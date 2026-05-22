#!/usr/bin/env bash
#===============================================================================
# 快速启动脚本 —— 在本机以开发模式一键拉起全部服务，用于本地测试
#
# 启动流程：
#  1. 检查依赖命令 (node/npm/curl/docker)
#  2. 准备 .env 环境变量文件
#  3. 确保 MongoDB 可用（复用已有实例，否则启动一个 Docker 容器）
#  4. 运行 seed 写入初始数据
#  5. 依次启动 judge_server → api-server → judge-dispatcher
#  6. 打印访问地址和账号信息
#  7. 等待前台，Ctrl-C 停止所有后台进程并清理容器
#
# 环境变量（均可选，有默认值）：
#  JUDGE_SERVER_DIR     评测机源码目录
#  JUDGE_SERVER_BIN     评测机可执行文件路径
#  JUDGE_SERVER_CONFIG  评测机配置文件路径
#  MONGO_IMAGE          MongoDB Docker 镜像名
#  MONGO_CONTAINER_NAME MongoDB 容器名
#  MONGO_PORT           MongoDB 端口
#  API_HOST / API_PORT  API 服务监听地址，API_HOST 默认 0.0.0.0
#  API_PUBLIC_HOST      打印访问地址时使用的主机名或 IP，默认 127.0.0.1
#  DEBUG_JUDGE          是否输出评测链路 [DEBUG] 日志，默认 1
#  LOG_DIR              日志输出目录
#===============================================================================

set -euo pipefail

# ---- 路径配置 ----
# 脚本所在目录（仓库根目录）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 评测机 (judge_server) 相关路径
JUDGE_SERVER_DIR="${JUDGE_SERVER_DIR:-/home/rainboy/mycode/boxtest-opencode-dev}"
JUDGE_SERVER_BIN="${JUDGE_SERVER_BIN:-$JUDGE_SERVER_DIR/build/judge_server}"
JUDGE_SERVER_CONFIG="${JUDGE_SERVER_CONFIG:-$JUDGE_SERVER_DIR/config/config_for_test.json}"

# ---- MongoDB 配置 ----
MONGO_CONTAINER_NAME="${MONGO_CONTAINER_NAME:-roj-test-mongo}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:7.0.34-jammy}"
MONGO_PORT="${MONGO_PORT:-27017}"

# ---- API 服务配置 ----
API_HOST="${API_HOST:-0.0.0.0}"
API_PORT="${API_PORT:-3000}"
API_PUBLIC_HOST="${API_PUBLIC_HOST:-127.0.0.1}"
API_URL="${API_URL:-http://${API_PUBLIC_HOST}:${API_PORT}/problems}"

# ---- 日志与环境变量 ----
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.quick-start-logs}"   # 各服务的 stdout/stderr 重定向到这里
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"               # 运行时环境变量文件
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"             # 环境变量模板

# ---- 运行时状态 ----
PIDS=()                         # 记录后台启动的进程 PID，退出时逐一 kill
STARTED_MONGO_CONTAINER=0       # 标记：是否由本脚本启动了 Mongo 容器（退出时需要清理）

#-------------------------------------------------------------------------------
# 工具函数
#-------------------------------------------------------------------------------

log() {
  printf '[quick-start] %s\n' "$*"
}

fail() {
  printf '[quick-start] ERROR: %s\n' "$*" >&2
  exit 1
}

# 检查命令是否存在于 PATH 中
require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

# 轮询等待 TCP 端口可用
# 参数：host port label [timeout_seconds]
wait_for_tcp() {
  local host=$1
  local port=$2
  local label=$3
  local timeout_seconds=${4:-30}
  local i

  for ((i = 0; i < timeout_seconds * 10; i += 1)); do
    # 用 node 内建 net 模块尝试连接，成功则返回 0
    if node -e "const net=require('net');const s=net.connect(${port},'${host}');s.on('connect',()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
      log "$label is ready on ${host}:${port}"
      return 0
    fi
    sleep 0.1
  done

  fail "timed out waiting for $label on ${host}:${port}"
}

