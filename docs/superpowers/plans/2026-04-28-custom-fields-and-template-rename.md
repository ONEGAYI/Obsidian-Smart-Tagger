# 自定义 Frontmatter 字段与模板改名 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持用户在提示词模板中定义自定义 frontmatter 字段（如 description），AI 生成值后写入文档；同时支持模板改名和跳过逻辑重构。

**Architecture:** 模板驱动方案。`renderPrompt` 从模板中提取 `{{key: prompt}}` 语法的自定义字段，动态构建系统提示词引导 AI 返回 JSON 对象。解析后通过 `writeFields` 写入 frontmatter。跳过逻辑从布尔值重构为字段名数组。

**Tech Stack:** TypeScript, Obsidian API, OpenAI/Ollama 兼容 API

---

## 文件变更清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/types.ts` | 修改 | 新增 `CustomField`、`GenerateResult`；`skipTaggedFiles` → `skipFields` |
| `src/ai/prompts.ts` | 修改 | `renderPrompt` 提取自定义字段，返回 `RenderedPrompt` |
| `src/ai/utils.ts` | 修改 | 新增 `parseResponse`；`parseTagsFromResponse` 不变 |
| `src/ai/openai-client.ts` | 修改 | `generateTags` 返回 `GenerateResult`；动态系统提示词 |
| `src/ai/ollama-client.ts` | 修改 | 同上 |
| `src/tagger/frontmatter.ts` | 修改 | `writeTags` → `writeFields`；`hasTags` → `shouldSkip` |
| `src/tagger/tagger.ts` | 修改 | 适配新类型和跳过逻辑 |
| `src/settings.ts` | 修改 | 模板改名 UI；`skipFields` 文本框 |
| `src/main.ts` | 修改 | 设置迁移逻辑 |

---

### Task 1: 类型系统更新（`src/types.ts`）

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: 新增接口，重构 skipTaggedFiles → skipFields**

将 `src/types.ts` 修改为以下内容（仅列出变更部分，未标注的部分保持不变）：

在 `AIClient` 接口上方添加：

```typescript
/** 自定义字段定义（从模板 {{key: prompt}} 语法提取） */
export interface CustomField {
  key: string;
  prompt: string;
}

/** AI 生成结果（包含标签和自定义字段） */
export interface GenerateResult {
  tags: string[];
  fields: Record<string, string>;
}
```

修改 `AIClient.generateTags` 返回类型：

```typescript
export interface AIClient {
  generateTags(content: string, options: PromptOptions): Promise<GenerateResult>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  updateTemplate?(template: PromptTemplate): void;
  updateThinking?(enabled: boolean): void;
}
```

修改 `SmartTaggerSettings`，将 `skipTaggedFiles: boolean` 替换为 `skipFields: string[]`：

```typescript
export interface SmartTaggerSettings {
  aiMode: "openai" | "ollama";

  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;

  ollamaBaseUrl: string;
  ollamaModel: string;

  minTags: number;
  maxTags: number;
  preferExistingTags: boolean;
  skipFields: string[];

  maxRecursiveDepth: number;
  maxContentChars: number;

  promptTemplates: PromptTemplate[];
  activePromptName: string;

  enableThinking: boolean;
  debugMode: boolean;
}
```

修改 `DEFAULT_SETTINGS`，将 `skipTaggedFiles: true` 替换为：

```typescript
  skipFields: ["tags"],
```

修改 `DEFAULT_PROMPT_TEMPLATE` 的用户提示词，在 `{{content}}` 前添加自定义字段示例注释（不改变默认行为，仅更新提示文字）：

保持 `DEFAULT_PROMPT_TEMPLATE` 不变（默认模板不含自定义字段）。

- [ ] **Step 2: 运行构建确认类型错误位置**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，因为下游文件还在引用旧类型。记录错误文件列表。

- [ ] **Step 3: 提交类型变更**

