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
  const { cleaned, fields: customFields } = extractCustomFields(template.user);

  const existingBlock =
    context.preferExisting && context.existingTags.length > 0
      ? `请优先从以下已有标签中选取，只有在必要时才添加新标签：\n${context.existingTags.join("、")}`
      : "";

  const userPrompt = cleaned
    .replace(/\{\{minTags\}\}/g, String(context.minTags))
    .replace(/\{\{maxTags\}\}/g, String(context.maxTags))
    .replace(/\{\{existingTags\}\}/g, existingBlock)
    .replace(/\{\{content\}\}/g, context.content);

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
