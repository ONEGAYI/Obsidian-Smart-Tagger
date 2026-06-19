**English** | [中文](./README.md)

# Obsidian Smart Tagger

> 使用 AI 为 Obsidian 文档自动生成标签，并写入 frontmatter 的轻量插件。支持 OpenAI 兼容 API 与 Ollama 双模式。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.10.0+-7C3AED.svg)](https://obsidian.md)

<!-- screenshot -->

## 特性

- 🏷️ **AI 自动打标签** — 一键为当前文档或整个文件夹生成标签，写入 frontmatter 的 `tags` 字段
- 🤖 **双 AI 后端** — 支持 OpenAI 兼容 API（ChatGPT、DeepSeek、智谱、Moonshot 等）和 Ollama 本地模型
- 📋 **提示词模板管理** — 多份模板保存、切换、一键恢复默认
- 🎯 **标签优先策略** — 优先从 vault 已有标签中选取，保持标签体系一致
- 🧩 **自定义 frontmatter 字段** — 用 `{{key: prompt}}` 语法让 AI 顺带生成摘要、标题等任意字段
- 🚫 **灵活的文件排除** — gitignore 风格通配符，自动跳过模板、日志等非正式文档
- 📁 **文件夹批量处理** — 可配置递归深度，配合右键菜单快速批处理
- 🔒 **API Key 加密存储** — AES-GCM + PBKDF2 加密，以 vault 路径为密钥材料
- 🧠 **思考模式（Thinking）** — 支持开启模型的深度思考能力

## 安装

### 方式一：社区插件市场（推荐）

> 插件已提交 Obsidian 社区目录，审核通过后可通过「设置 → 第三方插件 → 社区插件市场」搜索 **Smart Tagger** 安装。

### 方式二：手动安装

1. 从 [Releases](https://github.com/ONEGAYI/Obsidian-Smart-Tagger/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 vault 中创建目录 `.obsidian/plugins/onegayi-smart-tagger/`
3. 将三个文件放入该目录
4. Obsidian 中「设置 → 第三方插件」关闭再开启「社区插件」，启用 **Smart Tagger**

### 方式三：BRAT（灰度测试）

使用 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat) 添加本仓库 `ONEGAYI/Obsidian-Smart-Tagger`，可获取未上架社区目录的预发布版本。

## 快速开始

1. **配置 AI 后端** — 打开插件设置，选择 OpenAI 兼容或 Ollama 模式，填入 API 地址、密钥、模型名
2. **选择提示词模板** — 使用默认模板，或在设置中自定义系统提示词与用户提示词
3. **生成标签** — 任选其一：
   - 命令面板（`Ctrl/Cmd + P`）执行「Smart Tagger: 为当前文件生成标签」
   - 文件管理器中右键文件 →「为该文件生成标签」
   - 右键文件夹 →「为该文件夹生成标签」（批量）

标签会自动合并去重写入 frontmatter，已存在的标签不会被覆盖。

## 配置说明

| 配置项 | 说明 |
|--------|------|
| **AI 模式** | OpenAI 兼容 / Ollama 二选一 |
| **API Base URL** | OpenAI 兼容模式下的接口地址，如 `https://api.openai.com/v1` |
| **API Key** | 加密存储，不会明文写入配置文件 |
| **模型名** | 如 `gpt-4o-mini`、`deepseek-chat`、`llama3` 等 |
| **标签数量** | 每次生成的标签数量范围（如 3-5） |
| **标签优先** | 开启后优先从 vault 已有标签中选取 |
| **跳过字段（skipFields）** | 当这些 frontmatter 字段都已有值时跳过该文件，不调用 AI |
| **文件排除规则** | gitignore 风格路径匹配规则，匹配的文件不处理 |
| **思考模式** | 开启后启用支持模型的 thinking 能力 |
| **递归深度** | 文件夹批量时的子目录递归层数 |

### 自定义字段语法

在模板的用户提示词中使用 `{{key: prompt描述}}` 即可让 AI 额外生成该字段。例如：

```
请为以下文档生成标签。
{{description: 用一句话概括文档主旨}}
{{title: 给出一个简洁有力的标题}}
```

AI 会返回 `{tags: [...], description: "...", title: "..."}`，插件自动写入对应 frontmatter 字段（`tags` 合并去重，其余字段覆盖）。

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 开发构建（含 inline sourcemap）
npm run build        # 生产构建（压缩、无 sourcemap）
npm run deploy       # build + 部署到本地 Obsidian 插件目录
npm test             # 运行 Jest 测试
```

部署目标路径在 `scripts/deploy.mjs` 中配置。构建产物为单文件 `main.js`（esbuild 打包，CJS 格式）。

## 许可证

[MIT](./LICENSE) © ONEGAYI

## 致谢

- [Obsidian](https://obsidian.md) — 提供优秀的知识管理平台
- 所有支持 OpenAI 兼容 API 与 Ollama 的模型提供方
