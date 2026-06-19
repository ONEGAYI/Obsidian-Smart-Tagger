# Changelog

本文件记录 Obsidian Smart Tagger 的所有显著变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-06-19

新增中英双语界面与日志等级控制。界面文案随 Obsidian 语言自动切换；调试日志默认关闭以满足社区规范，可在设置中按需开启。

### 新功能

- **中英双语国际化（i18n）**：通知、设置面板、命令面板、右键菜单等所有界面文案随 Obsidian 语言自动切换（中文 / 英文），非中文环境回退英文
- **AI 标签输出语言变量**：提示词模板新增 `{{language}}` 变量，按当前语言注入「中文」/「English」，用户可在模板中引用以控制 AI 生成标签的语言；默认模板的标签语言规则已改用此变量
- **调试日志等级控制**：新增 `Logger`，调试日志默认关闭（满足 Obsidian 社区「默认配置下控制台不得有 debug 输出」规范），可在「设置 → 高级 → 调试模式」按需开启；错误与警告始终输出

### 其他改进

- 提示词模板引入稳定主键 `id`（默认模板为 `__default__`），模板匹配优先按 id、回退按 name，兼容老用户已保存的模板数据（升级时自动迁移补全 id）

## [1.0.0] - 2026-06-19

首个公开版本。使用 AI（OpenAI 兼容 API 或 Ollama）为 Obsidian 文档自动生成标签并写入 frontmatter，支持自定义字段、模板管理、文件排除和思考模式。

### 新功能

- **AI 标签生成**：一键为当前文件或整个文件夹生成标签，支持 OpenAI 兼容 API（ChatGPT、DeepSeek、智谱、Moonshot 等）与 Ollama 本地模型双模式
- **提示词模板管理**：支持多份模板的保存、切换与一键恢复默认
- **自定义 frontmatter 字段**：通过 `{{key: prompt}}` 语法让 AI 顺带生成摘要、标题等任意字段（如 `{{description: 用一句话概括}}`）
- **标签优先策略**：开启后优先从 vault 已有标签中选取，保持标签体系一致
- **文件排除规则**：采用 gitignore 风格通配符语法，自动跳过模板、日志等非正式文档
- **文件夹批量处理**：可配置递归深度，配合文件管理器右键菜单快速批处理
- **多重触发入口**：命令面板快捷调用 + 文件管理器右键菜单（单文件 / 文件夹）
- **API Key 加密存储**：采用 AES-GCM + PBKDF2 加密，以 vault 路径为密钥材料，密钥不明文落盘
- **思考模式（Thinking）**：支持开启模型的深度思考能力

### Bug 修复

- 修复插件 id 与社区插件 `smart-tagger`（作者 Johan Denoyer）重名导致的「第三方插件更新覆盖」问题，id 更改为 `onegayi-smart-tagger`

### 其他改进

- 文件排除规则统一为 gitignore 语法，设置界面改为弹窗多行编辑器，便于维护复杂规则

<!-- 变更链接 -->
[1.1.0]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/releases/tag/v1.0.0
