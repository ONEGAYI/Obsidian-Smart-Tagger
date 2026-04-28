import { requestUrl, RequestUrlParam } from "obsidian";
import { AIClient, PromptOptions, PromptTemplate } from "../types";
import { renderPrompt } from "./prompts";
import { parseTagsFromResponse } from "./utils";

interface OpenAIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAIClient implements AIClient {
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

  async generateTags(content: string, options: PromptOptions): Promise<string[]> {
    const prompt = renderPrompt(this.template, {
      content,
      minTags: options.minTags,
      maxTags: options.maxTags,
      existingTags: options.existingTags,
      preferExisting: options.preferExisting,
    });

    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.3,
    };

    const response = await this.request("/v1/chat/completions", body);
    const text = response.choices?.[0]?.message?.content ?? "";
    return parseTagsFromResponse(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request("/v1/models", undefined, "GET");
      return response?.data?.length > 0;
    } catch {
      return false;
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


