import { App } from "obsidian";

let cachedTags: string[] | null = null;

/**
 * 获取 vault 中所有已有标签（带缓存）
 */
export function getVaultTags(app: App): string[] {
  if (cachedTags !== null) return cachedTags;

  const tagMap = app.metadataCache.getTags();
  if (!tagMap) {
    cachedTags = [];
    return cachedTags;
  }

  cachedTags = Object.keys(tagMap).map((tag) => tag.replace(/^#/, ""));
  return cachedTags;
}

/**
 * 清除缓存（每次生成标签后调用）
 */
export function invalidateVaultTagsCache(): void {
  cachedTags = null;
}

/**
 * 获取按出现次数排序的标签列表（降序）
 */
export function getVaultTagsSorted(app: App, limit?: number): string[] {
  const tagMap = app.metadataCache.getTags();
  if (!tagMap) return [];

  const entries = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag: tag.replace(/^#/, ""), count }))
    .sort((a, b) => b.count - a.count);

  const tags = entries.map((e) => e.tag);
  return limit ? tags.slice(0, limit) : tags;
}
