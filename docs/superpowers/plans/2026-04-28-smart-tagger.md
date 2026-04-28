# Smart-Tagger 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Obsidian 插件，使用 AI（OpenAI 兼容 API / Ollama）为文档自动生成 frontmatter 标签。

**Architecture:** 模块化分层架构。AI 客户端层通过抽象接口解耦具体实现（OpenAI / Ollama）；标签生成层编排读取、AI 调用、写入流程；UI 层负责设置面板和通知。插件入口负责注册命令、右键菜单和设置面板。

**Tech Stack:** TypeScript, Obsidian API, esbuild, Jest（纯逻辑测试）, Web Crypto API

---

## 文件结构

```
Smart-Tagger/
├── manifest.json                 # 插件元数据
├── versions.json                 # 版本兼容
├── styles.css                    # 设置面板样式
├── esbuild.config.mjs            # 打包配置
├── package.json                  # 依赖和脚本
├── tsconfig.json                 # TypeScript 配置
├── jest.config.js                # Jest 测试配置
├── src/
│   ├── main.ts                   # 插件入口：注册命令/菜单/设置
│   ├── types.ts                  # 共享类型定义（Settings、PromptTemplate 等）
│   ├── crypto.ts                 # API Key AES-GCM 加解密
│   ├── settings.ts               # 设置面板 PluginSettingTab
│   ├── ai/
│   │   ├── client.ts             # AIClient 抽象接口
│   │   ├── openai-client.ts      # OpenAI 兼容客户端
│   │   ├── ollama-client.ts      # Ollama 原生客户端
│   │   └── prompts.ts            # 提示词模板管理与渲染
│   ├── tagger/
│   │   ├── tagger.ts             # 核心标签生成流程编排
│   │   ├── frontmatter.ts        # frontmatter tags 读写
│   │   └── vault-tags.ts         # vault 已有标签收集与缓存
│   └── ui/
│       └── notice.ts             # Obsidian Notice 封装
└── __tests__/
    ├── crypto.test.ts            # 加解密测试
    └── prompts.test.ts           # 提示词渲染测试
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `jest.config.js`
- Create: `src/main.ts`（骨架）

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "obsidian-smart-tagger",
  "version": "1.0.0",
  "description": "使用 AI 为 Obsidian 文档自动生成标签",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production",
    "test": "jest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.20.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "tslib": "^2.6.2",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "obsidian": "latest"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2018", "ES2020.String"],
    "outDir": "./dist",
    "paths": {
      "src/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "__tests__/**/*.ts"]
}
```

- [ ] **Step 3: 创建 esbuild.config.mjs**

```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: [
      "obsidian",
      "electron",
      "@codemirror/autocomplete",
      "@codemirror/collab",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr",
      ...builtins,
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    minify: prod,
  })
  .catch(() => process.exit(1));
```

- [ ] **Step 4: 创建 manifest.json**

```json
{
  "id": "smart-tagger",
  "name": "Smart Tagger",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "使用 AI 为文档自动生成标签",
  "author": "ONEGAYI",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

- [ ] **Step 5: 创建 versions.json**

```json
{
  "1.0.0": "1.0.0"
}
```

- [ ] **Step 6: 创建 jest.config.js**

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleFileExtensions: ["ts", "js"],
};
```

- [ ] **Step 7: 创建 src/main.ts 骨架**

```typescript
import { Plugin } from "obsidian";

export default class SmartTaggerPlugin extends Plugin {
  async onload() {
    console.log("[Smart-Tagger] 插件加载");
  }

  onunload() {
    console.log("[Smart-Tagger] 插件卸载");
  }
}
```

- [ ] **Step 8: 安装依赖并验证构建**

Run: `cd D:/CODE/Project/Obsidian-Smart-Tagger && npm install`
Run: `npm run build`
Expected: 生成 `main.js`，无报错

- [ ] **Step 9: 提交**

```bash
git add package.json tsconfig.json esbuild.config.mjs manifest.json versions.json jest.config.js src/main.ts main.js
git commit -m "feat: 初始化 Obsidian 插件项目脚手架

- 配置 TypeScript + esbuild 打包
- 配置 Jest 测试框架
- 创建 manifest.json 和 versions.json
- 创建插件入口骨架 main.ts"
```

---

### Task 2: 共享类型定义

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 创建 src/types.ts**

```typescript
/** AI 客户端接口 */
export interface AIClient {
  generateTags(content: string, options: PromptOptions): Promise<string[]>;
  testConnection(): Promise<boolean>;
}

/** AI 调用选项 */
export interface PromptOptions {
  existingTags: string[];
  preferExisting: boolean;
  minTags: number;
  maxTags: number;
}

/** 提示词模板 */
export interface PromptTemplate {
  name: string;
  system: string;
  user: string;
}

/** 插件设置 */
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
  skipTaggedFiles: boolean;

  maxRecursiveDepth: number;
  maxContentChars: number;

  promptTemplates: PromptTemplate[];
  activePromptName: string;

  debugMode: boolean;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: SmartTaggerSettings = {
  aiMode: "openai",

  openaiBaseUrl: "https://api.openai.com",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",

  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3",

  minTags: 3,
  maxTags: 8,
  preferExistingTags: true,
  skipTaggedFiles: true,

  maxRecursiveDepth: 1,
  maxContentChars: 4000,

  promptTemplates: [],
  activePromptName: "默认模板",

  debugMode: false,
};

/** 默认提示词模板 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  name: "默认模板",
  system: `你是一个文档标签生成专家。你的任务是为给定的 Markdown 文档内容生成简洁、准确的标签。

