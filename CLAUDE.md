# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库工作时的指引。通用规则见：

@AGENTS.md

下文仅补充本项目专属信息。

---

## 项目概述

Obsidian Smart Tagger 是一个 Obsidian 插件，使用 AI（OpenAI 兼容 API 或 Ollama）为 Markdown 文档自动生成标签并写入 frontmatter。支持自定义 frontmatter 字段生成、模板管理、文件排除规则和思考模式。

## 常用命令

```bash
npm run dev        # 开发构建（含 inline sourcemap）
npm run build      # 生产构建（压缩、无 sourcemap）
npm run deploy     # build + 部署到本地 Obsidian 插件目录
npm test           # 运行 Jest 测试
npx jest __tests__/crypto.test.ts   # 运行单个测试文件
```

部署目标路径在 `scripts/deploy.mjs` 中配置。

## 架构

```
src/
├── main.ts              # 插件入口：加载设置、创建 AI 客户端、注册命令和右键菜单
├── types.ts             # 全局类型定义和默认值（AIClient 接口、SmartTaggerSettings、PromptTemplate）
├── settings.ts          # Obsidian 设置面板（SmartTaggerSettingTab）+ RuleEditModal 弹窗编辑器
├── crypto.ts            # API Key 加密（AES-GCM + PBKDF2，以 vault 路径为密钥材料）
├── logger.ts            # 统一日志输出（debug/warn/error，debug 受 debugMode 守卫）
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

## 关键约定

- **插件 id**：`onegayi-smart-tagger`（避免与社区插件 `smart-tagger` 冲突）。命令 id 前缀同为 `onegayi-smart-tagger:`。
- **不可改动**：`src/crypto.ts` 中的 `SALT` 常量（`smart-tagger-salt-v1`），改了会让所有已加密的 API Key 解密失败。
- **日志输出**：统一走 `Logger`（`src/logger.ts`），**禁止裸用 `console.log`**；默认 `debugMode: false` 以满足 Obsidian 社区审核规范（默认配置下控制台不得有 debug 输出，仅允许 error/warn）。`console.error`/`console.warn` 仅在 Logger 内部使用，业务代码调用 `logger.debug/warn/error`。
- **AI 客户端接口**：`AIClient`（`types.ts`）— 两个实现均遵循此接口，新增 AI 后端需实现 `generateTags` 和 `testConnection`
- **设置持久化**：API Key 加密存储（`crypto.ts`），其余设置明文 JSON
- **Obsidian API 限制**：使用 `requestUrl` 而非 `fetch`（Obsidian 环境兼容性）；`processFrontMatter` 用于原子性 frontmatter 修改
- **构建产物**：单文件 `main.js`（esbuild 打包，CJS 格式），外部化 obsidian/electron/codemirror
- **测试**：`__tests__/` 目录，ts-jest + Jest，无 DOM 环境（node 环境）
