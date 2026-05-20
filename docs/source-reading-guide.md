# ROJ 源码阅读指南

这份文档的目标不是“把所有代码解释一遍”，而是指导你按一个合理顺序逐步读懂这个项目。

建议你边看边做两件事：

1. 打开对应文件，顺着文档一起看。
2. 每读完一个阶段，自己回答“这个模块的职责是什么，它依赖谁，它产出什么”。

## 0. 先建立总图

先看：

1. [README.md](/home/rainboy/mycode/roj_codex/README.md)
2. [docs/oj-nodejs-ts-mongodb-plan.md](/home/rainboy/mycode/roj_codex/docs/oj-nodejs-ts-mongodb-plan.md)

你先不要急着看代码实现，先搞清楚这几个事实：

- 这是一个最小可运行 OJ，不是完整商业系统。
- `api-server` 负责页面和 HTTP API。
- `judge-dispatcher` 负责后台评测调度。
- `judge_server` 是外部评测执行器，不负责 OJ 业务。
- MongoDB 是 OJ 的真实状态来源。

如果这一步没搞清楚，后面你会一直困惑“为什么 submission 创建后没有立刻出结果”。

## 1. 先看共享领域定义

先看：

1. [packages/shared/src/index.ts](/home/rainboy/mycode/roj_codex/packages/shared/src/index.ts)
2. [packages/shared/test/domain.test.ts](/home/rainboy/mycode/roj_codex/packages/shared/test/domain.test.ts)

这一层最重要，因为后面所有模块都依赖它。

你重点要看懂：

- `OJSubmissionStatuses`
- `SubmissionVerdicts`
- `JudgeStatuses`
- `SubmissionDocument`
- `UserDocument`
- `mapJudgeSnapshotToSubmissionState()`

这一阶段你要回答：

- OJ 自己的 submission 状态和 judge_server 的状态有什么区别？
- 什么叫 `PENDING_DISPATCH`、`SENT_TO_JUDGE`、`JUDGING`？
- 为什么要有 `judge` 子对象和 `result` 子对象？

## 2. 再看数据库层

接着看：

1. [packages/db/src/index.ts](/home/rainboy/mycode/roj_codex/packages/db/src/index.ts)
2. [packages/db/test/lease.test.ts](/home/rainboy/mycode/roj_codex/packages/db/test/lease.test.ts)

这是整个项目最关键的一层之一。因为系统真实状态都落在这里。

建议按下面顺序看：

1. `ensureIndexes()`
2. `seedDemoData()`
3. `createSubmission()`
4. `claimPendingSubmission()`
5. `saveJudgeAck()`
6. `saveJudgeSnapshot()`
7. `markSubmissionFailed()`
8. 用户和 session 相关函数
9. 题目、年级、审核相关函数

你重点要看懂：

- submission 是如何被创建出来的
- dispatcher 是如何“抢任务”的
- judge 返回的 ack 和 snapshot 是如何写回 MongoDB 的
- 为什么 lease 要写在 `submission.judge.*` 里面

这一阶段你要回答：

- 为什么 submission 创建时不直接去连 judge？
- 为什么要有 `claimPendingSubmission()` 这种原子更新？
- 一个 submission 从创建到终态，数据库里哪些字段会变化？

## 3. 看 judge 协议客户端

然后看：

1. [drivers/typescript/src/index.ts](/home/rainboy/mycode/roj_codex/drivers/typescript/src/index.ts)
2. [drivers/typescript/examples/submit-and-wait.ts](/home/rainboy/mycode/roj_codex/drivers/typescript/examples/submit-and-wait.ts)
3. [drivers/typescript/examples/submit-and-poll.ts](/home/rainboy/mycode/roj_codex/drivers/typescript/examples/submit-and-poll.ts)
4. [packages/judge-driver/src/index.ts](/home/rainboy/mycode/roj_codex/packages/judge-driver/src/index.ts)

这里不要一开始就深挖所有 socket 细节。

先抓主干：

