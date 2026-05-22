# roj_codex

这个仓库现在不只是 handoff 包，也包含了一个已经能跑起来的最小 OJ 主链路实现。

当前范围：

- Pug 页面：题目列表、题目详情、提交详情
- 认证页面：注册、登录、profile、管理员用户审核
- HTTP API：题目列表、题目详情、创建 submission、查询 submission
- MongoDB 持久化：`users`、`problems`、`submissions`
- MongoDB session：`sessions`
- 后台 `judge-dispatcher`
- 复用现有 `packages/judge-driver` 与 `judge_server` 通信
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
  ├── package.json
  └── tsconfig.base.json
```

## 本地运行

前提：

- Node.js 22+
- Docker
- 一个可访问的 `judge_server`
- `judge_server` 侧已有 `testData/1000/data`

### 1. 安装依赖

```bash
npm install
```

### 2. 一键启动整个测试栈

```bash
./scripts/dev-up.sh
```

这个脚本会自动完成这些事情：

- 如果根目录没有 `.env`，从 `.env.example` 复制一份
- `source .env` 并导出环境变量
- 检查 `127.0.0.1:27017` 是否已有 MongoDB；没有的话尝试启动 Docker 容器
- 执行 `npm run seed`
- 启动 `judge_server`
- 启动 `api-server`
- 启动 `judge-dispatcher`

启动后直接访问：

```text
http://127.0.0.1:3000/problems
```

默认账号：

- `admin / admin123456`
- `demo / demo123456`

停止整套服务：

```bash
./scripts/dev-down.sh
```

或者在 `dev-up.sh` 当前终端里按 `Ctrl-C`。

### 3. MongoDB 说明

脚本默认尝试使用：

```bash
mongo:7.0.34-jammy
```

但需要注意：

- 之所以默认固定到 `7.0.34-jammy`，是因为这台机器当前的 Linux kernel `7.0.3-arch1-1` 下，MongoDB `8.x` 镜像存在已知启动兼容问题。
- 如果你本机已经有可用的 MongoDB 在 `127.0.0.1:27017` 上运行，脚本会直接复用它。
- 如果你仍然想换成别的 Mongo 镜像，也可以覆盖默认值。
- 也可以通过环境变量覆盖脚本默认镜像，例如：

```bash
MONGO_IMAGE=<your-working-mongo-image> ./scripts/dev-up.sh
```

### 4. 手动启动方式

如果你要逐个进程排查，也可以继续用手动方式。

先准备环境变量：

```bash
cp .env.example .env
```

如果你的 `judge_server` 不在 `127.0.0.1:8000`，修改对应变量。
注意：当前代码不会自动读取 `.env`，所以手动启动前需要先执行：

```bash
set -a
source .env
set +a
```

然后再分别执行下面的命令。

### 5. 初始化 demo 数据

```bash
npm run seed
```

这会创建：

- 管理员 `admin / admin123456`
- 用户 `demo`
- 密码 `demo123456`
- 题目 `1000`

### 6. 启动 API

```bash
npm run dev:api
```

默认监听：

```text
http://127.0.0.1:3000
```

### 7. 启动 dispatcher

```bash
npm run dev:dispatcher
```

### 8. 启动 judge_server

在 `judge_server` 仓库中：

```bash
cd /home/rainboy/mycode/boxtest-opencode-dev
./build/judge_server config/config.json
```

### 9. 打开页面提测

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

## Docker 镜像

构建镜像：

```bash
docker build -t roj-codex:local .
```

运行 API 服务：

```bash
docker run --rm -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e JUDGE_SERVER_HOST=host.docker.internal \
  roj-codex:local
```

运行 dispatcher：

```bash
docker run --rm \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e JUDGE_SERVER_HOST=host.docker.internal \
  roj-codex:local npm run dev:dispatcher
```

如果 MongoDB 或 `judge_server` 运行在同一个 Docker network 里，把上面的 host 改成对应的容器服务名。

## 推荐阅读顺序

1. `docs/oj-nodejs-ts-mongodb-plan.md`
2. `docs/superpowers/specs/2026-05-17-judge-pipeline-design.md`
3. `packages/judge-driver/README.md`
4. `apps/api-server/src/index.ts`
5. `apps/judge-dispatcher/src/index.ts`
