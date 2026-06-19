import { cpSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const targets = [
  "D:\\Documents\\06-依赖文件\\Obsidian-configs\\.obsidian\\plugins\\onegayi-smart-tagger",
];

const files = ["main.js", "manifest.json", "styles.css"];

for (const target of targets) {
  mkdirSync(target, { recursive: true });
  for (const file of files) {
    cpSync(resolve(root, file), resolve(target, file));
  }
  console.log(`[Smart-Tagger] 已部署到 ${target}`);
}
