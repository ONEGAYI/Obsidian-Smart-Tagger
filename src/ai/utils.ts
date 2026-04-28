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
