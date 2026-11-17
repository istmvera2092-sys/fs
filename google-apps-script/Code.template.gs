// Built into dist/Code.gs. The shared access code and film snapshot are added
// locally during packaging and are never committed to Git.
const FILM_ACCESS_CODE_ = __ACCESS_CODE_JSON__;
const INITIAL_FILMS_ = __INITIAL_FILMS_JSON__;
const FILM_PREFIX_ = "film:";
const SUGGESTION_PREFIX_ = "suggestion:";
const SESSION_PREFIX_ = "session:";
const NOTIFY_PREFIX_ = "notify:";
const NOTIFY_KEY_ = __NOTIFY_KEY_JSON__;

function doGet(e) {
  if (e && e.parameter && (e.parameter.mode === "notifications" || e.parameter.mode === "notificationAck" || e.parameter.mode === "notificationStatus")) {
    const params = e.parameter;
    if (params.key !== NOTIFY_KEY_) throw new Error("Доступ запрещён.");
    const result = params.mode === "notifications" ? pendingNotifications_() :
      params.mode === "notificationAck" ? acknowledgeNotification_(params.id) : notificationStatus_();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.mode === "bridge") {
    const nonce = String(e.parameter.nonce || "");
    if (!/^[a-f0-9]{32}$/.test(nonce)) throw new Error("Недопустимый запрос.");
    const template = HtmlService.createTemplateFromFile("Bridge");
    template.nonce = nonce;
    return template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle("Киновечер");
  }
  return HtmlService.createHtmlOutputFromFile("Index")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
    .setTitle("Киновечер — что посмотрим сегодня?");
}

function authenticate(credential) {
  if (typeof credential !== "string") return false;
  if (credential === FILM_ACCESS_CODE_) return true;
  if (!/^[a-f0-9]{64}$/.test(credential)) return false;
  return PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX_ + credential) === "1";
}

function requireAccess_(credential) {
  if (!authenticate(credential)) throw new Error("Доступ не подтверждён. Войдите снова по коду.");
}

function createSession(code) {
  if (typeof code !== "string" || code !== FILM_ACCESS_CODE_) throw new Error("Неверный код доступа.");
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "").toLowerCase();
  PropertiesService.getScriptProperties().setProperty(SESSION_PREFIX_ + token, "1");
  return token;
}

function revokeSession(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX_ + token);
  return true;
}

function pendingNotifications_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const all = properties.getProperties();
    const now = Date.now();
    const pending = [];
    Object.keys(all).filter((key) => key.indexOf(NOTIFY_PREFIX_) === 0).forEach((key) => {
      const item = JSON.parse(all[key]);
      if (item.claimedUntil && item.claimedUntil > now) return;
      item.claimedUntil = now + 5 * 60 * 1000;
      properties.setProperty(key, JSON.stringify(item));
      pending.push({ id: item.id, title: item.title, note: item.note });
    });
    return pending;
  } finally {
    lock.releaseLock();
  }
}

function notificationStatus_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  return { pending: Object.keys(all).filter((key) => key.indexOf(NOTIFY_PREFIX_) === 0).length };
}

function acknowledgeNotification_(id) {
  if (!/^\d+$/.test(String(id || ""))) throw new Error("Неверное уведомление.");
  PropertiesService.getScriptProperties().deleteProperty(NOTIFY_PREFIX_ + id);
  return { ok: true };
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

function readSuggestions_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(all)
    .filter((key) => key.indexOf(SUGGESTION_PREFIX_) === 0 && key !== "suggestion:nextId")
    .map((key) => JSON.parse(all[key]))
    .sort((a, b) => b.id - a.id);
}

function getState(code) {
  requireAccess_(code);
  ensureFilms_();
  return { films: readFilms_(), suggestions: readSuggestions_() };
}

function cleanTitle_(title) {
  title = typeof title === "string" ? title.trim().replace(/\s+/g, " ") : "";
  if (!title || title.length > 100) throw new Error("Укажите название фильма до 100 символов.");
  return title;
}

function cleanNote_(note) {
  note = typeof note === "string" ? note.trim() : "";
  if (note.length > 280) throw new Error("Комментарий слишком длинный.");
  return note;
}

function sameTitle_(a, b) {
  return a.toLocaleLowerCase("ru").replace(/ё/g, "е") === b.toLocaleLowerCase("ru").replace(/ё/g, "е");
}

function suggestFilm(code, title, note) {
  requireAccess_(code);
  title = cleanTitle_(title);
  note = cleanNote_(note);
  ensureFilms_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let suggestion;
  try {
    if (readFilms_().some((film) => sameTitle_(film.title, title)) ||
        readSuggestions_().some((item) => sameTitle_(item.title, title))) {
      throw new Error("Такой фильм уже есть в списке или предложениях.");
    }
    const properties = PropertiesService.getScriptProperties();
    const id = Number(properties.getProperty("suggestion:nextId") || "1");
    suggestion = { id, title, note, createdAt: new Date().toISOString() };
    properties.setProperties({
      [SUGGESTION_PREFIX_ + id]: JSON.stringify(suggestion),
      [NOTIFY_PREFIX_ + id]: JSON.stringify(suggestion),
      "suggestion:nextId": String(id + 1),
    });
  } finally {
    lock.releaseLock();
  }
  return { ...suggestion, notificationQueued: true };
}

function promoteSuggestion(code, id) {
  requireAccess_(code);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Предложение не найдено.");
  ensureFilms_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const raw = properties.getProperty(SUGGESTION_PREFIX_ + id);
    if (!raw) throw new Error("Предложение уже обработано.");
    const suggestion = JSON.parse(raw);
    if (readFilms_().some((film) => sameTitle_(film.title, suggestion.title))) {
      throw new Error("Такой фильм уже есть в колесе.");
    }
    const filmId = Number(properties.getProperty("films:nextId"));
    const film = { id: filmId, title: suggestion.title, note: suggestion.note, status: "queue", createdAt: new Date().toISOString(), watchedAt: null };
    properties.setProperties({ [FILM_PREFIX_ + filmId]: JSON.stringify(film), "films:nextId": String(filmId + 1) });
    properties.deleteProperty(SUGGESTION_PREFIX_ + id);
    return film;
  } finally {
    lock.releaseLock();
  }
}

function removeSuggestion(code, id) {
  requireAccess_(code);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Предложение не найдено.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    if (!properties.getProperty(SUGGESTION_PREFIX_ + id)) throw new Error("Предложение уже удалено.");
    properties.deleteProperty(SUGGESTION_PREFIX_ + id);
    return true;
  } finally {
    lock.releaseLock();
  }
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

function addFilm(code, title, note) {
  requireAccess_(code);
  title = cleanTitle_(title);
  note = cleanNote_(note);
  ensureFilms_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = readFilms_();
    if (existing.some((film) => sameTitle_(film.title, title))) {
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
