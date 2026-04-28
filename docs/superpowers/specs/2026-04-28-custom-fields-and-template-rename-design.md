# 自定义 Frontmatter 字段与模板改名

## 背景

当前 Smart Tagger 仅支持生成 `tags` 字段。用户希望在 frontmatter 中自动填充其他字段（如 `description`、`summary`），且不同用户的键名可能不同。同时，新建模板时自动命名为"模板 N"，无法修改名称。

## 需求概述

1. **自定义字段**：用户在提示词模板中用 `{{keyName: AI提示描述}}` 语法定义额外字段，AI 根据描述生成值并填入 frontmatter
2. **模板改名**：在设置面板中支持修改模板名称
3. **跳过逻辑重构**：`skipTaggedFiles` 布尔值 → `skipFields: string[]` 数组，支持按字段名配置跳过

## 设计方案：模板驱动

在用户提示词模板中用 `{{keyName: AI提示描述}}` 语法定义自定义字段。编辑模板即定义字段，无需额外配置 UI。

## 1. 模板语法与解析

### 语法规则

在用户提示词模板中，`{{keyName: 描述文字}}` 定义一个自定义字段。

区分规则：自定义字段名的特征是**包含冒号**，内置变量 `{{minTags}}`、`{{maxTags}}`、`{{existingTags}}`、`{{content}}` 不包含冒号，不参与字段解析。

### 解析流程

1. `renderPrompt` 先用正则扫描模板，提取所有 `{{keyName: description}}` 格式的占位符
2. 将匹配到的字段存为 `CustomField[]`（`{ key: string, prompt: string }`）
3. 替换占位符为空字符串
4. 内置变量照常替换

### 数据结构

```typescript
interface CustomField {
  key: string;    // frontmatter 键名，如 "description"
  prompt: string; // AI 提示描述，如 "用一到两句话概括文档的核心内容"
}
```

### 示例

模板：

```
请为以下文档内容生成合适的标签。标签数量：{{minTags}} 到 {{maxTags}} 个。

{{existingTags}}
{{description: 用一到两句话概括文档的核心内容}}
{{content}}
```

提取结果：`[{ key: "description", prompt: "用一到两句话概括文档的核心内容" }]`

## 2. 系统提示词动态调整与 AI 返回格式

### 无自定义字段（向后兼容）

系统提示词不变。AI 仍返回 `["标签1", "标签2"]` 数组。解析逻辑不变。

### 有自定义字段

系统提示词自动追加字段说明和 JSON schema：

```
你需要返回一个 JSON 对象，格式如下：
{
  "tags": ["标签1", "标签2", ...],
  "description": "文档概括描述",
  ...
}
各字段要求：
- tags: 标签列表（字符串数组）
- description: 用一到两句话概括文档的核心内容（字符串）
```

- `tags` 固定为字符串数组
- 其他字段固定为字符串
- AI 返回 JSON 对象

### 数据流

`renderPrompt` 返回 `{ system, user, customFields }`。`customFields` 传递给 AI client 的 `generateTags`，client 根据是否有自定义字段决定：
- 无自定义字段：系统提示词不变，AI 返回数组，用 `parseTagsFromResponse` 解析
- 有自定义字段：系统提示词追加 schema，AI 返回 JSON 对象，用 `parseResponse` 解析

### 解析逻辑

新增 `parseResponse(text: string, customFields: CustomField[])` 函数：
1. 先尝试从文本中提取 JSON 对象（正则匹配 `{...}`）
2. 如果是对象且包含 `tags` 字段 → 提取 `tags` 数组 + 遍历 `customFields` 提取各字段值（缺失字段设为空字符串）
3. 如果不是对象或解析失败 → 回退到现有 `parseTagsFromResponse`（纯数组解析）

保证向后兼容：旧模板无自定义字段时 customFields 为空，仍走数组解析路径。

### 返回类型变更

```typescript
interface GenerateResult {
  tags: string[];
  fields: Record<string, string>; // 自定义字段键值对，无自定义字段时为 {}
}
```

`AIClient.generateTags` 签名不变（仍接收 `content` + `options`），返回类型从 `string[]` 改为 `GenerateResult`。`PromptOptions` 不变。

## 3. Frontmatter 写入与跳过逻辑

### 写入逻辑

- `writeTags` 重命名为 `writeFields`
- 接收 `Record<string, unknown>` 对象
- `tags` 字段保持合并去重逻辑（数组合并）
- 其他自定义字段直接覆盖写入（字符串赋值）
- 底层仍使用 `app.fileManager.processFrontMatter`

### 跳过逻辑重构

- `skipTaggedFiles: boolean` → `skipFields: string[]`
- 默认值：`["tags"]`（等价于之前 `skipTaggedFiles: true`）
- 空数组 `[]` 表示不跳过任何字段
- 跳过判定：遍历 `skipFields` 列表，如果 frontmatter 中**所有**列出的字段都已存在，则跳过该文件

### 配置示例

- `["tags"]` — 仅检查 tags 是否存在
- `["tags", "description"]` — tags 和 description 都存在才跳过
- `[]` — 永不跳过

### 设置面板变更

- 移除"跳过已有标签的文档"开关
- 替换为"跳过已有字段"文本框，逗号分隔输入（如 `tags, description`）

## 4. 模板改名

### 当前问题

新建模板时自动命名为"模板 N"，无法修改。

### 设计

- 在设置面板的模板下拉框旁边新增文本输入框，显示当前模板名称
- 下拉框切换模板时，输入框自动同步为新模板名称
- 修改名称后，点击"保存当前修改"按钮时一起持久化
- 保存时检测名称是否变化，如果变了就执行 rename（删旧模板 + 创建新模板名），同时更新 `activePromptName`
- 旧名称与新名称相同时行为不变

## 涉及文件

| 文件 | 变更内容 |
|------|----------|
| `src/types.ts` | 新增 `CustomField`、`GenerateResult` 接口；`skipTaggedFiles` → `skipFields`；`DEFAULT_PROMPT_TEMPLATE` 调整 |
| `src/ai/prompts.ts` | `renderPrompt` 新增自定义字段提取逻辑；返回值增加 `customFields` |
| `src/ai/utils.ts` | 新增 `parseResponse` 统一解析函数（JSON 对象 + 数组回退） |
| `src/ai/openai-client.ts` | `generateTags` 返回类型改为 `GenerateResult`；根据 customFields 动态调整系统提示词 |
| `src/ai/ollama-client.ts` | 同上 |
| `src/tagger/frontmatter.ts` | `writeTags` → `writeFields`；`hasTags` → `shouldSkip` |
| `src/tagger/tagger.ts` | 适配新返回类型和写入逻辑 |
| `src/settings.ts` | 模板改名 UI；`skipFields` 文本框替换旧开关 |
| `src/main.ts` | 设置迁移逻辑（`skipTaggedFiles` → `skipFields`） |
