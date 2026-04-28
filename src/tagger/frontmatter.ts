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
