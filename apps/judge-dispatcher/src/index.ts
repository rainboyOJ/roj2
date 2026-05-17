import { hostname } from 'node:os';

import { RojDb } from '@roj/db';
import { JudgeServerClient } from '@roj/judge-driver';

import { runDispatcherLoop } from './dispatcher.ts';

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing environment variable ${name}`);
  }
  return value;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = new RojDb({
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB ?? 'roj_demo',
  });

  await db.connect();
  await db.ensureIndexes();

  const client = new JudgeServerClient({
    host: process.env.JUDGE_SERVER_HOST ?? '127.0.0.1',
    port: Number(process.env.JUDGE_SERVER_PORT ?? '8000'),
    responseTimeoutMs: Number(process.env.JUDGE_RESPONSE_TIMEOUT_MS ?? '30000'),
    pollIntervalMs: Number(process.env.JUDGE_POLL_INTERVAL_MS ?? '500'),
  });

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
