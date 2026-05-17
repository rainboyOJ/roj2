# 基于 judge_server 的 Node.js + TypeScript + MongoDB OJ 规划

这份文档的目标不是讨论“理想中的大型 OJ”，而是基于当前仓库里已经存在的 `judge_server`，先做一个小型、能稳定上线、后续还能继续扩展的 OJ。

核心原则只有三条：

1. `judge_server` 只负责评测，不负责 OJ 业务。
2. OJ 自己的数据库状态以 MongoDB 为准，不以 `judge_server` 内存状态为准。
3. 先做单体业务服务 + 独立评测 worker，先跑通，再扩展。

---

## 1. 目标与边界

### 1.1 目标

先完成一个 small OJ MVP，至少具备这些能力：

- 学生注册、登录、等待管理员审核
- 用户提交代码
- OJ 把提交交给 `judge_server`
- OJ 持久化保存 submission 和结果
- 用户可以查看提交状态和最终 verdict
- 支持 C++ / Python
- 题目数据部署在 judge 机器本地文件系统

### 1.2 明确边界

`judge_server` 的职责：

- 接收 `submit`
- 返回 `submission_ack`
- 后台执行 compile / run / compare
- 提供 `query_result`
- 返回 `submission_update` / `submission_finished`

OJ 服务的职责：

- 用户、题目、提交、比赛、权限
- 持久化数据库
- API
- 页面或前端接口
- submission 派发到 judge
- submission 状态对用户可见
- 题目元数据管理
- problem data 部署流程

不要让 `judge_server` 直接承担：

- 用户系统
- 提交历史数据库
- 排名榜
- contest 规则
- 权限校验
- 审计日志

---

## 2. 当前 judge_server 的真实能力

基于当前代码，和 OJ 集成时要接受这些事实：

- 协议是 TCP，framing 为 `4-byte big-endian length + UTF-8 JSON`
- 请求只有 `submit`、`query_result`
- 成功响应有 `submission_ack`、`submission_update`、`submission_finished`
- 错误响应仍是兼容格式，没有 `type`
- 当前稳定支持的语言是 C++、Python
- 题目数据来自 judge 机器本地 `testData/<pid>/data`
- `ResultStore` 是进程内存，不是持久化数据库
- `SubmissionQueue` 是进程内内存队列，不是持久化消息队列
- `query_result` 可以按 `submission_id` 查询最新快照
- 当前主动推送最稳定的路径是 `submission_ack -> submission_finished`

这意味着：

1. 你不能把 `judge_server` 当成 OJ 的数据库。
2. 你不能假设 `judge_server` 重启后还能记住旧 submission。
3. 你的 OJ 必须把自己的 submission 状态写进 MongoDB。
4. 题目数据必须先部署到 judge 节点本地，单靠 MongoDB 存题目正文不够。

---

## 3. 技术选型结论

### 3.1 后端技术

建议：

- Node.js 22 LTS
- TypeScript 5.x
- Fastify
- MongoDB 官方 Node Driver
- Zod 做请求校验
- Pug/Jade 做服务端页面模板

这里不优先选 Mongoose，原因很简单：

- OJ 的核心数据模型并不复杂
- submission 派发、lease、原子更新这些逻辑更适合直接写 Mongo 查询
- 官方 driver + Zod 更直接，也更容易控制并发细节

### 3.2 进程划分

建议至少拆成两个 Node 进程：

1. `api-server`
2. `judge-dispatcher`

不要把这两部分塞进一个 HTTP 进程里。

原因：

- HTTP 请求不应该长期等待评测完成
- 评测派发有自己的重试、lease、超时逻辑
- 后续你可能会单独扩容 dispatcher

### 3.3 前端通信

MVP 推荐先用 HTTP 轮询 submission 详情，不急着上 WebSocket。

原因：

- 先保证提交和评测主链路正确
- OJ 的状态变化频率不算极高
- 轮询简单、可靠、调试成本低

后续如果需要更好的体验，再加 SSE。

### 3.4 登录与 Session

建议：

