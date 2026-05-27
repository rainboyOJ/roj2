#!/usr/bin/env node
// 基于已有 submissions 重建用户题目进度表。
import { RojDb } from '@roj/db';

const db = new RojDb({
  uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGODB_DB ?? 'roj_demo',
});

await db.connect();

try {
  await db.ensureIndexes();
  const result = await db.rebuildUserProblemProgress();
  console.log(`rebuilt ${result.rebuilt} user problem progress rows`);
} finally {
  await db.close();
}