```bash
git add src/types.ts
git commit -m "refactor: 新增 CustomField/GenerateResult 类型，skipTaggedFiles → skipFields"
```

---

### Task 2: 提示词解析升级（`src/ai/prompts.ts`）

**Files:**
- Modify: `src/ai/prompts.ts`

- [ ] **Step 1: 新增 RenderedPrompt 返回类型和自定义字段提取逻辑**

完整替换 `src/ai/prompts.ts` 内容：

```typescript
import { PromptTemplate, DEFAULT_PROMPT_TEMPLATE, CustomField } from "../types";

interface RenderContext {
  content: string;
  minTags: number;
  maxTags: number;
  existingTags: string[];
  preferExisting: boolean;
}

export interface RenderedPrompt {
  system: string;
  user: string;
  customFields: CustomField[];
}

/** 从模板文本中提取 {{key: prompt}} 自定义字段 */
function extractCustomFields(template: string): { cleaned: string; fields: CustomField[] } {
  const fields: CustomField[] = [];
  // 匹配 {{keyName: 描述文字}}，keyName 不含 {{ 和 }}
  const regex = /\{\{([^{}:]+):([^{}]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    fields.push({
      key: match[1].trim(),
      prompt: match[2].trim(),
    });
  }
  const cleaned = template.replace(regex, "");
  return { cleaned, fields };
}

/** 根据自定义字段动态追加系统提示词 */
function buildSchemaInstruction(customFields: CustomField[]): string {
  if (customFields.length === 0) return "";

  const fieldLines = customFields
    .map((f) => `- ${f.key}: ${f.prompt}（字符串）`)
    .join("\n");

  const schemaFields = ["tags: 标签列表（字符串数组）", ...customFields.map((f) => `${f.key}: ${f.prompt}`)]
    .map((line) => `  ${line}`)
    .join("\n");

  return `

你需要返回一个 JSON 对象，格式如下：
{
${schemaFields}
}
各字段要求：
- tags: 标签列表（字符串数组）
${fieldLines}`;
}

export function renderPrompt(
  template: PromptTemplate,
  context: RenderContext
): RenderedPrompt {
  // 1. 从用户提示词中提取自定义字段
  const { cleaned, fields: customFields } = extractCustomFields(template.user);

  // 2. 构建已有标签块
  const existingBlock =
    context.preferExisting && context.existingTags.length > 0
      ? `请优先从以下已有标签中选取，只有在必要时才添加新标签：\n${context.existingTags.join("、")}`
      : "";

  // 3. 替换内置变量
  const userPrompt = cleaned
    .replace(/\{\{minTags\}\}/g, String(context.minTags))
    .replace(/\{\{maxTags\}\}/g, String(context.maxTags))
    .replace(/\{\{existingTags\}\}/g, existingBlock)
    .replace(/\{\{content\}\}/g, context.content);

  // 4. 有自定义字段时追加系统提示词
  const schemaSuffix = buildSchemaInstruction(customFields);
  const systemPrompt = template.system + schemaSuffix;

  return {
    system: systemPrompt,
    user: userPrompt,
    customFields,
  };
}

export function getDefaultTemplates(): PromptTemplate[] {
  return [{ ...DEFAULT_PROMPT_TEMPLATE }];
}

export function findTemplate(
  templates: PromptTemplate[],
  name: string
): PromptTemplate | undefined {
  return templates.find((t) => t.name === name);
}

export function upsertTemplate(
  templates: PromptTemplate[],
  template: PromptTemplate
): PromptTemplate[] {
  const idx = templates.findIndex((t) => t.name === template.name);
  if (idx >= 0) {
    const updated = [...templates];
    updated[idx] = template;
    return updated;
  }
  return [...templates, template];
}

export function deleteTemplate(
  templates: PromptTemplate[],
  name: string
): PromptTemplate[] {
  return templates.filter((t) => t.name !== name);
}
```