规则：
1. 标签应反映文档的核心主题和关键概念
2. 标签使用中文，除非是专有名词或技术术语
3. 标签不需要加 # 前缀
4. 只返回 JSON 数组格式的标签列表，不要有其他解释
5. 示例格式：["标签1", "标签2", "标签3"]`,
  user: `请为以下文档内容生成合适的标签。标签数量：{{minTags}} 到 {{maxTags}} 个。

{{content}}`,
};
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src/types.ts
git commit -m "feat: 添加共享类型定义

- AIClient 接口、PromptOptions、PromptTemplate
- SmartTaggerSettings 及默认值
- 默认提示词模板（中文）"
```

---

### Task 3: API Key 加解密模块

**Files:**
- Create: `src/crypto.ts`
- Create: `__tests__/crypto.test.ts`

- [ ] **Step 1: 编写加解密测试**

```typescript
// __tests__/crypto.test.ts
import { encryptApiKey, decryptApiKey } from "../src/crypto";

describe("crypto", () => {
  const vaultPath = "/test/vault/path";

  it("加解密往返应返回原始值", async () => {
    const original = "sk-test-api-key-12345";
    const encrypted = await encryptApiKey(original, vaultPath);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:ciphertext 格式
    const decrypted = await decryptApiKey(encrypted, vaultPath);
    expect(decrypted).toBe(original);
  });

  it("不同 vault 路径解密应失败", async () => {
    const original = "sk-test-key";
    const encrypted = await encryptApiKey(original, vaultPath);
    await expect(decryptApiKey(encrypted, "/different/vault")).rejects.toThrow();
  });

  it("空字符串应正常处理", async () => {
    const encrypted = await encryptApiKey("", vaultPath);
    const decrypted = await decryptApiKey(encrypted, vaultPath);
    expect(decrypted).toBe("");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest __tests__/crypto.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 crypto.ts**

```typescript
// src/crypto.ts

const SALT = new TextEncoder().encode("smart-tagger-salt-v1");
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

