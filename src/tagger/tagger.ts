import { App, TFile, TFolder } from "obsidian";
import { AIClient, SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE } from "../types";
import { findTemplate } from "../ai/prompts";
import { hasTags, extractContent, truncateContent, writeTags } from "./frontmatter";
import { getVaultTags, invalidateVaultTagsCache } from "./vault-tags";
import {
  notifySuccess,
  notifySkipped,
  notifyProgress,
  notifyBatchComplete,
  notifyError,
  notifyBusy,
} from "../ui/notice";

export class Tagger {
  private isProcessing = false;

  constructor(
    private app: App,
    private client: AIClient,
    private settings: SmartTaggerSettings
  ) {}

  updateClient(client: AIClient) {
    (this as any).client = client;
  }

  updateSettings(settings: SmartTaggerSettings) {
    this.settings = settings;
  }

  /** 为单个文件生成标签 */
  async generateTagsForFile(file: TFile): Promise<{ success: boolean; reason?: string }> {
    if (this.isProcessing) {
      notifyBusy();
      return { success: false, reason: "busy" };
    }

    if (this.settings.skipTaggedFiles && hasTags(this.app, file)) {
      notifySkipped();
      return { success: false, reason: "skipped" };
    }

    try {
      this.isProcessing = true;
      const content = await this.app.vault.read(file);
      const body = extractContent(content);
      const truncated = truncateContent(body, this.settings.maxContentChars);

      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];

      const template = this.getActiveTemplate();
      if ("updateTemplate" in this.client) {
        (this.client as any).updateTemplate(template);
      }

      const tags = await this.client.generateTags(truncated, {
        existingTags,
        preferExisting: this.settings.preferExistingTags,
        minTags: this.settings.minTags,
        maxTags: this.settings.maxTags,
      });

      if (tags.length === 0) {
        notifyError("AI 未返回有效标签");
        return { success: false, reason: "empty" };
      }

      await writeTags(this.app, file, tags);
      invalidateVaultTagsCache();
      notifySuccess(tags);

      if (this.settings.debugMode) {
        console.log("[Smart-Tagger] 标签生成成功:", file.path, tags);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifyError(message);
      console.error("[Smart-Tagger] 标签生成失败:", error);
      return { success: false, reason: "error" };
    } finally {
      this.isProcessing = false;
    }
  }

  /** 为文件夹批量生成标签 */
  async generateTagsForFolder(folder: TFolder): Promise<void> {
    if (this.isProcessing) {
      notifyBusy();
      return;
    }

    const files = this.collectFiles(folder, this.settings.maxRecursiveDepth);
    if (files.length === 0) {
      notifyError("文件夹中没有 Markdown 文件");
      return;
    }

    this.isProcessing = true;
    let success = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (this.settings.skipTaggedFiles && hasTags(this.app, file)) {
          skipped++;
          continue;
        }

        notifyProgress(i + 1, files.length);

        try {
          const content = await this.app.vault.read(file);
          const body = extractContent(content);
          const truncated = truncateContent(body, this.settings.maxContentChars);

          const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];

          const template = this.getActiveTemplate();
          if ("updateTemplate" in this.client) {
            (this.client as any).updateTemplate(template);
          }

          const tags = await this.client.generateTags(truncated, {
            existingTags,
            preferExisting: this.settings.preferExistingTags,
            minTags: this.settings.minTags,
            maxTags: this.settings.maxTags,
          });

          if (tags.length > 0) {
            await writeTags(this.app, file, tags);
            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      invalidateVaultTagsCache();
      notifyBatchComplete(success, skipped, failed);
    } finally {
      this.isProcessing = false;
    }
  }

  /** 按递归深度收集 Markdown 文件 */
  private collectFiles(folder: TFolder, maxDepth: number): TFile[] {
    const files: TFile[] = [];
    const walk = (current: TFolder, depth: number) => {
      for (const child of current.children) {
        if (child instanceof TFile && child.extension === "md") {
          files.push(child);
        } else if (child instanceof TFolder && depth < maxDepth) {
          walk(child, depth + 1);
        }
      }
    };
    walk(folder, 0);
    return files;
  }

  /** 获取当前活跃提示词模板 */
  private getActiveTemplate(): PromptTemplate {
    const template = findTemplate(this.settings.promptTemplates, this.settings.activePromptName);
    return template ?? this.settings.promptTemplates[0] ?? DEFAULT_PROMPT_TEMPLATE;
  }
}