# 轮询等待 HTTP 接口可访问
# 参数：url label [timeout_seconds]
wait_for_http() {
  local url=$1
  local label=$2
  local timeout_seconds=${3:-30}
  local i

  for ((i = 0; i < timeout_seconds * 2; i += 1)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "$label is ready at $url"
      return 0
    fi
    sleep 0.5
  done

  fail "timed out waiting for $label at $url"
}

#-------------------------------------------------------------------------------
# 清理 & 信号处理
#-------------------------------------------------------------------------------

cleanup() {
  local exit_code=$?

  # 杀掉脚本启动的所有后台子进程
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done

  # 如果是本脚本创建的 Mongo 容器，也一并删除
  if [[ "$STARTED_MONGO_CONTAINER" -eq 1 ]]; then
    docker rm -f "$MONGO_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

# 注册退出信号：脚本退出 / Ctrl-C / 被 kill 时都会执行 cleanup
trap cleanup EXIT INT TERM

#-------------------------------------------------------------------------------
# 环境准备
#-------------------------------------------------------------------------------

# 确保 .env 文件存在：没有则从 .env.example 复制一份
ensure_env_file() {
  [[ -f "$ENV_EXAMPLE_FILE" ]] || fail "missing .env.example in repository root"

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    log "created $ENV_FILE from .env.example"
  fi
}

# 加载 .env 中的变量到当前 shell 环境
load_env() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

# 检查关键文件是否存在
ensure_files() {
  [[ -x "$JUDGE_SERVER_BIN" ]] || fail "judge_server binary not found or not executable: $JUDGE_SERVER_BIN"
  [[ -f "$JUDGE_SERVER_CONFIG" ]] || fail "judge_server config not found: $JUDGE_SERVER_CONFIG"
}

#-------------------------------------------------------------------------------
# MongoDB 启动
#-------------------------------------------------------------------------------

ensure_mongo() {
  # 先尝试连接 127.0.0.1:27017，如果能连上说明已有 Mongo 在运行，直接复用
  if node -e "const net=require('net');const s=net.connect(${MONGO_PORT},'127.0.0.1');s.on('connect',()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
    log "using existing MongoDB on 127.0.0.1:${MONGO_PORT}"
    return 0
  fi

  # 没有可用的 Mongo，用 Docker 起一个容器
  if ! docker image inspect "$MONGO_IMAGE" >/dev/null 2>&1; then
    fail "MongoDB image $MONGO_IMAGE is not available locally"
  fi

  # 如果之前有同名容器残留，先删掉
  if docker ps -a --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER_NAME"; then
    log "removing existing MongoDB container $MONGO_CONTAINER_NAME"
    docker rm -f "$MONGO_CONTAINER_NAME" >/dev/null
  fi

  log "starting MongoDB container $MONGO_CONTAINER_NAME from $MONGO_IMAGE"
  docker run -d --name "$MONGO_CONTAINER_NAME" -p "${MONGO_PORT}:27017" "$MONGO_IMAGE" >/dev/null
  STARTED_MONGO_CONTAINER=1   # 标记：退出时需要清理
  wait_for_tcp 127.0.0.1 "$MONGO_PORT" "MongoDB"
}

#-------------------------------------------------------------------------------
# 启动业务进程
#-------------------------------------------------------------------------------

start_processes() {
  mkdir -p "$LOG_DIR"

  # 1. 写入初始种子数据（题目、用户等）
  log "running seed"
  (
    cd "$ROOT_DIR"
    npm run seed
  )

  # 2. 启动 C++ 评测机（TCP 端口 8000）
  log "starting judge_server"
  (
    cd "$JUDGE_SERVER_DIR/build"
    "$JUDGE_SERVER_BIN" "$JUDGE_SERVER_CONFIG"
  ) >"$LOG_DIR/judge-server.log" 2>&1 &
  PIDS+=("$!")
  wait_for_tcp "${JUDGE_SERVER_HOST:-127.0.0.1}" "${JUDGE_SERVER_PORT:-8000}" "judge_server"

  # 3. 启动 API 服务（Fastify，端口 3000）
  log "starting api-server"
  (
    cd "$ROOT_DIR"
    HOST="$API_HOST" PORT="$API_PORT" npm run dev:api
  ) >"$LOG_DIR/api-server.log" 2>&1 &
  PIDS+=("$!")
  wait_for_http "$API_URL" "api-server"

  # 4. 启动判题调度器（从 MongoDB 拉取提交，分发给评测机）
  log "starting judge-dispatcher"
  (
    cd "$ROOT_DIR"
    npm run dev:dispatcher
  ) >"$LOG_DIR/judge-dispatcher.log" 2>&1 &
  PIDS+=("$!")
}

#-------------------------------------------------------------------------------
# 启动后信息提示
#-------------------------------------------------------------------------------

print_summary() {
  cat <<EOF
[quick-start] stack is running
[quick-start] api-server listen: ${API_HOST}:${API_PORT}
[quick-start] problems page: ${API_URL}
[quick-start] login: http://${API_PUBLIC_HOST}:${API_PORT}/login
[quick-start] LAN login: http://<this-machine-LAN-IP>:${API_PORT}/login
[quick-start] admin: admin / admin123456
[quick-start] demo: demo / demo123456
[quick-start] logs: ${LOG_DIR}
[quick-start] press Ctrl-C to stop api-server, dispatcher, judge_server, and the test MongoDB container
EOF
}

#-------------------------------------------------------------------------------
# 主流程
#-------------------------------------------------------------------------------

main() {
  # 前置检查
  require_command node
  require_command npm
  require_command curl
  require_command docker

  ensure_env_file    # 准备 .env
  load_env           # 加载环境变量
  export DEBUG_JUDGE="${DEBUG_JUDGE:-1}"
  ensure_files       # 检查评测机文件
  ensure_mongo       # 确保 MongoDB 可用
  start_processes    # 依次启动所有服务
  print_summary      # 打印访问信息

  wait               # 阻塞等待，直到 Ctrl-C 或子进程退出
}

main "$@"
