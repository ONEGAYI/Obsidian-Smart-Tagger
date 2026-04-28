import { App, TFile, TFolder } from "obsidian";
import { AIClient, SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE } from "../types";
import { findTemplate, extractCustomFields } from "../ai/prompts";
import { shouldSkip, extractContent, truncateContent, writeFields, isPathExcluded, hasExcludedKey } from "./frontmatter";
import { getVaultTags, invalidateVaultTagsCache } from "./vault-tags";
import {
  ProgressNotice,
  notifyStart,
  notifySuccess,
  notifySkipped,
  notifyBatchComplete,
  notifyError,
  notifyBusy,
} from "../ui/notice";

export class Tagger {
  private isProcessing = false;

  constructor(
    private app: App,
    protected client: AIClient,
    private settings: SmartTaggerSettings
  ) {}

  updateClient(client: AIClient) {
    this.client = client;
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

    if (this.isFileExcluded(file)) {
      notifySkipped();
      return { success: false, reason: "excluded" };
    }

    const template = this.getActiveTemplate();
    if (shouldSkip(this.app, file, this.buildSkipCheckFields(template))) {
      notifySkipped();
      return { success: false, reason: "skipped" };
    }

    const progress = notifyStart(1);

    try {
      this.isProcessing = true;
      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];
      const result = await this.generateForSingleFile(file, existingTags, template);

      if (result.tags.length === 0) {
        progress.done();
        notifyError("AI 未返回有效标签");
        return { success: false, reason: "empty" };
      }

      await writeFields(this.app, file, result.tags, result.fields, this.settings.skipFields);
      invalidateVaultTagsCache();
      progress.done();
      notifySuccess(result.tags);

      if (this.settings.debugMode) {
        console.log("[Smart-Tagger] 标签生成成功:", file.path, result.tags, result.fields);
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      progress.done();
      notifyError(message);
      console.error("[Smart-Tagger] 标签生成失败:", error);
      return { success: false, reason: "error" };
    } finally {
      this.isProcessing = false;
    }
  }

  /** 为单个文件生成标签的核心逻辑 */
  private async generateForSingleFile(file: TFile, existingTags: string[], template: PromptTemplate) {
    const content = await this.app.vault.read(file);
    const body = extractContent(content);
    const truncated = truncateContent(body, this.settings.maxContentChars);

    this.client.updateTemplate?.(template);

    return await this.client.generateTags(truncated, {
      existingTags,
      preferExisting: this.settings.preferExistingTags,
      minTags: this.settings.minTags,
      maxTags: this.settings.maxTags,
    });
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
    let processed = 0;

    const progress = notifyStart(files.length);

    try {
      const existingTags = this.settings.preferExistingTags ? getVaultTags(this.app) : [];
      const template = this.getActiveTemplate();
      const skipCheckFields = this.buildSkipCheckFields(template);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (this.isFileExcluded(file)) {
          skipped++;
          processed++;
          progress.update(`正在处理 ${processed}/${files.length}（已跳过 ${skipped}）`);
          continue;
        }

        if (shouldSkip(this.app, file, skipCheckFields)) {
          skipped++;
          processed++;
          progress.update(`正在处理 ${processed}/${files.length}（已跳过 ${skipped}）`);
          continue;
        }

        progress.update(`正在处理 ${processed + 1}/${files.length} — ${file.basename}`);

        try {
          const result = await this.generateForSingleFile(file, existingTags, template);

          if (result.tags.length > 0) {
            await writeFields(this.app, file, result.tags, result.fields, this.settings.skipFields);
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error("[Smart-Tagger] 文件处理失败:", file.path, error);
          failed++;
        }

        processed++;
      }

      invalidateVaultTagsCache();
      progress.done();
      notifyBatchComplete(success, skipped, failed);
    } catch (error) {
      progress.done();
      throw error;
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

  private isFileExcluded(file: TFile): boolean {
    return (
      isPathExcluded(file.path, this.settings.excludePatterns) ||
      hasExcludedKey(this.app, file, this.settings.excludeFrontmatterKeys)
    );
  }

  /** 构建 skipFields + 模板自定义字段的合并列表 */
  private buildSkipCheckFields(template: PromptTemplate): string[] {
    if (this.settings.skipFields.length === 0) return [];
    const { fields } = extractCustomFields(template.user);
    const customKeys = fields.map((f) => f.key);
    return [...new Set([...this.settings.skipFields, ...customKeys])];
  }

  /** 获取当前活跃提示词模板 */
  private getActiveTemplate(): PromptTemplate {
    const template = findTemplate(this.settings.promptTemplates, this.settings.activePromptName);
    return template ?? this.settings.promptTemplates[0] ?? DEFAULT_PROMPT_TEMPLATE;
  }
}
