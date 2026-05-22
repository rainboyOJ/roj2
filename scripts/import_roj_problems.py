#!/usr/bin/env python3
"""Import ROJ problem statements into the OJ through the admin HTTP API."""

from __future__ import annotations

import getpass
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener
from http.cookiejar import CookieJar


DEFAULT_OJ_URL = "http://127.0.0.1:3000"
DEFAULT_ROJ_ROOT = "/home/rainboy/mycode/problems/roj"


@dataclass
class ProblemPayload:
    pid: str
    title: str
    statementMarkdown: str
    allowLanguages: list[str]
    isVisible: bool


class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/") + "/"
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
    ) -> Any:
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(
            urljoin(self.base_url, path.lstrip("/")),
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with self.opener.open(request) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"{method} {path} failed with HTTP {error.code}: {detail}",
            ) from error
        except URLError as error:
            raise RuntimeError(f"{method} {path} failed: {error.reason}") from error

        if not raw:
            return None
        return json.loads(raw)

    def login(self, username: str, password: str) -> None:
        self.request(
            "POST",
            "/api/login",
            {
                "username": username,
                "password": password,
            },
        )

    def list_admin_problems(self) -> list[dict[str, Any]]:
        result = self.request("GET", "/api/admin/problems")
        return result.get("problems", [])

    def create_problem(self, payload: ProblemPayload) -> Any:
        return self.request("POST", "/api/admin/problems", payload.__dict__)

    def update_problem(self, problem_id: str, payload: ProblemPayload) -> Any:
        return self.request("PUT", f"/api/admin/problems/{problem_id}", payload.__dict__)


def ask(prompt: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    if value:
        return value
    if default is not None:
        return default
    return ""


def parse_problem_ids(raw: str) -> list[str]:
    problem_ids: set[int] = set()
    for part in re.split(r"[\s,，]+", raw.strip()):
        if not part:
            continue

        match = re.fullmatch(r"(\d+)\s*[-~]\s*(\d+)", part)
        if match:
            start = int(match.group(1))
            end = int(match.group(2))
            if start > end:
                start, end = end, start
            problem_ids.update(range(start, end + 1))
            continue

        if re.fullmatch(r"\d+", part):
            problem_ids.add(int(part))
            continue

        raise ValueError(f"invalid problem id expression: {part}")

    return [str(pid) for pid in sorted(problem_ids)]


def read_problem_payload(roj_root: Path, pid: str) -> ProblemPayload:
    problem_dir = roj_root / pid
    config_path = problem_dir / "config.json"
    statement_path = problem_dir / "content.md"

    if not problem_dir.is_dir():
        raise FileNotFoundError(f"problem directory not found: {problem_dir}")
    if not config_path.is_file():
        raise FileNotFoundError(f"config.json not found: {config_path}")
    if not statement_path.is_file():
        raise FileNotFoundError(f"content.md not found: {statement_path}")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    title = str(config.get("title") or f"ROJ {pid}")
    statement = statement_path.read_text(encoding="utf-8")
    if not statement.strip():
        raise ValueError(f"content.md is empty: {statement_path}")

    return ProblemPayload(
        pid=pid,
        title=title,
        statementMarkdown=statement,
        allowLanguages=["cpp", "python"],
        isVisible=True,
    )


def main() -> int:
    oj_url = ask("OJ URL", DEFAULT_OJ_URL)
    username = ask("admin username")
    password = getpass.getpass("admin password: ")
    roj_root = Path(ask("ROJ problems root", DEFAULT_ROJ_ROOT)).expanduser()
    raw_ids = ask("problem ids, for example 1000 or 1000-1009")

    try:
        problem_ids = parse_problem_ids(raw_ids)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    if not problem_ids:
        print("error: no problem ids selected", file=sys.stderr)
        return 1

    client = ApiClient(oj_url)
    try:
        client.login(username, password)
        existing = {
            str(problem["pid"]): str(problem["id"])
            for problem in client.list_admin_problems()
        }
    except RuntimeError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    created_count = 0
    updated_count = 0
    failed_count = 0

    for pid in problem_ids:
        try:
            payload = read_problem_payload(roj_root, pid)
            if pid in existing:
                client.update_problem(existing[pid], payload)
                updated_count += 1
                action = "updated"
            else:
                result = client.create_problem(payload)
                existing[pid] = str(result["problemId"])
                created_count += 1
                action = "created"

            print(f"{action}: {pid} {payload.title}")
        except (FileNotFoundError, ValueError, RuntimeError, KeyError) as error:
            failed_count += 1
            print(f"failed: {pid} {error}", file=sys.stderr)

    print(
        f"done: created={created_count} updated={updated_count} failed={failed_count}",
    )
    return 1 if failed_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
