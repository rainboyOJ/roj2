#!/usr/bin/env node
// 为已有题目补齐预渲染 HTML。运行后，用户访问题目页不需要实时渲染 Markdown。
import { renderMarkdown } from '@roj/markdown-renderer';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
const dbName = process.env.MONGODB_DB ?? 'roj_demo';

await client.connect();

try {
  const problems = client.db(dbName).collection<{
    _id: string;
    pid: string;
    statementMarkdown?: string;
  }>('problems');

  const cursor = problems.find({
    statementMarkdown: {
      $type: 'string',
    },
  });

  let updated = 0;
  for await (const problem of cursor) {
    const statementMarkdown = problem.statementMarkdown ?? '';
    await problems.updateOne(
      { _id: problem._id },
      {
        $set: {
          statementHtml: renderMarkdown(statementMarkdown),
          updatedAt: new Date(),
        },
      },
    );
    updated += 1;
    console.log(`rendered ${problem.pid}`);
  }

  console.log(`rendered ${updated} problems`);
} finally {
  await client.close();
}
