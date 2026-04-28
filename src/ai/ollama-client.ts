import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate } from "../types";
import { renderPrompt } from "./prompts";
import { parseTagsFromResponse } from "./utils";

interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class OllamaClient implements AIClient {
  private enableThinking = false;

  constructor(
    private config: OllamaConfig,
    private template: PromptTemplate
  ) {}

  updateConfig(config: Partial<OllamaConfig>) {
    Object.assign(this.config, config);
  }

  updateTemplate(template: PromptTemplate) {
    this.template = template;
  }

  updateThinking(enabled: boolean) {
    this.enableThinking = enabled;
  }

  async generateTags(content: string, options: PromptOptions): Promise<string[]> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      stream: false,
    };

    if (this.enableThinking) {
      body.think = true;
    }

    const response = await this.request("/api/chat", body);
    const text = response.message?.content ?? "";
    return parseTagsFromResponse(text);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const resp = await requestUrl({
        url: `${this.config.baseUrl}/api/tags`,
        method: "GET",
      });
      const ok = resp.json?.models?.length > 0;
      return { ok };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Smart-Tagger] Ollama 连接测试失败:", message);
      return { ok: false, error: message };
    }
  }

  private async request(path: string, body: unknown): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const params: RequestUrlParam = {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const resp = await requestUrl(params);
    return resp.json;
  }
}
