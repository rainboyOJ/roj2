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
