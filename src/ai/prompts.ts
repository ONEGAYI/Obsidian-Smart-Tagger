export interface PromptTemplate {
  name: string;
  system: string;
  user: string;
}

const DEFAULT_PROMPT_TEMPLATE: PromptTemplate = {
  name: "默认模板",
  system: `你是一个文档标签生成专家。你的任务是为给定的 Markdown 文档内容生成简洁、准确的标签。

规则：
1. 标签应反映文档的核心主题和关键概念
2. 标签使用中文，除非是专有名词或技术术语
3. 标签不需要加 # 前缀
4. 只返回 JSON 数组格式的标签列表，不要有其他解释
5. 示例格式：["标签1", "标签2", "标签3"]`,
  user: `请为以下文档内容生成合适的标签。标签数量：{{minTags}} 到 {{maxTags}} 个。\n\n{{content}}`,
};

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
