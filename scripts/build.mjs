import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const helpers = (await read("src/helpers.js")).replace(/^export /gm, "");
const styles = (await read("src/styles.js")).replace(/^export /gm, "");
const card = (await read("src/purespa-card.js")).replace(/^import .*;\r?\n/gm, "");
const output = `// PureSpa Card - generated file, do not edit directly.\n\n${helpers}\n${styles}\n${card}`;
const destination = resolve(root, "dist/purespa-card.js");

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, output);
console.log("Built dist/purespa-card.js");