- [ ] **Step 2: 运行构建确认**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，openai-client 和 ollama-client 的 `renderPrompt` 返回值类型不匹配。

- [ ] **Step 3: 提交**

```bash
git add src/ai/prompts.ts
git commit -m "feat: 提示词解析支持自定义字段提取和动态系统提示词"
```

---

### Task 3: 响应解析升级（`src/ai/utils.ts`）

**Files:**
- Modify: `src/ai/utils.ts`

- [ ] **Step 1: 新增 parseResponse 函数**

完整替换 `src/ai/utils.ts`：

```typescript
import { CustomField, GenerateResult } from "../types";

/** 解析 AI 返回的纯标签数组 */
export function parseTagsFromResponse(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((t: unknown) => String(t).trim().replace(/^#/, ""));
      }
    } catch {
      // JSON 解析失败，回退到文本分割
    }
  }
  return text
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter((t) => t.length > 0 && !t.startsWith("请") && !t.startsWith("标签"));
}

/** 统一解析 AI 响应：有自定义字段时解析 JSON 对象，否则回退到数组解析 */
export function parseResponse(text: string, customFields: CustomField[]): GenerateResult {
  if (customFields.length === 0) {
    return { tags: parseTagsFromResponse(text), fields: {} };
  }

  // 尝试提取 JSON 对象
  const objMatch = text.match(/\{[\s\S]*?\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.tags)) {
        const tags: string[] = parsed.tags.map((t: unknown) => String(t).trim().replace(/^#/, ""));
        const fields: Record<string, string> = {};
        for (const field of customFields) {
          if (typeof parsed[field.key] === "string") {
            fields[field.key] = parsed[field.key];
          }
        }
        return { tags, fields };
      }
    } catch {
      // JSON 解析失败，回退
    }
  }

  // 回退到纯标签解析
  return { tags: parseTagsFromResponse(text), fields: {} };
}
```

- [ ] **Step 2: 运行构建确认**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：仍因 client 文件未更新而失败，但 utils.ts 本身无错误。

- [ ] **Step 3: 提交**

```bash
git add src/ai/utils.ts
git commit -m "feat: 新增 parseResponse 统一解析函数，支持 JSON 对象和数组回退"
```

---

### Task 4: AI 客户端适配（openai-client + ollama-client）

**Files:**
- Modify: `src/ai/openai-client.ts`
- Modify: `src/ai/ollama-client.ts`

- [ ] **Step 1: 更新 OpenAIClient.generateTags**

替换 `src/ai/openai-client.ts` 的 `generateTags` 方法和 import：

```typescript
import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate, GenerateResult } from "../types";
import { renderPrompt } from "./prompts";
import { parseResponse } from "./utils";
```

替换 `generateTags` 方法（从 `async generateTags` 到方法结束）：

```typescript
  async generateTags(content: string, options: PromptOptions): Promise<GenerateResult> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.3,
    };

    if (this.enableThinking) {
      body.reasoning_effort = "medium";
    }

    const response = await this.request("/v1/chat/completions", body);
    const text = response.choices?.[0]?.message?.content ?? "";
    return parseResponse(text, prompt.customFields);
  }
```

- [ ] **Step 2: 更新 OllamaClient.generateTags**

替换 `src/ai/ollama-client.ts` 的 import：

```typescript
import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate, GenerateResult } from "../types";
import { renderPrompt } from "./prompts";
import { parseResponse } from "./utils";
```

替换 `generateTags` 方法：

```typescript
  async generateTags(content: string, options: PromptOptions): Promise<GenerateResult> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      stream: false,
    };

    if (this.enableThinking) {
      body.think = true;
    }

    const response = await this.request("/api/chat", body);
    const text = response.message?.content ?? "";
    return parseResponse(text, prompt.customFields);
  }
```

- [ ] **Step 3: 运行构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，tagger.ts 和 frontmatter.ts 引用了旧 API。

