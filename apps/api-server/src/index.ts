// api-server 的入口文件。
// 这里只负责生产环境启动：连接数据库、创建 services、组装 Fastify 应用。
import { RojDb } from '@roj/db';

import { buildApp } from './app.ts';
import { buildProductionServices } from './services/production.ts';

export { buildProductionServices } from './services/production.ts';

if (import.meta.url === `file://${process.argv[1]}`) {
  // 这里才是真正的生产启动逻辑：
  // 建 DB、建 services、建 Fastify、监听端口。
  const db = new RojDb({
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB ?? 'roj_demo',
  });

  await db.connect();
  await db.ensureIndexes();

  const services = await buildProductionServices(db);
  const app = buildApp(services);
  const port = Number(process.env.PORT ?? '3000');
  const host = process.env.HOST ?? '127.0.0.1';

  await app.listen({
    host,
    port,
  });

  console.log(`api-server listening on http://${host}:${port}`);
}

export * from './app.ts';
