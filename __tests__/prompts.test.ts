import { renderPrompt, getDefaultTemplates } from "../src/ai/prompts";

const DEFAULT_TEMPLATE = {
  name: "默认模板",
  system: "你是一个文档标签生成专家。标签使用 {{language}}。",
  user: "请为以下文档内容生成合适的标签。标签数量：{{minTags}} 到 {{maxTags}} 个。\n\n{{content}}",
};

describe("prompts", () => {
  describe("renderPrompt", () => {
    it("应正确替换基础变量", () => {
      const result = renderPrompt(DEFAULT_TEMPLATE, {
        content: "这是一篇关于机器学习的文章",
        minTags: 3,
        maxTags: 8,
        existingTags: [],
        preferExisting: false,
        language: "中文",
      });
      expect(result.user).toContain("3 到 8 个");
      expect(result.user).toContain("这是一篇关于机器学习的文章");
    });

    it("preferExisting 开启时应注入已有标签", () => {
      const result = renderPrompt(DEFAULT_TEMPLATE, {
        content: "测试内容",
        minTags: 3,
        maxTags: 5,
        existingTags: ["机器学习", "深度学习", "Python"],
        preferExisting: true,
        language: "中文",
      });
      expect(result.user).toContain("机器学习");
      expect(result.user).toContain("深度学习");
      expect(result.user).toContain("优先从以下已有标签");
    });

    it("preferExisting 关闭时不应注入已有标签", () => {
      const result = renderPrompt(DEFAULT_TEMPLATE, {
        content: "测试内容",
        minTags: 3,
        maxTags: 5,
        existingTags: ["机器学习"],
        preferExisting: false,
        language: "中文",
      });
      expect(result.user).not.toContain("机器学习");
      expect(result.user).not.toContain("优先从以下已有标签");
    });

    it("应在 system 提示词中替换 {{language}} 变量", () => {
      const zh = renderPrompt(DEFAULT_TEMPLATE, {
        content: "x",
        minTags: 1,
        maxTags: 3,
        existingTags: [],
        preferExisting: false,
        language: "中文",
      });
      expect(zh.system).toContain("标签使用 中文");
      expect(zh.system).not.toContain("{{language}}");

      const en = renderPrompt(DEFAULT_TEMPLATE, {
        content: "x",
        minTags: 1,
        maxTags: 3,
        existingTags: [],
        preferExisting: false,
        language: "English",
      });
      expect(en.system).toContain("标签使用 English");
    });
  });

  describe("getDefaultTemplates", () => {
    it("应返回包含默认模板的数组", () => {
      const templates = getDefaultTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates[0].name).toBe("默认模板");
    });
  });
});