async function deriveKey(vaultPath: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(vaultPath),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export async function encryptApiKey(plainText: string, vaultPath: string): Promise<string> {
  const key = await deriveKey(vaultPath);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
}

export async function decryptApiKey(cipherText: string, vaultPath: string): Promise<string> {
  const [ivBase64, dataBase64] = cipherText.split(":");
  if (!ivBase64 || !dataBase64) throw new Error("无效的加密格式");

  const key = await deriveKey(vaultPath);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const data = base64ToArrayBuffer(dataBase64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx jest __tests__/crypto.test.ts`
Expected: 3 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/crypto.ts __tests__/crypto.test.ts
git commit -m "feat: 实现 API Key AES-GCM 加解密

- PBKDF2 密钥派生（基于 vault 路径 + 固定 salt）
- AES-GCM 加密，存储格式 iv:ciphertext（base64）
- 包含往返加解密、错误 vault 路径、空字符串测试"
```

---

### Task 4: 提示词模板管理

**Files:**
- Create: `src/ai/prompts.ts`
- Create: `__tests__/prompts.test.ts`

- [ ] **Step 1: 编写提示词渲染测试**

```typescript
// __tests__/prompts.test.ts
import { renderPrompt, getDefaultTemplates } from "../src/ai/prompts";
import { DEFAULT_PROMPT_TEMPLATE, PromptTemplate } from "../src/types";

describe("prompts", () => {
  describe("renderPrompt", () => {
    it("应正确替换基础变量", () => {
      const result = renderPrompt(DEFAULT_PROMPT_TEMPLATE, {
        content: "这是一篇关于机器学习的文章",
        minTags: 3,
        maxTags: 8,
        existingTags: [],
        preferExisting: false,
      });
      expect(result.user).toContain("3 到 8 个");
      expect(result.user).toContain("这是一篇关于机器学习的文章");
    });

    it("preferExisting 开启时应注入已有标签", () => {
      const result = renderPrompt(DEFAULT_PROMPT_TEMPLATE, {
        content: "测试内容",
        minTags: 3,
        maxTags: 5,
        existingTags: ["机器学习", "深度学习", "Python"],
        preferExisting: true,
      });
      expect(result.user).toContain("机器学习");
      expect(result.user).toContain("深度学习");
      expect(result.user).toContain("优先从以下已有标签");
    });

    it("preferExisting 关闭时不应注入已有标签", () => {
      const result = renderPrompt(DEFAULT_PROMPT_TEMPLATE, {
        content: "测试内容",
        minTags: 3,
        maxTags: 5,
        existingTags: ["机器学习"],
        preferExisting: false,
      });
      expect(result.user).not.toContain("机器学习");
      expect(result.user).not.toContain("优先从以下已有标签");
    });
  });

  describe("getDefaultTemplates", () => {
    it("应返回包含默认模板的数组", () => {
      const templates = getDefaultTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates[0].name).toBe("默认模板");
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest __tests__/prompts.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 prompts.ts**

```typescript
// src/ai/prompts.ts
import { PromptTemplate, DEFAULT_PROMPT_TEMPLATE } from "../types";

interface RenderContext {
  content: string;
  minTags: number;
  maxTags: number;
  existingTags: string[];
  preferExisting: boolean;
}

export function renderPrompt(
  template: PromptTemplate,
  context: RenderContext
): { system: string; user: string } {
  let userPrompt = template.user
    .replace(/\{\{minTags\}\}/g, String(context.minTags))
    .replace(/\{\{maxTags\}\}/g, String(context.maxTags))
    .replace(/\{\{content\}\}/g, context.content);

  if (context.preferExisting && context.existingTags.length > 0) {
    const tagList = context.existingTags.join("、");
    userPrompt += `\n\n请优先从以下已有标签中选取，只有在必要时才添加新标签：${tagList}`;
  }

  return {
    system: template.system,
    user: userPrompt,
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

- [ ] **Step 4: 运行测试确认通过**

Run: `npx jest __tests__/prompts.test.ts`
Expected: 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/ai/prompts.ts __tests__/prompts.test.ts
git commit -m "feat: 实现提示词模板管理

- renderPrompt 支持变量插值和条件注入
- 模板 CRUD：findTemplate、upsertTemplate、deleteTemplate
- 包含基础替换、条件注入、默认模板获取测试"
```

---

### Task 5: AI 客户端接口与 OpenAI 实现

**Files:**
- Create: `src/ai/client.ts`
- Create: `src/ai/openai-client.ts`

- [ ] **Step 1: 创建 AI 客户端接口**

```typescript
// src/ai/client.ts
import { AIClient } from "../types";

export type { AIClient };
```

- [ ] **Step 2: 实现 OpenAI 兼容客户端**

```typescript
// src/ai/openai-client.ts
import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions } from "../types";
import { renderPrompt } from "./prompts";

interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAIClient implements AIClient {
  constructor(private config: OpenAIConfig) {}

  async generateTags(content: string, options: PromptOptions): Promise<string[]> {
    const prompt = renderPrompt(this.getActiveTemplate(), {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.3,
    };

    const response = await this.request("/v1/chat/completions", body);
    const text = response.choices?.[0]?.message?.content ?? "";
    return this.parseTags(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request("/v1/models", undefined, "GET");
      return response?.data?.length > 0;
    } catch {
      return false;
    }
  }

  private async request(
    path: string,
    body: unknown,
    method: string = "POST"
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const params: RequestUrlParam = {
      url,
      method: method as any,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    };
    if (body) {
      params.body = JSON.stringify(body);
    }
    const resp = await requestUrl(params);
    return resp.json;
  }

  private parseTags(text: string): string[] {
    // 尝试提取 JSON 数组
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map((t: any) => String(t).trim().replace(/^#/, ""));
        }
      } catch {}
    }
    // 回退：按行/逗号分割
    return text
      .split(/[,\n]/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter((t) => t.length > 0 && !t.startsWith("请") && !t.startsWith("标签"));
  }

  private getActiveTemplate() {
    // 此方法将由 Tagger 传入模板，此处返回默认
    // 实际模板由 Tagger 在调用 generateTags 前设置
    const { DEFAULT_PROMPT_TEMPLATE } = require("../types");
    return DEFAULT_PROMPT_TEMPLATE;
  }
}
```

注意：`getActiveTemplate()` 是一个临时方案。在 Task 10（Core Tagger）中会重构为通过构造函数注入模板。

- [ ] **Step 3: 重构 — 让 generateTags 直接接收模板**

修改 `src/ai/openai-client.ts`，将 `generateTags` 签名改为接收模板参数：

```typescript
// src/ai/openai-client.ts（完整版）
import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate } from "../types";
import { renderPrompt } from "./prompts";

interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAIClient implements AIClient {
  constructor(
    private config: OpenAIConfig,
    private template: PromptTemplate
  ) {}

  updateConfig(config: Partial<OpenAIConfig>) {
    Object.assign(this.config, config);
  }

  updateTemplate(template: PromptTemplate) {
    this.template = template;
  }

  async generateTags(content: string, options: PromptOptions): Promise<string[]> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.3,
    };

    const response = await this.request("/v1/chat/completions", body);
    const text = response.choices?.[0]?.message?.content ?? "";
    return parseTagsFromResponse(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request("/v1/models", undefined, "GET");
      return response?.data?.length > 0;
    } catch {
      return false;
    }
  }

  private async request(path: string, body: unknown, method: string = "POST"): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const params: RequestUrlParam = {
      url,
      method: method as any,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    };
    if (body) params.body = JSON.stringify(body);
    const resp = await requestUrl(params);
    return resp.json;
  }
}

/** 从 AI 响应文本中解析标签 */
export function parseTagsFromResponse(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => String(t).trim().replace(/^#/, ""));
      }
    } catch {}
  }
  return text
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter((t) => t.length > 0 && !t.startsWith("请") && !t.startsWith("标签"));
}
```

- [ ] **Step 4: 验证编译**

Run: `npm run build`
Expected: 编译通过（obsidian 模块为 external，不参与打包）

- [ ] **Step 5: 提交**

```bash
git add src/ai/client.ts src/ai/openai-client.ts
git commit -m "feat: 实现 OpenAI 兼容 AI 客户端

- AIClient 接口定义
- OpenAIClient 使用 requestUrl 调用 /v1/chat/completions
- 标签解析：优先 JSON 数组，回退逗号/换行分割
- testConnection 验证服务可用性
- 支持动态更新配置和提示词模板"
```

---

### Task 6: Ollama 客户端

**Files:**
- Create: `src/ai/ollama-client.ts`

- [ ] **Step 1: 实现 Ollama 客户端**

```typescript
// src/ai/ollama-client.ts
import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate } from "../types";
import { renderPrompt } from "./prompts";
import { parseTagsFromResponse } from "./openai-client";

interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class OllamaClient implements AIClient {
  constructor(
    private config: OllamaConfig,
    private template: PromptTemplate
  ) {}

  updateConfig(config: Partial<OllamaConfig>) {
    Object.assign(this.config, config);
  }

  updateTemplate(template: PromptTemplate) {
    this.template = template;
  }

  async generateTags(content: string, options: PromptOptions): Promise<string[]> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      stream: false,
    };

    const response = await this.request("/api/chat", body);
    const text = response.message?.content ?? "";
    return parseTagsFromResponse(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      const resp = await requestUrl({
        url: `${this.config.baseUrl}/api/tags`,
        method: "GET",
      });
      return resp.json?.models?.length > 0;
    } catch {
      return false;
    }
  }

  private async request(path: string, body: unknown): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const params: RequestUrlParam = {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const resp = await requestUrl(params);
    return resp.json;
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src/ai/ollama-client.ts
git commit -m "feat: 实现 Ollama 原生 AI 客户端

- 使用 /api/chat 端点，无需 API Key
- 复用 OpenAI 客户端的 parseTagsFromResponse 解析标签
- testConnection 通过 /api/tags 验证服务可用性"
```

---

### Task 7: 通知封装

**Files:**
- Create: `src/ui/notice.ts`

- [ ] **Step 1: 实现 notice.ts**

```typescript
// src/ui/notice.ts
import { Notice } from "obsidian";

const PREFIX = "Smart Tagger";

function notify(message: string, timeout: number = 3000): void {
  new Notice(`${PREFIX}: ${message}`, timeout);
}

export function notifySuccess(tags: string[]): void {
  notify(`已添加标签 ${tags.join(", ")}`, 3000);
}

export function notifySkipped(): void {
  notify("已跳过（已有标签）", 2000);
}

export function notifyProgress(current: number, total: number): void {
  notify(`正在处理 ${current}/${total}...`, 2000);
}

export function notifyBatchComplete(success: number, skipped: number, failed: number): void {
  notify(`完成！成功 ${success}，跳过 ${skipped}，失败 ${failed}`, 5000);
}

export function notifyError(message: string): void {
  notify(`错误 - ${message}`, 5000);
}

export function notifyBusy(): void {
  notify("正在处理中，请稍候", 2000);
}

export function notifyTestConnection(success: boolean, message?: string): void {
  if (success) {
    notify("连接测试成功", 2000);
  } else {
    notify(`连接测试失败${message ? ` - ${message}` : ""}`, 5000);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/ui/notice.ts
git commit -m "feat: 实现通知封装模块

- 提供成功、跳过、进度、批处理完成、错误、忙碌、连接测试等通知函数
- 统一 Smart Tagger 前缀"
```

---

### Task 8: Frontmatter 操作

**Files:**
- Create: `src/tagger/frontmatter.ts`

- [ ] **Step 1: 实现 frontmatter 读写**

```typescript
// src/tagger/frontmatter.ts
import { App, TFile } from "obsidian";

/**
 * 检查文件 frontmatter 中是否已有标签
 */
export function hasTags(app: App, file: TFile): boolean {
  const cache = app.metadataCache.getFileCache(file);
  const tags = cache?.frontmatter?.tags;
  if (!tags) return false;
  if (Array.isArray(tags)) return tags.length > 0;
  if (typeof tags === "string") return tags.length > 0;
  return false;
}

/**
 * 获取文件 frontmatter 中的现有标签
 */
export function getExistingTags(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  const tags = cache?.frontmatter?.tags;
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") return [tags];
  return [];
}

/**
 * 将标签写入文件 frontmatter（合并去重）
 */
export async function writeTags(app: App, file: TFile, newTags: string[]): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    const existing: string[] = frontmatter.tags ?? [];
    const existingStrs = existing.map(String);
    const merged = [...new Set([...existingStrs, ...newTags])];
    frontmatter.tags = merged;
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

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src/tagger/frontmatter.ts
git commit -m "feat: 实现 frontmatter 标签读写操作

- hasTags / getExistingTags 读取已有标签
- writeTags 合并去重写入标签（使用 processFrontMatter API）
- extractContent 提取正文（去掉 frontmatter）
- truncateContent 按字符数截取内容"
```

---

### Task 9: Vault 标签收集

**Files:**
- Create: `src/tagger/vault-tags.ts`

- [ ] **Step 1: 实现 vault 标签收集与缓存**

```typescript
// src/tagger/vault-tags.ts
import { App, MetadataCache } from "obsidian";

let cachedTags: string[] | null = null;

/**
 * 获取 vault 中所有已有标签（带缓存）
 */
export function getVaultTags(app: App): string[] {
  if (cachedTags !== null) return cachedTags;

  const tagMap = app.metadataCache.getTags();
  if (!tagMap) {
    cachedTags = [];
    return cachedTags;
  }

  cachedTags = Object.keys(tagMap).map((tag) => tag.replace(/^#/, ""));
  return cachedTags;
}

/**
 * 清除缓存（每次生成标签后调用）
 */
export function invalidateVaultTagsCache(): void {
  cachedTags = null;
}

/**
 * 获取按出现次数排序的标签列表（降序）
 */
export function getVaultTagsSorted(app: App, limit?: number): string[] {
  const tagMap = app.metadataCache.getTags();
  if (!tagMap) return [];

  const entries = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag: tag.replace(/^#/, ""), count }))
    .sort((a, b) => b.count - a.count);

  const tags = entries.map((e) => e.tag);
  return limit ? tags.slice(0, limit) : tags;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/tagger/vault-tags.ts
git commit -m "feat: 实现 vault 标签收集与缓存

- getVaultTags 获取所有标签（带内存缓存）
- getVaultTagsSorted 按出现次数降序排列
- invalidateVaultTagsCache 清除缓存"
```

---

### Task 10: 核心标签生成编排

**Files:**
- Create: `src/tagger/tagger.ts`

- [ ] **Step 1: 实现 Tagger 核心逻辑**

```typescript
// src/tagger/tagger.ts
import { App, Notice, TFile, TFolder } from "obsidian";
import { AIClient, SmartTaggerSettings, PromptTemplate } from "../types";
import { findTemplate } from "../ai/prompts";
import { hasTags, extractContent, truncateContent, writeTags } from "./frontmatter";
import { getVaultTags, invalidateVaultTagsCache } from "./vault-tags";
import {
  notifySuccess,
  notifySkipped,
  notifyProgress,
  notifyBatchComplete,
  notifyError,
  notifyBusy,
} from "../ui/notice";

export class Tagger {
  private isProcessing = false;

  constructor(
    private app: App,
    private client: AIClient,
    private settings: SmartTaggerSettings
  ) {}

  updateClient(client: AIClient) {
    (this as any).client = client;
  }

  updateSettings(settings: SmartTaggerSettings) {
    this.settings = settings;
  }

  /** 为单个文件生成标签 */
  async generateTagsForFile(file: TFile): Promise<{ success: boolean; reason?: string }> {
    if (this.isProcessing) {
      notifyBusy();
      return { success: false, reason: "busy" };
    }

    // skipTaggedFiles 检查（非批处理时也生效）
    if (this.settings.skipTaggedFiles && hasTags(this.app, file)) {
      notifySkipped();
      return { success: false, reason: "skipped" };
    }

    try {
      this.isProcessing = true;
      const content = await this.app.vault.read(file);
      const body = extractContent(content);
      const truncated = truncateContent(body, this.settings.maxContentChars);

      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];

      const template = this.getActiveTemplate();
      // 更新客户端模板（如果客户端支持）
      if ("updateTemplate" in this.client) {
        (this.client as any).updateTemplate(template);
      }

      const tags = await this.client.generateTags(truncated, {
        existingTags,
        preferExisting: this.settings.preferExistingTags,
        minTags: this.settings.minTags,
        maxTags: this.settings.maxTags,
      });

      if (tags.length === 0) {
        notifyError("AI 未返回有效标签");
        return { success: false, reason: "empty" };
      }

      await writeTags(this.app, file, tags);
      invalidateVaultTagsCache();
      notifySuccess(tags);

      if (this.settings.debugMode) {
        console.log("[Smart-Tagger] 标签生成成功:", file.path, tags);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifyError(message);
      console.error("[Smart-Tagger] 标签生成失败:", error);
      return { success: false, reason: "error" };
    } finally {
      this.isProcessing = false;
    }
  }

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

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (this.settings.skipTaggedFiles && hasTags(this.app, file)) {
          skipped++;
          continue;
        }

        notifyProgress(i + 1, files.length);

        try {
          const content = await this.app.vault.read(file);
          const body = extractContent(content);
          const truncated = truncateContent(body, this.settings.maxContentChars);

          const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];

          const template = this.getActiveTemplate();
          if ("updateTemplate" in this.client) {
            (this.client as any).updateTemplate(template);
          }

          const tags = await this.client.generateTags(truncated, {
            existingTags,
            preferExisting: this.settings.preferExistingTags,
            minTags: this.settings.minTags,
            maxTags: this.settings.maxTags,
          });

          if (tags.length > 0) {
            await writeTags(this.app, file, tags);
            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      invalidateVaultTagsCache();
      notifyBatchComplete(success, skipped, failed);
    } finally {
      this.isProcessing = false;
    }
  }

  /** 按递归深度收集 Markdown 文件 */
  private collectFiles(folder: TFolder, maxDepth: number): TFile[] {
    const files: TFile[] = [];
    const walk = (current: TFolder, depth: number) => {
      for (const child of current.children) {
        if (child instanceof TFile && child.extension === "md") {
          files.push(child);
        } else if (child instanceof TFolder && depth < maxDepth) {
          walk(child, depth + 1);
        }
      }
    };
    walk(folder, 0);
    return files;
  }

  /** 获取当前活跃提示词模板 */
  private getActiveTemplate(): PromptTemplate {
    const template = findTemplate(this.settings.promptTemplates, this.settings.activePromptName);
    return template ?? this.settings.promptTemplates[0] ?? require("../types").DEFAULT_PROMPT_TEMPLATE;
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src/tagger/tagger.ts
git commit -m "feat: 实现核心标签生成编排器

- generateTagsForFile 单文件处理流程
- generateTagsForFolder 串行批量处理
- collectFiles 按递归深度收集 Markdown 文件
- isProcessing 锁防止并发触发
- 集成 frontmatter 读写、vault 标签缓存、通知"
```

---

### Task 11: 设置面板

**Files:**
- Create: `src/settings.ts`
- Create: `styles.css`

- [ ] **Step 1: 实现设置面板**

```typescript
// src/settings.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import { SmartTaggerSettings, PromptTemplate, DEFAULT_SETTINGS, DEFAULT_PROMPT_TEMPLATE } from "./types";
import { getDefaultTemplates, upsertTemplate, deleteTemplate } from "./ai/prompts";
import { encryptApiKey, decryptApiKey } from "./crypto";
import { notifyTestConnection } from "./ui/notice";

export class SmartTaggerSettingTab extends PluginSettingTab {
  private settings: SmartTaggerSettings;
  private onSave: (settings: SmartTaggerSettings) => Promise<void>;
  private onTestConnection: () => Promise<boolean>;
  private decryptedApiKey: string = "";

  constructor(
    app: App,
    settings: SmartTaggerSettings,
    onSave: (settings: SmartTaggerSettings) => Promise<void>,
    onTestConnection: () => Promise<boolean>
  ) {
    super(app, "");
    this.settings = { ...settings };
    this.onSave = onSave;
    this.onTestConnection = onTestConnection;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Smart Tagger 设置" });

    this.renderAISection(containerEl);
    this.renderStrategySection(containerEl);
    this.renderPromptSection(containerEl);
  }

  private renderAISection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "AI 服务连接" });

    new Setting(containerEl)
      .setName("AI 模式")
      .setDesc("选择使用 OpenAI 兼容 API 或 Ollama")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ openai: "OpenAI 兼容 API", ollama: "Ollama" })
          .setValue(this.settings.aiMode)
          .onChange(async (value) => {
            this.settings.aiMode = value as "openai" | "ollama";
            await this.save();
            this.display();
          })
      );

    if (this.settings.aiMode === "openai") {
      new Setting(containerEl)
        .setName("API Base URL")
        .addText((text) =>
          text
            .setPlaceholder("https://api.openai.com")
            .setValue(this.settings.openaiBaseUrl)
            .onChange(async (value) => {
              this.settings.openaiBaseUrl = value;
              await this.save();
            })
        );

      new Setting(containerEl)
        .setName("API Key")
        .setDesc("加密存储")
        .addText((text) => {
          text
            .setPlaceholder("sk-...")
            .setValue(this.decryptedApiKey)
            .onChange(async (value) => {
              this.decryptedApiKey = value;
            });
          text.inputEl.type = "password";
        })
        .addButton((btn) =>
          btn.setButtonText("保存 Key").onClick(async () => {
            this.settings.openaiApiKey = await encryptApiKey(
              this.decryptedApiKey,
              this.app.vault.adapter.getBasePath?.() ?? ""
            );
            await this.save();
          })
        );

      new Setting(containerEl)
        .setName("模型")
        .addText((text) =>
          text
            .setPlaceholder("gpt-4o-mini")
            .setValue(this.settings.openaiModel)
            .onChange(async (value) => {
              this.settings.openaiModel = value;
              await this.save();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Ollama Base URL")
        .addText((text) =>
          text
            .setPlaceholder("http://localhost:11434")
            .setValue(this.settings.ollamaBaseUrl)
            .onChange(async (value) => {
              this.settings.ollamaBaseUrl = value;
              await this.save();
            })
        );

      new Setting(containerEl)
        .setName("模型")
        .addText((text) =>
          text
            .setPlaceholder("llama3")
            .setValue(this.settings.ollamaModel)
            .onChange(async (value) => {
              this.settings.ollamaModel = value;
              await this.save();
            })
        );
    }

    new Setting(containerEl)
      .setName("测试连接")
      .setDesc("验证 AI 服务是否可用")
      .addButton((btn) =>
        btn.setButtonText("测试").onClick(async () => {
          btn.setButtonText("测试中...");
          btn.setDisabled(true);
          const success = await this.onTestConnection();
          notifyTestConnection(success);
          btn.setButtonText("测试");
          btn.setDisabled(false);
        })
      );
  }

  private renderStrategySection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "标签生成策略" });

    new Setting(containerEl)
      .setName("最小标签数")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.settings.minTags)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.minTags = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("最大标签数")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.settings.maxTags)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxTags = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("优先已有标签")
      .setDesc("AI 会优先从 vault 已有标签中选取，必要时才添加新标签")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.preferExistingTags).onChange(async (value) => {
          this.settings.preferExistingTags = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName("跳过已有标签的文档")
      .setDesc("处理时自动跳过 frontmatter 中已有 tags 的文档")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.skipTaggedFiles).onChange(async (value) => {
          this.settings.skipTaggedFiles = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName("文件夹递归深度")
      .setDesc("0 = 仅直接子文件，1 = 包含一级子文件夹，以此类推")
      .addSlider((slider) =>
        slider
          .setLimits(0, 10, 1)
          .setValue(this.settings.maxRecursiveDepth)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxRecursiveDepth = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("最大内容字符数")
      .setDesc("发送给 AI 的最大字符数，超出部分将被截断")
      .addSlider((slider) =>
        slider
          .setLimits(1000, 20000, 500)
          .setValue(this.settings.maxContentChars)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxContentChars = value;
            await this.save();
          })
      );
  }

  private renderPromptSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "提示词模板管理" });

    const templateNames = this.settings.promptTemplates.map((t) => t.name);

    new Setting(containerEl)
      .setName("当前模板")
      .addDropdown((dropdown) => {
        dropdown.addOptions(
          templateNames.reduce((acc, name) => ({ ...acc, [name]: name }), {} as Record<string, string>)
        );
        dropdown.setValue(this.settings.activePromptName);
        dropdown.onChange(async (value) => {
          this.settings.activePromptName = value;
          await this.save();
          this.display();
        });
      });

    // 获取当前活跃模板
    const activeTemplate =
      this.settings.promptTemplates.find((t) => t.name === this.settings.activePromptName) ??
      this.settings.promptTemplates[0];

    if (activeTemplate) {
      new Setting(containerEl).setName("系统提示词").setHeading();
      const systemArea = containerEl.createEl("textarea", {
        cls: "smart-tagger-prompt-area",
      });
      systemArea.value = activeTemplate.system;
      systemArea.rows = 8;
      systemArea.addEventListener("change", () => {
        activeTemplate.system = systemArea.value;
      });

      new Setting(containerEl).setName("用户提示词").setHeading();
      const userArea = containerEl.createEl("textarea", {
        cls: "smart-tagger-prompt-area",
      });
      userArea.value = activeTemplate.user;
      userArea.rows = 6;
      userArea.addEventListener("change", () => {
        activeTemplate.user = userArea.value;
      });

      // 变量提示
      const hint = containerEl.createEl("p", {
        cls: "smart-tagger-hint",
        text: "可用变量：{{minTags}}、{{maxTags}}、{{content}}（自动注入）；{{existingTags}}（preferExisting 开启时自动追加）",
      });
    }

    // 操作按钮
    new Setting(containerEl)
      .setName("模板操作")
      .addButton((btn) =>
        btn.setButtonText("保存当前修改").onClick(async () => {
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, activeTemplate);
          await this.save();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("保存为新模板").onClick(async () => {
          const name = `模板 ${this.settings.promptTemplates.length + 1}`;
          const newTemplate: PromptTemplate = {
            name,
            system: activeTemplate?.system ?? DEFAULT_PROMPT_TEMPLATE.system,
            user: activeTemplate?.user ?? DEFAULT_PROMPT_TEMPLATE.user,
          };
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, newTemplate);
          this.settings.activePromptName = name;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("删除当前模板").setWarning(true).onClick(async () => {
          if (this.settings.promptTemplates.length <= 1) return;
          this.settings.promptTemplates = deleteTemplate(
            this.settings.promptTemplates,
            this.settings.activePromptName
          );
          this.settings.activePromptName = this.settings.promptTemplates[0].name;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("恢复默认模板").setWarning(true).onClick(async () => {
          this.settings.promptTemplates = getDefaultTemplates();
          this.settings.activePromptName = DEFAULT_PROMPT_TEMPLATE.name;
          await this.save();
          this.display();
        })
      );
  }

  private async save(): Promise<void> {
    await this.onSave(this.settings);
  }

  /** 初始化时解密 API Key */
  async initDecryptedKey(): Promise<void> {
    if (this.settings.openaiApiKey) {
      try {
        this.decryptedApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.app.vault.adapter.getBasePath?.() ?? ""
        );
      } catch {
        this.decryptedApiKey = "";
      }
    }
  }
}
```

- [ ] **Step 2: 创建 styles.css**

```css
/* styles.css */
.smart-tagger-prompt-area {
  width: 100%;
  padding: 8px;
  font-family: var(--font-monospace);
  font-size: 0.85em;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-secondary);
  color: var(--text-normal);
  resize: vertical;
}

