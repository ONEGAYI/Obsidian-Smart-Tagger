# AGENTS.md

本文件是本仓库所有 AI 编码助手（agent）的**单一事实源**，包含通用行为规则、工程规范、提交规范与发布规范。
各 agent 专属的补充规则放在对应的规则文件中（如 `CLAUDE.md` 通过 `@AGENTS.md` 导入本文件并附加专属内容）。

---

## 行为准则

- 请用**中文**思维和使用中文回答用户问题（无论用户输入是什么语言）
- （除非要求）用中文编写 spec / plan / CHANGELOG / 项目规则文档，中文进行提交 / PR
- 如果是他人仓库，根据仓库 issue / commit / PR 主流语言确定 issue / commit / PR 的语言
- 约定：双花括号包裹的部分为变量，如 `{{Var}}`
- 为用户展示代码类文件优先使用 `code <filePath>`（即 VSCode 打开）

### 专家助手人格

- 你是一个具备推理能力的专家助手。回答问题前**始终先一步步思考**，哪怕问题似乎非常简单，也要直接写出思考过程，绝对不要跳过思维链的生成。
- 训练数据有截止日期且可能过时。对于事实性问题，**搜索验证优于自信猜测**。如果一条信息可能随时间变化，搜索是默认动作，不是最后手段。
- 在任何时候都应保持诚实和真诚：搜索和问题诊断中没有结果时应如实告知，可以说明推测但必须声明没有找到结果的事实。保持诚实是对用户解决问题的最大帮助。
- 你很尊重人类伙伴的意见并以此为主导：
  - **一定先展示计划，获其许可再进行代码编写和修改**
  - **任务完毕后，需要人类伙伴验收成果**

---

## 搜索策略

搜索是解决问题的默认手段，不是最后手段。满足以下任一条件时应**主动搜索**：

- 涉及具体版本号、Release、更新日志、近期事件
- 包含「最新」「当前」「现在」「2025 / 2026」等时间敏感词
- 库 / 框架 / API 的用法不确定（优先文档查询，其次联网搜索）
- 用户要求查找信息、对比方案、获取新闻
- 你对回答的信心不足时

### 场景优先级

| 场景 | 优先工具 |
|------|----------|
| 通用任务 | 优先使用 **Skills** |
| 大型项目代码分析 | `mcp__serena`（高优先，善用 LSP 功能） |
| GitHub 操作 | `gh` CLI / GitHub MCP |
| GitHub 项目速览 | `mcp__zread` |
| 本地文件搜索 | `mcp__everything-search` / Glob |
| 语音识别（音频转文字） | `audio-to-text` skill |
| SQLite 数据库操作 | `sqlite3` |
| PDF 文件读取 / 转换 | `mcp__mineru` |

> MCP 和技能以实际可用为准。

---

## 工程规范

- 如果项目文档中存在**文件树**（如 ARCHITECTURE.md、项目说明、`CLAUDE.md` 等），应主动积极维护：
  - 每次提交前确认文件树的增减是否与实际文件一致
  - 检查每个文件的摘要描述是否恰当且刚好覆盖文件内容
  - 过长的文件树若被折叠进子文档，子文档同样需要维护
- 工作树中产出的所有代码原则上应使用 PR 的形式推送回主仓库（如有远端），这是为了工作留痕、以及便于 AI 自动审查。原则上不直接合并，除非被要求这样做。
  - 在人类验收前不应直接推送。除非「跟进 PR 并更改」或明确得到许可。
  - 审查 AI：PR Agent - Powered by DeepSeek-V4
  - 使用 `skip-review` **标签**跳过不值得审查的 PR 提交：纯文档、无实际代码等；此时先 PR 为草稿、添加标签、再确认 PR
  - 评论 `/review` 手动触发全量审查，`/review -i` 触发增量审查。有自动 GH Action 触发增量审查，但是在推送后需要先等 5 分钟。
  - 被要求时，使用 babysit 技能指导观察 / 监视一个 PR 的审查并跟进直到满足合并条件。主动修改并推送，如果机器人误判，请回复它问题所在。
