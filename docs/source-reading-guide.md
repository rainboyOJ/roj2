# ROJ 源码阅读指南

这份文档的目标不是把所有代码逐行解释一遍，而是给你一个稳定的阅读顺序。按这个顺序读，可以先抓住主链路，再回头看页面、脚本和部署细节。

建议你边看边回答三个问题：

1. 这个模块的职责是什么？
2. 它依赖谁？
3. 它产出的数据会流向哪里？

## 0. 先建立总图

先看：

1. [README.md](../README.md)
2. [docs/oj-nodejs-ts-mongodb-plan.md](./oj-nodejs-ts-mongodb-plan.md)
3. [docs/judge_flow_source_reading.md](./judge_flow_source_reading.md)

先不要急着读实现，先确认这几个事实：

- `api-server` 负责页面、HTTP API 和登录态。
- `judge-dispatcher` 负责后台评测调度。
- `judge_server` 是外部评测执行器，不保存 OJ 业务状态。
- MongoDB 是用户、题目、提交、评测结果的真实状态来源。
- 提交创建后不会立刻出结果，必须等 dispatcher 抢任务并写回评测快照。

## 1. 共享领域定义

先看：

1. [packages/shared/src/index.ts](../packages/shared/src/index.ts)
2. [packages/shared/test/domain.test.ts](../packages/shared/test/domain.test.ts)

这一层定义所有模块都会用到的状态和值对象。

重点看：

- `OJSubmissionStatuses`
- `SubmissionVerdicts`
- `JudgeStatuses`
- `ProblemDocument`
- `SubmissionDocument`
- `UserDocument`
- `mapJudgeSnapshotToSubmissionState()`

读完后你应该能回答：

- OJ 自己的 submission 状态和 judge_server 的状态有什么区别？
- `PENDING_DISPATCH`、`SENT_TO_JUDGE`、`JUDGING` 分别表示什么？
- 为什么 submission 里要分成 `judge` 子对象和 `result` 子对象？

## 2. 数据库层

接着看：

1. [packages/db/src/index.ts](../packages/db/src/index.ts)
2. [packages/db/test/lease.test.ts](../packages/db/test/lease.test.ts)
3. [packages/db/test/problem-progress.test.ts](../packages/db/test/problem-progress.test.ts)
4. [packages/db/test/default-problems.test.ts](../packages/db/test/default-problems.test.ts)

这是系统最关键的一层。真实业务状态基本都在这里落库。

建议按下面顺序看：

1. `ensureIndexes()`
2. `seedDemoData()`
3. 默认题目读取逻辑：`readDefaultProblemSeeds()`
4. `createSubmission()`
5. `claimPendingSubmission()`
6. `saveJudgeAck()`
7. `saveJudgeSnapshot()`
8. `markSubmissionFailed()`
9. 用户、session、题目、年级、审核相关函数

重点看懂：

- 默认题目如何从 `packages/db/default_problems/<pid>/` 扫描并写入数据库。
- submission 是如何创建出来的。
- dispatcher 如何通过 lease 原子抢任务。
- judge ack 和 snapshot 如何写回 MongoDB。
- 用户题目进度表如何从提交结果更新。

读完后你应该能回答：

- 为什么 API 创建 submission 时不直接连接 judge_server？
- 为什么需要 `claimPendingSubmission()` 这种原子更新？
- 一个 submission 从创建到终态，数据库里哪些字段会变化？
- 为什么题目元数据进 MongoDB 后，judge_server 仍然需要本地测试数据目录？

## 3. Judge 协议客户端

然后看：

1. [packages/judge-driver/src/index.ts](../packages/judge-driver/src/index.ts)
2. [packages/judge-driver/examples/submit-and-wait.ts](../packages/judge-driver/examples/submit-and-wait.ts)
3. [packages/judge-driver/examples/submit-and-poll.ts](../packages/judge-driver/examples/submit-and-poll.ts)

先抓主干：

- `JudgeSession`
- `JudgeServerClient`
- `submit()`
- `queryResult()`
- `submitAndWait()`
- `submitAndPollUntilFinished()`

再回头看协议细节：

- `encodeRequestFrame()`
- `FramedJsonDecoder`
- `nextMessage()`

重点看懂：

- judge_server 协议为什么是“长度前缀 + JSON”。
- 长连接等待和短连接轮询有什么区别。
- 当前 dispatcher 为什么采用 `submit + queryResult` 轮询模式。

## 4. Dispatcher

然后看：

