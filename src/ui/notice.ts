import { Notice } from "obsidian";

const PREFIX = "Smart Tagger";

function notify(message: string, timeout: number = 3000): void {
  new Notice(`${PREFIX}: ${message}`, timeout);
}

export function notifySuccess(tags: string[]): void {
  notify(`已添加标签 ${tags.join(", ")}`, 3000);
}

export function notifySkipped(): void {
  notify("已跳过（已有标签）", 2000);
}

export function notifyProgress(current: number, total: number): void {
  notify(`正在处理 ${current}/${total}...`, 2000);
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
