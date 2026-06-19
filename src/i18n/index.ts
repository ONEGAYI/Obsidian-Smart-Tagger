import { zh } from "./locales/zh";
import { en } from "./locales/en";

export type Locale = "zh" | "en";

const dictionaries: Record<Locale, unknown> = { zh, en };

/** 手动覆盖的 locale；为 "auto" 时走自动检测 */
let override: Locale | "auto" = "auto";

/**
 * 获取当前 locale：优先手动覆盖，否则基于 window.moment.locale() 检测。
 * 非 zh 开头的语言一律回退为 en。
 */
export function getLocale(): Locale {
  if (override !== "auto") return override;
  const m = (typeof window !== "undefined" && (window as { moment?: { locale: () => string } }).moment) || undefined;
  const raw = m ? String(m.locale()).toLowerCase() : "";
  return raw.startsWith("zh") ? "zh" : "en";
}

/**
 * 手动设置 locale。主要用于：
 * - 测试时强制语言
 * - 未来若提供插件内语言切换开关
 * 传入 "auto" 恢复自动检测。
 */
export function setLocale(locale: Locale | "auto"): void {
  override = locale;
}

/** 按点分路径从字典取值，如 "notice.generating" */
function pick(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, seg) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[seg];
    }
    return undefined;
  }, dict);
}

/** 将字符串中的 {name} 占位符替换为 vars 对应值；缺失的变量保留原占位符 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
  });
}

/**
 * 翻译函数。
 * @param key 点分路径，如 "notice.generating"
 * @param vars 插值变量，如 { count: 5 } 对应模板中的 {count}
 * @returns 翻译后的字符串；key 不存在时原样返回（不抛错）
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = dictionaries[getLocale()];
  const value = pick(dict, key);
  if (typeof value !== "string") return key;
  return interpolate(value, vars);
}

/** 返回标签输出语言的友好名称，用于注入提示词的 {{language}} 变量 */
export function getLanguageName(): string {
  return getLocale() === "zh" ? "中文" : "English";
}
