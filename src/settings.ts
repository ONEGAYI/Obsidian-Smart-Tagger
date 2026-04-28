import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE } from "./types";
import { getDefaultTemplates, upsertTemplate, deleteTemplate } from "./ai/prompts";
import { encryptApiKey, decryptApiKey } from "./crypto";
import { notifyTestConnection } from "./ui/notice";

export class SmartTaggerSettingTab extends PluginSettingTab {
  private settings: SmartTaggerSettings;
  private onSave: (settings: SmartTaggerSettings) => Promise<void>;
  private onTestConnection: () => Promise<boolean>;
  private decryptedApiKey: string = "";

  constructor(
    app: App,
    plugin: Plugin,
    settings: SmartTaggerSettings,
    onSave: (settings: SmartTaggerSettings) => Promise<void>,
    onTestConnection: () => Promise<boolean>
  ) {
    super(app, plugin);
    this.settings = { ...settings };
    this.onSave = onSave;
    this.onTestConnection = onTestConnection;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Smart Tagger 设置" });
    this.renderAISection(containerEl);
    this.renderStrategySection(containerEl);
    this.renderPromptSection(containerEl);
  }

  private renderAISection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "AI 服务连接" });

    new Setting(containerEl)
      .setName("AI 模式")
      .setDesc("选择使用 OpenAI 兼容 API 或 Ollama")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ openai: "OpenAI 兼容 API", ollama: "Ollama" })
          .setValue(this.settings.aiMode)
          .onChange(async (value) => {
            this.settings.aiMode = value as "openai" | "ollama";
            await this.save();
            this.display();
          })
      );

    if (this.settings.aiMode === "openai") {
      new Setting(containerEl)
        .setName("API Base URL")
        .addText((text) =>
          text
            .setPlaceholder("https://api.openai.com")
            .setValue(this.settings.openaiBaseUrl)
            .onChange(async (value) => {
              this.settings.openaiBaseUrl = value;
              await this.save();
            })
        );

      new Setting(containerEl)
        .setName("API Key")
        .setDesc("加密存储")
        .addText((text) => {
          text
            .setPlaceholder("sk-...")
            .setValue(this.decryptedApiKey)
            .onChange(async (value) => {
              this.decryptedApiKey = value;
            });
          text.inputEl.type = "password";
        })
        .addButton((btn) =>
          btn.setButtonText("保存 Key").onClick(async () => {
            this.settings.openaiApiKey = await encryptApiKey(
              this.decryptedApiKey,
              this.app.vault.adapter.getBasePath?.() ?? ""
            );
            await this.save();
          })
        );

      new Setting(containerEl)
        .setName("模型")
        .addText((text) =>
          text
            .setPlaceholder("gpt-4o-mini")
            .setValue(this.settings.openaiModel)
            .onChange(async (value) => {
              this.settings.openaiModel = value;
              await this.save();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Ollama Base URL")
        .addText((text) =>
          text
            .setPlaceholder("http://localhost:11434")
            .setValue(this.settings.ollamaBaseUrl)
            .onChange(async (value) => {
              this.settings.ollamaBaseUrl = value;
              await this.save();
            })
        );

      new Setting(containerEl)
        .setName("模型")
        .addText((text) =>
          text
            .setPlaceholder("llama3")
            .setValue(this.settings.ollamaModel)
            .onChange(async (value) => {
              this.settings.ollamaModel = value;
              await this.save();
            })
        );
    }

    new Setting(containerEl)
      .setName("测试连接")
      .setDesc("验证 AI 服务是否可用")
      .addButton((btn) =>
        btn.setButtonText("测试").onClick(async () => {
          btn.setButtonText("测试中...");
          btn.setDisabled(true);
          const success = await this.onTestConnection();
          notifyTestConnection(success);
          btn.setButtonText("测试");
          btn.setDisabled(false);
        })
      );
  }

  private renderStrategySection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "标签生成策略" });

    new Setting(containerEl)
      .setName("最小标签数")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.settings.minTags)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.minTags = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("最大标签数")
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.settings.maxTags)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxTags = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("优先已有标签")
      .setDesc("AI 会优先从 vault 已有标签中选取，必要时才添加新标签")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.preferExistingTags).onChange(async (value) => {
          this.settings.preferExistingTags = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName("跳过已有标签的文档")
      .setDesc("处理时自动跳过 frontmatter 中已有 tags 的文档")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.skipTaggedFiles).onChange(async (value) => {
          this.settings.skipTaggedFiles = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName("文件夹递归深度")
      .setDesc("0 = 仅直接子文件，1 = 包含一级子文件夹，以此类推")
      .addSlider((slider) =>
        slider
          .setLimits(0, 10, 1)
          .setValue(this.settings.maxRecursiveDepth)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxRecursiveDepth = value;
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName("最大内容字符数")
      .setDesc("发送给 AI 的最大字符数，超出部分将被截断")
      .addSlider((slider) =>
        slider
          .setLimits(1000, 20000, 500)
          .setValue(this.settings.maxContentChars)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.maxContentChars = value;
            await this.save();
          })
      );
  }

  private renderPromptSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "提示词模板管理" });

    const templateNames = this.settings.promptTemplates.map((t) => t.name);

    new Setting(containerEl)
      .setName("当前模板")
      .addDropdown((dropdown) => {
        dropdown.addOptions(
          templateNames.reduce((acc, name) => ({ ...acc, [name]: name }), {} as Record<string, string>)
        );
        dropdown.setValue(this.settings.activePromptName);
        dropdown.onChange(async (value) => {
          this.settings.activePromptName = value;
          await this.save();
          this.display();
        });
      });

    const activeTemplate =
      this.settings.promptTemplates.find((t) => t.name === this.settings.activePromptName) ??
      this.settings.promptTemplates[0];

    if (activeTemplate) {
      new Setting(containerEl).setName("系统提示词").setHeading();
      const systemArea = containerEl.createEl("textarea", {
        cls: "smart-tagger-prompt-area",
      });
      systemArea.value = activeTemplate.system;
      systemArea.rows = 8;
      systemArea.addEventListener("change", () => {
        activeTemplate.system = systemArea.value;
      });

      new Setting(containerEl).setName("用户提示词").setHeading();
      const userArea = containerEl.createEl("textarea", {
        cls: "smart-tagger-prompt-area",
      });
      userArea.value = activeTemplate.user;
      userArea.rows = 6;
      userArea.addEventListener("change", () => {
        activeTemplate.user = userArea.value;
      });

      containerEl.createEl("p", {
        cls: "smart-tagger-hint",
        text: "可用变量：{{minTags}}、{{maxTags}}、{{content}}（自动注入）；{{existingTags}}（preferExisting 开启时自动追加）",
      });
    }

    new Setting(containerEl)
      .setName("模板操作")
      .addButton((btn) =>
        btn.setButtonText("保存当前修改").onClick(async () => {
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, activeTemplate!);
          await this.save();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("保存为新模板").onClick(async () => {
          const name = `模板 ${this.settings.promptTemplates.length + 1}`;
          const newTemplate: PromptTemplate = {
            name,
            system: activeTemplate?.system ?? DEFAULT_PROMPT_TEMPLATE.system,
            user: activeTemplate?.user ?? DEFAULT_PROMPT_TEMPLATE.user,
          };
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, newTemplate);
          this.settings.activePromptName = name;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("删除当前模板").setWarning(true).onClick(async () => {
          if (this.settings.promptTemplates.length <= 1) return;
          this.settings.promptTemplates = deleteTemplate(
            this.settings.promptTemplates,
            this.settings.activePromptName
          );
          this.settings.activePromptName = this.settings.promptTemplates[0].name;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("恢复默认模板").setWarning(true).onClick(async () => {
          this.settings.promptTemplates = getDefaultTemplates();
          this.settings.activePromptName = DEFAULT_PROMPT_TEMPLATE.name;
          await this.save();
          this.display();
        })
      );
  }

  private async save(): Promise<void> {
    await this.onSave(this.settings);
  }

  async initDecryptedKey(): Promise<void> {
    if (this.settings.openaiApiKey) {
      try {
        this.decryptedApiKey = await decryptApiKey(
          this.settings.openaiApiKey,
          this.app.vault.adapter.getBasePath?.() ?? ""
        );
      } catch {
        this.decryptedApiKey = "";
      }
    }
  }
}
