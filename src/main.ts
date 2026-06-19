import { Plugin, TFile, TFolder, Menu, Notice, FileSystemAdapter } from "obsidian";
import { SmartTaggerSettings, DEFAULT_SETTINGS, DEFAULT_PROMPT_TEMPLATE } from "./types";
import { OpenAIClient } from "./ai/openai-client";
import { OllamaClient } from "./ai/ollama-client";
import { getDefaultTemplates, findTemplate } from "./ai/prompts";
import { encryptApiKey, decryptApiKey } from "./crypto";
import { Tagger } from "./tagger/tagger";
import { SmartTaggerSettingTab } from "./settings";
import { Logger } from "./logger";
import { t } from "./i18n";

export default class SmartTaggerPlugin extends Plugin {
  settings!: SmartTaggerSettings;
  tagger!: Tagger;
  logger!: Logger;

  async onload() {
    this.logger = new Logger(() => this.settings.debugMode);

    await this.loadSettings();
    this.logger.debug("插件加载");

    if (this.settings.promptTemplates.length === 0) {
      this.settings.promptTemplates = getDefaultTemplates();
      this.settings.activePromptName = DEFAULT_PROMPT_TEMPLATE.name;
      await this.saveSettings();
    } else {
      // 迁移：为老用户的默认模板补上稳定 id，使后续 findTemplate 可按 id 匹配
      this.migrateTemplateIds();
    }

    const client = this.createClient();
    this.tagger = new Tagger(this.app, client, this.settings, this.logger);

    this.registerCommands();
    this.registerFileMenu();

    const settingTab = new SmartTaggerSettingTab(
      this.app,
      this,
      this.settings,
      async (settings) => {
        this.settings = settings;
        await this.saveSettings();
        this.tagger.updateSettings(this.settings);
        const client = this.createClient();
        this.tagger.updateClient(client);
      },
      async () => {
        const client = this.createClient();
        return client.testConnection();
      }
    );
    await settingTab.initDecryptedKey();
    this.addSettingTab(settingTab);
  }

  onunload() {
    this.logger.debug("插件卸载");
  }

  private async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

    // 迁移：skipTaggedFiles → skipFields
    const legacy = data as Record<string, unknown>;
    if (legacy.skipTaggedFiles !== undefined && legacy.skipFields === undefined) {
      this.settings.skipFields = legacy.skipTaggedFiles ? ["tags"] : [];
      await this.saveSettings();
    }

    if (this.settings.openaiApiKey) {
      try {
        this.settings.openaiApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.getVaultPath()
        );
      } catch {
        this.logger.warn("API Key 解密失败，已清空。请重新输入 API Key。");
        new Notice(t("notice.decryptFailed"));
        this.settings.openaiApiKey = "";
      }
    }
  }

  private async saveSettings(): Promise<void> {
    const toSave = { ...this.settings };
    if (toSave.openaiApiKey) {
      toSave.openaiApiKey = await encryptApiKey(
        toSave.openaiApiKey,
        this.getVaultPath()
      );
    }
    await this.saveData(toSave);
  }

  /**
   * 获取 vault 根目录的绝对路径，作为 API Key 加密的密钥材料。
   * getBasePath 仅存在于 FileSystemAdapter（桌面端），移动端为 DummyMetadataAdapter 不支持，
   * 用 instanceof 窄化以通过类型检查，移动端回退为空串。
   */
  private getVaultPath(): string {
    const adapter = this.app.vault.adapter;
    return adapter instanceof FileSystemAdapter ? adapter.getBasePath() : "";
  }

  /** 给老版本（无 id）的默认模板补上稳定 id "__default__"，便于 findTemplate 按 id 匹配 */
  private migrateTemplateIds(): void {
    let changed = false;
    this.settings.promptTemplates = this.settings.promptTemplates.map((tpl) => {
      if (!tpl.id && tpl.name === DEFAULT_PROMPT_TEMPLATE.name) {
        changed = true;
        return { ...tpl, id: DEFAULT_PROMPT_TEMPLATE.id };
      }
      return tpl;
    });
    if (changed) {
      void this.saveSettings();
    }
  }

  private createClient() {
    const template =
      findTemplate(this.settings.promptTemplates, this.settings.activePromptName) ??
      this.settings.promptTemplates[0] ??
      DEFAULT_PROMPT_TEMPLATE;

    if (this.settings.aiMode === "ollama") {
      const client = new OllamaClient(
        { baseUrl: this.settings.ollamaBaseUrl, model: this.settings.ollamaModel },
        template
      );
      client.updateThinking(this.settings.enableThinking);
      return client;
    }

    const client = new OpenAIClient(
      {
        baseUrl: this.settings.openaiBaseUrl,
        apiKey: this.settings.openaiApiKey,
        model: this.settings.openaiModel,
      },
      template
    );
    client.updateThinking(this.settings.enableThinking);
    return client;
  }

  private registerCommands(): void {
    this.addCommand({
      id: "tag-current-file",
      name: t("command.tagFile"),
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return;
        void this.tagger.generateTagsForFile(file);
      },
    });

    this.addCommand({
      id: "tag-current-folder",
      name: t("command.tagFolder"),
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return;
        const folder = file.parent;
        if (!folder) return;
        void this.tagger.generateTagsForFolder(folder);
      },
    });
  }

  private registerFileMenu(): void {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle(t("command.menuTagFile"))
              .setIcon("tag")
              .onClick(() => {
                void this.tagger.generateTagsForFile(file);
              });
          });
        }

        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle(t("command.menuTagFolder"))
              .setIcon("tag")
              .onClick(() => {
                void this.tagger.generateTagsForFolder(file);
              });
          });
        }
      })
    );
  }
}
