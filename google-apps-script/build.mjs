import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "..");
const output = join(directory, "dist");
const envFile = join(root, ".dev.vars");
if (!existsSync(envFile)) throw new Error("Create .dev.vars in the repository root before building.");
const accessCode = readFileSync(envFile, "utf8").match(/^FILM_ACCESS_CODE=(.+)$/m)?.[1]?.trim();
if (!accessCode) throw new Error("FILM_ACCESS_CODE is missing from .dev.vars.");

const seedPath = existsSync(join(directory, "films.local.json"))
  ? join(directory, "films.local.json")
  : join(directory, "initial-films.json");
const initialFilms = JSON.parse(readFileSync(seedPath, "utf8"));
if (!Array.isArray(initialFilms) || initialFilms.length === 0) throw new Error("The initial film list is empty.");
const filmIds = new Set();
for (const film of initialFilms) {
  if (!Number.isSafeInteger(film.id) || filmIds.has(film.id) || !film.title) throw new Error("Invalid initial film snapshot.");
  filmIds.add(film.id);
}

const catalog = JSON.parse(readFileSync(join(root, "app/film-catalog.json"), "utf8"));
for (const metadata of Object.values(catalog)) {
  const posterPath = join(root, "public", metadata.poster.replace(/^\//, ""));
  const bytes = await sharp(posterPath).resize({ width: 250, withoutEnlargement: true }).webp({ quality: 64, effort: 5 }).toBuffer();
  metadata.poster = "data:image/webp;base64," + bytes.toString("base64");
  delete metadata.source;
}
const backgroundBytes = await sharp(join(root, "public/elven-valley.webp"))
  .resize({ width: 1500, withoutEnlargement: true }).webp({ quality: 58, effort: 5 }).toBuffer();
const background = "data:image/webp;base64," + backgroundBytes.toString("base64");

const index = readFileSync(join(directory, "Index.template.html"), "utf8")
  .replace("__BACKGROUND_DATA__", background)
  .replace("__CATALOG_JSON__", JSON.stringify(catalog));
const code = readFileSync(join(directory, "Code.template.gs"), "utf8")
  .replace("__ACCESS_CODE_JSON__", JSON.stringify(accessCode))
  .replace("__INITIAL_FILMS_JSON__", JSON.stringify(initialFilms));
if (index.includes("__BACKGROUND_DATA__") || index.includes("__CATALOG_JSON__") ||
    code.includes("__ACCESS_CODE_JSON__") || code.includes("__INITIAL_FILMS_JSON__")) {
  throw new Error("An Apps Script template placeholder was not replaced.");
}
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "Index.html"), index);
writeFileSync(join(output, "Code.gs"), code, { mode: 0o600 });
copyFileSync(join(directory, "appsscript.json"), join(output, "appsscript.json"));
copyFileSync(join(directory, "Bridge.template.html"), join(output, "Bridge.html"));
console.log(`Google package ready: ${initialFilms.length} films, ${Math.round(index.length / 1024)} KB page. Access code stays out of Git.`);
