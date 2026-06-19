import { getLocale, t, setLocale } from "../src/i18n";

/**
 * jest 默认 node 环境无 window。本插件运行在 Obsidian（浏览器环境），getLocale 依赖 window.moment。
 * 这里通过 globalThis 模拟一个最小 window，供 getLocale 检测。
 */
function setMomentLocale(locale: string | undefined): void {
  (globalThis as { window?: { moment?: { locale: () => string } } }).window =
    locale === undefined ? undefined : { moment: { locale: () => locale } };
}

describe("i18n", () => {
  afterEach(() => {
    // 每个用例后重置为默认检测，避免互相影响
    setLocale("auto");
    setMomentLocale("en");
  });

  describe("getLocale", () => {
    it("moment.locale() 为 zh-cn 时返回 zh", () => {
      setMomentLocale("zh-cn");
      expect(getLocale()).toBe("zh");
    });

    it("moment.locale() 为 zh-tw 时返回 zh", () => {
      setMomentLocale("zh-tw");
      expect(getLocale()).toBe("zh");
    });

    it("moment.locale() 为 en 时返回 en", () => {
      setMomentLocale("en");
      expect(getLocale()).toBe("en");
    });

    it("非 zh 语言（如 fr）回退为 en", () => {
      setMomentLocale("fr");
      expect(getLocale()).toBe("en");
    });

    it("window.moment 不存在时不崩溃，回退为 en", () => {
      setMomentLocale(undefined);
      expect(getLocale()).toBe("en");
    });
  });

  describe("setLocale 手动覆盖", () => {
    it("setLocale('zh') 强制中文，忽略 moment", () => {
      setMomentLocale("en");
      setLocale("zh");
      expect(t("notice.generating")).toBe("正在生成标签...");
    });

    it("setLocale('en') 强制英文", () => {
      setMomentLocale("zh-cn");
      setLocale("en");
      expect(t("notice.generating")).toBe("Generating tags...");
    });

    it("setLocale('auto') 恢复自动检测", () => {
      setMomentLocale("zh-cn");
      setLocale("en");
      setLocale("auto");
      expect(t("notice.generating")).toBe("正在生成标签...");
    });
  });

  describe("t 翻译", () => {
    beforeEach(() => {
      setLocale("zh");
    });

    it("中文 locale 返回中文文案", () => {
      expect(t("notice.skipped")).toBe("已跳过（指定字段已存在）");
    });

    it("英文 locale 返回英文文案", () => {
      setLocale("en");
      expect(t("notice.skipped")).toBe("Skipped (specified fields already exist)");
    });

    it("支持 {var} 插值", () => {
      expect(t("notice.preparingBatch", { count: 5 })).toBe("准备处理 5 个文件...");
    });

    it("多变量插值", () => {
      expect(
        t("notice.batchComplete", { success: 3, skipped: 1, failed: 0 })
      ).toBe("完成！成功 3，跳过 1，失败 0");
    });

    it("不存在的 key 返回 key 本身不崩溃", () => {
      expect(t("nonexistent.deep.key")).toBe("nonexistent.deep.key");
    });

    it("缺少插值变量时保留占位符不崩溃", () => {
      expect(t("notice.preparingBatch")).toBe("准备处理 {count} 个文件...");
    });
  });

  describe("getLanguageName", () => {
    it("zh locale 返回 '中文'", async () => {
      const { getLanguageName } = await import("../src/i18n");
      setLocale("zh");
      expect(getLanguageName()).toBe("中文");
    });

    it("en locale 返回 'English'", async () => {
      const { getLanguageName } = await import("../src/i18n");
      setLocale("en");
      expect(getLanguageName()).toBe("English");
    });
  });
});

describe("i18n 字典对齐（防漏译）", () => {
  const collectKeys = (obj: unknown, prefix = ""): string[] => {
    if (obj === null || typeof obj !== "object") return [];
    const out: string[] = [];
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object") {
        out.push(...collectKeys(v, full));
      } else {
        out.push(full);
      }
    }
    return out;
  };

  it("zh 与 en 的 key 完全对齐", async () => {
    const { zh } = await import("../src/i18n/locales/zh");
    const { en } = await import("../src/i18n/locales/en");
    const zhKeys = collectKeys(zh).sort();
    const enKeys = collectKeys(en).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("没有任何值为空字符串", async () => {
    const { zh } = await import("../src/i18n/locales/zh");
    const { en } = await import("../src/i18n/locales/en");
    const checkEmpty = (obj: unknown, label: string): void => {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (v !== null && typeof v === "object") {
          checkEmpty(v, `${label}.${k}`);
        } else if (v === "") {
          throw new Error(`${label}.${k} 的值为空字符串`);
        }
      }
    };
    checkEmpty(zh, "zh");
    checkEmpty(en, "en");
  });
});
