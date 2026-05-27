# 快速调试 Docker 部署服务

`quick_start_for_test.sh` 用于已经通过 `install.sh` 拉起 Docker 服务后，快速调试本地 `api-server` 和 `judge-dispatcher`。

它适合这些场景：

- 修改 Pug、CSS、前端 JS 后，希望刷新浏览器马上看到效果。
- 修改 API 路由或 dispatcher 逻辑后，希望不重新构建 Docker 镜像。
- 保留 Docker 中的 MongoDB 和 judge-server，只替换本地开发进程。

## 前置条件

先通过 `install.sh` 启动完整服务：

```bash
./install.sh
```

确认这两个容器正在运行：

```text
roj-mongodb
roj-judge-server
```

如果缺少其中任意一个，`quick_start_for_test.sh` 会输出警告并退出。

## 启动方式

在 `roj2` 仓库根目录执行：

```bash
./quick_start_for_test.sh
```

脚本会先停止 Docker 中的这两个容器：

```text
roj-api-server
roj-judge-dispatcher
```

然后启动本地开发进程：

```text
npm run dev:api
npm run dev:dispatcher
```

默认访问地址：

```text
http://127.0.0.1:3300/problems
```

默认 API 监听地址是 `0.0.0.0:3300`，局域网内其他机器可以通过当前机器 IP 访问。

## 日志

脚本日志目录：

```text
.quick-start-logs/
```

主要日志文件：

```text
.quick-start-logs/api-server.log
.quick-start-logs/judge-dispatcher.log
```

## 停止调试

按 `Ctrl-C` 停止本地开发进程。

默认情况下，脚本退出时会尝试恢复之前被停止的 Docker 容器：

```text
roj-api-server
roj-judge-dispatcher
```

如果不希望自动恢复，可以这样运行：

```bash
RESTORE_DOCKER_SERVICES=0 ./quick_start_for_test.sh
```

## 常用环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `API_HOST` | `0.0.0.0` | 本地 API 监听地址 |
| `API_PORT` | `3300` | 本地 API 监听端口 |
| `API_PUBLIC_HOST` | `127.0.0.1` | 输出访问地址使用的主机名 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | 本地连接 MongoDB 的地址 |
| `MONGODB_DB` | `roj_demo` | MongoDB 数据库名 |
| `JUDGE_SERVER_CONTAINER_NAME` | `roj-judge-server` | judge-server 容器名 |
| `MONGO_CONTAINER_NAME` | `roj-mongodb` | MongoDB 容器名 |
| `RESTORE_DOCKER_SERVICES` | `1` | 退出时是否恢复被停止的 Docker 容器 |

如果本机 `3300` 端口被占用，可以指定其他端口：

```bash
API_PORT=3400 API_PUBLIC_HOST=127.0.0.1 ./quick_start_for_test.sh
```
