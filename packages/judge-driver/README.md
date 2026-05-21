# judge_server TypeScript Driver

这个目录提供一个给 Node.js / TypeScript OJ 后端直接使用的驱动，用来和当前仓库里的 `judge_server` 通信。

它遵循项目当前协议：

- TCP 连接
- `4-byte big-endian length + UTF-8 JSON body`
- 请求类型：`submit`、`query_result`
- 响应类型：`submission_ack`、`submission_update`、`submission_finished`
- 错误响应：兼容格式 JSON（没有 `type` 字段）

## 适合什么场景

这个驱动主要面向你的 OJ 后端，不是给浏览器直接用的。

推荐的两种使用方式：

1. `submit()` + `queryResult()`

先提交，拿到 `submission_id`，把它存进你的数据库；之后由你的 Web API 周期性查询 `queryResult()`。

2. `submitAndPollUntilFinished()`

适合后台 worker、任务队列消费者、离线批量评测。

如果你明确想依赖 judge server 在同一条 TCP 连接上主动推送最终结果，也可以用：

- `createSession()`
- `session.submit()`
- `session.waitForFinal()`

## 当前约束

- `JudgeSession` 更适合一条连接只处理一个 in-flight submit。
- 如果你的网站后端要做大规模并发，推荐每次提交/查询都新开连接，直接使用 `JudgeServerClient` 的高层方法。
- 当前 server 的主动推送路径最稳定的是：`submission_ack -> submission_finished`。
- 更细粒度进度更新如果需要，建议你走 `queryResult()` 轮询。

## 目录

```text
packages/judge-driver/
  ├── src/index.ts
  ├── examples/submit-and-wait.ts
  ├── examples/submit-and-poll.ts
  ├── package.json
  └── tsconfig.json
```

## API

### `Language`

```ts
Language.CPP    // 0
Language.C      // 1
Language.PYTHON // 2
```

### `JudgeServerClient`

```ts
const client = new JudgeServerClient({
  host: '127.0.0.1',
  port: 8000,
});
```

支持的方法：

- `submit(request)`：只提交，返回 `submission_ack`
- `queryResult(submissionId)`：查询当前最新快照
- `submitAndWait(request)`：同一连接提交并等待最终推送结果
- `submitAndPollUntilFinished(request)`：提交后轮询直到终态
- `createSession()`：拿到底层长连接会话

### `JudgeSession`

适合同一条 TCP 连接上的 push 模式：

```ts
const session = await client.createSession();
const ack = await session.submit({
  uuid: 1001,
  pid: '1000',
  lang: Language.PYTHON,
  code: 'a, b = map(int, input().split())\nprint(a + b)\n',
});

const final = await session.waitForFinal();
session.close();
```

## 示例 1：提交后轮询

```ts
import { JudgeServerClient, Language } from './src/index.ts';

const client = new JudgeServerClient({ host: '127.0.0.1', port: 8000 });

const { ack, final } = await client.submitAndPollUntilFinished({
  uuid: Date.now(),
  pid: '1000',
  lang: Language.PYTHON,
  code: 'a, b = map(int, input().split())\nprint(a + b)\n',
});

console.log(ack.submission_id);
console.log(final.verdict);
```

## 示例 2：先提交，再由你自己的接口查询

```ts
const ack = await client.submit({
  uuid: Date.now(),
  pid: '1000',
  lang: Language.CPP,
  code: '#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}\n',
});

const snapshot = await client.queryResult(ack.submission_id);
```

## 错误处理

网络错误、协议错误、超时会直接抛异常。

如果 judge server 返回的是错误包，驱动会抛 `JudgeServerError`，你可以从 `error.response` 里拿到原始响应：

```ts
try {
  await client.queryResult(999999);
} catch (error) {
  if (error instanceof JudgeServerError) {
    console.error(error.response.message);
  }
}
```

## 本地运行示例

Node 22 可以直接用 strip-types 运行：

```bash
cd packages/judge-driver
node --experimental-strip-types ./examples/submit-and-poll.ts
```
