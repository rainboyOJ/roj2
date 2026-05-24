# 一次评测的完整源码链路

这份文档从用户在前端提交代码开始，追踪到前端看到评测结果为止。重点解释 `api-server`、MongoDB、`judge-dispatcher` 和 `judge_server` 之间如何协作，帮助阅读源码时建立整体模型。

## 1. 核心结论

当前项目里，`api-server` 和 `judge-dispatcher` 不是通过 HTTP、WebSocket 或 RPC 直接通信。

它们通过同一个 MongoDB 数据库协作：

1. `api-server` 接收用户提交，把 submission 写入 MongoDB。
2. `judge-dispatcher` 后台轮询 MongoDB，抢占待评测 submission。
3. `judge-dispatcher` 调用 `judge_server` 完成评测。
4. `judge-dispatcher` 把评测状态和结果写回 MongoDB。
5. 前端页面或 JSON API 再从 `api-server` 读取 MongoDB 中的最新 submission。

所以源码里要注意区分三类状态：

- 浏览器看到的页面状态，来自 `api-server` 渲染或 JSON API 返回。
- OJ 自己的 submission 状态，保存在 MongoDB 的 `submissions.status`。
- `judge_server` 的原始评测状态，保存在 MongoDB 的 `submissions.judge.lastStatus`。

## 2. 相关源码入口

前端页面：

- `apps/api-server/src/views/problem.pug`
- `apps/api-server/src/views/submission.pug`
- `apps/api-server/src/views/submissions.pug`

HTTP 服务：

- `apps/api-server/src/app.ts`
- `apps/api-server/src/index.ts`

数据库层：

- `packages/db/src/index.ts`
- `packages/shared/src/index.ts`

后台评测进程：

- `apps/judge-dispatcher/src/index.ts`
- `apps/judge-dispatcher/src/dispatcher.ts`

judge 协议客户端：

- `packages/judge-driver/src/index.ts`

## 3. 总体时序

```text
Browser
  |
  | POST /submissions 或 POST /api/submissions
  v
api-server
  |
  | createSubmission()
  v
MongoDB submissions
  |
  | claimPendingSubmission()
  v
judge-dispatcher
  |
  | submit / query_result
  v
judge_server
  |
  | submission_ack / submission_update / submission_finished
  v
judge-dispatcher
  |
  | saveJudgeAck() / saveJudgeSnapshot()
  v
MongoDB submissions
  |
  | GET /submissions/:id 或 GET /api/submissions/:id
  v
api-server
  |
  v
Browser
```

## 4. 第一步：用户在题目页提交代码

题目详情页在 `apps/api-server/src/views/problem.pug`。

页面里有一个提交表单：

```pug
form(method="post" action=urlWithLang('/submissions'))
  input(type="hidden" name="pid" value=problem.pid)
  select(name="language" id="language")
  textarea(name="sourceCode" id="sourceCode")
```

用户点击提交后，浏览器会发起：

```text
POST /submissions
```

如果是程序调用 JSON API，则走：

```text
POST /api/submissions
```

这两个入口最终都只做一件核心事情：创建一条 submission。它们不会在 HTTP 请求里等待评测完成。

## 5. 第二步：api-server 创建 submission

页面提交路由在 `apps/api-server/src/app.ts` 的 `app.post('/submissions', ...)`。

主要逻辑：

1. 从 cookie 里读取 `roj_session`。
2. 通过 `services.getCurrentUser()` 找到当前用户。
3. 检查学生用户是否已经通过审核。
4. 用 `createSubmissionSchema` 校验 `pid`、`language`、`sourceCode`。
5. 调用 `services.createSubmission()`。
6. 跳转到提交详情页 `/submissions/:id`。

JSON API 路由 `app.post('/api/submissions', ...)` 逻辑类似，只是返回 JSON：

```json
{
  "submissionId": "1",
  "submissionNo": 1,
  "status": "PENDING_DISPATCH",
  "verdict": "PENDING"
}
```

`services.createSubmission()` 在 `apps/api-server/src/index.ts` 里实现。这里很重要：

```ts
const created = await db.createSubmission(input);
```

