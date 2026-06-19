# Changelog

本文件记录 Obsidian Smart Tagger AI 的所有显著变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.2] - 2026-06-19

修复 Obsidian 社区审核反馈，统一设置面板标题写法、命令 id 规范与项目对外语言（英文为默认），并清理一批遗留的类型与测试问题。

### Bug 修复

- **设置面板标题**：6 处 `createEl("h2/h3")` 改为 `new Setting().setName().setHeading()`，符合 Obsidian 一致 UI 规范（审核 Error）
- **manifest description**：补全英文描述并以句点结尾（审核 Manifest Warning），改为「Automatically generate tags for your notes using AI and write them to frontmatter.」
- **README 改为英文默认**：`README.md` 升为英文版（社区目录以英文为主），中文版迁移至 `README.zh.md`，修正双向语言切换链接（审核 README Warning）
- **命令 id 去前缀**：`onegayi-smart-tagger:tag-current-file` 等改为 `tag-current-file`，Obsidian 会自动加插件 id 前缀防冲突，无需手动加（审核 Warning）

### 其他改进

- **类型错误清理**：`setIcon` 多传的 size 参数、`setWarning(true)` 改无参调用、`getBasePath` 用 `FileSystemAdapter` 窄化、`metadataCache.getTags()` 补类型断言，`tsc --noEmit` 现零错误
- **代码规范**：4 处 fire-and-forget 的 Promise 加 `void` 标记；删除 `settings.ts`/`tagger.ts` 未使用的 import；清理 `settings.ts` 中 4 处冗余的 `activeTemplate!` 断言
- **glob 正则**：文件排除匹配的占位符由 ASCII 控制字符（`\x01-\x04`）改为 Unicode 私用区字符（`\uE000-\uE003`），消除 `no-control-regex` 警告，匹配行为不变
- **测试修复**：`prompts.test.ts` 的测试模板补回遗漏的 `{{existingTags}}` 占位符，与真实默认模板结构对齐

## [1.1.1] - 2026-06-19

修复插件显示名与社区目录已有插件重名导致无法提交审核的问题。

### Bug 修复

- 插件显示名（`manifest.json` 的 `name`）由 `Smart Tagger` 改为 `Smart Tagger AI`，避免与社区目录中 Johan Denoyer 的同名插件冲突（社区平台同时校验 id 与 name 的唯一性）

### 其他改进

- 统一全项目品牌名为 `Smart Tagger AI`：通知前缀、右键菜单项、设置面板标题、README、i18n 字典均同步更新；日志前缀 `[Smart-Tagger]`、命令 id 前缀 `smart-tagger:` 等内部技术标识保持不变

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
[1.1.2]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/compare/v1.1.0...1.1.1
[1.1.0]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ONEGAYI/Obsidian-Smart-Tagger/releases/tag/v1.0.0
