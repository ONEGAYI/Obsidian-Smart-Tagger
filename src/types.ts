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

/** AI 客户端接口 */
export interface AIClient {
  generateTags(content: string, options: PromptOptions): Promise<GenerateResult>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  updateTemplate?(template: PromptTemplate): void;
  updateThinking?(enabled: boolean): void;
}

/** AI 调用选项 */
export interface PromptOptions {
  existingTags: string[];
  preferExisting: boolean;
  minTags: number;
  maxTags: number;
  /** 标签输出语言友好名，注入提示词 {{language}} 变量 */
  language: string;
}

/** 提示词模板 */
export interface PromptTemplate {
  /** 稳定标识，作为数据主键（不随语言变化）；用户自建模板可缺省，此时回退按 name 匹配 */
  id?: string;
  name: string;
  system: string;
  user: string;
}

/** 默认排除路径规则 */
export const DEFAULT_EXCLUDE_PATTERNS = ["*.excalidraw.md"];

/** 默认排除 frontmatter 键 */
export const DEFAULT_EXCLUDE_FM_KEYS = ["kanban-plugin", "excalidraw-plugin"];

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
  skipFields: string[];
  excludePatterns: string[];
  excludeFrontmatterKeys: string[];

  maxRecursiveDepth: number;
  maxContentChars: number;

  promptTemplates: PromptTemplate[];
  activePromptName: string;

  enableThinking: boolean;
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
  skipFields: ["tags"],
  excludePatterns: [...DEFAULT_EXCLUDE_PATTERNS],
  excludeFrontmatterKeys: [...DEFAULT_EXCLUDE_FM_KEYS],

  maxRecursiveDepth: 1,
  maxContentChars: 4000,

  promptTemplates: [],
  activePromptName: "默认模板",

  enableThinking: false,
  debugMode: false,
};

/** 默认提示词模板 */
export const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  id: "__default__",
  name: "默认模板",
  system: `你是一个文档标签生成专家。你的任务是为给定的 Markdown 文档内容生成简洁、准确的标签。

规则：
1. 标签应反映文档的核心主题和关键概念
2. 标签使用 {{language}}，除非是专有名词或技术术语
3. 标签不需要加 # 前缀
4. 只返回 JSON 数组格式的标签列表，不要有其他解释
5. 示例格式：["标签1", "标签2", "标签3"]
6. 如果提供了已有标签列表，优先从中选取匹配的标签，尽量避免创建新标签，保持标签体系一致性`,
  user: `请为以下文档内容生成合适的标签。标签数量：{{minTags}} 到 {{maxTags}} 个。

{{existingTags}}
{{content}}`,
};