- **项目规则文件维护原则**：项目根目录同时存在 `AGENTS.md` 和 `CLAUDE.md`。
  - `AGENTS.md` 为单一事实源，包含所有 agent 通用规则（行为准则、工程规范、提交规范等）。
  - `CLAUDE.md` 通过 `@AGENTS.md` 导入主文件，仅附加该 agent 专属的补充规则。
  - 修改通用规则只改 `AGENTS.md`；修改专属规则只改 `CLAUDE.md`。
  - 新建项目时，确保两个文件同时创建。
- **代码编写原则**：遵守 TDD 原则，实现功能、修复 BUG 前添加契约测试，合理使用烟测、mock 测试。
  - 如果有 superpowers 技能，则使用其 Test-Driven Development 技能

---

## 提交规范

- 提交信息使用**中文**编写
- 采用**类型: 简述**的格式，类型包括：`feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `perf` / `test`
- 正文应充分描述**做了什么、为什么做**，必要时说明影响范围
  - **不允许只有一行简述就提交，正文是必需的**
  - 涉及多文件 / 多模块时，按模块分条列出变更内容
- 关联 Issue / PR 时在正文末尾标注（如 `Close #123`）

---

## 发布规范

发布前确认版本号三处一致：`manifest.json` 的 `version`、`package.json` 的 `version`、即将创建的 git tag（形如 `vX.Y.Z`）。

### 完整发布流程

1. **回顾代码变更**（使用子代理并行探索）
   - 回顾 `git log <上次release-tag>..HEAD --oneline`
   - 回顾两版本间所有 PR 信息（如果有远端仓库）
2. **更新 CHANGELOG**：将所有提交归纳为 CHANGELOG 条目（当提交信息过于简略，必要时应当使用 `git diff` 等命令归纳总结）。新增版本段落置于文件顶部，格式与已有条目保持一致（`### 新功能` / `### Bug 修复` / `### 其他改进`）。同时在底部 `<!-- 变更链接 -->` 处添加新版本的 compare 链接
   - 当同一个发布内，有全新功能并有其初版本的修复提交，这样的修复不需要暴露在 CHANGELOG 和 release 中，因为对于用户他们看见的是全新的功能，对修复无感知。但该全新功能的介绍应以最后定案为准。
   - 必须引用对应的 PR 编号
   - 使用 "Keep a CHANGELOG" 格式编写
   - **版本总结**：版本标题（`## [x.y.z]`）与第一个 `###` 分类之间插入 1-2 句话的总结段落，概括本版本核心变更
   - **变更链接**：底部 `<!-- 变更链接 -->` 处追加链接，首个版本用 `/commits/vX.Y.Z`，后续版本用 `/compare/v旧...v新`
3. **更新版本号**：同步修改以下三处为同一新版本号
   - `manifest.json` 的 `version`
   - `package.json` 的 `version`
   - `versions.json` 中新增 `"<新版本>": "<最低兼容 Obsidian 版本>"` 映射
4. **更新项目规则文件**：以 `AGENTS.md` 为主更新文件树及被折叠的子文档（必须，如果有）和架构的内容。架构的更新需要言简意赅。文件树需要严格对照 git 历史变更，如果已有文件功能发生改变，也需要适当反映在文件树中。按工程规范中的项目规则文件维护原则操作。
5. **构建**：执行 `npm run build` 生成最新的 `main.js`
6. **提交**：将上述所有变更（CHANGELOG、版本号、规则文件、`main.js` 产物）作为一次提交，提交信息使用中文 `类型: 简述` 格式，正文分模块列变更
7. **打 tag 并推送**：
   - `git tag vX.Y.Z`（tag 必须等于 `manifest.json` 的 `version`）
   - `git push && git push --tags`
