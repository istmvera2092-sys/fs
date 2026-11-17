import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const directory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(directory, "dist/Code.gs"), "utf8");
const sent = [];
const acked = [];
const pending = [{ id: 1, title: "Тестовый фильм", note: "Совет от компании" }];
const triggers = [];
const context = vm.createContext({
  UrlFetchApp: { fetch(url) {
    const parsed = new URL(url);
    assert.ok(parsed.searchParams.get("key"));
    if (parsed.searchParams.get("mode") === "notificationAck") acked.push(parsed.searchParams.get("id"));
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(parsed.searchParams.get("mode") === "notifications" ? pending : { ok: true }) };
  } },
  MailApp: { sendEmail(...args) { sent.push(args); } },
  ScriptApp: {
    getProjectTriggers: () => triggers,
    newTrigger(handler) { return { timeBased() { return this; }, everyMinutes(minutes) { assert.equal(minutes, 1); return this; }, create() { triggers.push({ getHandlerFunction: () => handler }); } }; },
  },
  URL,
  JSON,
  encodeURIComponent,
  Error,
});
vm.runInContext(source, context);
assert.equal(context.setupNotifier(), 1);
assert.equal(triggers.length, 1);
assert.equal(sent.length, 1);
assert.equal(sent[0][0], "GovorunGoorushky@yandex.ru");
assert.ok(sent[0][2].includes("Совет от компании"));
assert.deepEqual(acked, ["1"]);
context.setupNotifier();
assert.equal(triggers.length, 1);
console.log("Private notifier passed: mail delivery, queue acknowledgment, and one scheduled trigger.");
