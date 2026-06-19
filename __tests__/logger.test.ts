import { Logger } from "../src/logger";

describe("Logger", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("debug", () => {
    it("debugMode 为 false 时不调用 console.log", () => {
      const logger = new Logger(() => false);
      logger.debug("标签生成成功", ["a", "b"]);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("debugMode 为 true 时调用 console.log 并带 [Smart-Tagger] 前缀", () => {
      const logger = new Logger(() => true);
      logger.debug("标签生成成功", ["a", "b"]);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("[Smart-Tagger]", "标签生成成功", ["a", "b"]);
    });

    it("getDebug 闭包能动态读取最新值", () => {
      let debug = false;
      const logger = new Logger(() => debug);
      logger.debug("first");
      expect(logSpy).not.toHaveBeenCalled();

      debug = true;
      logger.debug("second");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("[Smart-Tagger]", "second");
    });
  });

  describe("warn", () => {
    it("始终调用 console.warn 并带前缀，无论 debugMode", () => {
      const logger = new Logger(() => false);
      logger.warn("API Key 解密失败");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith("[Smart-Tagger]", "API Key 解密失败");
    });
  });

  describe("error", () => {
    it("始终调用 console.error 并带前缀，无论 debugMode", () => {
      const logger = new Logger(() => false);
      logger.error("标签生成失败", new Error("boom"));
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("[Smart-Tagger]", "标签生成失败", expect.any(Error));
    });
  });
});
