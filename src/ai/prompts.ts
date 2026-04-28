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