也就是说，`api-server` 创建 submission 的时候只写数据库，不直接连接 `judge_server`。

## 6. 第三步：DB 层写入待评测 submission

真正创建 submission 的代码在 `packages/db/src/index.ts` 的 `RojDb.createSubmission()`。

它会做这些事情：

1. 根据 `userId` 找用户。
2. 根据 `pid` 找题目。
3. 检查题目是否允许当前语言。
4. 用 `nextCounterValue('submissionNo')` 分配一个对外展示的数字提交号。
5. 插入一条 `submissions` 文档。

新 submission 的关键字段大致是：

```ts
{
  submissionNo,
  userId,
  problemId,
  pid,
  username,
  displayName,
  language,
  sourceCode,
  status: 'PENDING_DISPATCH',
  verdict: 'PENDING',
  judge: createEmptyJudgeState(),
  result: createEmptyResultState()
}
```

这里的 `status: 'PENDING_DISPATCH'` 是整个异步评测流程的起点。它表示：

> 这条提交已经进入 OJ 数据库，但还没有被后台 dispatcher 发送给 `judge_server`。

## 7. 第四步：前端跳转到提交详情页

页面提交成功后，`api-server` 会跳转到：

```text
/submissions/:publicId
```

对应路由在 `apps/api-server/src/app.ts` 的 `app.get('/submissions/:id', ...)`。

这个路由会：

1. 检查登录态。
2. 调用 `services.getSubmissionById()`。
3. 判断是否有权限查看这条提交。
4. 渲染 `apps/api-server/src/views/submission.pug`。

`submission.pug` 里有一段自动刷新逻辑：

```js
const terminal = ['FINISHED', 'FAILED'];
if (!terminal.includes('#{submission.status}')) {
  setTimeout(() => {
    window.location.href = '#{urlWithLang(`/submissions/${submission.publicId}`)}';
  }, 2000);
}
```

因此用户提交后会先看到等待状态，页面每 2 秒刷新一次。只要 MongoDB 里的 submission 还不是 `FINISHED` 或 `FAILED`，页面就会继续刷新。

## 8. 第五步：judge-dispatcher 启动后台循环

`judge-dispatcher` 的入口是 `apps/judge-dispatcher/src/index.ts`。

它启动时会做三件事：

1. 连接 MongoDB。
2. 创建 `JudgeServerClient`，用于连接 `judge_server`。
3. 调用 `runDispatcherLoop()` 进入无限循环。

关键配置来自环境变量：

```text
MONGODB_URI
MONGODB_DB
JUDGE_SERVER_HOST
JUDGE_SERVER_PORT
JUDGE_RESPONSE_TIMEOUT_MS
JUDGE_POLL_INTERVAL_MS
JUDGE_LEASE_OWNER
JUDGE_LEASE_MS
DISPATCHER_IDLE_DELAY_MS
```

这说明 `judge-dispatcher` 是一个独立进程。它不提供 HTTP 服务，也不接收浏览器请求。

## 9. 第六步：dispatcher 从 MongoDB 抢任务

主循环在 `apps/judge-dispatcher/src/dispatcher.ts` 的 `runDispatcherLoop()`。

每一轮循环都会调用：

```ts
const claimed = await options.db.claimPendingSubmission(
  options.leaseOwner,
  options.leaseMs,
);
```

`claimPendingSubmission()` 在 `packages/db/src/index.ts`。

它会在 `submissions` 集合里找：

```ts
{
  status: 'PENDING_DISPATCH',
  judge.leaseExpireAt: null 或 已经过期
}
```

找到后用一次原子更新把它改成：

```ts
{
  status: 'SENT_TO_JUDGE',
  judge.leaseOwner,
  judge.leaseExpireAt
}
```

这个 lease 机制的作用是：如果将来运行多个 dispatcher 实例，同一条 submission 不会轻易被多个进程重复处理。

如果没有待评测任务，dispatcher 会 sleep 一段时间，然后继续下一轮。

## 10. 第七步：dispatcher 提交给 judge_server

抢到任务后，dispatcher 调用 `processClaimedSubmission()`。

