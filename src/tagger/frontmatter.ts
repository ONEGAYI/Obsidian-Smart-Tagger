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
    const existing: string[] = frontmatter.tags ?? [];
    const existingStrs = existing.map(String);
    frontmatter.tags = [...new Set([...existingStrs, ...tags])];

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
