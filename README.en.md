English | [中文](./README.md)

# Obsidian Smart Tagger

> A lightweight Obsidian plugin that auto-generates tags for your notes and writes them into frontmatter. Supports both OpenAI-compatible APIs and Ollama.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.10.0+-7C3AED.svg)](https://obsidian.md)

<!-- screenshot -->

## Features

- 🏷️ **AI Auto-Tagging** — Generate tags for the current file or an entire folder with one click, written into the `tags` frontmatter field
- 🤖 **Dual AI Backends** — Supports OpenAI-compatible APIs (ChatGPT, DeepSeek, Zhipu, Moonshot, etc.) and local Ollama models
- 📋 **Prompt Template Management** — Save, switch, and restore multiple prompt templates
- 🎯 **Tag Priority Strategy** — Prefer existing tags in your vault to keep your taxonomy consistent
- 🧩 **Custom Frontmatter Fields** — Use `{{key: prompt}}` syntax to let the AI also generate summaries, titles, or any other field
- 🚫 **Flexible File Exclusion** — gitignore-style glob patterns to skip templates, logs, and other non-content files
- 📁 **Folder Batch Processing** — Configurable recursion depth, with right-click menu for quick batch runs
- 🔒 **Encrypted API Key Storage** — AES-GCM + PBKDF2 encryption keyed by the vault path
- 🧠 **Thinking Mode** — Enable deep-thinking capabilities on supported models

## Installation

### Option 1: Community Plugin Directory (Recommended)

> The plugin has been submitted to the Obsidian Community directory. Once approved, install it via **Settings → Community plugins → Browse** by searching for **Smart Tagger**.

### Option 2: Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Releases](https://github.com/ONEGAYI/Obsidian-Smart-Tagger/releases) page
2. Create the directory `.obsidian/plugins/onegayi-smart-tagger/` in your vault
3. Place the three files into that directory
4. In Obsidian, go to **Settings → Community plugins**, toggle off and on **Community plugins**, then enable **Smart Tagger**

### Option 3: BRAT (Pre-release Testing)

Use the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) to add this repository `ONEGAYI/Obsidian-Smart-Tagger` and get pre-release versions before they hit the community directory.

## Quick Start

1. **Configure the AI backend** — Open plugin settings, choose OpenAI-compatible or Ollama mode, and fill in the API URL, key, and model name
2. **Pick a prompt template** — Use the default, or customize the system and user prompts in settings
3. **Generate tags** — Pick any of these:
   - Command palette (`Ctrl/Cmd + P`): run **"Smart Tagger: 为当前文件生成标签"**
   - Right-click a file in the file explorer → **"为该文件生成标签"**
   - Right-click a folder → **"为该文件夹生成标签"** (batch)

Tags are merged and de-duplicated into frontmatter; existing tags are never overwritten.

## Configuration

| Option | Description |
|--------|-------------|
| **AI Mode** | Choose between OpenAI-compatible and Ollama |
| **API Base URL** | Endpoint under OpenAI-compatible mode, e.g. `https://api.openai.com/v1` |
| **API Key** | Encrypted at rest, never stored in plaintext |
| **Model** | Model name, e.g. `gpt-4o-mini`, `deepseek-chat`, `llama3` |
| **Tag Count** | The range of tags to generate per run (e.g. 3-5) |
| **Tag Priority** | When enabled, prefer existing tags in the vault |
| **Skip Fields** | Skip a file (no AI call) when all of these frontmatter fields already have values |
| **File Exclusion Rules** | gitignore-style path match patterns; matched files are skipped |
| **Thinking Mode** | Enable the thinking capability on supported models |
| **Recursion Depth** | Sub-folder recursion depth during folder batch runs |

### Custom Field Syntax

Use `{{key: prompt description}}` in the user prompt to let the AI generate that field too. For example:

```
Generate tags for the following document.
{{description: Summarize the document in one sentence}}
{{title: Give a concise, punchy title}}
```

The AI returns `{tags: [...], description: "...", title: "..."}`. The plugin writes them into the corresponding frontmatter fields (`tags` are merged and de-duplicated; other fields are overwritten).

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev build (with inline sourcemaps)
npm run build        # Production build (minified, no sourcemaps)
npm run deploy       # Build + deploy to the local Obsidian plugins directory
npm test             # Run Jest tests
```

The deploy target path is configured in `scripts/deploy.mjs`. The build output is a single `main.js` (esbuild bundle, CJS format).

## License

[MIT](./LICENSE) © ONEGAYI

## Acknowledgements

- [Obsidian](https://obsidian.md) — For an outstanding knowledge-management platform
- All providers of OpenAI-compatible APIs and Ollama models
