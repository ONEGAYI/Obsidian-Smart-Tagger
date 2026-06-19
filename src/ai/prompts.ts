import { PromptTemplate, DEFAULT_PROMPT_TEMPLATE, CustomField } from "../types";

interface RenderContext {
  content: string;
  minTags: number;
  maxTags: number;
  existingTags: string[];
  preferExisting: boolean;
  /** 标签输出语言友好名（如 "中文" / "English"），注入 {{language}} 变量 */
  language: string;
}

export interface RenderedPrompt {
  system: string;
  user: string;
  customFields: CustomField[];
}

/** 从模板文本中提取 {{key: prompt}} 自定义字段 */
export function extractCustomFields(template: string): { cleaned: string; fields: CustomField[] } {
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

/** 将上下文变量替换进模板文本（system 与 user 共用同一套替换规则） */
function applyVars(template: string, context: RenderContext): string {
  const existingBlock =
    context.preferExisting && context.existingTags.length > 0
      ? `请优先从以下已有标签中选取，只有在必要时才添加新标签：\n${context.existingTags.join("、")}`
      : "";

  return template
    .replace(/\{\{minTags\}\}/g, String(context.minTags))
    .replace(/\{\{maxTags\}\}/g, String(context.maxTags))
    .replace(/\{\{language\}\}/g, context.language)
    .replace(/\{\{existingTags\}\}/g, existingBlock)
    .replace(/\{\{content\}\}/g, context.content);
}

export function renderPrompt(
  template: PromptTemplate,
  context: RenderContext
): RenderedPrompt {
  const { cleaned, fields: customFields } = extractCustomFields(template.user);

  const userPrompt = applyVars(cleaned, context);

  const schemaSuffix = buildSchemaInstruction(customFields);
  const systemPrompt = applyVars(template.system, context) + schemaSuffix;

  return {
    system: systemPrompt,
    user: userPrompt,
    customFields,
  };
}

export function getDefaultTemplates(): PromptTemplate[] {
  return [{ ...DEFAULT_PROMPT_TEMPLATE }];
}

/** 匹配模板：优先按 id，无命中再按 name。identifier 兼容老用户存的 name 字符串 */
export function findTemplate(
  templates: PromptTemplate[],
  identifier: string
): PromptTemplate | undefined {
  return templates.find((t) => t.id === identifier) ?? templates.find((t) => t.name === identifier);
}

export function upsertTemplate(
  templates: PromptTemplate[],
  template: PromptTemplate
): PromptTemplate[] {
  // 有 id 时按 id 去重，否则按 name 去重
  const matcher = template.id
    ? (t: PromptTemplate) => t.id === template.id
    : (t: PromptTemplate) => t.name === template.name;
  const idx = templates.findIndex(matcher);
  if (idx >= 0) {
    const updated = [...templates];
    updated[idx] = template;
    return updated;
  }
  return [...templates, template];
}

/** 删除模板：identifier 优先按 id 匹配，无命中按 name */
export function deleteTemplate(
  templates: PromptTemplate[],
  identifier: string
): PromptTemplate[] {
  const match =
    templates.find((t) => t.id === identifier) ?? templates.find((t) => t.name === identifier);
  if (!match) return templates;
  return templates.filter((t) => t !== match);
}