- 页面走 Pug/Jade 服务端渲染
- 页面里的登录态依赖 cookie
- 使用服务端 session
- session 本体落 MongoDB

不要第一版就上 JWT。

原因：

- 当前系统是典型网站而不是纯 API 平台
- 管理员后续会有“重置密码 / 强制失效旧登录”的需求
- 服务端 session 更贴合这种后台管理场景

---

## 4. 总体架构

推荐结构：

```text
browser
  -> api-server (Fastify)
  -> MongoDB

judge-dispatcher
  -> MongoDB
  -> judge_server (TCP JSON protocol)

judge_server
  -> local testData/
  -> sjudge / checker / compiler / python
```

更细一点：

```text
用户提交代码
  -> api-server 创建 submission 文档
  -> MongoDB 记录为 PENDING_DISPATCH
  -> judge-dispatcher 抢占这个 submission
  -> 调用 TypeScript judge driver 向 judge_server 发 submit
  -> 保存 judge_server 返回的 submission_id
  -> 轮询 query_result
  -> 持续把快照写回 MongoDB
  -> 到终态后更新 submission
  -> 前端轮询 API 看到最终结果
```

再补充一下页面层结构：

```text
browser
  -> Pug 页面路由
  -> 页面内 fetch/axios 调 JSON API
  -> api-server
```

也就是说：

- 页面本身由 OJ server 渲染
- 提交、查询 submission、管理员操作走 JSON API
- 浏览器绝不直接访问 `judge_server`

---

## 5. 为什么主集成方式应选 submit + query_result

当前 `drivers/typescript` 已经支持两种思路：

1. `submitAndWait()`：同一条 TCP 连接上等待最终推送
2. `submit()` + `queryResult()`：提交后轮询

对 OJ 后端来说，推荐主流程用第二种。

原因：

- 如果 dispatcher 在拿到 `submission_ack` 之后崩掉，新的 worker 还能根据保存下来的 `judgeSubmissionId` 继续 `query_result`
- 不依赖长连接持续存活
- 更适合把 submission 状态持久化到 MongoDB
- 更符合“数据库是事实来源”的设计

`submitAndWait()` 仍然有价值，但更适合：

- 调试脚本
- 本地联调
- 少量后台任务

不适合作为 OJ 主业务链路的唯一机制。

---

## 6. OJ 内部模块划分

建议 OJ 代码库至少分这几个模块：

```text
apps/
  api-server/
  judge-dispatcher/

packages/
  shared/
  judge-driver/
  db/
```

### 6.1 `api-server`

职责：

- 用户认证
- 题目列表 / 题目详情
- 创建 submission
- 查询 submission
- 管理员题目管理接口

### 6.2 `judge-dispatcher`

职责：

- 从 MongoDB 抢占待评测 submission
- 调用 TypeScript judge driver
- 保存 `judgeSubmissionId`
- 轮询 `query_result`
- 持续更新 MongoDB 中的 submission 状态
- 失败重试 / lease 续租 / 超时处理

### 6.3 `packages/judge-driver`

这里直接复用你现在仓库里的 `drivers/typescript` 思路即可。

建议未来把它抽成单独 package，让 `api-server` 和 `judge-dispatcher` 都能共享类型定义，但真正连 judge 的动作主要还是给 `judge-dispatcher` 用。

### 6.4 `packages/shared`

放这些共享内容：

- verdict/status 类型
- submission DTO
- problem DTO
- API 响应类型
- Zod schema

---

## 7. MongoDB 数据模型建议

## 7.1 users

```ts
{
  _id: ObjectId,
  username: string,
  name: string,
  gender: 'male' | 'female' | 'other',
  className: string,
  grade: string,
  passwordHash: string,
  role: 'student' | 'admin',
  approvalStatus: 'pending' | 'approved' | 'rejected',
  approvedBy: ObjectId | null,
  approvedAt: Date | null,
  rejectedReason: string | null,
  createdAt: Date,
  updatedAt: Date
}
```

补充约束：

