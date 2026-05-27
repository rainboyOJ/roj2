# 后续功能优化记录

## 高优先级

- [x] **1. 去除残留的 i18n 翻译层**

项目现在已经确定只保留中文，不再需要英文界面。但当前页面模板里仍然大量使用 `t('...')`，HTTP 渲染入口也还会注入 `createViewContext()`。

这个结构在多语言阶段是合理的，但现在会增加源码阅读和页面修改成本：

- 阅读 Pug 模板时不能直接看到最终中文文案。
- 修改一个页面文案时，需要在模板和 `view-i18n.ts` 之间来回跳转。
- 后续新增页面时，容易继续复制不必要的翻译 key。

后续建议：

- 删除 `apps/api-server/src/view-i18n.ts`。
- 在 Pug 模板中直接写中文文案。
- 删除 `createViewContext()` 注入逻辑。
- 保留 `assetUrl`、`currentUser`、`isAdminArea` 等真正需要的模板上下文。
- 更新相关测试，确保页面仍然渲染中文内容。

- [x] **2. 统一 HTML 表单错误处理**

当前 HTML 表单路由遇到错误时，很多地方直接返回纯文本，例如 `Invalid registration payload`、`Invalid problem payload`。

这个方式实现简单，但用户体验不够好：

- 用户会离开原页面，看到一行纯文本错误。
- 表单里已经填写的内容无法保留。
- 不同页面的错误展示方式不一致。

后续建议：

- 为登录、注册、个人资料、后台题目、后台语言设置、年级管理等表单统一错误显示方式。
- HTML 表单校验失败时优先回到原页面，并显示中文错误提示。
- API 路由继续返回 JSON，不和 HTML 页面混在一起。
- 前端校验只作为体验优化，后端仍然保留完整校验。

- [ ] **3. 明确删除用户的数据一致性策略**

当前删除用户时会删除 `users` 和 `sessions`，但该用户历史提交、题目进度等数据仍可能保留。

这会带来几个问题：

- 提交列表中可能还能看到已经不存在的用户数据。
- 用户题目进度表中可能留下孤立记录。
- 后续统计、排行榜、管理后台查询时，删除用户的语义不够清楚。

后续建议先确定删除策略：

- 如果用户已有提交，可以禁止硬删除，只允许禁用或软删除。
- 如果允许硬删除，需要明确是否级联删除 `sessions`、`user_problem_progress`。
- 历史 `submissions` 建议保留，因为它们属于评测记录；页面展示可继续使用提交里保存的 `username`、`displayName`。
- 后台删除操作需要给管理员明确提示，避免误删。

## 中优先级

- [ ] **4. 抽取管理后台表单解析逻辑**

当前 `apps/api-server/src/routes/admin.ts` 中，HTML 表单和 API 路由存在一些重复解析逻辑，例如题目表单、语言设置、年级表单。

这些重复代码短期可接受，但后台功能继续增加后会变得难维护：

- checkbox 字段需要反复处理 string / string[]。
- HTML 表单和 API 的 zod 校验入口不完全一致。
- 修改一个字段时，容易漏掉另一个路由分支。

后续建议：

- 抽取 `parseProblemFormBody()`。
- 抽取 `parseLanguageSettingsFormBody()`。
- 抽取 `parseGradeFormBody()`。
- HTML 路由和 API 路由尽量复用同一套 schema。
- 保持现有 URL 和行为不变，只做结构整理。

- [ ] **5. 静态资源路由整理为统一 manifest**

当前静态资源路由使用手写白名单 Map，`problem-editor.js` 又单独注册了一条路由。这个方式安全，但随着本地资源增多会越来越零散。

后续建议：

- 建立统一的 asset manifest，集中声明允许访问的资源和 content-type。
- 普通 JS/CSS、editor bundle、字体资源都走一致的路径校验和缓存策略。
- 保持本地资源白名单，不开放任意文件读取。
- 保留开发环境 `no-store`、生产环境版本号缓存的行为。

- [ ] **6. 为 `quick_start_for_test.sh` 增加自动化测试**

`quick_start_for_test.sh` 是本地调试 Docker 部署服务的重要入口，但当前测试主要覆盖 `install.sh` 和 dev 脚本，快速调试脚本还缺少自动化验证。

后续建议使用 fake `docker`、fake `curl`、fake `node` 或可控脚本环境覆盖这些场景：

- 缺少 `roj-mongodb` 容器时输出警告并退出。
- 缺少 `roj-judge-server` 容器时输出警告并退出。
- 存在 `roj-api-server` 和 `roj-judge-dispatcher` 时会先停止它们。
- 能从 `docker port` 识别 judge-server 映射端口。
- 脚本退出时默认恢复被停止的 Docker 容器。
- 设置 `RESTORE_DOCKER_SERVICES=0` 时不恢复容器。

- [x] **7. 默认题目 seed 改为扫描目录**

当前默认题目初始化固定读取 `packages/db/default_problems/1000`。但目录结构已经是 `default_problems/<pid>/`，天然支持多个默认题目。

后续建议：

- 启动 seed 时扫描 `packages/db/default_problems/` 下的所有题号目录。
- 每个目录读取 `metadata.json`、`content.md` 和可选的 `data/`。
- 数据库初始化时按目录批量 upsert 默认题目。
- `install.sh` 同步默认测试数据时也支持多个默认题目目录。
- 保持题目 `1000` 作为默认 smoke test 题目。

## 低优先级

- [ ] **8. 比赛功能占位实现**

当前比赛页面仍然是 placeholder 数据，只用于占位导航和页面结构。

后续如果短期不做比赛功能，建议在页面上明确显示“比赛功能暂未开放”。如果要正式支持比赛，需要单独设计 contest、contest problem、contest submission、contest ranklist 等数据模型。

- [ ] **9. 源码阅读文档同步**

部署文档已经同步过，但源码阅读文档中仍然有一些旧路径和旧模块痕迹，例如本机绝对路径、已经删除的旧视图辅助模块等。

后续建议：

- 更新 `docs/source-reading-guide.md` 中的阅读顺序。
- 避免写死 `/home/rainboy/mycode/roj_codex/...` 这类本机绝对路径。
- 删除或改写已经不再推荐阅读的旧模块。
- 增加当前路由拆分后的阅读入口，例如 `routes/`、`http/context.ts`、`packages/db/src/index.ts`。

- [ ] **10. 脚本和文档的一致性检查**

`install.sh`、`quick_start_for_test.sh`、GitHub smoke test、Docker Compose 和 README 都会继续变化。手工同步文档容易遗漏。

后续建议：

- 在测试中检查 README 和 `.env.example` 中的默认端口是否一致。
- 检查文档中提到的默认镜像名是否和 `.env.example` 一致。
- 检查文档中提到的脚本文件是否存在且可执行。
- 对重要部署文档增加最小的静态一致性测试，避免再次出现旧端口或旧镜像名。