1. [apps/judge-dispatcher/src/index.ts](../apps/judge-dispatcher/src/index.ts)
2. [apps/judge-dispatcher/src/dispatcher.ts](../apps/judge-dispatcher/src/dispatcher.ts)
3. [apps/judge-dispatcher/test/dispatcher.test.ts](../apps/judge-dispatcher/test/dispatcher.test.ts)

建议按这个顺序理解：

1. `runDispatcherLoop()`
2. `processClaimedSubmission()`
3. `appLanguageToJudgeLanguage()`
4. `processSubmissionWithClient()`

重点看懂：

- dispatcher 为什么是独立进程。
- 它和 api-server 的边界是什么。
- 它什么时候调用 `db.claimPendingSubmission()`。
- 它什么时候调用 `db.saveJudgeAck()` / `db.saveJudgeSnapshot()`。

读完后你应该能回答：

- 没有 dispatcher 时，为什么 submission 会一直停在等待状态？
- dispatcher 崩溃后，为什么系统还能继续恢复处理旧任务？

## 5. API Server 入口和服务组装

然后看：

1. [apps/api-server/src/index.ts](../apps/api-server/src/index.ts)
2. [apps/api-server/src/app.ts](../apps/api-server/src/app.ts)
3. [apps/api-server/src/http/context.ts](../apps/api-server/src/http/context.ts)
4. [apps/api-server/src/http/schemas.ts](../apps/api-server/src/http/schemas.ts)
5. [apps/api-server/src/seed.ts](../apps/api-server/src/seed.ts)

这里先不要被具体路由淹没。先看入口和依赖如何组装：

- `buildProductionServices()`
- `buildApp()`
- `createRouteContext()`
- `renderPage()`
- `requireHtmlUser()` / `requireApiUser()`
- `requireHtmlAdmin()` / `requireApiAdmin()`
- `mapProblem()` / `mapSubmission()` / `mapSessionUser()`

重点看懂：

- 为什么 `app.ts` 不直接 new `RojDb`。
- 为什么 `index.ts` 要把 DB 文档转换成 ViewModel。
- 为什么路由拿到的是 `services`，而不是直接操作 MongoDB。
- zod schema 如何同时服务 HTML fallback 和 JSON API。

## 6. 路由层

真正的页面和 API 路由已经按领域拆到 [apps/api-server/src/routes/](../apps/api-server/src/routes/)。

建议按下面顺序读：

1. [routes/auth.ts](../apps/api-server/src/routes/auth.ts)
   - 登录、注册、登出
   - `/api/login`、`/api/register`
2. [routes/problems.ts](../apps/api-server/src/routes/problems.ts)
   - 题目列表
   - 题目详情页
   - HTML 提交 fallback：`POST /submissions`
3. [routes/submissions.ts](../apps/api-server/src/routes/submissions.ts)
   - 提交列表
   - 提交详情
   - `/api/submissions`
4. [routes/admin.ts](../apps/api-server/src/routes/admin.ts)
   - 管理后台页面
   - 用户、年级、题目、语言设置 API
5. [routes/profile.ts](../apps/api-server/src/routes/profile.ts)
   - 个人中心
   - 修改密码 API
6. [routes/static.ts](../apps/api-server/src/routes/static.ts)
   - 本地静态资源白名单
7. [routes/misc.ts](../apps/api-server/src/routes/misc.ts)
   - 排行榜、比赛占位等杂项页面

当前前端表单的主路径已经是 axios 调 JSON API：

- 登录：`POST /api/login`
- 注册：`POST /api/register`
- 提交代码：`POST /api/submissions`
- 后台题目、语言、年级、用户管理：`/api/admin/*`

HTML POST 路由仍然保留，主要作为无 JS 或直接提交时的 fallback。

## 7. 页面模板和前端脚本

模板看：

1. [apps/api-server/src/views/layout.pug](../apps/api-server/src/views/layout.pug)
2. [apps/api-server/src/views/home.pug](../apps/api-server/src/views/home.pug)
3. [apps/api-server/src/views/problems.pug](../apps/api-server/src/views/problems.pug)
4. [apps/api-server/src/views/problem.pug](../apps/api-server/src/views/problem.pug)
5. [apps/api-server/src/views/submissions.pug](../apps/api-server/src/views/submissions.pug)
6. [apps/api-server/src/views/submission.pug](../apps/api-server/src/views/submission.pug)
7. 管理页模板：`admin-*.pug`

模板辅助看：

1. [apps/api-server/src/view-helpers.ts](../apps/api-server/src/view-helpers.ts)
2. [apps/api-server/src/views/mixins/assets.pug](../apps/api-server/src/views/mixins/assets.pug)