- `username` 唯一
- `username` 建议限制为小写字母、数字、下划线，长度 `3~24`
- 密码哈希算法使用 `argon2id`
- 学生注册时自己填写：`username / name / gender / className / grade / password`
- 注册后默认 `approvalStatus = pending`
- `pending` 用户可以登录，但不能提交
- `grade` 学生自己不能改，管理员可以改
- `name`、`gender` 学生自己不能改，管理员可以改
- `className` 学生可以改，但改完重新进入 `pending`

这套设计的意义是：

- 允许学生自助注册
- 又保留管理员最终审核和纠错的权力

## 7.1.1 grades

因为你已经确定“届”不是自由文本，而是管理员维护的固定列表，所以建议单独建一个集合：

```ts
{
  _id: ObjectId,
  name: string,
  isActive: boolean,
  order: number,
  createdAt: Date,
  updatedAt: Date
}
```

例如：

- `2024`
- `2025`
- `2026`

注册页面从这个集合读取可选列表。

## 7.1.2 sessions

如果你使用 MongoDB session store，实际还会有一类 session 文档。

这一层可以交给 session 中间件管理，不需要你自己手写业务 schema，但在架构上要承认它存在。

## 7.2 problems

```ts
{
  _id: ObjectId,
  pid: string,
  title: string,
  statementMarkdown: string,
  tags: string[],
  difficulty: '入门' | '普及' | '提高',
  allowLanguages: Array<'cpp' | 'python'>,
  isVisible: boolean,
  stats: {
    triedUserCount: number,
    acceptedUserCount: number
  },
  limits: {
    timeLimitMs: number,
    memoryLimitMb: number
  },
  judgeConfig: {
    pid: string,
    dataVersion: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

这里要注意：

- 路由层建议直接使用 `pid`，即 `/problem/:pid`
- `pid` 要和 judge 机器上的 `testData/<pid>/data` 对应
- problem 文档保存的是元数据，不是测试数据本体
- `difficulty` 用固定枚举，不用自由文本
- `tags` 用自由文本数组
- `stats.triedUserCount` 表示尝试过该题的去重学生数
- `stats.acceptedUserCount` 表示 AC 过该题的去重学生数

### 7.2.1 题目统计更新策略

第一版按最简单且稳定的口径处理：

- `triedUserCount = 提交过该题的去重学生数`
- `acceptedUserCount = AC 过该题的去重学生数`

更新建议：

- 不在每次提交时直接硬算全量统计
- dispatcher 在 submission 进入终态后，异步维护一份“用户-题目通过状态”
- 题目详情页读取 `problems.stats`
- 管理员后台预留“重算题目统计”能力，但第一版不必先做成复杂后台任务系统

也就是说，第一版的目标是：

- 先保证统计口径一致
- 不为了统计把 submission 主链路做复杂

## 7.3 submissions

这是最关键的集合。

建议字段：

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  problemId: ObjectId,
  pid: string,
  username: string,
  displayName: string,
  userClassName: string,
  language: 'cpp' | 'python',
  sourceCode: string,

  status: 'PENDING_DISPATCH' | 'SENT_TO_JUDGE' | 'JUDGING' | 'FINISHED' | 'FAILED',
  verdict: 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'OLE' | 'PE' | 'CE' | 'UNKNOWN' | 'SYSTEM_ERROR',

  judge: {
    nodeId: string | null,
    submissionId: number | null,
    lastStatus: string | null,
    lastMessage: string | null,
    retryCount: number,
    leaseOwner: string | null,
    leaseExpireAt: Date | null,
    lastPolledAt: Date | null,
    ackAt: Date | null,
    finishedAt: Date | null
  },

  result: {
    caseResults: Array<{
      seqId: number,
      verdict: string,
      cpuTimeMs: number,
      realTimeMs: number,
      memoryKb: number,
      signal: number,
      exitCode: number,
      errorCode: number
    }>,
    message: string
  },

  createdAt: Date,
  updatedAt: Date
}
```

核心思想：

- OJ 自己有一套 submission 文档
- `judge.submissionId` 只是映射到 `judge_server` 的外部编号
- 用户查的永远是 MongoDB 里的 submission，不直接查 judge server

