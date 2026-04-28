# Smart-Tagger 设计文档

> Obsidian 插件，使用 AI 为文档自动生成标签并写入 frontmatter。

## 概述

Smart-Tagger 是一个 Obsidian 插件，支持通过 OpenAI 兼容 API 和 Ollama 原生 API 两种模式调用 AI 服务，为 Markdown 文档自动生成标签并写入 YAML frontmatter 的 `tags` 字段。

### 核心特性

- AI 标签生成（OpenAI API + Ollama 双模式）
- 可配置提示词模板（多份保存/切换/恢复默认）
- 标签优先策略（优先从 vault 已有标签中选取）
- 跳过已有标签的文档
- 文件夹批量处理（递归 + 可配置递归层数）
- 命令面板快捷调用
- 文件管理器右键菜单（单文件 + 文件夹）
- API Key 加密存储（AES-GCM）
- 气泡通知状态反馈

## 架构

### 模块化分层架构

```
src/
├── main.ts                # 插件入口，注册命令/菜单
├── settings.ts            # 设置面板 + 数据结构
├── crypto.ts              # API Key AES-GCM 加解密
├── ai/
│   ├── client.ts          # AIClient 接口定义
│   ├── openai-client.ts   # OpenAI 兼容客户端
│   ├── ollama-client.ts   # Ollama 原生客户端
│   └── prompts.ts         # 提示词模板管理
├── tagger/
│   ├── tagger.ts          # 核心标签生成流程
│   ├── frontmatter.ts     # frontmatter 读写操作
│   └── vault-tags.ts      # vault 标签收集与缓存
└── ui/
    └── notice.ts          # 通知封装
```

## 插件入口（main.ts）

### 生命周期

```
onload()
  → loadSettings()
  → initAIClient()
  → registerCommands()
  → registerFileMenu()
  → addSettingTab()

onunload()
  → 清理资源
```

### 注册命令（Command Palette）

| 命令 ID | 名称 | 作用 |
|---------|------|------|
| `smart-tagger:tag-current-file` | Smart Tagger: 为当前文件生成标签 | 对当前活跃文件调用标签生成 |
| `smart-tagger:tag-current-folder` | Smart Tagger: 为当前文件夹所有文件生成标签 | 对当前文件所在文件夹批量生成 |

### 右键菜单

使用 `app.workspace.on('file-menu', callback)` 事件注册：

- **单文件**：右键菜单项 "为该文件生成标签"
- **文件夹**：右键菜单项 "为该文件夹生成标签"（递归深度取设置值）

通过回调的 `file` 参数判断是 `TFile` 还是 `TFolder`，分别注册不同菜单项。

## AI 客户端层

### 接口抽象（ai/client.ts）

```typescript
interface AIClient {
  generateTags(content: string, options: PromptOptions): Promise<string[]>
}

interface PromptOptions {
  existingTags: string[]    // vault 中已有的标签列表
  preferExisting: boolean   // 是否优先已有标签
  minTags: number           // 最小标签数
  maxTags: number           // 最大标签数
}
```

### OpenAI 兼容客户端（ai/openai-client.ts）

- 使用 `requestUrl`（Obsidian 内置 HTTP 客户端，避免 CORS 问题）
- 配置项：`baseUrl`、`apiKey`（加密存储）、`model`
- 调用 `POST {baseUrl}/v1/chat/completions`
- AI 响应要求返回 JSON 数组格式的标签列表

### Ollama 客户端（ai/ollama-client.ts）

- 同样使用 `requestUrl`
- 配置项：`baseUrl`（默认 `http://localhost:11434`）、`model`
- 调用 `POST {baseUrl}/api/chat`
- 无需 API Key

### 提示词管理（ai/prompts.ts）

```typescript
interface PromptTemplate {
  name: string       // 模板名称
  system: string     // 系统提示词
  user: string       // 用户提示词模板，支持变量插值
}
```

- 内置一套默认模板，设置面板可"一键恢复默认"
- 用户可创建/保存多份模板，通过下拉菜单切换
- 动态注入逻辑：
  - `preferExisting` 开启 → 在 user prompt 中追加 vault 已有标签列表
  - 标签数量范围 → 注入为硬约束

## 设置面板

### 设置数据结构（settings.ts）

```typescript
interface SmartTaggerSettings {
  // AI 服务配置
  aiMode: 'openai' | 'ollama'

  // OpenAI 配置
  openaiBaseUrl: string      // 默认 "https://api.openai.com"
  openaiApiKey: string       // 加密存储
  openaiModel: string        // 默认 "gpt-4o-mini"

  // Ollama 配置
  ollamaBaseUrl: string      // 默认 "http://localhost:11434"
  ollamaModel: string        // 默认 "llama3"

  // 标签生成策略
  minTags: number            // 默认 3
  maxTags: number            // 默认 8
  preferExistingTags: boolean // 默认 true
  skipTaggedFiles: boolean   // 默认 true

  // 文件夹批处理
  maxRecursiveDepth: number  // 默认 1（仅直接子文件）

  // 提示词
  promptTemplates: PromptTemplate[]
  activePromptName: string   // 当前使用的模板名称

  // 调试
  debugMode: boolean         // 默认 false
}
```

