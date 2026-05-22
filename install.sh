#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-$(dirname "$ROOT_DIR")}"

JUDGE_SERVER_REPO_URL="${JUDGE_SERVER_REPO_URL:-https://github.com/rainboyOJ/judge_server_cpp.git}"
ROJ_REPO_URL="${ROJ_REPO_URL:-https://github.com/rainboyOJ/roj2.git}"

JUDGE_SERVER_DIR="${JUDGE_SERVER_DIR:-$WORKSPACE_DIR/boxtest-opencode-dev}"
ROJ_DIR="${ROJ_DIR:-$ROOT_DIR}"
IMAGE_NAME="${IMAGE_NAME:-roj-codex:local}"
UPDATE_REPOS="${UPDATE_REPOS:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

DOCKER_CMD=(docker)
COMPOSE_CMD=(docker compose)

log() {
  printf '[install] %s\n' "$*"
}

warn() {
  printf '[install] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[install] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

is_placeholder_url() {
  [[ -z "$1" || "$1" == TODO* || "$1" == "placeholder" ]]
}

setup_docker_commands() {
  require_command docker

  if docker info >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
  else
    warn "Docker needs sudo permission on this machine."
    log "Requesting sudo now so Docker commands can run."
    sudo -v
    DOCKER_CMD=(sudo docker)
    "${DOCKER_CMD[@]}" info >/dev/null
  fi

  if "${DOCKER_CMD[@]}" compose version >/dev/null 2>&1; then
    COMPOSE_CMD=("${DOCKER_CMD[@]}" compose)
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    if [[ "${DOCKER_CMD[0]}" == "sudo" ]]; then
      COMPOSE_CMD=(sudo docker-compose)
    else
      COMPOSE_CMD=(docker-compose)
    fi
    return
  fi

  fail "missing Docker Compose plugin or docker-compose binary"
}

pull_or_update_repo() {
  local name=$1
  local url=$2
  local dir=$3

  if [[ -d "$dir/.git" ]]; then
    if [[ "$UPDATE_REPOS" != "1" ]]; then
      log "using existing $name repo at $dir"
      return
    fi

    log "updating $name at $dir"
    if is_placeholder_url "$url"; then
      git -C "$dir" pull --ff-only
    else
      git -C "$dir" fetch "$url"
      git -C "$dir" merge --ff-only FETCH_HEAD
    fi
    return
  fi

  if [[ -d "$dir" ]]; then
    warn "$name directory exists but is not a git repo: $dir"
    return
  fi

  if is_placeholder_url "$url"; then
    warn "$name repo URL is not configured; skipping clone for $dir"
    return
  fi

  log "cloning $name into $dir"
  git clone "$url" "$dir"
}

ensure_files() {
  [[ -f "$ROJ_DIR/Dockerfile" ]] || fail "missing Dockerfile in $ROJ_DIR"
  [[ -f "$ROJ_DIR/docker-compose.yaml" ]] || fail "missing docker-compose.yaml in $ROJ_DIR"
}

ensure_judge_image() {
  if "${DOCKER_CMD[@]}" image inspect boxtest-judge-server:dev >/dev/null 2>&1; then
    log "using existing judge image: boxtest-judge-server:dev"
    return
  fi

  if [[ -f "$JUDGE_SERVER_DIR/Dockerfile" ]]; then
    log "building judge image from $JUDGE_SERVER_DIR"
    "${DOCKER_CMD[@]}" build -t boxtest-judge-server:dev "$JUDGE_SERVER_DIR"
    return
  fi

  fail "judge image boxtest-judge-server:dev not found, and no Dockerfile found in $JUDGE_SERVER_DIR"
}

main() {
  require_command git
  setup_docker_commands

  log "This installer may use sudo for Docker, depending on your local Docker permissions."
  pull_or_update_repo "judge_server" "$JUDGE_SERVER_REPO_URL" "$JUDGE_SERVER_DIR"
  pull_or_update_repo "roj_codex" "$ROJ_REPO_URL" "$ROJ_DIR"

  ensure_files
  ensure_judge_image

  if [[ "$SKIP_BUILD" == "1" ]]; then
    if ! "${DOCKER_CMD[@]}" image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
      fail "SKIP_BUILD=1 was set, but image $IMAGE_NAME does not exist"
    fi
    log "using existing image $IMAGE_NAME"
  else
    log "building $IMAGE_NAME"
    "${DOCKER_CMD[@]}" build -t "$IMAGE_NAME" "$ROJ_DIR"
  fi

  log "starting services with Docker Compose"
  (
    cd "$ROJ_DIR"
    if [[ "$SKIP_BUILD" == "1" ]]; then
      "${COMPOSE_CMD[@]}" up -d
    else
      "${COMPOSE_CMD[@]}" up -d --build
    fi
  )

  cat <<EOF
[install] done
[install] API: http://127.0.0.1:3000/problems
[install] Stop: ${COMPOSE_CMD[*]} down
EOF
}

main "$@"
