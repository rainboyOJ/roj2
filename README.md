# roj2

`roj2` 是一个基于 Node.js、TypeScript、MongoDB 和外部 `judge_server` 的在线评测系统。项目提供服务端渲染页面、JSON API、后台评测调度器和 judge 通信驱动，适合校内 OJ、课程训练和小规模题库管理场景。

## 功能概览

- 用户注册、登录、会话管理
- 管理员用户审核
- 题目列表、题目详情、题面 Markdown HTML 渲染
- 提交代码、提交列表、提交详情
- 评测结果、测试点结果和提交源码展示
- 管理端题目、用户、提交入口
- MongoDB 持久化存储
- 独立 `judge-dispatcher` 后台评测调度
- `judge-driver` TCP 协议客户端
- Docker / Docker Compose 部署
- GHCR 镜像自动构建发布

## 架构

```text
Browser
  -> api-server
  -> MongoDB
  -> judge-dispatcher
  -> judge_server
```

核心模块：

- `apps/api-server`：HTTP API、页面路由、Pug 模板渲染
- `apps/judge-dispatcher`：从 MongoDB 抢占待评测提交，发送给 `judge_server`
- `packages/db`：MongoDB 数据访问层
- `packages/shared`：共享领域类型、状态常量和状态映射
- `packages/judge-driver`：`judge_server` TCP JSON 协议客户端
- `packages/markdown-renderer`：题面 Markdown 渲染

`api-server` 和 `judge-dispatcher` 不直接通信。二者通过 MongoDB 的 `submissions` 集合协作：

```text
PENDING_DISPATCH -> SENT_TO_JUDGE -> JUDGING -> FINISHED / FAILED
```

## 环境要求

- Node.js 25+
- npm
- Docker
- Docker Compose
- MongoDB，默认可由 Compose 启动
- `judge_server_cpp` 镜像或源码仓库

## 快速部署

推荐使用安装脚本准备 `judge_server`、构建镜像并拉起服务：

```bash
./install.sh
```

可以在一个空目录中执行安装脚本。脚本会在当前目录创建部署所需资源：

```text
judge_server_cpp/
roj2/
docker-compose.yaml
.env
judge_server_config.json
judge_server_testData/
```

更新代码、重建镜像并重启服务：

```bash
./install.sh update
```

清理相关容器和本地构建镜像：

```bash
./install.sh clear
```

安装完成后访问：

```text
http://127.0.0.1:3000/problems
```

默认种子账号：

```text
admin / admin123456
demo  / demo123456
```

## judge_server 配置

安装脚本会在部署目录创建：

```text
judge_server_config.json
judge_server_testData/
```

Compose 会把它们挂载到 `judge-server` 容器：

```text
judge_server_config.json -> /opt/boxtest/config/config.json
judge_server_testData/   -> /opt/boxtest/testData
```

题目测试数据目录格式：

```text
judge_server_testData/<pid>/data
```

修改 `judge_server` 配置或测试数据后，建议重启整套服务：

```bash
docker compose down
docker compose up -d
```

## Docker Compose

本仓库提供 `docker-compose.yaml`，包含：

- `mongodb`
- `judge-server`
- `api-server`
- `judge-dispatcher`

使用 GHCR 镜像启动：

```bash
docker compose up -d
```

查看日志：

```bash
docker compose logs -f judge-server judge-dispatcher api-server
```

停止服务：

```bash
docker compose down
```

默认镜像：

```text
ghcr.io/rainboyoj/roj2:latest
ghcr.io/rainboyoj/judge_server_cpp:latest
```

如需指定其他镜像：

```bash
IMAGE_NAME=ghcr.io/rainboyoj/roj2:latest \
JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge_server_cpp:latest \
docker compose up -d
```

## GHCR 镜像

代码 push 到 GitHub 的 `master` / `main` 分支后，GitHub Actions 会自动构建并发布镜像到 GitHub Container Registry。

镜像地址：

```text
ghcr.io/rainboyoj/roj2:latest
ghcr.io/rainboyoj/judge_server_cpp:latest
```

拉取镜像：

```bash
docker pull ghcr.io/rainboyoj/roj2:latest
docker pull ghcr.io/rainboyoj/judge_server_cpp:latest
```

可用 tag：

- `latest`：默认分支最新镜像
- `master` / `main`：分支镜像
- `sha-<commit-sha>`：提交镜像
- `v*`：版本 tag 镜像

如果 GHCR package 未设置为 public，拉取前需要登录：

```bash
docker login ghcr.io
```

## 本地开发

安装依赖：

```bash
npm install
```

初始化种子数据：

```bash
npm run seed
```

启动 API 服务：

```bash
npm run dev:api
```

启动评测调度器：

```bash
npm run dev:dispatcher
```

常用检查：

```bash
npm test
npm run typecheck
```

## 环境变量

常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | API 监听地址 |
| `PORT` | `3000` | API 监听端口 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB 地址 |
| `MONGODB_DB` | `roj_demo` | MongoDB 数据库名 |
| `JUDGE_SERVER_HOST` | `127.0.0.1` | `judge_server` 地址 |
| `JUDGE_SERVER_PORT` | `8000` | `judge_server` 端口 |
| `JUDGE_RESPONSE_TIMEOUT_MS` | `30000` | judge 响应超时 |
| `JUDGE_POLL_INTERVAL_MS` | `500` | dispatcher 轮询间隔 |
| `JUDGE_LEASE_MS` | `30000` | submission 抢占租约时间 |

## 文档

- `docs/judge_flow_source_reading.md`：一次评测的完整源码链路
- `docs/source-reading-guide.md`：源码阅读顺序
- `packages/judge-driver/README.md`：judge TCP 客户端说明
- `docs/docker_one_key_build_and_run.md`：Docker 一键构建部署说明

## License

当前仓库未声明开源许可证。使用、分发或部署前请先确认项目授权。
