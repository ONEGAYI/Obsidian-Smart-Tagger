import { App, Plugin, PluginSettingTab, Setting, Notice, Modal, setIcon } from "obsidian";
import { SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE, DEFAULT_EXCLUDE_PATTERNS, DEFAULT_EXCLUDE_FM_KEYS } from "./types";
import { getDefaultTemplates, upsertTemplate, deleteTemplate } from "./ai/prompts";
import { notifyTestConnection } from "./ui/notice";
import { t } from "./i18n";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

class RuleEditModal extends Modal {
  constructor(
    app: App,
    private title: string,
    private rules: string[],
    private placeholder: string,
    private onSave: (rules: string[]) => Promise<void>
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });

    contentEl.createDiv({ cls: "smart-tagger-rule-hint", text: t("modal.gitignoreHint") }, (el) => {
      el.setAttribute("aria-label", t("modal.gitignoreAria"));
    });

    const textarea = contentEl.createEl("textarea", {
      cls: "smart-tagger-prompt-area",
    });
    textarea.value = this.rules.join("\n");
    textarea.rows = 10;
    textarea.placeholder = this.placeholder;

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText(t("modal.save")).setCta().onClick(async () => {
          const newRules = textarea.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          await this.onSave(newRules);
          this.close();
        })
      )
      .addButton((btn) =>
        btn.setButtonText(t("modal.cancel")).onClick(() => {
          this.close();
        })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class SmartTaggerSettingTab extends PluginSettingTab {
  private settings: SmartTaggerSettings;
  private onSave: (settings: SmartTaggerSettings) => Promise<void>;
  private onTestConnection: () => Promise<{ ok: boolean; error?: string }>;
  private decryptedApiKey: string = "";
  private _pendingTemplateName?: string;

  constructor(
    app: App,
    plugin: Plugin,
    settings: SmartTaggerSettings,
    onSave: (settings: SmartTaggerSettings) => Promise<void>,
    onTestConnection: () => Promise<{ ok: boolean; error?: string }>
  ) {
    super(app, plugin);
    this.settings = { ...settings };
    this.onSave = onSave;
    this.onTestConnection = onTestConnection;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: t("setting.title") });
    this.renderAISection(containerEl);
    this.renderStrategySection(containerEl);
    this.renderExcludeSection(containerEl);
    this.renderAdvancedSection(containerEl);
    this.renderPromptSection(containerEl);
  }

  private renderAISection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t("setting.aiSection") });

    new Setting(containerEl)
      .setName(t("setting.aiMode"))
      .setDesc(t("setting.aiModeDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            openai: t("setting.aiModeOpenai"),
            ollama: t("setting.aiModeOllama"),
          })
          .setValue(this.settings.aiMode)
          .onChange(async (value) => {
            this.settings.aiMode = value as "openai" | "ollama";
            await this.save();
            this.display();
          })
      );

    if (this.settings.aiMode === "openai") {
      new Setting(containerEl)
        .setName(t("setting.openaiBaseUrl"))
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
        .setName(t("setting.apiKey"))
        .setDesc(t("setting.apiKeyDesc"))
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
          btn.setButtonText(t("setting.saveKey")).onClick(async () => {
            this.settings.openaiApiKey = this.decryptedApiKey;
            await this.save();
          })
        );

      new Setting(containerEl)
        .setName(t("setting.model"))
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
        .setName(t("setting.ollamaBaseUrl"))
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
        .setName(t("setting.model"))
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
      .setName(t("setting.testConnection"))
      .setDesc(t("setting.testConnectionDesc"))
      .addButton((btn) =>
        btn.setButtonText(t("setting.testBtn")).onClick(async () => {
          btn.setButtonText(t("setting.testing"));
          btn.setDisabled(true);
          const result = await this.onTestConnection();
          notifyTestConnection(result.ok, result.error);
          btn.setButtonText(t("setting.testBtn"));
          btn.setDisabled(false);
        })
      );
  }

  private renderStrategySection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t("setting.strategySection") });

    new Setting(containerEl)
      .setName(t("setting.minTags"))
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
      .setName(t("setting.maxTags"))
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
      .setName(t("setting.preferExisting"))
      .setDesc(t("setting.preferExistingDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.preferExistingTags).onChange(async (value) => {
          this.settings.preferExistingTags = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName(t("setting.skipFields"))
      .setDesc(t("setting.skipFieldsDesc"))
      .addText((text) =>
        text
          .setPlaceholder("tags")
          .setValue(this.settings.skipFields.join(", "))
          .onChange(async (value) => {
            this.settings.skipFields = splitCsv(value);
            await this.save();
          })
      );

    new Setting(containerEl)
      .setName(t("setting.recursiveDepth"))
      .setDesc(t("setting.recursiveDepthDesc"))
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
      .setName(t("setting.maxContent"))
      .setDesc(t("setting.maxContentDesc"))
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

  private renderExcludeSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t("setting.excludeSection") });

    new Setting(containerEl)
      .setName(t("setting.excludePath"))
      .setDesc(
        this.settings.excludePatterns.length > 0
          ? t("setting.excludePathCurrent", { rules: this.settings.excludePatterns.join("、") })
          : t("setting.excludeNone")
      )
      .addButton((btn) => {
        btn.buttonEl.empty();
        setIcon(btn.buttonEl, "pencil", 16);
        btn.buttonEl.createSpan({ text: t("setting.editBtn") });
        btn.onClick(() => {
          new RuleEditModal(
            this.app,
            t("setting.excludePathTitle"),
            this.settings.excludePatterns,
            t("setting.excludePathPlaceholder"),
            async (rules) => {
              this.settings.excludePatterns = rules;
              await this.save();
              this.display();
            }
          ).open();
        });
      });

    new Setting(containerEl)
      .setName(t("setting.excludeFmKeys"))
      .setDesc(
        this.settings.excludeFrontmatterKeys.length > 0
          ? t("setting.excludeFmKeysCurrent", { rules: this.settings.excludeFrontmatterKeys.join("、") })
          : t("setting.excludeNone")
      )
      .addButton((btn) => {
        btn.buttonEl.empty();
        setIcon(btn.buttonEl, "pencil", 16);
        btn.buttonEl.createSpan({ text: t("setting.editBtn") });
        btn.onClick(() => {
          new RuleEditModal(
            this.app,
            t("setting.excludeFmKeysTitle"),
            this.settings.excludeFrontmatterKeys,
            t("setting.excludeFmKeysPlaceholder"),
            async (rules) => {
              this.settings.excludeFrontmatterKeys = rules;
              await this.save();
              this.display();
            }
          ).open();
        });
      });

    new Setting(containerEl)
      .setName(t("setting.resetExclude"))
      .addButton((btn) =>
        btn.setButtonText(t("setting.resetExcludeBtn")).setWarning(true).onClick(async () => {
          this.settings.excludePatterns = [...DEFAULT_EXCLUDE_PATTERNS];
          this.settings.excludeFrontmatterKeys = [...DEFAULT_EXCLUDE_FM_KEYS];
          await this.save();
          this.display();
        })
      );
  }

  private renderAdvancedSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t("setting.advancedSection") });

    new Setting(containerEl)
      .setName(t("setting.thinkingMode"))
      .setDesc(t("setting.thinkingModeDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.enableThinking).onChange(async (value) => {
          this.settings.enableThinking = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName(t("setting.debugMode"))
      .setDesc(t("setting.debugModeDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.debugMode).onChange(async (value) => {
          this.settings.debugMode = value;
          await this.save();
        })
      );
  }

  private renderPromptSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: t("setting.promptSection") });

    const templateNames = this.settings.promptTemplates.map((tpl) => tpl.name);

    new Setting(containerEl)
      .setName(t("setting.currentTemplate"))
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

    new Setting(containerEl)
      .setName(t("setting.templateName"))
      .setDesc(t("setting.templateNameDesc"))
      .addText((text) =>
        text
          .setValue(this.settings.activePromptName)
          .onChange((value) => {
            this._pendingTemplateName = value;
          })
      );

    const activeTemplate =
      this.settings.promptTemplates.find((tpl) => tpl.name === this.settings.activePromptName) ??
      this.settings.promptTemplates[0];

    if (activeTemplate) {
      new Setting(containerEl).setName(t("setting.systemPrompt")).setHeading();
      const systemArea = containerEl.createEl("textarea", {
        cls: "smart-tagger-prompt-area",
      });
      systemArea.value = activeTemplate.system;
      systemArea.rows = 8;
      systemArea.addEventListener("change", () => {
        activeTemplate.system = systemArea.value;
      });

      new Setting(containerEl).setName(t("setting.userPrompt")).setHeading();
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
        text: t("setting.promptVars"),
      });
    }

    new Setting(containerEl)
      .setName(t("setting.templateOps"))
      .addButton((btn) =>
        btn.setButtonText(t("setting.saveCurrent")).onClick(async () => {
          if (this._pendingTemplateName && this._pendingTemplateName !== activeTemplate!.name) {
            const newName = this._pendingTemplateName.trim();
            if (newName) {
              const oldName = activeTemplate!.name;
              activeTemplate!.name = newName;
              if (this.settings.activePromptName === oldName) {
                this.settings.activePromptName = newName;
              }
            }
          }
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, activeTemplate!);
          this._pendingTemplateName = undefined;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText(t("setting.saveAsNew")).onClick(async () => {
          const name =
            this._pendingTemplateName?.trim() ||
            t("setting.newTemplateName", { n: this.settings.promptTemplates.length + 1 });
          const newTemplate: PromptTemplate = {
            name,
            system: activeTemplate?.system ?? DEFAULT_PROMPT_TEMPLATE.system,
            user: activeTemplate?.user ?? DEFAULT_PROMPT_TEMPLATE.user,
          };
          this.settings.promptTemplates = upsertTemplate(this.settings.promptTemplates, newTemplate);
          this.settings.activePromptName = name;
          this._pendingTemplateName = undefined;
          await this.save();
          this.display();
        })
      )
      .addButton((btn) =>
        btn.setButtonText(t("setting.deleteCurrent")).setWarning(true).onClick(async () => {
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
        btn.setButtonText(t("setting.resetDefault")).setWarning(true).onClick(async () => {
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
    this.decryptedApiKey = this.settings.openaiApiKey;
  }
}