.smart-tagger-hint {
  font-size: 0.85em;
  color: var(--text-muted);
  margin: 4px 0 16px 0;
}
```

- [ ] **Step 3: 验证编译**

Run: `npm run build`
Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/settings.ts styles.css
git commit -m "feat: 实现设置面板

- 三区域布局：AI 连接、标签策略、提示词管理
- 动态切换 OpenAI / Ollama 配置项
- API Key 加密存储（密码输入框）
- 提示词模板 CRUD：新建、编辑、删除、恢复默认
- 连接测试按钮
- 包含样式文件"
```

---

### Task 12: 插件入口 — 组装所有模块

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 实现完整的插件入口**

```typescript
// src/main.ts
import { Plugin, TFile, TFolder, Menu } from "obsidian";
import { SmartTaggerSettings, DEFAULT_SETTINGS, DEFAULT_PROMPT_TEMPLATE } from "./types";
import { OpenAIClient } from "./ai/openai-client";
import { OllamaClient } from "./ai/ollama-client";
import { getDefaultTemplates, findTemplate } from "./ai/prompts";
import { encryptApiKey, decryptApiKey } from "./crypto";
import { Tagger } from "./tagger/tagger";
import { SmartTaggerSettingTab } from "./settings";

export default class SmartTaggerPlugin extends Plugin {
  settings!: SmartTaggerSettings;
  tagger!: Tagger;

  async onload() {
    console.log("[Smart-Tagger] 插件加载");

    await this.loadSettings();

    // 确保至少有一个模板
    if (this.settings.promptTemplates.length === 0) {
      this.settings.promptTemplates = getDefaultTemplates();
      this.settings.activePromptName = DEFAULT_PROMPT_TEMPLATE.name;
      await this.saveSettings();
    }

    // 初始化 AI 客户端和 Tagger
    const client = this.createClient();
    this.tagger = new Tagger(this.app, client, this.settings);

    // 注册命令
    this.registerCommands();

    // 注册文件管理器右键菜单
    this.registerFileMenu();

    // 注册设置面板
    const settingTab = new SmartTaggerSettingTab(
      this.app,
      this.settings,
      async (settings) => {
        this.settings = settings;
        await this.saveSettings();
        this.tagger.updateSettings(this.settings);
        const client = this.createClient();
        this.tagger.updateClient(client);
      },
      async () => {
        const client = this.createClient();
        return client.testConnection();
      }
    );
    await settingTab.initDecryptedKey();
    this.addSettingTab(settingTab);
  }

  onunload() {
    console.log("[Smart-Tagger] 插件卸载");
  }

  private async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

    // 解密 API Key 供客户端使用
    if (this.settings.openaiApiKey) {
      try {
        this.settings.openaiApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.app.vault.adapter.getBasePath?.() ?? ""
        );
      } catch {
        this.settings.openaiApiKey = "";
      }
    }
  }

  private async saveSettings(): Promise<void> {
    // 加密 API Key 后存储，原值保留在内存中
    const toSave = { ...this.settings };
    if (toSave.openaiApiKey) {
      toSave.openaiApiKey = await encryptApiKey(
        toSave.openaiApiKey,
        this.app.vault.adapter.getBasePath?.() ?? ""
      );
    }
    await this.saveData(toSave);
  }

  private createClient() {
    const template =
      findTemplate(this.settings.promptTemplates, this.settings.activePromptName) ??
      this.settings.promptTemplates[0] ??
      DEFAULT_PROMPT_TEMPLATE;

    if (this.settings.aiMode === "ollama") {
      return new OllamaClient(
        { baseUrl: this.settings.ollamaBaseUrl, model: this.settings.ollamaModel },
        template
      );
    }

    return new OpenAIClient(
      {
        baseUrl: this.settings.openaiBaseUrl,
        apiKey: this.settings.openaiApiKey,
        model: this.settings.openaiModel,
      },
      template
    );
  }

  private registerCommands(): void {
    this.addCommand({
      id: "smart-tagger:tag-current-file",
      name: "为当前文件生成标签",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") {
          return;
        }
        this.tagger.generateTagsForFile(file);
      },
    });

    this.addCommand({
      id: "smart-tagger:tag-current-folder",
      name: "为当前文件夹所有文件生成标签",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return;
        const folder = file.parent;
        if (!folder) return;
        this.tagger.generateTagsForFolder(folder);
      },
    });
  }

  private registerFileMenu(): void {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle("Smart Tagger: 为该文件生成标签")
              .setIcon("tag")
              .onClick(() => {
                this.tagger.generateTagsForFile(file);
              });
          });
        }

        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Smart Tagger: 为该文件夹生成标签")
              .setIcon("tag")
              .onClick(() => {
                this.tagger.generateTagsForFolder(file);
              });
          });
        }
      })
    );
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run build`
Expected: 编译通过，生成 `main.js`

