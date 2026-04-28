import { renderPrompt, getDefaultTemplates } from "../src/ai/prompts";

const DEFAULT_TEMPLATE = {
  name: "默认模板",
  system: "你是一个文档标签生成专家。",
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
      });
      expect(result.user).not.toContain("机器学习");
      expect(result.user).not.toContain("优先从以下已有标签");
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
