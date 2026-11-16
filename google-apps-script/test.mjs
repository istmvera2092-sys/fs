import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const directory = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(directory, "dist/Code.gs"), "utf8");
const html = readFileSync(join(directory, "dist/Index.html"), "utf8");
const accessCode = readFileSync(join(directory, "../.dev.vars"), "utf8").match(/^FILM_ACCESS_CODE=(.+)$/m)?.[1]?.trim();
assert.ok(accessCode);
const values = new Map();
const metaTags = [];
const properties = {
  getProperty(key) { return values.get(key) ?? null; },
  getProperties() { return Object.fromEntries(values); },
  setProperty(key, value) { values.set(key, value); },
  setProperties(entries) { for (const [key, value] of Object.entries(entries)) values.set(key, value); },
};
const lock = { waitLock() {}, releaseLock() {} };
const context = vm.createContext({
  PropertiesService: { getScriptProperties: () => properties },
  LockService: { getScriptLock: () => lock },
  HtmlService: { createHtmlOutputFromFile: () => ({
    addMetaTag(name, content) { metaTags.push({ name, content }); return this; },
    setTitle() { return this; },
  }) },
  Date,
  JSON,
});
vm.runInContext(source, context);
context.doGet();
assert.equal(metaTags.find((tag) => tag.name === "viewport")?.content, "width=device-width, initial-scale=1, viewport-fit=cover");
assert.equal(context.authenticate("wrong-code"), false);
assert.equal(context.authenticate(accessCode), true);
assert.throws(() => context.getFilms("wrong-code"), /Неверный код/);
const films = context.getFilms(accessCode);
assert.equal(films.length, 12);
assert.equal(new Set(films.map((film) => film.id)).size, films.length);
assert.equal(context.updateWatched(accessCode, films[0].id, true).status, "watched");
assert.equal(context.getFilms(accessCode).find((film) => film.id === films[0].id).status, "watched");
assert.equal(context.updateWatched(accessCode, films[0].id, false).status, "queue");
assert.throws(() => context.addFilm("wrong-code", "Новый фильм", ""), /Неверный код/);
assert.throws(() => context.addFilm(accessCode, films[0].title, ""), /уже есть/);
assert.equal(context.addFilm(accessCode, "Новый фильм", "").id, Math.max(...films.map((film) => film.id)) + 1);
assert.equal(context.getFilms(accessCode).length, 13);
assert.ok(html.includes("data:image/webp;base64,"));
assert.ok(!html.includes(accessCode), "Access code leaked into public HTML");
assert.ok(!html.includes("Есть хороший фильм?"));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
new Function(scripts[0][1]);
console.log("Google package passed: access gate, shared film updates, seed import, hidden code, and client syntax.");
