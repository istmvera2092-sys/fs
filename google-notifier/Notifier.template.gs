// Private script. Build substitutes the key locally; dist/ is excluded from Git.
const SITE_URL_ = "https://kinovecher-sophie-2026.web.app/";
const QUEUE_URL_ = "https://script.google.com/macros/s/AKfycbzdZYf74dsGiZAaTdWuP9COIo2va-_qLX8W4Oc-4VFgT5GkUfVo9R_v7A-z74sJsk0m/exec";
const NOTIFY_KEY_ = __NOTIFY_KEY_JSON__;
const RECIPIENT_ = "GovorunGoorushky@yandex.ru";

function queueRequest_(mode, id) {
  const query = "?mode=" + encodeURIComponent(mode) + "&key=" + encodeURIComponent(NOTIFY_KEY_) +
    (id === undefined ? "" : "&id=" + encodeURIComponent(id));
  const response = UrlFetchApp.fetch(QUEUE_URL_ + query, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error("Очередь уведомлений недоступна: HTTP " + response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function sendPendingNotifications() {
  const pending = queueRequest_("notifications");
  if (!Array.isArray(pending)) throw new Error("Неверный ответ очереди уведомлений.");
  pending.forEach((item) => {
    const subject = "Киновечер: предложили фильм «" + item.title + "»";
    const body = "Новый фильм: " + item.title + "\n" +
      (item.note ? "Комментарий: " + item.note + "\n" : "") +
      "\nОткрыть Киновечер: " + SITE_URL_;
    MailApp.sendEmail(RECIPIENT_, subject, body);
    queueRequest_("notificationAck", item.id);
  });
  return pending.length;
}

// Run this once in the Apps Script editor and grant permissions.
function setupNotifier() {
  const exists = ScriptApp.getProjectTriggers().some((trigger) => trigger.getHandlerFunction() === "sendPendingNotifications");
  if (!exists) ScriptApp.newTrigger("sendPendingNotifications").timeBased().everyMinutes(1).create();
  return sendPendingNotifications();
}
