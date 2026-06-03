# ROJ 源码可维护性优化准绳

本文档记录一次从“可维护性 / 可读性 / 模块化”角度出发的源码审查结论。

后续优化应遵守以下约束：

- 不为了“漂亮”做大规模重写。
- 不改变现有业务语义。
- 不改变现有 URL 行为。
- 不引入新的框架。
- 优先复用当前项目已有模式。
- 每一项优化都要能通过测试验证。
- 优先选择低风险、高收益、容易测试的重构。

## 1. 总体评价

当前项目已经从“单功能 OJ 原型”演进成包含用户、题目、提交、题目单、后台配置、分页、导入脚本、Docker 部署等多个领域的系统。

整体分层是清晰的：

- `apps/api-server` 负责 HTTP / HTML 页面。
- `packages/db` 负责 MongoDB 数据访问。
- `packages/shared` 放共享类型。
- `scripts` 放导入、迁移、测试辅助脚本。

主要问题不是功能混乱，而是多轮提交后出现了几个复杂度聚集点：

- `packages/db/src/index.ts`：数据层大文件，约 1600 行。
- `apps/api-server/src/routes/admin.ts`：后台路由大文件，约 1200 行。
- `apps/api-server/test/views.test.ts`：页面测试大文件，约 1200 行。
- `apps/api-server/src/views/layout.pug`：布局和全局样式大文件，约 870 行。

这些文件承担了过多职责，是后续维护成本上升的主要来源。

## 2. 高优先级优化

### 2.1 拆分后台 admin 路由

- [x] 按领域拆分 `apps/api-server/src/routes/admin.ts`

涉及位置：

- `apps/api-server/src/routes/admin.ts`

问题：

`admin.ts` 同时处理管理员首页、用户审核、年级、班级、语言设置、分页设置、题目、题目单、提交列表，并且混合 HTML 路由和 JSON API 路由。

影响：

- 阅读时很难快速定位某个后台功能。
- 新增后台功能时容易继续堆到同一个文件。
- `requireHtmlAdmin`、`requireApiAdmin`、`safeParse`、错误渲染、重定向逻辑重复出现。

建议：

按领域拆分，例如：

- `routes/admin/users.ts`
- `routes/admin/problems.ts`
- `routes/admin/problem-sets.ts`
- `routes/admin/dictionaries.ts`
- `routes/admin/settings.ts`
- `routes/admin/submissions.ts`

要求：

- 所有现有 URL 保持不变。
- 只改变内部注册结构。
- 拆分时一组路由一组路由移动，避免一次性大改。

风险：

中低。主要风险是路由遗漏、注册顺序变化、权限检查遗漏。

推荐测试：

- 跑现有 admin 相关 view/API 测试。
- 补充每组后台页面的测试：
  - 已登录 admin 返回 200。
  - 未登录用户跳转登录。
  - 非 admin 用户被拒绝。
  - 表单错误返回原页面并显示错误提示。

### 2.2 提取后台表单解析、分页、错误处理 helper

- [x] 提取后台通用表单解析、分页解析、错误处理逻辑

涉及位置：

- `apps/api-server/src/routes/admin.ts`
- `apps/api-server/src/http/schemas.ts`
- `apps/api-server/src/http/form-errors.ts`
- `apps/api-server/src/assets/admin-*.js`

问题：

表单字段转换、checkbox 数组、布尔值、分页参数、zod 错误转中文提示、HTML 错误渲染、API 400 返回逻辑分散在多个地方。

影响：

- HTML 表单和 JSON API 的处理规则容易不一致。
- 修改一个错误提示或字段转换规则时，需要查找多个入口。
- `admin.ts` 可读性被大量重复样板代码拉低。

建议：

提取小型 helper，不引入新框架，例如：

- `parseCheckboxArray`
- `parseBooleanField`
- `sendValidationError`
- `renderAdminFormError`
- `parseAdminPaginationQuery`

要求：

- 先替换重复最多的用户审核、题目、设置表单。
- 不改变返回状态码和页面行为。
- 不改变现有 API 返回结构。

风险：

低。只要 helper 足够小，且保留现有测试，风险可控。

