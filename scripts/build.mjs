import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const helpers = (await read("src/helpers.js")).replace(/^export /gm, "");
const waterQuality = (await read("src/water-quality.js")).replace(/^export /gm, "");
const temperatureGauge = (await read("src/components/temperature-gauge.js")).replace(/^export /gm, "");
const statusIndicator = (await read("src/components/status-indicator.js")).replace(/^export /gm, "");
const targetTemperatureControl = (await read("src/components/target-temperature-control.js")).replace(/^export /gm, "");
const styles = (await read("src/styles.js")).replace(/^export /gm, "");
const editorSchema = (await read("src/editor/editor-schema.js")).replace(/^export /gm, "");
const editorHelpers = (await read("src/editor/editor-helpers.js")).replace(/^export /gm, "");
const editor = (await read("src/editor/aquard-card-editor.js")).replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
const card = (await read("src/aquard-card.js")).replace(/^import .*;\r?\n/gm, "");
const output = `// Aquard - generated file, do not edit directly.\n\n${helpers}\n${waterQuality}\n${temperatureGauge}\n${statusIndicator}\n${targetTemperatureControl}\n${styles}\n${editorSchema}\n${editorHelpers}\n${editor}\n${card}`;
const destination = resolve(root, "dist/aquard-card.js");

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, output);
console.log("Built dist/aquard-card.js");
