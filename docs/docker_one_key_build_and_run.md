# Docker 一键部署

这个文档说明如何用 `install.sh` 在一台新机器或一个空目录中拉起完整 ROJ 服务。

## 前置条件

需要提前安装：

- Git
- Docker
- Docker Compose 插件，或 `docker-compose`

如果当前用户没有直接访问 Docker daemon 的权限，安装脚本会自动改用 `sudo docker`。

## 一键安装

建议在一个空目录中执行：

```bash
mkdir -p ~/roj_deploy
cd ~/roj_deploy
./install.sh
```

脚本会在当前部署目录准备这些资源：

```text
judge_server_cpp/
roj2/
docker-compose.yaml
.env
judge_server_config.json
judge_server_testData/
```

安装过程会完成：

- 拉取或复用 `judge_server_cpp` 仓库。
- 拉取或复用 `roj2` 仓库。
- 从 `roj2/.env.example` 复制生成 `.env`。
- 从 `roj2/docker-compose.yaml` 复制生成部署用 Compose 文件。
- 从 `judge_server_cpp/config/config.json` 复制生成 `judge_server_config.json`。
- 创建 `judge_server_testData/`。
- 复制默认题目 `1000` 的测试数据到 `judge_server_testData/1000/data`。
- 拉取 GHCR 镜像并启动 Docker Compose 服务。

默认访问地址：

```text
http://127.0.0.1:3300/problems
```

默认账号：

```text
admin / admin123456
demo  / demo123456
```

## 镜像与加速

默认运行镜像：

```text
ghcr.io/rainboyoj/roj2:latest
ghcr.io/rainboyoj/judge-server-cpp:latest
```

安装时会交互选择 Docker 镜像加速器：

- `ghcr.nju.edu.cn`：默认选项，替换 `ghcr.io` 域名。
- `gh-proxy.org/docker`：在原镜像名前增加代理前缀。
- 不使用代理：直接拉取 GHCR。

如果在非交互环境中运行，可以用环境变量指定：

```bash
DOCKER_IMAGE_ACCELERATOR_KIND=mirror \
DOCKER_IMAGE_ACCELERATOR=ghcr.nju.edu.cn \
./install.sh
```

关闭镜像加速：

```bash
DOCKER_IMAGE_ACCELERATOR_KIND=none \
DOCKER_IMAGE_ACCELERATOR= \
./install.sh
```

## 更新服务

更新仓库、重新拉取镜像并重启服务：

```bash
./install.sh update
```

`update` 会对已有 git 仓库执行 fast-forward 更新，并在启动前执行：

```bash
docker compose down --remove-orphans
docker compose up -d
```

## 清理服务

删除 ROJ 相关容器和本地镜像：

```bash
./install.sh clear
```

执行 `clear` 时会询问是否删除 MongoDB 数据卷 `roj-mongodb-data`。默认不删除数据库数据。

非交互删除数据库数据：

```bash
CLEAR_MONGODB_DATA=1 ./install.sh clear
```

非交互保留数据库数据：

```bash
CLEAR_MONGODB_DATA=0 ./install.sh clear
```

## Compose 服务

`docker-compose.yaml` 包含四个服务：

| 服务 | 容器名 | 作用 |
| --- | --- | --- |
| `mongodb` | `roj-mongodb` | MongoDB 数据库 |
| `judge-server` | `roj-judge-server` | C++ judge_server |
| `api-server` | `roj-api-server` | Web 页面和 JSON API |
| `judge-dispatcher` | `roj-judge-dispatcher` | 后台评测调度器 |

默认 `.env` 来自 `.env.example`，关键配置如下：

```text
IMAGE_NAME=ghcr.io/rainboyoj/roj2:latest
JUDGE_SERVER_IMAGE_NAME=ghcr.io/rainboyoj/judge-server-cpp:latest
JUDGE_SERVER_HOST_PORT=18000
JUDGE_SERVER_CONFIG_PATH=./judge_server_config.json
JUDGE_SERVER_TESTDATA_DIR=./judge_server_testData
API_HOST_PORT=3300
```

容器内 API 端口是 `3000`，宿主机默认访问端口是 `API_HOST_PORT=3300`。

## judge_server 配置与测试数据

部署目录中的文件会挂载进 judge-server 容器：

```text
judge_server_config.json -> /opt/boxtest/config/config.json
judge_server_testData/   -> /opt/boxtest/testData
```

题目测试数据目录格式：

```text
judge_server_testData/<pid>/data
```

修改 judge_server 配置或测试数据后，建议重启服务：

```bash
docker compose down
docker compose up -d
```

## 默认题目

默认题目保存在 `roj2` 仓库内：

```text
packages/db/default_problems/<pid>/content.md
packages/db/default_problems/<pid>/metadata.json
packages/db/default_problems/<pid>/data/
```

当前默认题目 `1000` 包含：

```text
packages/db/default_problems/1000/content.md
packages/db/default_problems/1000/metadata.json
packages/db/default_problems/1000/data/
```

`api-server` 启动时会执行种子数据初始化。`install.sh` 会把默认题目的 `data/` 复制到部署目录的 `judge_server_testData/1000/data`，供 judge-server 读取。

## 查看日志与停止服务

查看主要服务日志：

```bash
docker compose logs -f judge-server judge-dispatcher api-server
```

查看所有容器：

```bash
docker ps -a
```

停止服务但保留数据：

```bash
docker compose down
```

再次启动：

```bash
docker compose up -d
```

## 常见问题

如果启动时报挂载文件和目录类型不匹配，检查部署目录中 `judge_server_config.json` 是否被错误创建成了目录。正确状态应该是一个普通 JSON 文件。

如果提交后报 `getaddrinfo ENOTFOUND judge-server`，通常说明本地进程使用了 Docker 内部服务名。Docker Compose 内部使用 `judge-server:8000`，宿主机本地调试应使用 `127.0.0.1:<JUDGE_SERVER_HOST_PORT>`。

如果只想调试本地代码，不想重启整套 Docker 服务，使用仓库根目录的 `quick_start_for_test.sh`。详细说明见 [quick_start_for_test.md](quick_start_for_test.md)。