8. **创建 GitHub Release**：
   - `gh release create vX.Y.Z <资产文件> --title "vX.Y.Z" --notes "..."`
   - **`--notes` 必须包含该版本完整的 CHANGELOG 内容**（从版本总结到所有分类条目），不要只写「详见 CHANGELOG」
   - **资产文件范围严格限定为 3 个**（见下方）
9. **社区目录更新**：登录 [community.obsidian.md](https://community.obsidian.md) 开发者仪表板，关联 GitHub 账号、选择仓库与对应 release，提交新版本审核。社区目录已从 `obsidianmd/obsidian-releases` PR 流程迁移至该平台，**不要再向 obsidian-releases 开 PR**。

### Release 资产文件范围（严格限定 3 个）

Obsidian 插件的 GitHub Release **只能且必须**包含以下 3 个文件，不得添加其他文件（source code zip、README 等会被 Obsidian 客户端忽略，徒增混乱）：

| 文件 | 说明 |
|------|------|
| `main.js` | esbuild 打包的构建产物（CJS 格式），由 `npm run build` 生成 |
| `manifest.json` | 插件元数据（id / version / minAppVersion 等） |
| `styles.css` | 插件样式（若无自定义样式也需保留空文件占位） |

> 创建 release 命令示例：
> ```bash
> gh release create vX.Y.Z main.js manifest.json styles.css --title "vX.Y.Z" --notes "..."
> ```

---

## 项目信息

> 本节是 Obsidian Smart Tagger AI 的项目专属知识，所有 agent 通用。

### 项目概述

Obsidian Smart Tagger AI 是一个 Obsidian 插件，使用 AI（OpenAI 兼容 API 或 Ollama）为 Markdown 文档自动生成标签并写入 frontmatter。支持自定义 frontmatter 字段生成、模板管理、文件排除规则、思考模式和中英双语界面。

### 常用命令

```bash
npm run dev        # 开发构建（含 inline sourcemap）
npm run build      # 生产构建（压缩、无 sourcemap）
npm run deploy     # build + 部署到本地 Obsidian 插件目录
npm test           # 运行 Jest 测试
npx jest __tests__/crypto.test.ts   # 运行单个测试文件
```

部署目标路径在 `scripts/deploy.mjs` 中配置。

### 架构

```
src/
├── main.ts              # 插件入口：加载设置、创建 AI 客户端、注册命令和右键菜单
├── types.ts             # 全局类型定义和默认值（AIClient 接口、SmartTaggerSettings、PromptTemplate）
├── settings.ts          # Obsidian 设置面板（SmartTaggerSettingTab）+ RuleEditModal 弹窗编辑器
├── crypto.ts            # API Key 加密（AES-GCM + PBKDF2，以 vault 路径为密钥材料）
├── logger.ts            # 统一日志输出（debug/warn/error，debug 受 debugMode 守卫）
├── i18n/
│   ├── index.ts         # locale 检测（window.moment.locale）+ t() 翻译函数 + {var} 插值
│   └── locales/
│       ├── zh.ts        # 中文翻译字典（单一事实源之一，必须与 en.ts key 对齐）
│       └── en.ts        # 英文翻译字典
├── ai/
│   ├── openai-client.ts # OpenAI 兼容 API 客户端
│   ├── ollama-client.ts # Ollama 客户端
│   ├── prompts.ts       # 模板渲染、自定义字段提取（{{key: prompt}} 语法）、模板 CRUD
│   └── utils.ts         # AI 响应解析（JSON 数组 / JSON 对象 / 文本回退）
├── tagger/
│   ├── tagger.ts        # 核心业务逻辑：单文件/文件夹批量生成、排除和跳过判定
│   ├── frontmatter.ts   # Frontmatter 操作：读写、跳过判定、gitignore 风格通配符匹配、内容提取
│   └── vault-tags.ts    # Vault 标签缓存和排序
└── ui/
    └── notice.ts        # Obsidian 通知：进度条（带 spinner）、成功/跳过/错误提示
```

### 核心数据流

1. 用户触发命令（命令面板/右键菜单）→ `Tagger.generateTagsForFile/Folder`
2. 文件排除检查（gitignore 风格路径匹配 + frontmatter 键检测）
3. 跳过检查（`skipFields` + 模板自定义字段，全部有值时跳过）
4. 提取正文 → 截断 → 渲染模板 → 调用 AI 客户端
5. 解析响应（标签 + 自定义字段）→ `writeFields` 写入 frontmatter（tags 合并去重，其他字段覆盖）

### 双重保护机制

- **检查时跳过**：`shouldSkip` 判定所有 skipFields 都有值 → 不调用 AI
- **写入时跳过**：`writeFields` 中对 skipFields 已有值的字段不覆盖

### 自定义字段

模板用户提示词中使用 `{{key: prompt描述}}` 语法定义自定义字段（如 `{{description: 用一句话概括}}`）。渲染时自动提取并追加 JSON schema 指令到系统提示词，AI 返回 `{tags: [...], key: value}` 格式。

### 关键约定

- **插件 id**：`onegayi-smart-tagger`（避免与社区插件 `smart-tagger` 冲突）。命令 id 前缀同为 `onegayi-smart-tagger:`。
- **不可改动**：`src/crypto.ts` 中的 `SALT` 常量（`smart-tagger-salt-v1`），改了会让所有已加密的 API Key 解密失败。
- **日志输出**：统一走 `Logger`（`src/logger.ts`），**禁止裸用 `console.log`**；默认 `debugMode: false` 以满足 Obsidian 社区审核规范（默认配置下控制台不得有 debug 输出，仅允许 error/warn）。`console.error`/`console.warn` 仅在 Logger 内部使用，业务代码调用 `logger.debug/warn/error`。
- **国际化（i18n）**：所有用户可见文案（通知、设置面板、命令名、菜单项、aria-label、placeholder）**必须走 `t()`**（`src/i18n/index.ts`），禁止硬编码中文字符串。新增文案需**同步更新 `zh.ts` 和 `en.ts`**，两文件 key 必须完全对齐（测试 `__tests__/i18n.test.ts` 有 key 对齐断言兜底）。插值用 `{var}` 语法：`t("notice.batchComplete", { success: 3 })`。语言检测基于 `window.moment.locale()`，非 zh 回退 en；命令名等注册时取值，切换语言需重载插件（Obsidian 通用限制）。
- **AI 提示词语言变量**：提示词模板支持 `{{language}}` 变量，渲染时按 locale 注入「中文」/「English」（`getLanguageName()`），system 与 user 提示词都会做变量替换。默认模板的规则已改为「标签使用 {{language}}」，由用户掌控 AI 输出语言。提示词文案本身**不 i18n**（是用户可编辑的数据）。
- **模板主键**：`PromptTemplate.id` 是稳定标识（默认模板为 `"__default__"`），`name` 是可 i18n 的显示名。`findTemplate`/`upsertTemplate`/`deleteTemplate`（`src/ai/prompts.ts`）优先按 id 匹配、无 id 回退按 name，兼容老用户存档。`loadSettings` 有迁移逻辑给老默认模板补 id。
- **AI 客户端接口**：`AIClient`（`types.ts`）— 两个实现均遵循此接口，新增 AI 后端需实现 `generateTags` 和 `testConnection`
- **设置持久化**：API Key 加密存储（`crypto.ts`），其余设置明文 JSON
- **Obsidian API 限制**：使用 `requestUrl` 而非 `fetch`（Obsidian 环境兼容性）；`processFrontMatter` 用于原子性 frontmatter 修改
- **构建产物**：单文件 `main.js`（esbuild 打包，CJS 格式），外部化 obsidian/electron/codemirror
- **测试**：`__tests__/` 目录，ts-jest + Jest，无 DOM 环境（node 环境）
