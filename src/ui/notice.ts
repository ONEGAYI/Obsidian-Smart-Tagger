import { Notice } from "obsidian";
import { t } from "../i18n";

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
    return new ProgressNotice(t("notice.generating"));
  }
  return new ProgressNotice(t("notice.preparingBatch", { count: fileCount }));
}

export function notifySuccess(tags: string[]): void {
  notify(t("notice.addedTags", { tags: tags.join(", ") }), 3000);
}

export function notifySkipped(): void {
  notify(t("notice.skipped"), 2000);
}

export function notifyBatchComplete(success: number, skipped: number, failed: number): void {
  notify(t("notice.batchComplete", { success, skipped, failed }), 5000);
}

export function notifyError(message: string): void {
  notify(t("notice.error", { message }), 5000);
}

export function notifyBusy(): void {
  notify(t("notice.busy"), 2000);
}

export function notifyTestConnection(success: boolean, error?: string): void {
  if (success) {
    notify(t("notice.testSuccess"), 2000);
  } else {
    notify(t("notice.testFailed", { error: error ? ` - ${error}` : "" }), 5000);
  }
}