推荐测试：

- 给 helper 写单元测试。
- 保留现有路由测试，确认响应状态码、重定向和页面内容不变。

### 2.3 拆分 `packages/db/src/index.ts`

- [x] 逐步拆分 `packages/db/src/index.ts`

涉及位置：

- `packages/db/src/index.ts`

问题：

同一文件中包含 MongoDB 连接配置、默认题目初始化、密码、用户、班级、年级、题目、题目单、提交、评测租约、排行榜、用户进度、站点设置等逻辑。

影响：

- 数据层领域边界不清。
- 修改提交逻辑时需要在大文件中穿梭。
- 领域逻辑和 MongoDB 细节混在一起。
- 后续新增数据访问逻辑时容易继续扩大这个文件。

建议：

不要一次性重写。按低风险路径推进：

1. 先抽出纯函数和 seed/helper。
2. 再按领域逐步拆出：
   - `submissions`
   - `problems`
   - `users`
   - `settings`
   - `problem-sets`
   - `ranklist`

要求：

- `RojDb` 对外 API 尽量保持不变。
- 优先移动内部实现，不改调用方。
- 每次只拆一个领域。

风险：

中。涉及 DB 行为，需要测试覆盖。

推荐测试：

- 保留并运行现有 DB 相关测试。
- 增加针对以下逻辑的测试：
  - 提交计分。
  - 排行榜聚合。
  - 用户题目进度。
  - 默认题目初始化。
  - 评测租约更新。

## 3. 中优先级优化

### 3.1 拆分 `app.ts` 中的类型和服务接口

- [x] 将 ViewModel 和 `ApiServerServices` 从 `apps/api-server/src/app.ts` 移出

涉及位置：

- `apps/api-server/src/app.ts`

问题：

`app.ts` 同时定义服务接口、大量 ViewModel、分页 helper、Fastify 装配逻辑。

影响：

- 路由开发者需要读到很多无关类型。
- `ApiServerServices` 越来越大。
- 应用装配入口不够聚焦。

建议：

- 将 ViewModel 移到 `view-models.ts`。
- 将 `ApiServerServices` 移到 `services.ts` 或 `service-types.ts`。
- `app.ts` 只保留 Fastify app 组装和路由注册。

风险：

低到中。主要是 import 调整。

推荐测试：

- `npx tsc --noEmit`
- 现有 API/view 测试。

### 3.2 拆分 `index.ts` 中的 mapper 和 production service adapter

- [x] 将 DB 文档到 ViewModel 的 mapper 从 `apps/api-server/src/index.ts` 移出

涉及位置：

- `apps/api-server/src/index.ts`

问题：

入口文件同时承担：

- DB 到 ViewModel 的 mapper。
- production services 构造。
- 占位比赛数据。
- 应用启动入口。

影响：

入口文件既像 main，又像 service adapter，又像 mapper 文件。

建议：

- 将 `mapProblem`、`mapSubmission`、`mapSessionUser` 等移到 `services/mappers.ts`。
- 将占位 contest 数据移到独立模块。
- 保留 `buildProductionServices` 的对外行为。

风险：

低。

推荐测试：

- `npx tsc --noEmit`
- 提交列表、题目列表、题目单、排行榜页面测试。

### 3.3 将 `layout.pug` 中的大段 CSS 移到静态资源

- [x] 将 `apps/api-server/src/views/layout.pug` 中的大段 CSS 移到本地 CSS 文件

涉及位置：

- `apps/api-server/src/views/layout.pug`
- `apps/api-server/src/assets/`

问题：

`layout.pug` 同时承担基础 HTML、导航、全局样式、大量 CSS。

影响：

- 修改某个页面样式时容易影响全站。
- Pug 模板可读性下降。
- 样式无法独立检查和复用。

建议：

- 先把 CSS 移到本地静态资源，例如 `assets/site.css`。
- 保留现有 class 名不变。
- 后续再考虑拆出 nav/include。

风险：

中低。主要是视觉回归风险。

推荐测试：

