#!/usr/bin/env node
// 为已有提交补齐数字提交号。新提交会自动分配，这个脚本只处理旧数据。
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
const dbName = process.env.MONGODB_DB ?? 'roj_demo';

await client.connect();

try {
  const db = client.db(dbName);
  const counters = db.collection<{
    _id: string;
    value: number;
    updatedAt: Date;
  }>('counters');
  const submissions = db.collection<{
    _id: string;
    submissionNo?: number;
  }>('submissions');

  const maxExisting = await submissions
    .find({ submissionNo: { $type: 'number' } })
    .sort({ submissionNo: -1 })
    .limit(1)
    .next();

  let nextSubmissionNo = maxExisting?.submissionNo ?? 0;
  let updated = 0;

  const cursor = submissions.find({ submissionNo: { $exists: false } }).sort({ createdAt: 1 });
  for await (const submission of cursor) {
    nextSubmissionNo += 1;
    await submissions.updateOne(
      { _id: submission._id },
      {
        $set: {
          submissionNo: nextSubmissionNo,
          updatedAt: new Date(),
        },
      },
    );
    updated += 1;
    console.log(`submission ${submission._id} -> #${nextSubmissionNo}`);
  }

  await counters.updateOne(
    { _id: 'submissionNo' },
    {
      $max: { value: nextSubmissionNo },
      $set: { updatedAt: new Date() },
    },
    { upsert: true },
  );

  console.log(`backfilled ${updated} submissions, next starts after ${nextSubmissionNo}`);
} finally {
  await client.close();
}
