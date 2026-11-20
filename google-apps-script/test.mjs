import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { randomUUID } from "node:crypto";

const directory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(directory, "dist/Code.gs"), "utf8");
const html = readFileSync(join(directory, "dist/Index.html"), "utf8");
const bridge = readFileSync(join(directory, "dist/Bridge.html"), "utf8");
const firebaseHtml = readFileSync(join(directory, "../firebase-site/public/index.html"), "utf8");
const firebaseClient = readFileSync(join(directory, "../firebase-site/public/bridge-client.js"), "utf8");
const accessCode = readFileSync(join(directory, "../.dev.vars"), "utf8").match(/^FILM_ACCESS_CODE=(.+)$/m)?.[1]?.trim();
const notifyKey = readFileSync(join(directory, "../.dev.vars"), "utf8").match(/^FILM_NOTIFY_KEY=(.+)$/m)?.[1]?.trim();
assert.ok(accessCode);
const values = new Map();
const metaTags = [];
const frameModes = [];
const properties = {
  getProperty(key) { return values.get(key) ?? null; },
  getProperties() { return Object.fromEntries(values); },
  setProperty(key, value) { values.set(key, value); },
  setProperties(entries) { for (const [key, value] of Object.entries(entries)) values.set(key, value); },
  deleteProperty(key) { values.delete(key); },
};
const lock = { waitLock() {}, releaseLock() {} };
const context = vm.createContext({
  PropertiesService: { getScriptProperties: () => properties },
  LockService: { getScriptLock: () => lock },
  Utilities: { getUuid: randomUUID },
  ContentService: { MimeType: { JSON: "json" }, createTextOutput(content) { return { content, setMimeType() { return this; } }; } },
  console: { error() {} },
  HtmlService: { XFrameOptionsMode: { ALLOWALL: "allowall" }, createTemplateFromFile: () => ({
    evaluate() { return { setXFrameOptionsMode(mode) { frameModes.push(mode); return this; }, setTitle() { return this; } }; },
  }), createHtmlOutputFromFile: () => ({
    addMetaTag(name, content) { metaTags.push({ name, content }); return this; },
    setTitle() { return this; },
  }) },
  Date,
  JSON,
});
vm.runInContext(source, context);
context.doGet();
context.doGet({ parameter: { mode: "bridge", nonce: "a".repeat(32) } });
assert.deepEqual(frameModes, ["allowall"]);
assert.throws(() => context.doGet({ parameter: { mode: "bridge", nonce: "invalid" } }), /Недопустимый/);
assert.equal(metaTags.find((tag) => tag.name === "viewport")?.content, "width=device-width, initial-scale=1, viewport-fit=cover");
assert.equal(context.authenticate("wrong-code"), false);
assert.equal(context.authenticate(accessCode), true);
assert.throws(() => context.createSession("wrong-code"), /Неверный код/);
const session = context.createSession(accessCode);
assert.match(session, /^[a-f0-9]{64}$/);
assert.equal(context.authenticate(session), true);
assert.equal(context.getState(session).films.length, 12);
assert.throws(() => context.getFilms("wrong-code"), /Доступ не подтверждён/);
const films = context.getFilms(accessCode);
assert.equal(films.length, 12);
assert.equal(new Set(films.map((film) => film.id)).size, films.length);
const brigada = films.find((film) => film.title === "Бригада");
assert.equal(brigada.status, "watching");
assert.equal(context.updateWatched(session, brigada.id, true).status, "watched");
assert.equal(context.getFilms(session).find((film) => film.id === brigada.id).status, "watched");
assert.throws(() => context.removeFilm(session, brigada.id), /отмечен просмотренным/);
assert.equal(context.updateWatched(session, brigada.id, false).status, "watching");
assert.equal(context.updateWatched(accessCode, films[0].id, true).status, "watched");
assert.equal(context.getFilms(accessCode).find((film) => film.id === films[0].id).status, "watched");
assert.equal(context.updateWatched(accessCode, films[0].id, false).status, "queue");
values.set("suggestion:1", JSON.stringify({ id: 1, title: "Ранее предложенный фильм", note: "Старый комментарий", createdAt: "2026-11-16T00:00:00Z" }));
values.set("suggestion:nextId", "2");
const migrated = context.getState(accessCode).films.find((film) => film.title === "Ранее предложенный фильм");
assert.equal(migrated.status, "queue");
assert.equal(migrated.note, "");
assert.equal(values.has("suggestion:1"), false);
assert.equal(context.getState(accessCode).suggestions.length, 0);
assert.throws(() => context.suggestFilm("wrong-code", "Ещё фильм"), /Доступ не подтверждён/);
assert.throws(() => context.suggestFilm(accessCode, films[0].title), /уже есть/);
const added = context.suggestFilm(accessCode, "Ещё фильм", "Игнорируем старый комментарий");
assert.equal(added.status, "queue");
assert.equal(added.note, "");
assert.equal(added.notificationQueued, true);
assert.equal(context.getState(accessCode).films.find((film) => film.id === added.id).title, "Ещё фильм");
assert.equal(JSON.parse(context.doGet({ parameter: { mode: "notificationStatus", key: notifyKey } }).content).pending, 1);
assert.throws(() => context.doGet({ parameter: { mode: "notifications", key: "wrong" } }), /Доступ запрещён/);
const notifications = JSON.parse(context.doGet({ parameter: { mode: "notifications", key: notifyKey } }).content);
assert.equal(notifications.length, 1);
assert.equal(notifications[0].title, "Ещё фильм");
assert.equal(notifications[0].note, undefined);
assert.equal(JSON.parse(context.doGet({ parameter: { mode: "notifications", key: notifyKey } }).content).length, 0);
assert.deepEqual(JSON.parse(context.doGet({ parameter: { mode: "notificationAck", key: notifyKey, id: String(notifications[0].id) } }).content), { ok: true });
assert.equal(JSON.parse(context.doGet({ parameter: { mode: "notificationStatus", key: notifyKey } }).content).pending, 0);
assert.throws(() => context.suggestFilm(accessCode, "ещё фильм"), /уже есть/);
assert.equal(context.getFilms(accessCode).length, 14);
const beforeRemoval = JSON.parse(JSON.stringify(context.getFilms(session)));
assert.throws(() => context.removeFilm("wrong-code", added.id), /Доступ не подтверждён/);
assert.equal(context.removeFilm(session, added.id), true);
assert.equal(context.removeFilm(session, brigada.id), true);
assert.equal(context.removeFilm(session, added.id), true);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.getFilms(accessCode))),
  beforeRemoval.filter((film) => film.id !== added.id && film.id !== brigada.id),
);
assert.equal(context.revokeSession(session), true);
assert.equal(context.authenticate(session), false);
assert.ok(html.includes("data:image/webp;base64,"));
assert.ok(!html.includes(accessCode), "Access code leaked into public HTML");
assert.ok(!firebaseHtml.includes(accessCode), "Access code leaked into Firebase HTML");
assert.ok(!html.includes(notifyKey) && !firebaseHtml.includes(notifyKey), "Notification key leaked into public HTML");
assert.ok(!source.includes("MailApp"), "Public script must not request mail permission");
assert.ok(!html.includes("Комментарий") && !html.includes("suggestion-list"), "Old suggestion controls remain visible");
assert.ok(firebaseHtml.includes('bridge-client.js'));
assert.ok(bridge.includes('kinovecher-bridge-v1'));
new Function(firebaseClient);
new Function(bridge.replace('<?= nonce ?>', 'a'.repeat(32)).match(/<script>([\s\S]*?)<\/script>/)[1]);
assert.ok(!html.includes("Есть хороший фильм?"));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
new Function(scripts[0][1]);
console.log("Google package passed: access gate, shared film updates, seed import, hidden code, and client syntax.");
