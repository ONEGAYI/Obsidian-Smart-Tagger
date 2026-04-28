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

  return { tags: parseTagsFromResponse(text), fields: {} };
}
