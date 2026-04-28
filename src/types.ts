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