- [ ] **Step 4: 提交**

```bash
git add src/ai/openai-client.ts src/ai/ollama-client.ts
git commit -m "feat: AI 客户端适配 GenerateResult 返回类型和动态系统提示词"
```

---

### Task 5: Frontmatter 操作重构（`src/tagger/frontmatter.ts`）

**Files:**
- Modify: `src/tagger/frontmatter.ts`

- [ ] **Step 1: 重构写入和跳过逻辑**

完整替换 `src/tagger/frontmatter.ts`：

```typescript
import { App, TFile } from "obsidian";

/**
 * 检查文件 frontmatter 中指定字段是否都已存在
 */
export function shouldSkip(app: App, file: TFile, fields: string[]): boolean {
  if (fields.length === 0) return false;
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return false;
  return fields.every((field) => fm[field] !== undefined);
}

/**
 * 将标签和自定义字段写入文件 frontmatter
 * - tags: 合并去重
 * - 其他字段: 直接覆盖
 */
export async function writeFields(
  app: App,
  file: TFile,
  tags: string[],
  fields: Record<string, string>
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    // tags 合并去重
    const existing: string[] = frontmatter.tags ?? [];
    const existingStrs = existing.map(String);
    frontmatter.tags = [...new Set([...existingStrs, ...tags])];

    // 自定义字段直接覆盖
    for (const [key, value] of Object.entries(fields)) {
      frontmatter[key] = value;
    }
  });
}

/**
 * 提取文件正文（去掉 frontmatter）
 */
export function extractContent(fileContent: string): string {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return fileContent;
  return fileContent.slice(match[0].length);
}

/**
 * 截取内容到指定最大字符数
 */
export function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n\n[文档内容已截断]";
}
```

- [ ] **Step 2: 运行构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，tagger.ts 引用了旧的 `hasTags` 和 `writeTags`。

- [ ] **Step 3: 提交**

```bash
git add src/tagger/frontmatter.ts
git commit -m "refactor: frontmatter 写入支持自定义字段，跳过逻辑按字段名数组判定"
```

---

### Task 6: Tagger 核心适配（`src/tagger/tagger.ts`）

**Files:**
- Modify: `src/tagger/tagger.ts`

- [ ] **Step 1: 适配新的 GenerateResult、shouldSkip、writeFields**

替换 `src/tagger/tagger.ts` 的 import 部分：

```typescript
import { App, TFile, TFolder } from "obsidian";
import { AIClient, SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE } from "../types";
import { findTemplate } from "../ai/prompts";
import { shouldSkip, extractContent, truncateContent, writeFields } from "./frontmatter";
import { getVaultTags, invalidateVaultTagsCache } from "./vault-tags";
import {
  ProgressNotice,
  notifyStart,
  notifySuccess,
  notifySkipped,
  notifyBatchComplete,
  notifyError,
  notifyBusy,
} from "../ui/notice";
```

替换 `generateTagsForFile` 方法：

```typescript
  /** 为单个文件生成标签 */
  async generateTagsForFile(file: TFile): Promise<{ success: boolean; reason?: string }> {
    if (this.isProcessing) {
      notifyBusy();
      return { success: false, reason: "busy" };
    }

    if (shouldSkip(this.app, file, this.settings.skipFields)) {
      notifySkipped();
      return { success: false, reason: "skipped" };
    }

    const progress = notifyStart(1);

    try {
      this.isProcessing = true;
      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];
      const result = await this.generateForSingleFile(file, existingTags);

      if (result.tags.length === 0) {
        progress.done();
        notifyError("AI 未返回有效标签");
        return { success: false, reason: "empty" };
      }

      await writeFields(this.app, file, result.tags, result.fields);
      invalidateVaultTagsCache();
      progress.done();
      notifySuccess(result.tags);

      if (this.settings.debugMode) {
        console.log("[Smart-Tagger] 标签生成成功:", file.path, result.tags, result.fields);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done();
      notifyError(message);
      console.error("[Smart-Tagger] 标签生成失败:", error);
      return { success: false, reason: "error" };
    } finally {
      this.isProcessing = false;
    }
  }
```

