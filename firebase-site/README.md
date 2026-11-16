# Киновечер на Firebase Hosting

Публичный адрес: https://kinovecher-sophie-2026.web.app/

Публичная страница собирается из того же шаблона, что и версия Google Apps Script. На новом адресе нет служебной полосы Google. Список фильмов, предложения и отметки остаются в Script Properties прежнего Google-проекта; это сохраняет общие данные при смене адреса.

Сайт общается с Google-проектом через невидимую страницу `Bridge.html`. Она принимает только известные действия, требует текущий код доступа на сервере и проверяет случайный идентификатор обмена. Код доступа не включается в опубликованные файлы Firebase.

```sh
node firebase-site/build.mjs
node google-apps-script/build.mjs
node google-apps-script/test.mjs
firebase deploy --only hosting
```

`firebase.json` настроен на каталог `firebase-site/public`, а `.firebaserc` — на проект `kinovecher-sophie-2026`. При сборке в каталог записываются `index.html` и `bridge-client.js`. Для публикации нужен вход Firebase CLI под владельцем проекта. После обновления нужно проверить вход, предложение фильма и выход на телефоне.