- Playwright 查看首页、题目页、提交页、排行榜、后台页。
- 确认静态 CSS 资源可以正常访问。
- 确认导航栏、表格、按钮、card 直角风格不变。

### 3.4 拆分大型页面测试

- [x] 拆分 `apps/api-server/test/views.test.ts`

涉及位置：

- `apps/api-server/test/views.test.ts`

问题：

大量页面测试集中在一个文件中。

影响：

- 未来重构路由时，测试定位困难。
- 测试失败时不容易判断属于哪个页面领域。
- 单个测试文件越来越难阅读。

建议：

按领域拆分，例如：

- `auth-view.test.ts`
- `problem-view.test.ts`
- `submission-view.test.ts`
- `admin-view.test.ts`
- `problem-set-view.test.ts`
- `ranklist-view.test.ts`

要求：

- 拆分前后测试数量和断言不减少。
- 共享 fixture 继续放在 `test/helpers.ts`。

风险：

低。属于测试组织重构。

推荐测试：

- 跑完整测试。
- 对比拆分前后的测试覆盖点。

## 4. 低优先级优化

### 4.1 提取 Pug 页面中重复的表格、按钮、状态展示结构

- [x] 增加 Pug mixin，减少页面重复模板

涉及位置：

- `apps/api-server/src/views/*.pug`
- `apps/api-server/src/views/mixins/`

问题：

分页、刷新按钮、状态标签、后台列表 action 样式有重复。

影响：

- 样式统一成本高。
- 小样式修改容易漏页面。

建议：

继续扩展已有 mixin：

- `mixins/pagination.pug`
- `mixins/assets.pug`

可以新增：

- table header mixin
- action button mixin
- status chip mixin
- page toolbar mixin

风险：

低。

推荐测试：

- 页面 HTML 断言。
- Playwright 视觉检查。

### 4.2 整理 ROJ 题目导入脚本

- [x] 拆分 `scripts/import_roj_problems.ts`

涉及位置：

- `scripts/import_roj_problems.ts`
- `scripts/import_roj_problems.py`

问题：

交互输入、HTTP 登录、题目解析、数据同步、文件处理混在脚本里。

影响：

- 以后加导入功能时容易变成第二套业务逻辑。
- TS 和 Python 两个导入脚本可能存在职责重叠。

建议：

- 把 pid 范围解析抽成纯函数。
- 把 HTTP client 抽出来。
- 把 ROJ 题目解析抽出来。
- 把数据同步逻辑抽出来。
- 确认 Python 版本是否还需要保留。

风险：

低到中。

推荐测试：

- pid 解析单元测试。
- dry-run 模式。
- 小范围导入测试。

### 4.3 未来拆分 `packages/shared/src/index.ts`

- [x] 后续按领域拆分 `packages/shared/src/index.ts`

涉及位置：

- `packages/shared/src/index.ts`

问题：

共享类型目前都在一个入口文件中。

影响：

目前约 279 行，还不是严重问题。但继续增加领域类型后会变重。

建议：

暂时不优先处理。未来可以按领域拆分：

- `submission.ts`
- `problem.ts`
- `user.ts`
- `settings.ts`

再从 `index.ts` 统一 re-export。

风险：

低。

推荐测试：

- `npx tsc --noEmit`

## 5. 分阶段重构路线图

### 第一阶段：低风险、高收益，可快速完成

- [x] 拆分 `views.test.ts`，让后续重构有更清晰的测试保护网。
- [x] 提取后台表单解析、分页、错误返回 helper。
- [x] 把 `app.ts` 的 ViewModel / Service 类型移出。
- [x] 把 `index.ts` 的 mapper 移出。

目标：

- 不改变业务行为。
- 尽快降低阅读成本。
- 为后续拆分路由和 DB 打基础。

### 第二阶段：中等风险，需要更多测试覆盖

- [x] 按领域拆分 `routes/admin.ts`，保持 URL 完全不变。
- [x] 把 `layout.pug` 的 CSS 移到静态 CSS 文件。
- [x] 给后台列表、状态、按钮补 Pug mixin，减少重复模板。

目标：

- 降低后台功能之间的耦合。
- 降低页面模板维护成本。