它会把 OJ 内部语言转换成 `judge_server` 协议里的语言编号：

```ts
cpp -> 0
python -> 2
```

然后调用：

```ts
const ack = await options.client.submit({
  uuid: Date.now(),
  pid: submission.pid,
  lang: appLanguageToJudgeLanguage(submission.language),
  code: submission.sourceCode,
});
```

这里的 `options.client` 是 `packages/judge-driver/src/index.ts` 里的 `JudgeServerClient`。

`judge-driver` 和 `judge_server` 的通信协议是：

```text
TCP
4-byte big-endian length + UTF-8 JSON body
```

提交请求类型是：

```json
{
  "type": "submit",
  "uuid": 123,
  "pid": "1000",
  "lang": 2,
  "code": "..."
}
```

`judge_server` 接收后会返回 `submission_ack`，其中最重要的是：

```json
{
  "type": "submission_ack",
  "submission_id": 123
}
```

这个 `submission_id` 是 `judge_server` 内部的提交 ID，不等于 OJ 自己 MongoDB 里的 `_id`，也不等于对外展示的 `submissionNo`。

## 11. 第八步：保存 judge ack

dispatcher 收到 ack 后调用：

```ts
await options.db.saveJudgeAck(submission.id, {
  submissionId: ack.submission_id,
  status: ack.status,
  verdict: ack.verdict,
  message: ack.message,
  case_results: ack.case_results,
});
```

`saveJudgeAck()` 会把 MongoDB 里的 submission 更新成：

```ts
{
  status: 'JUDGING',
  verdict: ack.verdict,
  judge: {
    submissionId: ack.submission_id,
    lastStatus: ack.status,
    lastMessage: ack.message,
    ackAt: now
  }
}
```

此时前端刷新详情页时，通常会看到状态已经从 `PENDING_DISPATCH` 变成 `JUDGING`。

## 12. 第九步：dispatcher 轮询 judge_server

ack 保存后，dispatcher 进入轮询：

```ts
while (true) {
  await delay(options.pollDelayMs);
  const snapshot = await options.client.queryResult(ack.submission_id);
  await options.db.saveJudgeSnapshot(submission.id, snapshot);

  if (isTerminalJudgeStatus(snapshot.status)) {
    return snapshot;
  }
}
```

轮询请求类型是：

```json
{
  "type": "query_result",
  "submission_id": 123
}
```

`judge_server` 可能返回：

- `submission_update`：仍在评测中。
- `submission_finished`：评测结束。
- 错误响应：由 `judge-driver` 抛出异常。

dispatcher 不直接把结果推给浏览器，而是每次拿到快照后都写回 MongoDB。

## 13. 第十步：保存评测快照

`saveJudgeSnapshot()` 在 `packages/db/src/index.ts`。

它先调用 `mapJudgeSnapshotToSubmissionState()`，把 `judge_server` 的状态映射成 OJ 自己的状态。

映射逻辑在 `packages/shared/src/index.ts`：

```ts
if (snapshot.status === 'FAILED') {
  return { status: 'FAILED', verdict: snapshot.verdict };
}

if (snapshot.status !== 'FINISHED') {
  return { status: 'JUDGING', verdict: snapshot.verdict };
}

return { status: 'FINISHED', verdict: snapshot.verdict };
```

然后更新 MongoDB：

```ts
{
  status: mapped.status,
  verdict: mapped.verdict,
  judge.lastStatus: snapshot.status,
  judge.lastMessage: snapshot.message,
  judge.lastPolledAt: now,
  judge.finishedAt: 终态时写入 now,
  result.caseResults: snapshot.case_results,
  result.message: snapshot.message
}
```

如果状态已经是 `FINISHED` 或 `FAILED`，还会清理 lease：

```ts
{
  judge.leaseOwner: null,
  judge.leaseExpireAt: null
}
```

这表示后台处理已经结束。

## 14. 第十一步：前端拿到最终结果

前端详情页并不是通过一个长连接等待结果，而是反复重新请求：

```text
GET /submissions/:id
```

每次请求都会经过：

