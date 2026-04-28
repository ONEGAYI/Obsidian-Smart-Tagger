import { Notice } from "obsidian";

const PREFIX = "Smart Tagger";
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function notify(message: string, timeout: number = 3000): void {
  new Notice(`${PREFIX}: ${message}`, timeout);
}

/** 可更新的进度通知，用于长时间操作中原地刷新文字 */
export class ProgressNotice {
  private notice: Notice;
  private baseMessage: string;
  private timer: number | null = null;
  private frame = 0;

  constructor(message: string) {
    this.baseMessage = message;
    this.notice = new Notice(this.format(), 0);
    this.startSpinner();
  }

  update(message: string): void {
    this.baseMessage = message;
    this.notice.setMessage(this.format());
  }

  done(): void {
    this.stopSpinner();
    this.notice.hide();
  }

  private format(): string {
    return `${PREFIX}: ${SPINNER[this.frame]} ${this.baseMessage}`;
  }

  private startSpinner(): void {
    this.timer = window.setInterval(() => {
      this.frame = (this.frame + 1) % SPINNER.length;
      this.notice.setMessage(this.format());
    }, 80);
  }

  private stopSpinner(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export function notifyStart(fileCount: number): ProgressNotice {
  if (fileCount === 1) {
    return new ProgressNotice("正在生成标签...");
  }
  return new ProgressNotice(`准备处理 ${fileCount} 个文件...`);
}

export function notifySuccess(tags: string[]): void {
  notify(`已添加标签 ${tags.join(", ")}`, 3000);
}

export function notifySkipped(): void {
  notify("已跳过（指定字段已存在）", 2000);
}

export function notifyBatchComplete(success: number, skipped: number, failed: number): void {
  notify(`完成！成功 ${success}，跳过 ${skipped}，失败 ${failed}`, 5000);
}

export function notifyError(message: string): void {
  notify(`错误 - ${message}`, 5000);
}

export function notifyBusy(): void {
  notify("正在处理中，请稍候", 2000);
}

export function notifyTestConnection(success: boolean, error?: string): void {
  if (success) {
    notify("连接测试成功", 2000);
  } else {
    notify(`连接测试失败${error ? ` - ${error}` : ""}`, 5000);
  }
}
