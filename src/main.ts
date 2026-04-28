import { Plugin } from "obsidian";

export default class SmartTaggerPlugin extends Plugin {
  async onload() {
    console.log("[Smart-Tagger] 插件加载");
  }

  onunload() {
    console.log("[Smart-Tagger] 插件卸载");
  }
}
