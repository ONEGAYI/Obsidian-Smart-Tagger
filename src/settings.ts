import { App, Plugin, PluginSettingTab, Setting, Notice, Modal, setIcon } from "obsidian";
import { SmartTaggerSettings, PromptTemplate, DEFAULT_PROMPT_TEMPLATE, DEFAULT_EXCLUDE_PATTERNS, DEFAULT_EXCLUDE_FM_KEYS } from "./types";
import { getDefaultTemplates, upsertTemplate, deleteTemplate } from "./ai/prompts";
import { notifyTestConnection } from "./ui/notice";

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

    contentEl.createDiv({ cls: "smart-tagger-rule-hint", text: "ℹ️ 使用 gitignore 语法" }, (el) => {
      el.setAttribute(
        "aria-label",
        "无 / → 匹配任意深度的文件名（如 CLAUDE.md、*.log）\n" +
        "有 / → 匹配 vault 根目录起的路径（如 templates/*）\n" +
        "** → 匹配零或多个目录层级（如 **/test/*.md、src/**/utils.ts、logs/**）\n" +
        "* → 匹配非 / 字符，? → 匹配单个非 / 字符"
      );
    });

    const textarea = contentEl.createEl("textarea", {
      cls: "smart-tagger-prompt-area",
    });
    textarea.value = this.rules.join("\n");
    textarea.rows = 10;
    textarea.placeholder = this.placeholder;

    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText("保存").setCta().onClick(async () => {
          const newRules = textarea.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          await this.onSave(newRules);
          this.close();
        })
      )
      .addButton((btn) =>
        btn.setButtonText("取消").onClick(() => {
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
  private onTestConnection: () => Promise<boolean>;
  private decryptedApiKey: string = "";
  private _pendingTemplateName?: string;

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
    this.renderExcludeSection(containerEl);
    this.renderAdvancedSection(containerEl);
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
            this.settings.openaiApiKey = this.decryptedApiKey;
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
          const result = await this.onTestConnection();
          notifyTestConnection(result.ok, result.error);
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
      .setName("跳过已有字段")
      .setDesc("逗号分隔字段名。当 frontmatter 中所有指定字段都已存在时跳过该文档。如：tags, description")
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

  private renderExcludeSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "文件排除规则" });

    new Setting(containerEl)
      .setName("排除路径规则")
      .setDesc(
        this.settings.excludePatterns.length > 0
          ? `当前：${this.settings.excludePatterns.join("、")}`
          : "未配置规则"
      )
      .addButton((btn) => {
        btn.buttonEl.empty();
        setIcon(btn.buttonEl, "pencil", 16);
        btn.buttonEl.createSpan({ text: " 编辑" });
        btn.onClick(() => {
          new RuleEditModal(
            this.app,
            "排除路径规则",
            this.settings.excludePatterns,
            "每行一条规则，语法类似 .gitignore：\n" +
            "*.excalidraw.md     → 任意深度的匹配文件\n" +
            "templates/*         → 仅根目录下 templates/\n" +
            "**/CLAUDE.md        → 任意深度的 CLAUDE.md\n" +
            "src/**/test.ts      → src 下任意深度的 test.ts\n" +
            "logs/**             → logs 目录下所有文件",
            async (rules) => {
              this.settings.excludePatterns = rules;
              await this.save();
              this.display();
            }
          ).open();
        });
      });

    new Setting(containerEl)
      .setName("排除 frontmatter 键")
      .setDesc(
        this.settings.excludeFrontmatterKeys.length > 0
          ? `当前：${this.settings.excludeFrontmatterKeys.join("、")}`
          : "未配置规则"
      )
      .addButton((btn) => {
        btn.buttonEl.empty();
        setIcon(btn.buttonEl, "pencil", 16);
        btn.buttonEl.createSpan({ text: " 编辑" });
        btn.onClick(() => {
          new RuleEditModal(
            this.app,
            "排除 frontmatter 键",
            this.settings.excludeFrontmatterKeys,
            "每行一个 frontmatter 键名。如：\nkanban-plugin\nexcalidraw-plugin",
            async (rules) => {
              this.settings.excludeFrontmatterKeys = rules;
              await this.save();
              this.display();
            }
          ).open();
        });
      });

    new Setting(containerEl)
      .setName("恢复默认排除规则")
      .addButton((btn) =>
        btn.setButtonText("恢复默认").setWarning(true).onClick(async () => {
          this.settings.excludePatterns = [...DEFAULT_EXCLUDE_PATTERNS];
          this.settings.excludeFrontmatterKeys = [...DEFAULT_EXCLUDE_FM_KEYS];
          await this.save();
          this.display();
        })
      );
  }

  private renderAdvancedSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "高级设置" });

    new Setting(containerEl)
      .setName("启用思考模式")
      .setDesc("开启后模型会先进行推理再输出标签（OpenAI 兼容 API 使用 reasoning_effort，Ollama 使用 think 参数）")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.enableThinking).onChange(async (value) => {
          this.settings.enableThinking = value;
          await this.save();
        })
      );

    new Setting(containerEl)
      .setName("调试模式")
      .setDesc("在控制台输出详细日志")
      .addToggle((toggle) =>
        toggle.setValue(this.settings.debugMode).onChange(async (value) => {
          this.settings.debugMode = value;
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

    new Setting(containerEl)
      .setName("模板名称")
      .setDesc("修改后点击「保存当前修改」生效")
      .addText((text) =>
        text
          .setValue(this.settings.activePromptName)
          .onChange((value) => {
            this._pendingTemplateName = value;
          })
      );

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
        text: "可用变量：{{minTags}}、{{maxTags}}、{{content}}（自动注入）；{{existingTags}}（preferExisting 开启时自动注入）。自定义字段：{{字段名: AI提示描述}}，如 {{description: 用一句话概括文档内容}}",
      });
    }

    new Setting(containerEl)
      .setName("模板操作")
      .addButton((btn) =>
        btn.setButtonText("保存当前修改").onClick(async () => {
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
        btn.setButtonText("保存为新模板").onClick(async () => {
          const name = this._pendingTemplateName?.trim() || `模板 ${this.settings.promptTemplates.length + 1}`;
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
    this.decryptedApiKey = this.settings.openaiApiKey;
  }
}
