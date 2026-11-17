import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const notifyKey = readFileSync(join(directory, "../.dev.vars"), "utf8").match(/^FILM_NOTIFY_KEY=(.+)$/m)?.[1]?.trim();
if (!notifyKey || notifyKey.length < 48) throw new Error("FILM_NOTIFY_KEY is missing or too short in .dev.vars.");
const output = join(directory, "dist");
mkdirSync(output, { recursive: true });
const source = readFileSync(join(directory, "Notifier.template.gs"), "utf8").replace("__NOTIFY_KEY_JSON__", JSON.stringify(notifyKey));
if (source.includes("__NOTIFY_KEY_JSON__")) throw new Error("Notifier template placeholder was not replaced.");
writeFileSync(join(output, "Code.gs"), source, { mode: 0o600 });
copyFileSync(join(directory, "appsscript.json"), join(output, "appsscript.json"));
console.log("Private notification script ready. Notification key stays out of Git.");