替换 `generateTagsForSingleFile` 为 `generateForSingleFile`（返回 `GenerateResult`）：

```typescript
  /** 为单个文件调用 AI 生成标签和自定义字段 */
  private async generateForSingleFile(file: TFile, existingTags: string[]) {
    const content = await this.app.vault.read(file);
    const body = extractContent(content);
    const truncated = truncateContent(body, this.settings.maxContentChars);

    const template = this.getActiveTemplate();
    this.client.updateTemplate?.(template);

    return await this.client.generateTags(truncated, {
      existingTags,
      preferExisting: this.settings.preferExistingTags,
      minTags: this.settings.minTags,
      maxTags: this.settings.maxTags,
    });
  }
```

替换 `generateTagsForFolder` 方法：

```typescript
  /** 为文件夹批量生成标签 */
  async generateTagsForFolder(folder: TFolder): Promise<void> {
    if (this.isProcessing) {
      notifyBusy();
      return;
    }

    const files = this.collectFiles(folder, this.settings.maxRecursiveDepth);
    if (files.length === 0) {
      notifyError("文件夹中没有 Markdown 文件");
      return;
    }

    this.isProcessing = true;
    let success = 0;
    let skipped = 0;
    let failed = 0;
    let processed = 0;

    const progress = notifyStart(files.length);

    try {
      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (shouldSkip(this.app, file, this.settings.skipFields)) {
          skipped++;
          processed++;
          progress.update(`正在处理 ${processed}/${files.length}（已跳过 ${skipped}）`);
          continue;
        }

        progress.update(`正在处理 ${processed + 1}/${files.length} — ${file.basename}`);

        try {
          const result = await this.generateForSingleFile(file, existingTags);

          if (result.tags.length > 0) {
            await writeFields(this.app, file, result.tags, result.fields);
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error("[Smart-Tagger] 文件处理失败:", file.path, error);
          failed++;
        }

        processed++;
      }

      invalidateVaultTagsCache();
      progress.done();
      notifyBatchComplete(success, skipped, failed);
    } catch (error) {
      progress.done();
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
```

保持 `collectFiles` 和 `getActiveTemplate` 不变。

- [ ] **Step 2: 运行构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，settings.ts 和 main.ts 仍引用旧设置。

- [ ] **Step 3: 提交**

```bash
git add src/tagger/tagger.ts
git commit -m "refactor: Tagger 适配 GenerateResult 和 shouldSkip 新 API"
```

---

### Task 7: 设置迁移 + 主入口适配（`src/main.ts`）

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 在 loadSettings 中添加 skipTaggedFiles → skipFields 迁移**

替换 `loadSettings` 方法：

```typescript
  private async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

    // 迁移：skipTaggedFiles → skipFields
    const legacy = data as Record<string, unknown>;
    if (legacy.skipTaggedFiles !== undefined && legacy.skipFields === undefined) {
      this.settings.skipFields = legacy.skipTaggedFiles ? ["tags"] : [];
      await this.saveSettings();
    }

    if (this.settings.openaiApiKey) {
      try {
        this.settings.openaiApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.app.vault.adapter.getBasePath?.() ?? ""
        );
      } catch {
        console.warn("[Smart-Tagger] API Key 解密失败，已清空。请重新输入 API Key。");
        new Notice("Smart Tagger: API Key 解密失败，请重新输入");
        this.settings.openaiApiKey = "";
      }
    }
  }
```

- [ ] **Step 2: 运行构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译失败，settings.ts 仍引用旧设置。

- [ ] **Step 3: 提交**

```bash
git add src/main.ts
git commit -m "feat: 添加 skipTaggedFiles → skipFields 设置迁移逻辑"
```

