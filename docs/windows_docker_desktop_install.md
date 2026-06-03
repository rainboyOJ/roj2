# Windows + Docker Desktop 安装教程

本文档说明如何在 Windows 电脑上使用 Docker Desktop 安装并运行 ROJ。

推荐方式是：

```text
Windows
  -> Docker Desktop
  -> WSL2 Ubuntu
  -> 在 Ubuntu 终端中执行 install.sh
```

不推荐直接在 PowerShell、CMD 或 Git Bash 里运行 `install.sh`。本项目的安装脚本是 Bash 脚本，并且需要准备 Linux 风格的挂载路径；放在 WSL2 Ubuntu 里执行最稳定。

## 1. 准备 Windows 环境

需要提前准备：

- Windows 10 / Windows 11 64 位系统
- BIOS 中已开启虚拟化
- WSL2
- Docker Desktop for Windows
- 一个 WSL2 Linux 发行版，推荐 Ubuntu

官方参考：

- Docker Desktop Windows 安装文档：<https://docs.docker.com/desktop/setup/install/windows-install/>
- Docker Desktop WSL2 后端文档：<https://docs.docker.com/desktop/features/wsl/>
- WSL2 中使用 Docker Desktop：<https://docs.docker.com/desktop/features/wsl/use-wsl/>

## 2. 安装 WSL2 Ubuntu

用管理员身份打开 PowerShell，执行：

```powershell
wsl --install -d Ubuntu
```

安装完成后重启电脑，然后打开 Ubuntu，按提示创建 Linux 用户名和密码。

检查 Ubuntu 是否是 WSL2：

```powershell
wsl -l -v
```

如果 Ubuntu 显示为 `VERSION 1`，改成 WSL2：

```powershell
wsl --set-version Ubuntu 2
```

## 3. 安装并配置 Docker Desktop

安装 Docker Desktop 后，打开 Docker Desktop，检查这些设置：

1. `Settings -> General`
2. 勾选 `Use the WSL 2 based engine`
3. `Settings -> Resources -> WSL Integration`
4. 打开 Ubuntu 对应的集成开关
5. 点击 `Apply & Restart`

然后打开 Ubuntu 终端，检查 Docker 是否可用：

```bash
docker version
docker compose version
```

如果 `docker version` 报无法连接 Docker daemon，先确认 Docker Desktop 正在运行，并且已经打开 Ubuntu 的 WSL Integration。

## 4. 在 WSL2 Ubuntu 中准备工具

进入 Ubuntu 终端，安装常用命令：

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
```

建议把部署目录放在 Linux home 目录下，例如 `~/roj_deploy`。

不要放在 `/mnt/c/...` 下面。Windows 文件系统路径会让 Docker bind mount 和大量小文件访问变慢，也更容易出现路径权限问题。

## 5. 下载并执行安装脚本

在 Ubuntu 终端中执行：

```bash
mkdir -p ~/roj_deploy
cd ~/roj_deploy
curl -L -o install.sh https://raw.githubusercontent.com/rainboyOJ/roj2/master/install.sh
chmod +x install.sh
./install.sh
```

安装过程中会询问 Docker 镜像加速方式：

```text
1) ghcr.nju.edu.cn
2) gh-proxy.org/docker
3) no proxy
```

通常直接回车选择默认的 `ghcr.nju.edu.cn`。如果镜像拉取一直卡住或报错，可以重新执行安装脚本，并选择其他加速方式或不使用代理。

安装成功后，部署目录大致如下：

```text
~/roj_deploy/
  install.sh
  judge_server_cpp/
  roj2/
  docker-compose.yaml
  .env
  judge_server_config.json
  judge_server_testData/
