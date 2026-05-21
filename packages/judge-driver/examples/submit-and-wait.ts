// 示例 2：
// 用同一个 TCP 会话提交并等待 judge_server 主动推送终态。
// 适合理解“长连接等待”的 judge 使用方式。
import {
  JudgeServerClient,
  Language,
} from '../src/index.ts';

const client = new JudgeServerClient({
  host: '127.0.0.1',
  port: 8000,
  responseTimeoutMs: 30000,
});

const { ack, final } = await client.submitAndWait({
  uuid: Date.now(),
  pid: '1000',
  lang: Language.PYTHON,
  code: 'a, b = map(int, input().split())\nprint(a + b)\n',
});

console.log('submission_id =', ack.submission_id);
console.log('final status =', final.status);
console.log('final verdict =', final.verdict);
console.log(JSON.stringify(final, null, 2));
