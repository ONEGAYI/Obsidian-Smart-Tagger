import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate, GenerateResult } from "../types";
import { renderPrompt } from "./prompts";
import { parseResponse } from "./utils";

interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAIClient implements AIClient {
  private enableThinking = false;

  constructor(
    private config: OpenAIConfig,
    private template: PromptTemplate
  ) {}

  updateConfig(config: Partial<OpenAIConfig>) {
    Object.assign(this.config, config);
  }

  updateTemplate(template: PromptTemplate) {
    this.template = template;
  }

  updateThinking(enabled: boolean) {
    this.enableThinking = enabled;
  }

  async generateTags(content: string, options: PromptOptions): Promise<GenerateResult> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
      language: options.language,
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.3,
    };

    if (this.enableThinking) {
      body.reasoning_effort = "medium";
    }

    const response = await this.request("/v1/chat/completions", body);
    const text = response.choices?.[0]?.message?.content ?? "";
    return parseResponse(text, prompt.customFields);
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await this.request("/v1/models", undefined, "GET");
      const ok = response?.data?.length > 0;
      return { ok };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Smart-Tagger] 连接测试失败:", message);
      return { ok: false, error: message };
    }
  }

  private async request(path: string, body: unknown, method: "GET" | "POST" | "PUT" | "DELETE" = "POST"): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const params: RequestUrlParam = {
      url,
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    };
    if (body) params.body = JSON.stringify(body);
    const resp = await requestUrl(params);
    return resp.json;
  }
}