```

## 6. 访问 ROJ

安装完成后，在 Windows 浏览器中访问：

```text
http://127.0.0.1:3300/problems
```

默认账号：

```text
admin / admin123456
demo  / demo123456
```

`admin` 是管理员账号，`demo` 是普通测试账号。

## 7. 常用命令

以下命令都在 Ubuntu 终端的部署目录中执行：

```bash
cd ~/roj_deploy
```

查看容器：

```bash
docker ps -a
```

查看日志：

```bash
docker compose logs -f judge-server judge-dispatcher api-server
```

停止服务：

```bash
docker compose down
```

重新启动服务：

```bash
docker compose up -d
```

更新仓库、拉取新镜像并重启：

```bash
./install.sh update
```

清理容器和镜像：

```bash
./install.sh clear
```

`clear` 会询问是否删除 MongoDB 数据。默认不删除数据库数据。

## 8. 修改端口和配置

安装脚本会生成 `.env`：

```text
API_HOST_PORT=3300
JUDGE_SERVER_HOST_PORT=18000
JUDGE_SERVER_CONFIG_PATH=./judge_server_config.json
JUDGE_SERVER_TESTDATA_DIR=./judge_server_testData
```

如果 `3300` 端口被占用，可以修改 `.env`：

```text
API_HOST_PORT=3400
```

然后重启：

```bash
docker compose down
docker compose up -d
```

访问地址也随之变成：

```text
http://127.0.0.1:3400/problems
```

## 9. judge_server 配置和测试数据

部署目录中的文件会挂载到 `judge-server` 容器：

```text
judge_server_config.json -> /opt/boxtest/config/config.json
judge_server_testData/   -> /opt/boxtest/testData
```

题目测试数据目录格式：

```text
judge_server_testData/<pid>/data
```

修改 `judge_server_config.json` 或测试数据后，建议重启服务：

```bash
docker compose down
docker compose up -d
```

## 10. 常见问题

### 10.1 docker command not found

说明 Ubuntu 里没有连接到 Docker Desktop。

检查 Docker Desktop：

- Docker Desktop 是否正在运行
- 是否启用了 WSL2 backend
- 是否在 `Resources -> WSL Integration` 中启用了 Ubuntu

然后关闭并重新打开 Ubuntu 终端。

### 10.2 Cannot connect to the Docker daemon

通常是 Docker Desktop 没有启动，或者 WSL Integration 没打开。

先启动 Docker Desktop，等待左下角状态变成 Docker Engine running，再回到 Ubuntu 执行：

```bash
docker version
```

### 10.3 install.sh 出现 `$'\r': command not found`

说明脚本被 Windows 换行符污染了。进入 Ubuntu 后执行：

```bash
sed -i 's/\r$//' install.sh
chmod +x install.sh
./install.sh
```

### 10.4 挂载时报 not a directory

常见原因是 `judge_server_config.json` 被错误创建成目录，或者 `judge_server_testData` 不是目录。

检查：

```bash
cd ~/roj_deploy
ls -ld judge_server_config.json judge_server_testData
```

正确状态应该是：

```text
judge_server_config.json 是普通文件
judge_server_testData 是目录
```

如果是第一次安装，删除错误目录后重新执行：

```bash
./install.sh
```

### 10.5 浏览器打不开 127.0.0.1:3300

先检查容器状态：

```bash
docker ps -a
```

再看日志：

```bash
docker compose logs -f api-server judge-dispatcher judge-server
```

如果 `3300` 端口被占用，修改 `.env` 中的 `API_HOST_PORT`，然后重启服务。

### 10.6 镜像拉取很慢或卡住

重新运行安装脚本，换一个镜像加速方式：

```bash
./install.sh
```

如果默认的 `ghcr.nju.edu.cn` 不稳定，可以选择 `gh-proxy.org/docker` 或 `no proxy`。

## 11. 推荐使用习惯

- 部署目录放在 `~/roj_deploy` 这类 WSL2 Linux 路径中。
- 不要把项目放在 `/mnt/c/...` 下面运行。
- 所有 `docker compose` 命令都在 Ubuntu 终端中执行。
- Docker Desktop 负责提供 Docker Engine，不需要在 Ubuntu 里额外安装 Docker Engine。
- 修改 `.env`、`judge_server_config.json` 或测试数据后，使用 `docker compose down && docker compose up -d` 重启服务。
