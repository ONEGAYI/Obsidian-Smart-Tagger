/** 统一日志输出。按 Obsidian 社区规范：默认配置下不应输出 debug 日志，仅允许 error。 */
const PREFIX = "[Smart-Tagger]";

export class Logger {
  /**
   * @param getDebug 读取实时 debugMode 的闭包。设置面板切换后无需重建 logger 即可生效。
   */
  constructor(private getDebug: () => boolean) {}

  /** 调试日志，仅 debugMode 开启时输出 */
  debug(...args: unknown[]): void {
    if (this.getDebug()) console.log(PREFIX, ...args);
  }

  /** 警告，始终输出（用于真实故障提醒，如 API Key 解密失败） */
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args);
  }

  /** 错误，始终输出（社区规范允许 error 永远输出） */
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  }
}