- `JudgeSession`
- `JudgeServerClient`
- `submit()`
- `queryResult()`
- `submitAndWait()`
- `submitAndPollUntilFinished()`

再回头理解：

- `encodeRequestFrame()`
- `FramedJsonDecoder`
- `nextMessage()`

你重点要看懂：

- judge_server 协议为什么要自己处理“长度前缀 + JSON”
- 什么是长连接等待，什么是短连接轮询
- 为什么这个项目里 dispatcher 用的是 `submit + queryResult` 轮询模式

## 4. 看 dispatcher

然后看：

1. [apps/judge-dispatcher/src/index.ts](/home/rainboy/mycode/roj_codex/apps/judge-dispatcher/src/index.ts)
2. [apps/judge-dispatcher/src/dispatcher.ts](/home/rainboy/mycode/roj_codex/apps/judge-dispatcher/src/dispatcher.ts)
3. [apps/judge-dispatcher/test/dispatcher.test.ts](/home/rainboy/mycode/roj_codex/apps/judge-dispatcher/test/dispatcher.test.ts)

建议按这个顺序理解：

1. `runDispatcherLoop()`
2. `processClaimedSubmission()`
3. `appLanguageToJudgeLanguage()`
4. `processSubmissionWithClient()` 测试辅助函数

你重点要看懂：

- dispatcher 为什么是独立进程
- 它和 api-server 的边界是什么
- 它什么时候调用 `db.claimPendingSubmission()`
- 它什么时候调用 `db.saveJudgeAck()` / `db.saveJudgeSnapshot()`

这一阶段你要回答：

- 没有 dispatcher 时，为什么 submission 会一直停在等待状态？
- dispatcher 崩溃后，为什么系统还能恢复？

## 5. 看 API 服务入口

然后看：

1. [apps/api-server/src/index.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/index.ts)
2. [apps/api-server/src/seed.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/seed.ts)

这一层先不要被路由细节淹没，先看：

- `buildProductionServices()`
- `mapProblem()`
- `mapSubmission()`
- `mapSessionUser()`

你重点要看懂：

- 为什么 `app.ts` 不直接 new `RojDb`
- 为什么这里要先把 DB 文档转换成 ViewModel
- 为什么比赛数据现在还是 placeholder

## 6. 再看真正的路由层

接着看：

1. [apps/api-server/src/app.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/app.ts)

这是项目里最大、最重要的文件之一。不要从头一口气硬读到尾。

建议按下面顺序读：

1. 工具函数
   - `parseSessionToken()`
   - `setSessionCookie()`
   - `getRequestLang()`
   - `renderPage()`
2. 普通页面路由
   - `/`
   - `/problems`
   - `/problem/:pid`
   - `/submissions`
   - `/submissions/:id`
3. 认证路由
   - `/login`
   - `/register`
   - `/logout`
4. 普通用户 JSON API
   - `/api/login`
   - `/api/register`
   - `/api/submissions`
5. 管理页 HTML 路由
   - `/admin/users`
   - `/admin/problems`
   - `/admin/submissions`
6. 管理端 JSON API
   - `/api/admin/users`
   - `/api/admin/problems`
   - `/api/admin/grades`

这一阶段你重点看三件事：

- 登录态检查是怎么做的
- 管理员权限检查是怎么做的
- HTML 表单流和 JSON API 流分别怎么写

你要特别留意：

- 页面提交通常是 `POST /submissions` 后跳转
- API 提交通常是 `POST /api/submissions` 后返回 JSON
- 它们核心都调用同一个 `services.createSubmission()`

## 7. 看国际化和模板运行时辅助

然后看：

1. [apps/api-server/src/view-i18n.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/view-i18n.ts)

重点看：

- `translations`
- `createViewContext()`
- `urlWithLang()`
- `currentUrlForLang()`
- `localizeStatus()` / `localizeJudgeStatus()` / `localizeVerdict()`

你会明白：

- 为什么模板里能直接写 `t('...')`
- 为什么页面切语言时能保留当前地址
- 为什么状态和 verdict 能自动变成中文

