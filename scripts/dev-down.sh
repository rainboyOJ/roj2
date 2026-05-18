#!/usr/bin/env bash

set -euo pipefail

MONGO_CONTAINER_NAME="${MONGO_CONTAINER_NAME:-roj-demo-mongo}"

kill_if_running() {
  local pattern=$1
  local pids

  pids="$(pgrep -f "$pattern" || true)"
  if [[ -n "$pids" ]]; then
    printf '%s\n' "$pids" | xargs kill
  fi
}

kill_if_running '/home/rainboy/mycode/boxtest-opencode-dev/build/judge_server'
kill_if_running 'node --experimental-strip-types ./apps/api-server/src/index.ts'
kill_if_running 'node --experimental-strip-types ./apps/judge-dispatcher/src/index.ts'

if docker ps -a --format '{{.Names}}' | grep -qx "$MONGO_CONTAINER_NAME"; then
  removal_output="$(docker rm -f "$MONGO_CONTAINER_NAME" 2>&1 >/dev/null || true)"
  if [[ -n "$removal_output" ]] && [[ "$removal_output" != *"removal of container ${MONGO_CONTAINER_NAME} is already in progress"* ]]; then
    printf '%s\n' "$removal_output" >&2
    exit 1
  fi
fi
