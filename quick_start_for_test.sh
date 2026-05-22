#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JUDGE_SERVER_DIR="${JUDGE_SERVER_DIR:-/home/rainboy/mycode/boxtest-opencode-dev}"
JUDGE_SERVER_BIN="${JUDGE_SERVER_BIN:-$JUDGE_SERVER_DIR/build/judge_server}"
JUDGE_SERVER_CONFIG="${JUDGE_SERVER_CONFIG:-$JUDGE_SERVER_DIR/config/config.json}"

MONGO_CONTAINER_NAME="${MONGO_CONTAINER_NAME:-roj-test-mongo}"
MONGO_IMAGE="${MONGO_IMAGE:-mongo:7.0.34-jammy}"
MONGO_PORT="${MONGO_PORT:-27017}"

API_HOST="${API_HOST:-127.0.0.1}"
API_PORT="${API_PORT:-3000}"
API_URL="${API_URL:-http://${API_HOST}:${API_PORT}/problems}"

LOG_DIR="${LOG_DIR:-$ROOT_DIR/.quick-start-logs}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
ENV_EXAMPLE_FILE="$ROOT_DIR/.env.example"

PIDS=()
STARTED_MONGO_CONTAINER=0

log() {
  printf '[quick-start] %s\n' "$*"
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

cleanup() {
  local exit_code=$?

  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done

  if [[ "$STARTED_MONGO_CONTAINER" -eq 1 ]]; then
    docker rm -f "$MONGO_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

ensure_env_file() {
  [[ -f "$ENV_EXAMPLE_FILE" ]] || fail "missing .env.example in repository root"

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    log "created $ENV_FILE from .env.example"
  fi
}

load_env() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

ensure_files() {
  [[ -x "$JUDGE_SERVER_BIN" ]] || fail "judge_server binary not found or not executable: $JUDGE_SERVER_BIN"
  [[ -f "$JUDGE_SERVER_CONFIG" ]] || fail "judge_server config not found: $JUDGE_SERVER_CONFIG"
}

ensure_mongo() {
  if node -e "const net=require('net');const s=net.connect(${MONGO_PORT},'127.0.0.1');s.on('connect',()=>{s.end();process.exit(0);});s.on('error',()=>process.exit(1));" >/dev/null 2>&1; then
    log "using existing MongoDB on 127.0.0.1:${MONGO_PORT}"
    return 0
  fi

  if ! docker image inspect "$MONGO_IMAGE" >/dev/null 2>&1; then
    fail "MongoDB image $MONGO_IMAGE is not available locally"
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER_NAME"; then
    log "removing existing MongoDB container $MONGO_CONTAINER_NAME"
    docker rm -f "$MONGO_CONTAINER_NAME" >/dev/null
  fi

  log "starting MongoDB container $MONGO_CONTAINER_NAME from $MONGO_IMAGE"
  docker run -d --name "$MONGO_CONTAINER_NAME" -p "${MONGO_PORT}:27017" "$MONGO_IMAGE" >/dev/null
  STARTED_MONGO_CONTAINER=1
  wait_for_tcp 127.0.0.1 "$MONGO_PORT" "MongoDB"
}

start_processes() {
  mkdir -p "$LOG_DIR"

  log "running seed"
  (
    cd "$ROOT_DIR"
    npm run seed
  )

  log "starting judge_server"
  (
    cd "$JUDGE_SERVER_DIR/build"
    "$JUDGE_SERVER_BIN" "$JUDGE_SERVER_CONFIG"
  ) >"$LOG_DIR/judge-server.log" 2>&1 &
  PIDS+=("$!")
  wait_for_tcp "${JUDGE_SERVER_HOST:-127.0.0.1}" "${JUDGE_SERVER_PORT:-8000}" "judge_server"

  log "starting api-server"
  (
    cd "$ROOT_DIR"
    HOST="$API_HOST" PORT="$API_PORT" npm run dev:api
  ) >"$LOG_DIR/api-server.log" 2>&1 &
  PIDS+=("$!")
  wait_for_http "$API_URL" "api-server"

  log "starting judge-dispatcher"
  (
    cd "$ROOT_DIR"
    npm run dev:dispatcher
  ) >"$LOG_DIR/judge-dispatcher.log" 2>&1 &
  PIDS+=("$!")
}

print_summary() {
  cat <<EOF
[quick-start] stack is running
[quick-start] problems page: ${API_URL}
[quick-start] login: http://${API_HOST}:${API_PORT}/login
[quick-start] admin: admin / admin123456
[quick-start] demo: demo / demo123456
[quick-start] logs: ${LOG_DIR}
[quick-start] press Ctrl-C to stop api-server, dispatcher, judge_server, and the test MongoDB container
EOF
}

main() {
  require_command node
  require_command npm
  require_command curl
  require_command docker

  ensure_env_file
  load_env
  ensure_files
  ensure_mongo
  start_processes
  print_summary

  wait
}

main "$@"