## 8. 最后看页面模板

再看：

1. [apps/api-server/src/views/layout.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/layout.pug)
2. [apps/api-server/src/views/home.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/home.pug)
3. [apps/api-server/src/views/problems.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/problems.pug)
4. [apps/api-server/src/views/problem.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/problem.pug)
5. [apps/api-server/src/views/submissions.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/submissions.pug)
6. [apps/api-server/src/views/submission.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/submission.pug)
7. 管理页相关模板

建议顺序：

1. 先看 `layout.pug`
2. 再看普通用户页
3. 最后看管理页

你重点要看懂：

- nav 是如何根据 `isAdminArea` 和 `currentUser` 切换的
- table 列表页的结构是怎么统一的
- 题目页表单是如何提交到 `/submissions` 的
- 管理员审核页为什么同时有批量按钮和行内按钮

## 9. 最后用测试反推行为

最后读测试：

1. [apps/api-server/test/app.test.ts](/home/rainboy/mycode/roj_codex/apps/api-server/test/app.test.ts)
2. [apps/api-server/test/auth.test.ts](/home/rainboy/mycode/roj_codex/apps/api-server/test/auth.test.ts)
3. [apps/api-server/test/content-management.test.ts](/home/rainboy/mycode/roj_codex/apps/api-server/test/content-management.test.ts)
4. [apps/api-server/test/views.test.ts](/home/rainboy/mycode/roj_codex/apps/api-server/test/views.test.ts)

读测试的目标不是“背断言”，而是倒过来看系统承诺了什么行为。

比如：

- 未登录为什么不能提测
- 待审核学生为什么不能交题
- 管理员为什么能批量审核
- 页面最终应该渲染出哪些按钮和表格

## 10. 建议你实际跟一次主流程

当你把上面都看一遍后，建议你亲自跟一条提交主流程：

1. 登录 `demo`
2. 打开 `/problem/1000`
3. 提交一段代码
4. 记下 submission id
5. 去 MongoDB 看这条 submission 的文档变化
6. 对照 `db.createSubmission() -> dispatcher -> saveJudgeAck() -> saveJudgeSnapshot()`

这一步是把“看代码”变成“看系统状态变化”，理解会快很多。

## 11. 如果你时间有限，只看这 8 个文件

如果你现在只想抓住主干，优先读这 8 个文件：

1. [packages/shared/src/index.ts](/home/rainboy/mycode/roj_codex/packages/shared/src/index.ts)
2. [packages/db/src/index.ts](/home/rainboy/mycode/roj_codex/packages/db/src/index.ts)
3. [drivers/typescript/src/index.ts](/home/rainboy/mycode/roj_codex/drivers/typescript/src/index.ts)
4. [apps/judge-dispatcher/src/dispatcher.ts](/home/rainboy/mycode/roj_codex/apps/judge-dispatcher/src/dispatcher.ts)
5. [apps/api-server/src/index.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/index.ts)
6. [apps/api-server/src/app.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/app.ts)
7. [apps/api-server/src/view-i18n.ts](/home/rainboy/mycode/roj_codex/apps/api-server/src/view-i18n.ts)
8. [apps/api-server/src/views/layout.pug](/home/rainboy/mycode/roj_codex/apps/api-server/src/views/layout.pug)

## 12. 你阅读时最容易卡住的点

最后提前提醒你几个常见卡点：

- 不要把 `judge_server` 的状态直接当成 OJ 状态。
- 不要以为 `api-server` 会主动评测，它只负责创建 submission。
- 不要以为题目元数据进了 MongoDB，judge 机器就自动有测试数据。
- 不要把 HTML 页面流和 JSON API 流混在一起看，它们入口不同，但很多 service 相同。

如果你愿意，我下一步可以继续做两件事里的任意一个：

1. 再补第二轮中文注释，覆盖更多细节函数和样式块。
2. 按这份 guide 带你逐文件讲解一遍主链路。 