---

### Task 8: 设置面板 UI 更新（`src/settings.ts`）

**Files:**
- Modify: `src/settings.ts`

- [ ] **Step 1: 替换跳过开关为文本框 + 模板改名**

替换 `renderStrategySection` 中"跳过已有标签的文档"开关为：

```typescript
    new Setting(containerEl)
      .setName("跳过已有字段")
      .setDesc("逗号分隔字段名。当 frontmatter 中所有指定字段都已存在时跳过该文档。如：tags, description")
      .addText((text) =>
        text
          .setPlaceholder("tags")
          .setValue(this.settings.skipFields.join(", "))
          .onChange(async (value) => {
            this.settings.skipFields = value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            await this.save();
          })
      );
```

在 `renderPromptSection` 中，在模板下拉框之后添加名称编辑框。在 `const activeTemplate = ...` 之前插入：

```typescript
    new Setting(containerEl)
      .setName("模板名称")
      .setDesc("修改后点击「保存当前修改」生效")
      .addText((text) =>
        text
          .setValue(this.settings.activePromptName)
          .onChange((value) => {
            this._pendingTemplateName = value;
          })
      );
```

在 `SmartTaggerSettingTab` 类中添加属性：

```typescript
  private _pendingTemplateName?: string;
```

修改"保存当前修改"按钮的 `onClick`，在 `upsertTemplate` 前加入改名逻辑：

```typescript
        btn.setButtonText("保存当前修改").onClick(async () => {
          if (this._pendingTemplateName && this._pendingTemplateName !== activeTemplate!.name) {
            const newName = this._pendingTemplateName.trim();
            if (newName) {
              const oldName = activeTemplate!.name;
              activeTemplate!.name = newName;
              if (this.settings.activePromptName === oldName) {
                this.settings.activePromptName = newName;
              }
            }
          }
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, activeTemplate!);
          this._pendingTemplateName = undefined;
          await this.save();
          this.display();
        })
```

修改提示文字，增加自定义字段语法说明：

```typescript
      containerEl.createEl("p", {
        cls: "smart-tagger-hint",
        text: "可用变量：{{minTags}}、{{maxTags}}、{{content}}（自动注入）；{{existingTags}}（preferExisting 开启时自动注入）。自定义字段：{{字段名: AI提示描述}}，如 {{description: 用一句话概括文档内容}}",
      });
```

修改"保存为新模板"按钮，弹出输入框让用户输入名称。替换为：

```typescript
        btn.setButtonText("保存为新模板").onClick(async () => {
          const name = this._pendingTemplateName?.trim() || `模板 ${this.settings.promptTemplates.length + 1}`;
          const newTemplate: PromptTemplate = {
            name,
            system: activeTemplate?.system ?? DEFAULT_PROMPT_TEMPLATE.system,
            user: activeTemplate?.user ?? DEFAULT_PROMPT_TEMPLATE.user,
          };
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, newTemplate);
          this.settings.activePromptName = name;
          this._pendingTemplateName = undefined;
          await this.save();
          this.display();
        })
```

- [ ] **Step 2: 运行构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：编译成功。

- [ ] **Step 3: 提交**

```bash
git add src/settings.ts
git commit -m "feat: 设置面板支持模板改名和 skipFields 文本框"
```

---

### Task 9: 构建验证与最终提交

**Files:**
- Modify: `main.js`（构建产物）

- [ ] **Step 1: 运行完整构建**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && npm run build 2>&1`

预期：`main.js` 成功生成，无错误。

- [ ] **Step 2: 验证构建产物**

Run: `cd "D:/CODE/Project/Obsidian-Smart-Tagger" && ls -la main.js`

预期：文件存在且大小合理（约 20-25kb）。

- [ ] **Step 3: 提交构建产物**

```bash
git add main.js
git commit -m "build: 构建自定义字段与模板改名功能"
```