### 第三阶段：长期结构优化

- [x] 分领域拆 `packages/db/src/index.ts`。
- [x] 逐步把 `ApiServerServices` 从大接口拆成领域服务。
- [x] 整理脚本模块，统一导入、迁移、smoke test 的 HTTP/DB helper。
- [x] 视情况拆分 `packages/shared/src/index.ts`。

目标：

- 清晰化数据层边界。
- 降低跨模块耦合。
- 支持后续功能持续演进。

## 6. 建议优先实施的前三项

### 第一项：拆分 `views.test.ts`

理由：

- 风险最低。
- 不影响业务代码。
- 能为后续重构提供更好的测试保护。
- 测试结构清楚以后，拆路由和 DB 都更安全。

### 第二项：提取后台表单 / 分页 / 错误处理 helper

理由：

- 改动小，收益直接。
- 能减少 `admin.ts` 中最明显的重复逻辑。
- 为拆分 admin 路由做准备。

### 第三项：拆分 `routes/admin.ts`

理由：

- 这是当前阅读成本最高的 HTTP 层文件。
- 拆分后，后台每个功能的入口会更清楚。
- 能降低继续增加后台功能时的耦合。

## 7. 执行原则

每次优化建议遵循以下流程：

1. 先确认当前测试是否通过。
2. 只选择一个小范围目标。
3. 保持 URL、API 返回结构、页面行为不变。
4. 修改后运行相关测试。
5. 如涉及页面样式，使用 Playwright 做视觉检查。
6. 提交时保持单一关注点。

## 8. 2026-06-03 新一轮可读性优化计划

经过多轮 AI 编程后，项目的新复杂度主要集中在后台 CRUD、筛选分页上下文、前端小脚本和服务类型文件。后续继续按“小步、可测试、不改变业务语义”的方式优化。

### 8.1 统一列表 query / return URL 构造

- [ ] 新增统一 query/path helper。
- [ ] 把 Pug 模板中的 `filterParts`、`currentPageSuffix`、`actionQuery` 尽量移到 route 层生成。
- [ ] 优先覆盖 `/problems`、`/submissions`、`/admin/users`、`/admin/problems`、`/admin/problem-sets`。
- [ ] 保持分页、筛选、刷新、编辑、发布、隐藏、删除后的 URL 行为不变。

### 8.2 抽取后台 HTML 表单动作模板逻辑

- [ ] 抽取后台 HTML 表单常见流程：权限检查、body 转换、zod 校验、错误渲染、service 调用、成功跳转。
- [ ] 优先处理重复度最高的题目和题目单 create/edit 流程。
- [ ] 不一次性套到所有后台路由，避免过度抽象。

### 8.3 统一后台确认弹窗与危险操作脚本

- [ ] 新增或整理统一 admin action 脚本。
- [ ] 统一处理 `data-confirm-message`、Notyf 错误提示、成功 reload/redirect。
- [ ] 去掉题目单页面中的内联 `onsubmit="return window.confirm(...)"`。
- [ ] 后续再评估是否迁移用户管理脚本中的确认逻辑。

### 8.4 拆小 `service-types.ts`

- [ ] 按领域拆分 Problem、Submission、User、Dictionary、Settings、Ranklist、Contest 类型。
- [ ] 保留 `service-types.ts` 作为 re-export 入口，先不强制所有调用方一次性改 import。
- [ ] 通过 `npm run typecheck` 保证拆分不改变接口。

### 8.5 拆分 production service adapter

- [ ] 将 `apps/api-server/src/services/production.ts` 按领域拆成 problems、submissions、users、settings 等 adapter。
- [ ] `buildProductionServices()` 只负责组合领域 service。
- [ ] 不改 DB 层，不改 `ApiServerServices` 对外行为。

### 8.6 推荐执行顺序

1. 统一 query/path helper。
2. 抽取题目和题目单后台表单流程。
3. 统一后台危险操作确认脚本。
4. 拆分 `service-types.ts`。
5. 拆分 `production.ts`。

每一阶段完成后运行：

- `npm run typecheck`
- `npm test`

每一阶段单独提交，避免大范围混合重构。