说明：

- `displayName`、`userClassName` 冗余保存，是为了 submission 列表展示稳定，不依赖运行时再 join 用户表
- submission 列表对登录学生开放，推荐显示：
  - `姓名`
  - `班级`
  - `pid`
  - `language`
  - `verdict`
  - `提交时间`
- `/submission/:id` 中的结果详情默认对登录学生开放
- 代码查看权限单独判断

## 7.4 judge_nodes

如果一开始只一台 judge 机器，可以先不建这个集合。

如果准备后续多机扩展，建议预留：

```ts
{
  _id: string,
  host: string,
  port: number,
  enabled: boolean,
  maxConcurrentSubmissions: number,
  currentLeasedCount: number,
  tags: string[],
  updatedAt: Date
}
```

## 7.5 MongoDB 索引建议

第一版至少建立这些索引：

- `users.username` 唯一索引
- `grades.name` 唯一索引
- `problems.pid` 唯一索引
- `submissions.userId + createdAt`
- `submissions.pid + createdAt`
- `submissions.status + judge.leaseExpireAt`
- `submissions.judge.submissionId`

说明：

- `users.username` 用于登录和管理员查人
- `grades.name` 防止出现重复届
- `problems.pid` 保证题目路由和 judge 数据目录一一对应
- `submissions.userId + createdAt` 支持个人提交列表
- `submissions.pid + createdAt` 支持题目维度查看提交
- `submissions.status + judge.leaseExpireAt` 支持 dispatcher 抢任务
- `submissions.judge.submissionId` 方便通过 judge 侧 submission id 回查本地 submission

---

## 8. submission 状态机建议

OJ 自己的 submission 状态，不要完全照搬 `judge_server` 的状态。

推荐分两层：

### 8.1 OJ 业务层状态

- `PENDING_DISPATCH`
- `SENT_TO_JUDGE`
- `JUDGING`
- `FINISHED`
- `FAILED`

### 8.2 judge 快照层状态

直接保存 `judge_server` 返回的：

- `QUEUED`
- `PREPARING`
- `COMPILING`
- `RUNNING`
- `FINISHED`
- `FAILED`

这样做的好处是：

- 用户界面可以展示更友好的业务状态
- 你又不会丢掉底层评测状态细节

再补一层注册审核状态：

- `pending`
- `approved`
- `rejected`

`rejected` 用户允许修改资料后重新进入 `pending`。

---

## 9. 提交流程设计

推荐完整流程如下：

### 9.1 用户提交

1. 浏览器调用 `POST /api/submissions`
2. `api-server` 校验用户、题目、语言
3. 必须满足：
   - 用户已登录
   - 角色为 `student` 或 `admin`
   - 如果是学生，`approvalStatus = approved`
   - 题目 `isVisible = true`
4. 写入 MongoDB：
   - `status = PENDING_DISPATCH`
   - `verdict = PENDING`
5. 立即返回本地 submission `_id`

这里 HTTP 不等待 judge 结果。

### 9.2 dispatcher 抢任务

`judge-dispatcher` 循环执行：

1. 用 `findOneAndUpdate()` 原子抢占一条 `PENDING_DISPATCH`
2. 写入：
   - `judge.leaseOwner`
   - `judge.leaseExpireAt`
   - `status = SENT_TO_JUDGE`

这里的 lease 很重要，它解决：

- 多个 dispatcher 重复消费
- dispatcher 崩溃后的恢复

### 9.3 发送到 judge_server

dispatcher 用 TypeScript driver 调：

```ts
const ack = await client.submit(...)
```

拿到 ack 后写 MongoDB：

- `judge.submissionId = ack.submission_id`
- `judge.lastStatus = ack.status`
- `judge.ackAt = now`
- `status = JUDGING`

### 9.4 轮询 judge_server

然后循环：

```ts
const snapshot = await client.queryResult(judgeSubmissionId)
```

每次查询后更新 MongoDB：

- `judge.lastStatus`
- `judge.lastMessage`
- `result.caseResults`
- `verdict`
- `updatedAt`

