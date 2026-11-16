// Built into dist/Code.gs. The shared access code and film snapshot are added
// locally during packaging and are never committed to Git.
const FILM_ACCESS_CODE_ = __ACCESS_CODE_JSON__;
const INITIAL_FILMS_ = __INITIAL_FILMS_JSON__;
const FILM_PREFIX_ = "film:";

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Киновечер — что посмотрим сегодня?");
}

function authenticate(code) {
  return typeof code === "string" && code === FILM_ACCESS_CODE_;
}

function requireAccess_(code) {
  if (!authenticate(code)) throw new Error("Неверный код доступа.");
}

function ensureFilms_() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty("films:ready")) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (properties.getProperty("films:ready")) return;
    const entries = {};
    let highestId = 0;
    INITIAL_FILMS_.forEach((film) => {
      if (!Number.isSafeInteger(film.id) || film.id < 1) return;
      highestId = Math.max(highestId, film.id);
      entries[FILM_PREFIX_ + film.id] = JSON.stringify({
        id: film.id,
        title: String(film.title),
        note: String(film.note || ""),
        status: film.status === "watched" ? "watched" : "queue",
        createdAt: String(film.createdAt || new Date().toISOString()),
        watchedAt: film.status === "watched" ? String(film.watchedAt || "") : null,
      });
    });
    entries["films:nextId"] = String(highestId + 1);
    entries["films:ready"] = "1";
    properties.setProperties(entries);
  } finally {
    lock.releaseLock();
  }
}

function readFilms_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(all)
    .filter((key) => key.indexOf(FILM_PREFIX_) === 0)
    .map((key) => JSON.parse(all[key]))
    .sort((a, b) => b.id - a.id);
}

function getFilms(code) {
  requireAccess_(code);
  ensureFilms_();
  return readFilms_();
}

function updateWatched(code, id, watched) {
  requireAccess_(code);
  if (!Number.isSafeInteger(id) || id < 1 || typeof watched !== "boolean") {
    throw new Error("Неверный фильм или статус.");
  }
  ensureFilms_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const raw = properties.getProperty(FILM_PREFIX_ + id);
    if (!raw) throw new Error("Фильм не найден.");
    const film = JSON.parse(raw);
    film.status = watched ? "watched" : "queue";
    film.watchedAt = watched ? new Date().toISOString() : null;
    properties.setProperty(FILM_PREFIX_ + id, JSON.stringify(film));
    return film;
  } finally {
    lock.releaseLock();
  }
}

// Available for later additions; the current site deliberately has no add form.
function addFilm(code, title, note) {
  requireAccess_(code);
  title = typeof title === "string" ? title.trim().replace(/\s+/g, " ") : "";
  note = typeof note === "string" ? note.trim() : "";
  if (!title || title.length > 100) throw new Error("Укажите название фильма до 100 символов.");
  if (note.length > 280) throw new Error("Комментарий слишком длинный.");
  ensureFilms_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = readFilms_();
    if (existing.some((film) => film.title.toLocaleLowerCase("ru") === title.toLocaleLowerCase("ru"))) {
      throw new Error("Такой фильм уже есть в списке.");
    }
    const properties = PropertiesService.getScriptProperties();
    const id = Number(properties.getProperty("films:nextId"));
    const film = { id, title, note, status: "queue", createdAt: new Date().toISOString(), watchedAt: null };
    properties.setProperties({ [FILM_PREFIX_ + id]: JSON.stringify(film), "films:nextId": String(id + 1) });
    return film;
  } finally {
    lock.releaseLock();
  }
}