```text
app.get('/submissions/:id')
  -> services.getSubmissionById()
  -> db.getSubmissionWithProblemByPublicId()
  -> mapSubmission()
  -> submission.pug
```

当 MongoDB 里的 `submission.status` 变成：

```text
FINISHED
```

或：

```text
FAILED
```

`submission.pug` 里的自动刷新脚本就不会再触发。用户最终看到：

- OJ 状态：`submission.status`
- verdict：`submission.verdict`
- judge 状态：`submission.judgeStatus`
- judge message：`submission.message`
- 测试点结果：`submission.caseResults`
- 用户提交的代码：`submission.sourceCode`

如果是程序调用 JSON API，也可以通过：

```text
GET /api/submissions/:id
```

读取同样的 submission 视图模型。

## 15. api-server 和 judge-dispatcher 到底如何通信

它们的通信介质是 MongoDB。

`api-server` 负责写入：

```text
submissions.status = PENDING_DISPATCH
```

`judge-dispatcher` 负责读取并更新：

```text
PENDING_DISPATCH
  -> SENT_TO_JUDGE
  -> JUDGING
  -> FINISHED 或 FAILED
```

`api-server` 再负责读取这些状态并展示给用户。

所以可以把 MongoDB 的 `submissions` 集合理解成一个很简单的任务队列：

- `PENDING_DISPATCH`：待消费任务。
- `SENT_TO_JUDGE`：已经被某个 dispatcher 抢到。
- `JUDGING`：已经提交给 `judge_server`，正在轮询结果。
- `FINISHED`：评测正常完成。
- `FAILED`：评测失败或系统异常。

## 16. 三种 ID 的区别

一次评测里容易混淆三种 ID：

| 字段 | 来源 | 用途 |
| --- | --- | --- |
| `submission._id` | MongoDB / OJ 自己生成 | 数据库主键 |
| `submission.submissionNo` | `counters` 集合自增生成 | 前端展示的数字提交号 |
| `submission.judge.submissionId` | `judge_server` 返回的 `submission_id` | dispatcher 后续 `query_result` 查询用 |

用户页面通常看到的是 `submissionNo`。dispatcher 和 `judge_server` 通信时使用的是 `judge.submissionId`。

## 17. 异常情况下会发生什么

如果 dispatcher 在提交或轮询时遇到网络错误、协议错误、超时等异常，`runDispatcherLoop()` 会 catch 住错误并调用：

```ts
await options.db.markSubmissionFailed(claimed._id, message);
```

它会把 submission 更新成：

```ts
{
  status: 'FAILED',
  verdict: 'SYSTEM_ERROR',
  judge.lastStatus: 'FAILED',
  judge.lastMessage: message,
  result.message: message
}
```

这样即使后台评测进程出错，前端也能看到一个终态，而不是一直停在等待中。

## 18. 阅读源码时的建议顺序

建议按下面顺序读：

1. `apps/api-server/src/views/problem.pug`：看表单提交什么字段。
2. `apps/api-server/src/app.ts`：看 `/submissions` 和 `/api/submissions` 如何创建提交。
3. `apps/api-server/src/index.ts`：看 service 如何调用 DB。
4. `packages/db/src/index.ts`：看 submission 如何写入、如何被 claim、如何保存结果。
5. `packages/shared/src/index.ts`：看 OJ 状态和 judge 状态如何映射。
6. `apps/judge-dispatcher/src/index.ts`：看 dispatcher 如何启动。
7. `apps/judge-dispatcher/src/dispatcher.ts`：看后台评测循环。
8. `packages/judge-driver/src/index.ts`：看 TCP 协议如何封装。
9. `apps/api-server/src/views/submission.pug`：看页面如何展示和自动刷新结果。

## 19. 一句话总结

本项目的一次评测不是同步 HTTP 流程，而是异步任务流程：

```text
前端提交 -> api-server 写 MongoDB -> dispatcher 抢任务 -> judge_server 评测 -> dispatcher 写 MongoDB -> 前端轮询读取结果
```

理解这个模型后，再看每个文件里的函数，会更容易判断它属于“创建任务”、“调度任务”、“执行评测”还是“展示结果”。
