# roj_codex

这个仓库现在不只是 handoff 包，也包含了一个已经能跑起来的最小 OJ 主链路实现。

当前范围：

- Pug 页面：题目列表、题目详情、提交详情
- 认证页面：注册、登录、profile、管理员用户审核
- HTTP API：题目列表、题目详情、创建 submission、查询 submission
- MongoDB 持久化：`users`、`problems`、`submissions`
- MongoDB session：`sessions`
- 后台 `judge-dispatcher`
- 复用现有 `drivers/typescript` 与 `judge_server` 通信
- seed 数据：`admin`、`demo`、样例届别、`1000` 题目

暂未实现：

- 题目后台管理
- 多节点 judge 调度

## 目录结构

```text
.
  ├── apps/
  │   ├── api-server/
  │   └── judge-dispatcher/
  ├── packages/
  │   ├── db/
  │   ├── judge-driver/
  │   └── shared/
  ├── docs/
  │   ├── oj-nodejs-ts-mongodb-plan.md
  │   └── superpowers/
  ├── drivers/
  │   └── typescript/
  ├── package.json
  └── tsconfig.base.json
```

## 本地运行

前提：

- Node.js 22+
- Docker
- 一个可访问的 `judge_server`
- `judge_server` 侧已有 `testData/1000/data`

### 1. 启动 MongoDB

```bash
docker run -d \
  --name roj-demo-mongo \
  -p 27017:27017 \
  mongodb/mongodb-community-server:latest
```

注意：

- 在这台机器当前的 Linux kernel `7.0.3-arch1-1` 上，`mongodb/mongodb-community-server:latest` 会被镜像入口脚本直接拒绝启动。
- 容器日志会报：`MongoDB 8.0+ ... will not start by default on v6.19+`.
- 这不是 OJ 代码的问题，而是 MongoDB 8 社区镜像对新内核的已知保护行为。
- 如果你本机也遇到这个问题，优先换一个可启动的 MongoDB 运行方式后再执行 `npm run seed`。

### 2. 安装依赖

```bash
npm install
```

### 3. 准备环境变量

```bash
cp .env.example .env
```

如果你的 `judge_server` 不在 `127.0.0.1:8000`，修改对应变量。

### 4. 初始化 demo 数据

```bash
npm run seed
```

这会创建：

- 管理员 `admin / admin123456`
- 用户 `demo`
- 密码 `demo123456`
- 题目 `1000`

### 5. 启动 API

```bash
npm run dev:api
```

默认监听：

```text
http://127.0.0.1:3000
```

### 6. 启动 dispatcher

```bash
npm run dev:dispatcher
```

### 7. 启动 judge_server

在 `judge_server` 仓库中：

```bash
cd /home/rainboy/mycode/boxtest-opencode-dev
./build/judge_server config/config.json
```

### 8. 打开页面提测

访问：

```text
http://127.0.0.1:3000/problems
```

第一次使用可以：

1. 打开 `/login` 用 `admin / admin123456` 登录
2. 打开 `/admin/users` 审核学生
3. 或直接用种子账号 `demo / demo123456` 登录后提测

进入题目 `1000`，提交 C++ 或 Python 代码，页面会自动跳到 submission 详情，并每 2 秒刷新直到终态。

## 常用命令

```bash
npm test
npm run typecheck
npm run seed
npm run dev:api
npm run dev:dispatcher
```

## 推荐阅读顺序

1. `docs/oj-nodejs-ts-mongodb-plan.md`
2. `docs/superpowers/specs/2026-05-17-judge-pipeline-design.md`
3. `drivers/typescript/README.md`
4. `apps/api-server/src/index.ts`
5. `apps/judge-dispatcher/src/index.ts`
