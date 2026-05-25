#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_CONTAINER_NAME="${API_CONTAINER_NAME:-roj-api-server}"
DISPATCHER_CONTAINER_NAME="${DISPATCHER_CONTAINER_NAME:-roj-judge-dispatcher}"
JUDGE_SERVER_CONTAINER_NAME="${JUDGE_SERVER_CONTAINER_NAME:-roj-judge-server}"
MONGO_CONTAINER_NAME="${MONGO_CONTAINER_NAME:-roj-mongodb}"
API_HOST="${API_HOST:-0.0.0.0}"
API_PORT="${API_PORT:-3300}"
API_PUBLIC_HOST="${API_PUBLIC_HOST:-127.0.0.1}"
API_URL="${API_URL:-http://${API_PUBLIC_HOST}:${API_PORT}/problems}"
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}"
MONGODB_DB="${MONGODB_DB:-roj_demo}"
JUDGE_SERVER_HOST="${JUDGE_SERVER_HOST:-127.0.0.1}"
JUDGE_SERVER_PORT="${JUDGE_SERVER_PORT:-8000}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.quick-start-logs}"
RESTORE_DOCKER_SERVICES="${RESTORE_DOCKER_SERVICES:-1}"

PIDS=()
STOPPED_CONTAINERS=()

log() {
  printf '[quick-start] %s\n' "$*"
}

warn() {
  printf '[quick-start] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[quick-start] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

wait_for_tcp() {
  local host=$1
  local port=$2
  local label=$3
  local timeout_seconds=${4:-30}
  local i

  for ((i = 0; i < timeout_seconds * 10; i += 1)); do
    if node -e "const net=require('net');const s=net.connect(${port},'${host}');s.on('connect',()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
      log "$label is ready on ${host}:${port}"
      return 0
    fi
    sleep 0.1
  done

  fail "timed out waiting for $label on ${host}:${port}"
}

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

docker_container_exists() {
  local name=$1
  docker ps -a --format '{{.Names}}' | grep -qx "$name"
}

docker_container_running() {
  local name=$1
  docker ps --format '{{.Names}}' | grep -qx "$name"
}

stop_docker_container() {
  local name=$1
  if docker_container_running "$name"; then
    log "stopping docker container: $name"
    docker stop "$name" >/dev/null
    STOPPED_CONTAINERS+=("$name")
  fi
}

restore_docker_services() {
  if [[ "$RESTORE_DOCKER_SERVICES" != "1" ]]; then
    return 0
  fi

  for ((i = ${#STOPPED_CONTAINERS[@]} - 1; i >= 0; i -= 1)); do
    local name=${STOPPED_CONTAINERS[$i]}
    if docker_container_exists "$name"; then
      log "restoring docker container: $name"
      docker start "$name" >/dev/null 2>&1 || true
    fi
  done
}

cleanup() {
  local exit_code=$?

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done

  restore_docker_services
  exit "$exit_code"
}

trap cleanup EXIT INT TERM

ensure_required_containers() {
  if ! docker_container_running "$MONGO_CONTAINER_NAME"; then
    warn "missing required running container: $MONGO_CONTAINER_NAME"
    exit 1
  fi

  if ! docker_container_running "$JUDGE_SERVER_CONTAINER_NAME"; then
    warn "missing required running container: $JUDGE_SERVER_CONTAINER_NAME"
    exit 1
  fi
}

detect_judge_server_port() {
  local port_mapping

  port_mapping="$(docker port "$JUDGE_SERVER_CONTAINER_NAME" 8000/tcp 2>/dev/null | head -n 1 || true)"
  if [[ -z "$port_mapping" ]]; then
    warn "$JUDGE_SERVER_CONTAINER_NAME does not publish 8000/tcp to the host"
    warn "publish judge-server port first, then rerun this script"
    exit 1
  fi

  JUDGE_SERVER_HOST=127.0.0.1
  JUDGE_SERVER_PORT="${port_mapping##*:}"
  export JUDGE_SERVER_HOST JUDGE_SERVER_PORT
  log "judge-server is reachable at ${JUDGE_SERVER_HOST}:${JUDGE_SERVER_PORT}"
}

start_local_services() {
  mkdir -p "$LOG_DIR"

  log "starting local judge-dispatcher"
  (
    cd "$ROOT_DIR"
    MONGODB_URI="$MONGODB_URI" \
      MONGODB_DB="$MONGODB_DB" \
      JUDGE_SERVER_HOST="$JUDGE_SERVER_HOST" \
      JUDGE_SERVER_PORT="$JUDGE_SERVER_PORT" \
      npm run dev:dispatcher
  ) >"$LOG_DIR/judge-dispatcher.log" 2>&1 &
  PIDS+=("$!")

  log "starting local api-server"
  (
    cd "$ROOT_DIR"
    HOST="$API_HOST" \
      PORT="$API_PORT" \
      MONGODB_URI="$MONGODB_URI" \
      MONGODB_DB="$MONGODB_DB" \
      npm run dev:api
  ) >"$LOG_DIR/api-server.log" 2>&1 &
  PIDS+=("$!")

  wait_for_http "$API_URL" "api-server"
}

print_summary() {
  cat <<EOF
[quick-start] stack is running
[quick-start] url: $API_URL
[quick-start] docker containers kept running:
[quick-start]   - $MONGO_CONTAINER_NAME
[quick-start]   - $JUDGE_SERVER_CONTAINER_NAME
[quick-start] local processes:
[quick-start]   - api-server
[quick-start]   - judge-dispatcher
[quick-start] logs:
[quick-start]   - $LOG_DIR/api-server.log
[quick-start]   - $LOG_DIR/judge-dispatcher.log
[quick-start] press Ctrl-C to stop local processes
EOF
}

main() {
  require_command node
  require_command npm
  require_command curl
  require_command docker

  stop_docker_container "$API_CONTAINER_NAME"
  stop_docker_container "$DISPATCHER_CONTAINER_NAME"

  ensure_required_containers
  detect_judge_server_port
  wait_for_tcp "$JUDGE_SERVER_HOST" "$JUDGE_SERVER_PORT" "judge-server"
  wait_for_tcp 127.0.0.1 27017 "MongoDB"

  start_local_services
  print_summary

  wait
}

main "$@"