### 设置面板 UI（PluginSettingTab）

分三个区域：

**1. AI 服务连接区**
- 单选切换 OpenAI / Ollama 模式
- 根据当前模式动态显示对应配置项（baseUrl、model、API Key）
- "测试连接"按钮 → 发送简单请求验证服务可用性

**2. 标签策略区**
- 最小/最大标签数：数字输入
- "优先已有标签"开关 + 说明文字
- "跳过已有标签的文档"开关
- 文件夹递归深度：数字输入

**3. 提示词管理区**
- 下拉菜单选择当前模板
- 文本框编辑 system prompt 和 user prompt
- "保存为新模板" / "删除当前模板" / "恢复默认模板"按钮
- 变量提示：`{{existingTags}}`、`{{minTags}}`、`{{maxTags}}`

### API Key 加密（crypto.ts）

- 使用 AES-GCM 加密（Web Crypto API，Electron 环境原生支持）
- 密钥派生：基于 vault 路径 + 固定 salt 通过 PBKDF2 派生
- 存储格式：`{iv: string, ciphertext: string}` base64 编码存入 data.json
- 对设置层透明：读取时解密，写入时加密

## 标签生成核心逻辑

### Tagger 主流程（tagger/tagger.ts）

**单文件处理：**

```
generateTagsForFile(file: TFile):
  1. 读取文件内容
  2. 检查 frontmatter 是否已有标签
     → 如果 skipTaggedFiles 开启且已有标签，跳过
  3. 收集 vault 所有已有标签（使用缓存）
  4. 截取正文（去掉 frontmatter）发送给 AI 客户端
  5. AI 返回标签数组
  6. 写入 frontmatter tags 字段
  7. Notice 提示成功 + 标签列表
```

**文件夹批量处理：**

```
generateTagsForFolder(folder: TFolder):
  1. 根据 maxRecursiveDepth 收集目标文件列表（仅 .md）
  2. 过滤：skipTaggedFiles 开启则排除已有标签的文件
  3. 逐个调用 generateTagsForFile（串行执行）
  4. 每处理完一个文件发 Notice 显示进度
  5. 完成后汇总：成功 N 个，跳过 M 个，失败 K 个
```

### Frontmatter 操作（tagger/frontmatter.ts）

- 使用 `app.fileManager.processFrontMatter()` API
- 标签写入逻辑：已有 tags 字段则合并去重，没有则创建

### Vault 标签收集（tagger/vault-tags.ts）

- 使用 `app.metadataCache.getTags()` 获取所有标签及出现次数
- 结果缓存，每次生成标签后刷新

### 正文截取策略

- 发送给 AI 的内容：去掉 frontmatter 后的纯正文
- 长度限制：可配置最大字符数（默认取 AI 模型上下文窗口的 60%）
- 超长文档截取前 N 个字符 + 提示"文档已截断"

## 通知系统

### 通知场景

| 场景 | 通知内容 | 持续时间 |
|------|----------|----------|
| 单文件成功 | `Smart Tagger: 已添加标签 标签1, 标签2, 标签3` | 3s |
| 单文件跳过 | `Smart Tagger: 已跳过（已有标签）` | 2s |
| 文件夹完成 | `Smart Tagger: 完成！成功 7，跳过 2，失败 1` | 5s |
| AI 服务错误 | `Smart Tagger: AI 服务请求失败 - 具体错误信息` | 5s |
| 连接测试成功 | `Smart Tagger: 连接测试成功` | 2s |

### 错误处理层级

| 错误类型 | 处理方式 |
|----------|----------|
| 网络错误（超时、拒绝连接） | Notice 提示 + 控制台日志，批处理跳过当前文件继续 |
| AI 响应解析失败 | Notice 提示原始响应，批处理跳过当前文件 |
| API Key 认证失败（401） | Notice 提示"API Key 无效"，终止批处理 |
| 文件写入失败 | Notice 提示具体错误，批处理跳过 |

### 并发控制

- 文件夹批处理串行执行，不并行请求 AI
- 通过 `isProcessing` 标志位防止重复触发
- 锁定期间再次触发 → Notice 提示"正在处理中，请稍候"

### 日志

- 统一前缀 `[Smart-Tagger]`
- `debugMode` 开启时记录完整 AI 请求/响应
- 生产模式仅记录错误级别

## 文件清单

```
Smart-Tagger/
├── manifest.json              # 插件元数据
├── styles.css                 # 设置面板样式
├── esbuild.config.mjs         # 打包配置
├── package.json
├── tsconfig.json
├── versions.json              # Obsidian 版本兼容
└── src/
    ├── main.ts                # 插件入口
    ├── settings.ts            # 设置面板 + 数据结构
    ├── crypto.ts              # API Key 加解密
    ├── ai/
    │   ├── client.ts          # 接口定义
    │   ├── openai-client.ts   # OpenAI 兼容客户端
    │   ├── ollama-client.ts   # Ollama 客户端
    │   └── prompts.ts         # 提示词管理
    ├── tagger/
    │   ├── tagger.ts          # 核心标签生成
    │   ├── frontmatter.ts     # frontmatter 操作
    │   └── vault-tags.ts      # vault 标签收集
    └── ui/
        └── notice.ts          # 通知封装
```
