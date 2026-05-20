// 示例 1：
// 先 submit，再显式调用 query_result 轮询直到终态。
// 适合理解“短连接轮询”的 judge 使用方式。
import {
  JudgeServerClient,
  Language,
} from '../src/index.ts';

const client = new JudgeServerClient({
  host: '127.0.0.1',
  port: 8000,
  responseTimeoutMs: 30000,
  pollIntervalMs: 300,
});

const { ack, final } = await client.submitAndPollUntilFinished(
  {
    uuid: Date.now(),
    pid: '1000',
    lang: Language.PYTHON,
    code: 'a, b = map(int, input().split())\nprint(a + b)\n',
  },
  {
    onSnapshot(snapshot) {
      console.log(
        `snapshot submission_id=${snapshot.submission_id} status=${snapshot.status} verdict=${snapshot.verdict}`,
      );
    },
  },
);

console.log('submission_id =', ack.submission_id);
console.log('final status =', final.status);
console.log('final verdict =', final.verdict);
console.log(JSON.stringify(final, null, 2));
