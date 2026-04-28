import { Plugin, TFile, TFolder, Menu } from "obsidian";
import { SmartTaggerSettings, DEFAULT_SETTINGS, DEFAULT_PROMPT_TEMPLATE } from "./types";
import { OpenAIClient } from "./ai/openai-client";
import { OllamaClient } from "./ai/ollama-client";
import { getDefaultTemplates, findTemplate } from "./ai/prompts";
import { encryptApiKey, decryptApiKey } from "./crypto";
import { Tagger } from "./tagger/tagger";
import { SmartTaggerSettingTab } from "./settings";

export default class SmartTaggerPlugin extends Plugin {
  settings!: SmartTaggerSettings;
  tagger!: Tagger;

  async onload() {
    console.log("[Smart-Tagger] 插件加载");

    await this.loadSettings();

    if (this.settings.promptTemplates.length === 0) {
      this.settings.promptTemplates = getDefaultTemplates();
      this.settings.activePromptName = DEFAULT_PROMPT_TEMPLATE.name;
      await this.saveSettings();
    }

    const client = this.createClient();
    this.tagger = new Tagger(this.app, client, this.settings);

    this.registerCommands();
    this.registerFileMenu();

    const settingTab = new SmartTaggerSettingTab(
      this.app,
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
    console.log("[Smart-Tagger] 插件卸载");
  }

  private async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

    if (this.settings.openaiApiKey) {
      try {
        this.settings.openaiApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.app.vault.adapter.getBasePath?.() ?? ""
        );
      } catch {
        this.settings.openaiApiKey = "";
      }
    }
  }

  private async saveSettings(): Promise<void> {
    const toSave = { ...this.settings };
    if (toSave.openaiApiKey) {
      toSave.openaiApiKey = await encryptApiKey(
        toSave.openaiApiKey,
        this.app.vault.adapter.getBasePath?.() ?? ""
      );
    }
    await this.saveData(toSave);
  }

  private createClient() {
    const template =
      findTemplate(this.settings.promptTemplates, this.settings.activePromptName) ??
      this.settings.promptTemplates[0] ??
      DEFAULT_PROMPT_TEMPLATE;

    if (this.settings.aiMode === "ollama") {
      return new OllamaClient(
        { baseUrl: this.settings.ollamaBaseUrl, model: this.settings.ollamaModel },
        template
      );
    }

    return new OpenAIClient(
      {
        baseUrl: this.settings.openaiBaseUrl,
        apiKey: this.settings.openaiApiKey,
        model: this.settings.openaiModel,
      },
      template
    );
  }

  private registerCommands(): void {
    this.addCommand({
      id: "smart-tagger:tag-current-file",
      name: "为当前文件生成标签",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return;
        this.tagger.generateTagsForFile(file);
      },
    });

    this.addCommand({
      id: "smart-tagger:tag-current-folder",
      name: "为当前文件夹所有文件生成标签",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return;
        const folder = file.parent;
        if (!folder) return;
        this.tagger.generateTagsForFolder(folder);
      },
    });
  }

  private registerFileMenu(): void {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) => {
            item
              .setTitle("Smart Tagger: 为该文件生成标签")
              .setIcon("tag")
              .onClick(() => {
                this.tagger.generateTagsForFile(file);
              });
          });
        }

        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("Smart Tagger: 为该文件夹生成标签")
              .setIcon("tag")
              .onClick(() => {
                this.tagger.generateTagsForFolder(file);
              });
          });
        }
      })
    );
  }
}