- [ ] **Step 3: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add src/main.ts main.js
git commit -m "feat: 实现插件入口，组装所有模块

- 加载/保存设置（含 API Key 加解密）
- 创建 AI 客户端工厂方法
- 注册命令面板命令（当前文件/当前文件夹）
- 注册文件管理器右键菜单（单文件/文件夹）
- 初始化 Tagger 并注入依赖"
```

---

### Task 13: 构建产物与集成验证

**Files:**
- Create: `.gitignore`
- Modify: `main.js`（重新构建）

- [ ] **Step 1: 创建 .gitignore**

```
node_modules/
dist/
main.js.map
.DS_Store
```

- [ ] **Step 2: 生产构建**

Run: `npm run build production`
Expected: 生成精简的 `main.js`

- [ ] **Step 3: 验证插件结构**

在 Obsidian vault 的 `.obsidian/plugins/smart-tagger/` 目录下应包含：
- `main.js` — 插件代码
- `manifest.json` — 插件元数据
- `styles.css` — 样式

将这三个文件复制到测试 vault 中，在 Obsidian 设置中启用插件。

- [ ] **Step 4: 手动验证清单**

验证以下功能：

1. [ ] 插件加载无报错（检查控制台 `[Smart-Tagger] 插件加载`）
2. [ ] 命令面板中出现两条 Smart Tagger 命令
3. [ ] 文件管理器中右键 .md 文件出现 "为该文件生成标签"
4. [ ] 文件管理器中右键文件夹出现 "为该文件夹生成标签"
5. [ ] 设置面板三个区域正常显示
6. [ ] 切换 OpenAI / Ollama 模式时配置项正确显隐
7. [ ] 编辑提示词后保存正常
8. [ ] 使用 Ollama 对单个文件生成标签（需要本地 Ollama 运行）
9. [ ] 查看生成后文件的 frontmatter 包含正确的 tags 字段

- [ ] **Step 5: 最终提交**

```bash
git add .gitignore main.js manifest.json styles.css
git commit -m "feat: 完成插件构建与集成验证

- 添加 .gitignore
- 生产构建 main.js
- 包含 manifest.json 和 styles.css"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 设计文档中的每个功能都有对应 Task
- [x] **Placeholder scan:** 无 TBD / TODO / "implement later" / 无代码步骤
- [x] **Type consistency:** 所有接口、类型名称在各 Task 间一致
