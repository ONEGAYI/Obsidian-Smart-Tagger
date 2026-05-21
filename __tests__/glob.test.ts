import { matchGlob, isPathExcluded } from "../src/tagger/frontmatter";

describe("matchGlob — gitignore 风格匹配", () => {
  // === 无 / 的规则：匹配任意深度的 basename ===
  describe("无 / 规则（basename 匹配）", () => {
    it("CLAUDE.md 匹配任意深度", () => {
      expect(matchGlob("CLAUDE.md", "CLAUDE.md")).toBe(true);
      expect(matchGlob("CLAUDE.md", "projects/CLAUDE.md")).toBe(true);
      expect(matchGlob("CLAUDE.md", "a/b/c/CLAUDE.md")).toBe(true);
      expect(matchGlob("CLAUDE.md", "readme.md")).toBe(false);
    });

    it("*.excalidraw.md 匹配任意深度", () => {
      expect(matchGlob("*.excalidraw.md", "draw.excalidraw.md")).toBe(true);
      expect(matchGlob("*.excalidraw.md", "notes/draw.excalidraw.md")).toBe(true);
      expect(matchGlob("*.excalidraw.md", "a/b/draw.excalidraw.md")).toBe(true);
      expect(matchGlob("*.excalidraw.md", "notes/draw.md")).toBe(false);
    });

    it("*.log 匹配任意深度的 .log 文件", () => {
      expect(matchGlob("*.log", "debug.log")).toBe(true);
      expect(matchGlob("*.log", "logs/debug.log")).toBe(true);
      expect(matchGlob("*.log", "a/b/debug.log")).toBe(true);
      expect(matchGlob("*.log", "debug.txt")).toBe(false);
    });
  });

  // === 有 / 的规则：匹配完整路径 ===
  describe("有 / 规则（完整路径匹配）", () => {
    it("templates/* 仅匹配根目录下 templates/", () => {
      expect(matchGlob("templates/*", "templates/foo.md")).toBe(true);
      expect(matchGlob("templates/*", "sub/templates/foo.md")).toBe(false);
    });

    it("前导 / 表示 vault 根", () => {
      expect(matchGlob("/CLAUDE.md", "CLAUDE.md")).toBe(true);
      expect(matchGlob("/CLAUDE.md", "sub/CLAUDE.md")).toBe(false);
    });
  });

  // === ** 通配符 ===
  describe("** 通配符", () => {
    it("**/CLAUDE.md 匹配任意深度", () => {
      expect(matchGlob("**/CLAUDE.md", "CLAUDE.md")).toBe(true);
      expect(matchGlob("**/CLAUDE.md", "foo/CLAUDE.md")).toBe(true);
      expect(matchGlob("**/CLAUDE.md", "foo/bar/CLAUDE.md")).toBe(true);
      expect(matchGlob("**/CLAUDE.md", "foo/readme.md")).toBe(false);
    });

    it("**/test/*.md 匹配任意深度下的 test 目录", () => {
      expect(matchGlob("**/test/*.md", "test/foo.md")).toBe(true);
      expect(matchGlob("**/test/*.md", "src/test/foo.md")).toBe(true);
      expect(matchGlob("**/test/*.md", "a/b/test/foo.md")).toBe(true);
      expect(matchGlob("**/test/*.md", "test/sub/foo.md")).toBe(false);
    });

    it("src/**/utils.ts 匹配 src 下任意深度", () => {
      expect(matchGlob("src/**/utils.ts", "src/utils.ts")).toBe(true);
      expect(matchGlob("src/**/utils.ts", "src/foo/utils.ts")).toBe(true);
      expect(matchGlob("src/**/utils.ts", "src/a/b/utils.ts")).toBe(true);
      expect(matchGlob("src/**/utils.ts", "lib/utils.ts")).toBe(false);
    });

    it("logs/** 匹配 logs 目录下所有文件", () => {
      expect(matchGlob("logs/**", "logs/a.log")).toBe(true);
      expect(matchGlob("logs/**", "logs/sub/a.log")).toBe(true);
      expect(matchGlob("logs/**", "logs/a/b/c.log")).toBe(true);
      expect(matchGlob("logs/**", "src/a.log")).toBe(false);
    });
  });

  // === 混合和边界情况 ===
  describe("边界情况", () => {
    it("? 匹配单个非 / 字符", () => {
      expect(matchGlob("?.md", "a.md")).toBe(true);
      expect(matchGlob("?.md", "ab.md")).toBe(false);
    });

    it("空规则不匹配任何路径", () => {
      expect(matchGlob("", "foo.md")).toBe(false);
    });

    it("精确匹配", () => {
      expect(matchGlob("readme.md", "readme.md")).toBe(true);
      expect(matchGlob("readme.md", "foo/readme.md")).toBe(true);
      expect(matchGlob("readme.md", "readme.txt")).toBe(false);
    });
  });
});

describe("isPathExcluded", () => {
  it("匹配任一规则即排除", () => {
    expect(isPathExcluded("notes/draw.excalidraw.md", ["*.excalidraw.md"])).toBe(true);
    expect(isPathExcluded("notes/readme.md", ["*.excalidraw.md"])).toBe(false);
  });

  it("空规则不排除任何文件", () => {
    expect(isPathExcluded("any/file.md", [])).toBe(false);
  });

  it("默认规则排除 excalidraw 文件", () => {
    expect(isPathExcluded("drawing.excalidraw.md", ["*.excalidraw.md"])).toBe(true);
    expect(isPathExcluded("sub/drawing.excalidraw.md", ["*.excalidraw.md"])).toBe(true);
  });
});
