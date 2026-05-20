// judge-dispatcher 的入口文件。
// 它不提供 HTTP，只负责：
// 1. 连接 MongoDB
// 2. 连接 judge_server
// 3. 启动无限调度循环
import { hostname } from 'node:os';

import { RojDb } from '@roj/db';
import { JudgeServerClient } from '@roj/judge-driver';

import { runDispatcherLoop } from './dispatcher.ts';

// 当前版本大多环境变量都有默认值，这个函数暂时没有被调用。
// 先保留它，后续如果把某些配置改成强制项，可以直接复用。
function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing environment variable ${name}`);
  }
  return value;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // dispatcher 和 api-server 共用同一个业务数据库。
  const db = new RojDb({
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB ?? 'roj_demo',
  });

  await db.connect();
  await db.ensureIndexes();

  // 这里创建的是和 judge_server 通信的 TCP JSON 协议客户端。
  const client = new JudgeServerClient({
    host: process.env.JUDGE_SERVER_HOST ?? '127.0.0.1',
    port: Number(process.env.JUDGE_SERVER_PORT ?? '8000'),
    responseTimeoutMs: Number(process.env.JUDGE_RESPONSE_TIMEOUT_MS ?? '30000'),
    pollIntervalMs: Number(process.env.JUDGE_POLL_INTERVAL_MS ?? '500'),
  });

  // leaseOwner 用来标记“是哪一个 dispatcher 实例抢到了这个任务”。
  await runDispatcherLoop({
    db,
    client,
    leaseOwner: process.env.JUDGE_LEASE_OWNER ?? `dispatcher@${hostname()}`,
    leaseMs: Number(process.env.JUDGE_LEASE_MS ?? '30000'),
    idleDelayMs: Number(process.env.DISPATCHER_IDLE_DELAY_MS ?? '1000'),
    pollDelayMs: Number(process.env.JUDGE_POLL_INTERVAL_MS ?? '500'),
  });
}

export * from './dispatcher.ts';
