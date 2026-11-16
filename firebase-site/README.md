# Киновечер на Firebase Hosting

Публичная страница собирается из того же шаблона, что и версия Google Apps Script. На новом адресе нет служебной полосы Google. Список фильмов, предложения и отметки пока остаются в Script Properties прежнего Google-проекта; это сохраняет общие данные при смене адреса.

Сайт общается с Google-проектом через невидимую страницу `Bridge.html`. Она принимает только известные действия, требует текущий код доступа на сервере и проверяет случайный идентификатор обмена. Код доступа не включается в опубликованные файлы Firebase.

```sh
node firebase-site/build.mjs
node google-apps-script/build.mjs
node google-apps-script/test.mjs
firebase deploy --only hosting --project <PROJECT_ID>
```

`firebase.json` уже настроен на каталог `firebase-site/public`. При сборке в него записываются `index.html` и `bridge-client.js`. Для публикации нужен вход Firebase CLI под владельцем проекта и созданный Firebase-проект; тариф Spark подходит для этой статической страницы. После публикации нужно открыть адрес `<PROJECT_ID>.web.app` без VPN на телефоне и проверить вход, предложение фильма и выход.