如果 snapshot 是终态：

- `status = FINISHED` 或 `FAILED`
- `judge.finishedAt = now`
- 清除 lease

---

## 10. 为什么 MongoDB 里也要做 lease

因为 `judge_server` 没有持久化队列，也没有“任务归属”的外部调度语义。

所以 OJ 自己必须解决这些问题：

- 哪个 worker 正在处理哪条 submission
- worker 死掉后谁来接手
- 一条 submission 不能被多个 worker 重复派发

推荐 lease 字段：

- `judge.leaseOwner`
- `judge.leaseExpireAt`

worker 抢到任务后周期性续租。

如果 lease 过期，另一个 worker 才能接手。

---

## 11. problem 数据与 judge 机器部署

这是这个架构里一个必须提前想清楚的问题。

当前 `judge_server` 不是从 MongoDB 读取测试数据，而是从本地文件系统读取：

```text
testData/<pid>/data
```

所以题目管理必须拆成两部分：

1. MongoDB 中的题目元数据
2. judge 节点本地的测试数据目录

### 11.1 推荐做法

- MongoDB 存 problem statement、样例、标签、是否公开
- Git 仓库或对象存储保存 problem data 原始包
- 管理员发布题目时，把测试数据同步到 judge 节点本地

### 11.2 MVP 里最简单的方式

先手动维护：

- MongoDB problem 文档里的 `pid`
- judge 机器上的 `testData/<pid>/data`

也就是说，题目创建分两步：

1. 管理员在 OJ 后台创建题目元数据
2. 手动把测试数据目录放到 judge 机器

这虽然原始，但最容易先跑通。

### 11.3 后续改进

后面可以做一个 `problem-sync` 工具：

- 从对象存储下载 problem data
- 解压到 judge 节点
- 校验 `dataVersion`

---

## 12. judge_server 当前对 OJ 的几个限制

如果你真的要把这个 OJ 做成可长期维护的系统，下面这些点要明确。

### 12.1 per-problem 资源限制还不够好

当前 `SubmissionService::load_cases_for_problem()` 里测试点限制是硬编码的。

这对真正的 OJ 不够。

建议后续至少支持一种：

1. `testData/<pid>/config.json`
2. request 中带资源限制
3. problem 元数据下发到 judge 节点本地配置文件

最推荐第一种，因为和当前文件系统模型最匹配。

### 12.2 语言支持还少

当前主用是：

- C++
- Python

如果你需要 C、Java、Go，后面要继续扩 `RunnerFactory` 和对应 runner。

### 12.3 没有取消任务

当前没有 `cancel submission` 能力。

MVP 可以接受，但之后如果有：

- 比赛结束清理
- 用户重复提交太多
- 管理员终止异常任务

就会需要这个能力。

### 12.4 结果存储是内存态

所以 OJ 不能依赖 judge server 保存历史。

MongoDB 必须保存完整终态结果。

---

## 13. API 设计建议

MVP 先做这些就够：

### 用户侧

