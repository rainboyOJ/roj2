// 这个脚本只做一件事：向 MongoDB 填充一套最小演示数据。
// 本地第一次启动项目前，通常先跑它，确保有账号和题目可用。
import { RojDb } from '@roj/db';

const db = new RojDb({
  uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGODB_DB ?? 'roj_demo',
});

await db.connect();
await db.ensureIndexes();
await db.seedDemoData();
await db.close();

console.log('seed completed');
console.log('admin: admin / admin123456');
console.log('demo: demo / demo123456');
