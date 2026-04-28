import { App, TFile } from "obsidian";

/** 简单通配符匹配：* 匹配非 / 字符，? 匹配单个非 / 字符 */
export function matchGlob(pattern: string, path: string): boolean {
  const re = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]") +
      "$"
  );
  return re.test(path);
}

/** 检查文件路径是否匹配任一排除规则 */
export function isPathExcluded(filePath: string, patterns: string[]): boolean {
  return patterns.some((p) => matchGlob(p, filePath));
}

/** 检查文件 frontmatter 是否包含任一排除键 */
export function hasExcludedKey(app: App, file: TFile, keys: string[]): boolean {
  if (keys.length === 0) return false;
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) return false;
  return keys.some((key) => key in fm);
}

/**
 * 检查文件 frontmatter 中指定字段是否都已存在
 */
export function shouldSkip(app: App, file: TFile, fields: string[]): boolean {
  if (fields.length === 0) return false;
  const cache = app.metadataCache.getFileCache(file);
  const fm = cache?.frontmatter;
  if (!fm) return false;
  return fields.every((field) => hasValue(fm[field]));
}

/**
 * 将标签和自定义字段写入文件 frontmatter
 * - tags: 合并去重
 * - 其他字段: 直接覆盖
 */
function hasValue(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "string" && val.trim() === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

export async function writeFields(
  app: App,
  file: TFile,
  tags: string[],
  fields: Record<string, string>,
  skipFields: string[] = []
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    const skipTags = skipFields.includes("tags") && hasValue(frontmatter.tags);
    if (!skipTags) {
      const existing: string[] = frontmatter.tags ?? [];
      const existingStrs = existing.map(String);
      frontmatter.tags = [...new Set([...existingStrs, ...tags])];
    }

    for (const [key, value] of Object.entries(fields)) {
      if (skipFields.includes(key) && hasValue(frontmatter[key])) continue;
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