- `GET /register`
- `POST /api/register`
- `GET /login`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/me/class-name`
- `POST /api/submissions`
- `GET /api/submissions/:id`
- `GET /api/submissions`
- `GET /api/problems`
- `GET /api/problems/:id`

### 管理员侧

- `GET /api/admin/users`
- `POST /api/admin/users/:id/approve`
- `POST /api/admin/users/:id/reject`
- `POST /api/admin/users/:id/reset-password`
- `POST /api/admin/grades`
- `PUT /api/admin/grades/:id`
- `POST /api/admin/problems`
- `PUT /api/admin/problems/:id`
- `POST /api/admin/problems/:id/publish`
- `GET /api/admin/submissions`

### 返回风格建议

提交接口返回本地 submission id：

```json
{
  "submissionId": "6827..."
}
```

submission 详情接口返回：

```json
{
  "id": "6827...",
  "status": "JUDGING",
  "verdict": "PENDING",
  "judgeStatus": "RUNNING",
  "result": {
    "caseResults": []
  }
}
```

不要把前端直接绑死在 `judge_server` 的协议形状上。

OJ API 应该有自己的 DTO。

## 13.1 页面路由建议

推荐至少有这些页面：

- `/`
- `/register`
- `/login`
- `/problems`
- `/problem/:pid`
- `/submissions`
- `/submission/:id`
- `/profile`
- `/admin/users`
- `/admin/problems`
- `/admin/submissions`

匿名用户：

- 可以看题目列表
- 可以看题面
- 不能提交
- 不能看 submission 列表

待审核用户：

- 可以登录
- 页面明确显示“等待管理员审核”
- 可以看题目
- 不能提交

## 13.2 权限规则建议

### 题目

- 匿名用户可看公开题目列表和题面
- 登录学生可看所有公开题目
- 隐藏题目仅管理员可见

### submission 列表

- 所有登录学生可看 submission 列表
- 列表显示 `姓名 + 班级 + 题目 + 语言 + verdict + 时间`

### submission 详情

- 所有登录学生可看 verdict、编译错误、测试点结果
- 自己的代码永远可看
- `admin` 永远可看所有代码
- 学生如果“自己这题至少 AC 过一次”，则可看这题其他用户的所有提交代码，包括 AC / WA / TLE / CE

这条权限要做成明确的策略函数，不要散落在控制器里硬写。

---

## 14. 推荐迭代顺序

## Phase 0：judge_server 对齐

目标：

- 确认 `drivers/typescript` 可用
- 明确题目数据部署方式
- 明确当前只支持 C++ / Python

最好补的 judge_server 能力：

- per-problem 资源限制配置
- 更清晰的 compile error message

## Phase 1：OJ 后端骨架

目标：

- Fastify 项目初始化
- MongoDB 连接
- `users / grades / problems / submissions` 基础 schema
- session store 接入 MongoDB
- seed 脚本初始化 admin
- `POST /api/submissions`
- `GET /api/submissions/:id`

此阶段先不接 judge。

## Phase 2：dispatcher 接 judge_server

目标：

- 独立 `judge-dispatcher` 进程
- MongoDB lease 抢占
- 调用 TS driver：
  - `submit`
  - `queryResult`
- 把快照写回 MongoDB

此阶段完成后，OJ 核心闭环成立。

## Phase 3：题目管理与数据部署

目标：

- problem 元数据后台管理
- grades 管理
- 学生审核
- 管理员重置密码
- `pid` 与 judge 机器目录对应
- 管理员题目发布流程

此阶段决定后面运维是否痛苦。

## Phase 4：用户体验

目标：

- 用户提交列表
- 题目详情
- 提交详情页
- 轮询展示实时状态

这里先不要急着上 WebSocket。

## Phase 5：稳定性与扩展

目标：

- 多 judge 节点
- dispatcher 多实例
- submission retry 规则
- SSE / WebSocket
- contest / ranking

---

## 15. MVP 明确不做的事情

第一版不要做这些：

- 浏览器直接连 judge_server
- 把题目测试数据存进 MongoDB
- 一开始就做多机调度
- 一开始就做 WebSocket
- 一开始就做复杂 contest 规则
- 一开始就做通用插件化 runner 系统

这些东西都不是先把 OJ 跑起来的关键路径。

---

## 16. 最终建议

如果只给一句话的架构结论，那就是：

> 用 Node.js + TypeScript + MongoDB 做一个“Pug 页面 + JSON API + 独立 judge-dispatcher”的校内 OJ，把 `judge_server` 当成外部评测执行器；主流程采用 `submit -> 保存 judgeSubmissionId -> query_result 轮询 -> 写回 MongoDB`，账号体系采用“学生注册 + 管理员审核 + MongoDB session”。

这是当前这套 `judge_server` 最稳、最容易解释、也最容易恢复失败的一种接法。

如果后面要继续推进，最合理的下一步不是先写页面，而是先做：

1. `users / grades / submissions` collection 设计
2. 注册审核与 session 设计
3. `judge-dispatcher` lease 模型
4. problem data 部署约定

这四件事定了，整个系统的骨架就定了。
