# Киновечер на Google Apps Script

Отдельная версия сайта для адреса `script.google.com`. Она показывает ту же страницу входа, колесо, постер выбранного фильма и историю просмотров. Общие отметки хранятся в Script Properties проекта Google. Папка `dist` создаётся локально и не попадает в Git: в собранном `Code.gs` находится код доступа.

Рабочий адрес: https://script.google.com/macros/s/AKfycbzdZYf74dsGiZAaTdWuP9COIo2va-_qLX8W4Oc-4VFgT5GkUfVo9R_v7A-z74sJsk0m/exec

## Сборка

В корне репозитория нужен локальный `.dev.vars` с `FILM_ACCESS_CODE`. Этот файл исключён из Git. Сборка берёт снимок фильмов из `films.local.json`, если он есть, иначе использует `initial-films.json`.

```sh
node google-apps-script/build.mjs
node google-apps-script/test.mjs
```

Фон и постеры сжимаются и включаются прямо в `Index.html`. Страница не загружает изображения с GitHub или Cloudflare. Список и отметки доступны только после проверки общего кода на сервере Apps Script.

Для правильного масштаба на телефонах `doGet()` задаёт viewport через `HtmlOutput.addMetaTag()`. Метатег, записанный только в `Index.html`, [игнорируется HTML Service](https://developers.google.com/apps-script/reference/html/html-output#addmetatagname_content).

## Публикация

В [настройках Apps Script](https://script.google.com/home/usersettings) включите **Google Apps Script API**. Установите [clasp](https://developers.google.com/apps-script/guides/clasp) и войдите в нужный Google-аккаунт. Дальнейшие команды выполняются из `google-apps-script/dist`:

```sh
clasp login
clasp create --type webapp --title "Киновечер"
cd ../..
node google-apps-script/build.mjs
cd google-apps-script/dist
clasp push --force
clasp deploy --description "Киновечер"
```

Повторная сборка после `clasp create` нужна потому, что эта команда заменяет `appsscript.json` своим шаблоном.

Манифест задаёт запуск от имени владельца и доступ к странице по ссылке для всех; сами фильмы защищены кодом. После публикации проверьте адрес `/exec` в обычном и приватном окне браузера без VPN. URL проекта Google нужно сообщить приглашённым.

Для обновления действующего проекта сохраните локальный `.clasp.json`, выполните новую сборку, `clasp push --force` и `clasp deploy --deploymentId AKfycbzdZYf74dsGiZAaTdWuP9COIo2va-_qLX8W4Oc-4VFgT5GkUfVo9R_v7A-z74sJsk0m --description "Обновление"`. Не создавайте новый проект при обычном обновлении: общая история хранится в Script Properties прежнего проекта.

Снимок `films.local.json` экспортирован с прежнего сайта. Первое обращение после входа переносит фильмы и текущие отметки в Google. Повторная публикация не перезаписывает сохранённые данные.
