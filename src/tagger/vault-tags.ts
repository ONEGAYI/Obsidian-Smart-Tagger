import { App, MetadataCache } from "obsidian";

/**
 * Vault 中所有标签及其出现次数。
 * metadataCache.getTags() 运行时存在但 obsidian 类型定义未声明（历史补全滞后），
 * 这里集中做一次类型断言，避免散落的 as。
 */
function getAllTags(app: App): Record<string, number> {
  const cache = app.metadataCache as MetadataCache & {
    getTags?: () => Record<string, number>;
  };
  return cache.getTags?.() ?? {};
}

let cachedTags: string[] | null = null;

/**
 * 获取 vault 中所有已有标签（带缓存）
 */
export function getVaultTags(app: App): string[] {
  if (cachedTags !== null) return cachedTags;

  const tagMap = getAllTags(app);
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
  const tagMap = getAllTags(app);
  const entries = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag: tag.replace(/^#/, ""), count }))
    .sort((a, b) => b.count - a.count);

  const tags = entries.map((e) => e.tag);
  return limit ? tags.slice(0, limit) : tags;
}