前端脚本看：

1. [apps/api-server/src/assets/form-utils.js](../apps/api-server/src/assets/form-utils.js)
2. [apps/api-server/src/assets/login.js](../apps/api-server/src/assets/login.js)
3. [apps/api-server/src/assets/register.js](../apps/api-server/src/assets/register.js)
4. [apps/api-server/src/assets/admin-users.js](../apps/api-server/src/assets/admin-users.js)
5. [apps/api-server/src/client/problem-editor.ts](../apps/api-server/src/client/problem-editor.ts)

重点看懂：

- `layout.pug` 如何根据 `currentUser` 和 `isAdminArea` 切换导航。
- 模板里为什么现在直接写中文，不再经过 i18n 层。
- `formScripts()` 如何统一加载 axios、`form-utils.js` 和页面脚本。
- CodeMirror 编辑器源码在 `src/client/problem-editor.ts`，构建后输出到 `src/assets/editor/problem-editor.js`。

## 8. 默认题目和测试数据

看：

1. [packages/db/default_problems/1000/metadata.json](../packages/db/default_problems/1000/metadata.json)
2. [packages/db/default_problems/1000/content.md](../packages/db/default_problems/1000/content.md)
3. [packages/db/default_problems/1000/data/](../packages/db/default_problems/1000/data/)
4. [install.sh](../install.sh)

默认题目目录结构是：

```text
packages/db/default_problems/<pid>/
  metadata.json
  content.md
  data/
```

数据库 seed 只读取 `metadata.json` 和 `content.md`。`data/` 是给 judge_server 使用的测试数据，部署时由 `install.sh` 同步到 `judge_server_testData/<pid>/data`。

这里最容易混淆的一点是：题面进数据库，不代表 judge_server 已经有测试数据。两者是两条不同的数据流。

## 9. 用测试反推行为

最后读测试：

1. [apps/api-server/test/app.test.ts](../apps/api-server/test/app.test.ts)
2. [apps/api-server/test/auth.test.ts](../apps/api-server/test/auth.test.ts)
3. [apps/api-server/test/content-management.test.ts](../apps/api-server/test/content-management.test.ts)
4. [apps/api-server/test/views.test.ts](../apps/api-server/test/views.test.ts)
5. [test/install-script.test.ts](../test/install-script.test.ts)

读测试的目标不是背断言，而是倒过来看系统承诺了什么行为。

重点看：

- 未登录为什么不能提交。
- 待审核学生为什么不能交题。
- 管理员为什么能批量审核。
- 页面最终应该渲染出哪些按钮和表格。
- install 脚本应该准备哪些部署文件和默认测试数据。

## 10. 跟一次提交主流程

当你把上面都看一遍后，建议你亲自跟一条提交主流程：

1. 登录 `demo`。
2. 打开 `/problem/1000`。
3. 提交一段代码。
4. 记下 submission id。
5. 去 MongoDB 看这条 submission 的文档变化。
6. 对照 `db.createSubmission() -> dispatcher -> saveJudgeAck() -> saveJudgeSnapshot()`。

这一步会把“看代码”变成“看系统状态变化”，理解会快很多。

## 11. 如果时间有限，只看这 8 个入口

如果你现在只想抓住主干，优先读：

1. [packages/shared/src/index.ts](../packages/shared/src/index.ts)
2. [packages/db/src/index.ts](../packages/db/src/index.ts)
3. [packages/judge-driver/src/index.ts](../packages/judge-driver/src/index.ts)
4. [apps/judge-dispatcher/src/dispatcher.ts](../apps/judge-dispatcher/src/dispatcher.ts)
5. [apps/api-server/src/index.ts](../apps/api-server/src/index.ts)
6. [apps/api-server/src/http/context.ts](../apps/api-server/src/http/context.ts)
7. [apps/api-server/src/routes/submissions.ts](../apps/api-server/src/routes/submissions.ts)
8. [apps/api-server/src/routes/admin.ts](../apps/api-server/src/routes/admin.ts)

## 12. 常见卡点

- 不要把 judge_server 的状态直接当成 OJ 状态。
- 不要以为 api-server 会主动评测，它只负责创建 submission。
- 不要以为题目元数据进了 MongoDB，judge_server 就自动有测试数据。
- 不要把页面模板、页面脚本、JSON API 混在一起看；现在表单主路径是 axios API，HTML POST 是 fallback。
- 不要从 `app.ts` 里找全部业务路由；具体路由已经拆到 `routes/` 目录。
