# Киновечер

[Открыть сайт без VPN](https://script.google.com/macros/s/AKfycbzdZYf74dsGiZAaTdWuP9COIo2va-_qLX8W4Oc-4VFgT5GkUfVo9R_v7A-z74sJsk0m/exec)

Сайт для киновечеров с доступом по общему коду. Колесо выбирает фильм из общего списка. После выбора показываются постер и галочка «Посмотрели». Просмотренные фильмы перестают выпадать, а отметки видны всем приглашённым.

На сайте сейчас 12 фильмов. Код доступа не хранится в публичном репозитории.

Основная версия находится в [google-apps-script](google-apps-script/README.md). Сайт и общие отметки работают через Google Apps Script. Адрес GitHub Pages `https://istmvera2092-sys.github.io/fs/` перенаправляет на Google-версию, если GitHub Pages открывается у посетителя.

Прежняя реализация на Cloudflare Workers и D1 сохранена в папках `app`, `db` и `drizzle` как исходный код. Google-версия не загружает файлы с Cloudflare или GitHub. Источники иллюстрации и постеров описаны в [docs/visual-assets.md](docs/visual-assets.md).
