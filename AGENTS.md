# Repository Guidelines

## Project Structure & Module Organization

This repository is a small handoff package for a new OJ project. The repository root is the working area.

- `README.md`: migration notes and onboarding order.
- `docs/oj-nodejs-ts-mongodb-plan.md`: architecture and product plan.
- `drivers/typescript/src/index.ts`: TypeScript judge driver source.
- `drivers/typescript/examples/`: runnable submit/poll examples.

Keep driver logic in `src/`, usage samples in `examples/`, and planning or migration notes in `docs/`.

## Build, Test, and Development Commands

Run these from `drivers/typescript/`.

- `npm install`: install local development dependencies.
- `npx tsc --noEmit`: type-check the driver with strict TypeScript settings.
- `npm run example:submit-and-wait`: open one TCP session, submit, and wait for the final result.
- `npm run example:submit-and-poll`: submit, then poll `query_result` until completion.
- `node --experimental-strip-types ./examples/submit-and-poll.ts`: direct Node 22 execution without a build step.

Examples assume a reachable `judge_server` on `127.0.0.1:8000`.

## Coding Style & Naming Conventions

Match the existing TypeScript style in [src/index.ts](/home/rainboy/mycode/roj_codex/drivers/typescript/src/index.ts):

- Use ES modules, `strict` typing, and explicit exported types.
- Keep 2-space indentation, trailing commas where present, and semicolons.
- Use `PascalCase` for classes, interfaces, and exported types.
- Use `camelCase` for functions and variables.
- Preserve protocol field names like `submission_id` and `case_results` exactly as sent by the server.

## Testing Guidelines

There is no formal test framework yet. Until one is added:

- Run `npx tsc --noEmit` before submitting changes.
- Exercise the relevant example under `examples/` when changing protocol or socket behavior.
- Add focused example coverage for new flows instead of ad hoc scripts.

If you introduce a test runner later, keep tests close to the driver and document the command here.

## Commit & Pull Request Guidelines

This repository has no commit history yet, so use a simple, consistent style:

- Write imperative commit subjects, for example `Add timeout handling to judge client`.
- Keep commits scoped to one concern.
- In PRs, include the purpose, changed paths, verification command output, and any required judge server setup.
- Include sample request/response snippets when changing the wire protocol or public driver API.


## 其他

你如果想要访问 judge_server ,它的代码在 /home/rainboy/mycode/boxtest-opencode-dev/ 我允许你访问这个目录

我已经下载了 docker pull mongodb/mongodb-community-server:latest, 你可以使用docker 的镜像 来运行 mongodb 
