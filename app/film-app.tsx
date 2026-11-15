"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WhiteTree from "./white-tree";

type Film = {
  id: number;
  title: string;
  note: string;
  status: "idea" | "queue" | "watched";
  createdAt: string;
  watchedAt: string | null;
};

const colors = ["#263d30", "#5d5030", "#31473d", "#625a3d", "#243c3c", "#6c5733", "#3b4932", "#4b4930"];

function Wheel({ films, rotation, spinning }: { films: Film[]; rotation: number; spinning: boolean }) {
  const count = films.length;
  const stops = films.map((_, index) => {
    const start = index * 100 / count;
    const end = (index + 1) * 100 / count;
    return colors[index % colors.length] + " " + start + "% " + end + "%";
  });
  const background = count ? "conic-gradient(" + stops.join(", ") + ")" : "conic-gradient(#37302d 0 12.5%, #473a31 12.5% 25%, #37302d 25% 37.5%, #473a31 37.5% 50%, #37302d 50% 62.5%, #473a31 62.5% 75%, #37302d 75% 87.5%, #473a31 87.5% 100%)";

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden="true" />
      <div className="wheel-shadow">
        <div className="wheel-disc" style={{ background, transform: "rotate(" + rotation + "deg)", transition: spinning ? "transform 4.6s cubic-bezier(.13,.72,.12,1)" : "none" }}>
          {films.map((film, index) => {
            const angle = (index + .5) * Math.PI * 2 / count - Math.PI / 2;
            const x = 50 + 32 * Math.cos(angle);
            const y = 50 + 32 * Math.sin(angle);
            return (
              <span className="wheel-label" key={film.id} style={{ left: x + "%", top: y + "%", fontSize: count > 10 ? "10px" : count > 6 ? "11px" : "13px" }}>
                {count > 12 ? index + 1 : film.title}
              </span>
            );
          })}
          <div className="wheel-hub"><WhiteTree /></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [formType, setFormType] = useState<"idea" | "queue">("idea");
  const [formBusy, setFormBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Film | null>(null);
  const spinningRef = useRef(false);
  const rotationRef = useRef(0);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/films", { cache: "no-store" });
      const data = await response.json() as { films: Film[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить список.");
      if (!spinningRef.current) setFilms(data.films);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить список.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (!spinningRef.current && !document.hidden) refresh(); }, 12000);
    const onFocus = () => { if (!spinningRef.current) refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, [refresh]);

  const queue = films.filter((film) => film.status === "queue").reverse();
  const ideas = films.filter((film) => film.status === "idea");
  const watched = films.filter((film) => film.status === "watched");

  function spin() {
    if (!queue.length || spinningRef.current) return;
    const index = Math.floor(Math.random() * queue.length);
    const film = queue[index];
    const center = (index + .5) * 360 / queue.length;
    const correction = (360 - center - (rotationRef.current % 360) + 720) % 360;
    const next = rotationRef.current + 360 * 6 + correction;
    rotationRef.current = next;
    spinningRef.current = true;
    setPicked(null);
    setSpinning(true);
    requestAnimationFrame(() => setRotation(next));
    spinTimer.current = setTimeout(() => {
      spinningRef.current = false;
      setSpinning(false);
      setPicked(film);
      refresh();
    }, 4700);
  }

  async function addFilm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setFormBusy(true);
    setError("");
    try {
      const response = await fetch("/api/films", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note, status: formType }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось добавить фильм.");
      setTitle("");
      setNote("");
      await refresh();
      document.getElementById(formType === "idea" ? "ideas" : "watchlist")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить фильм.");
    } finally {
      setFormBusy(false);
    }
  }

  async function changeStatus(id: number, status: Film["status"]) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/films", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось обновить фильм.");
      if (picked?.id === id && status === "watched") setPicked(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить фильм.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeFilm(film: Film) {
    if (!window.confirm("Удалить «" + film.title + "» из общего списка?")) return;
    setBusyId(film.id);
    setError("");
    try {
      const response = await fetch("/api/films", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: film.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось удалить фильм.");
      if (picked?.id === film.id) setPicked(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить фильм.");
    } finally {
      setBusyId(null);
    }
  }

  async function leave() {
    await fetch("/api/access", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <main>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="site-header">
        <a className="brand" href="#" aria-label="Киновечер, на главную"><span className="brand-mark">✳</span><span>кино<span className="brand-accent">вечер</span></span></a>
        <nav aria-label="Разделы"><a href="#watchlist">Список</a><a href="#ideas">Предложения</a><a href="#watched">Просмотрено</a></nav>
        <a className="header-action" href="#add">+ Добавить фильм</a>
      </header>

      <section className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> БРАТСТВО КИНО · СОВЕТ СОБРАН</div>
          <h1>Один вечер.<br /><em>Тысяча историй.</em></h1>
          <p className="hero-lede">Соберите свою компанию у огня. Предложите историю, достойную путешествия, и позвольте кольцу выбрать фильм на сегодня.</p>
          <div className="hero-actions"><button className="primary-button" onClick={spin} disabled={!queue.length || spinning}>✦ &nbsp; Крутить колесо <span>↗</span></button><a className="text-link" href="#add">Предложить фильм <span>→</span></a></div>
          <div className="hero-stats"><div><strong>{queue.length}</strong><span>в списке</span></div><i /><div><strong>{ideas.length}</strong><span>идей</span></div><i /><div><strong>{watched.length}</strong><span>просмотрено</span></div></div>
        </div>
        <div className="wheel-panel">
          <div className="wheel-panel-top"><span>КОЛЬЦО ВЫБОРА</span><span className="live-pill"><b /> {queue.length ? queue.length + " в игре" : "Ждём фильмы"}</span></div>
          <Wheel films={queue} rotation={rotation} spinning={spinning} />
          <div className="wheel-result" aria-live="polite">
            {spinning ? <><span className="result-kicker">Барабанная дробь...</span><strong>Выбираем фильм</strong></> : picked ? <><span className="result-kicker">СЕГОДНЯ СМОТРИМ</span><strong>{picked.title}</strong><button onClick={() => changeStatus(picked.id, "watched")} disabled={busyId === picked.id}>✓ Отметить просмотренным</button></> : <><span className="result-kicker">ВАШ КИНОВЕЧЕР НАЧИНАЕТСЯ ЗДЕСЬ</span><strong>{queue.length ? "Крутите и смотрите!" : "Добавьте первый фильм"}</strong></>}
          </div>
        </div>
      </section>

      <section className="content page-width" id="watchlist">
        <div className="section-heading"><div><span className="section-index">01 / КОЛЛЕКЦИЯ</span><h2>В списке на просмотр</h2><p>Эти фильмы участвуют в розыгрыше.</p></div><span className="count-badge">{queue.length} фильмов</span></div>
        {loading ? <div className="empty-state">Загружаем список...</div> : queue.length ? <div className="film-grid">{queue.map((film, index) => <article className="film-card" key={film.id}><div className="film-card-top"><span className="film-number">{String(index + 1).padStart(2, "0")}</span><button className="icon-button" title="Удалить фильм" aria-label={"Удалить " + film.title} onClick={() => removeFilm(film)} disabled={busyId === film.id}>×</button></div><div><span className="film-tag">В СПИСКЕ</span><h3>{film.title}</h3>{film.note && <p>{film.note}</p>}</div><button className="card-action" onClick={() => changeStatus(film.id, "watched")} disabled={busyId === film.id}><span className="check-square" /> Посмотрели</button></article>)}</div> : <div className="empty-state"><span>✦</span><h3>Пока здесь пусто</h3><p>Добавьте фильм сразу в список или перенесите его из предложений.</p><a href="#add">Добавить фильм →</a></div>}
      </section>

      <section className="ideas-band" id="ideas"><div className="page-width"><div className="section-heading"><div><span className="section-index">02 / ВДОХНОВЕНИЕ</span><h2>Предложения</h2><p>Идеи от вашей компании. Каждый увидит их здесь.</p></div><span className="count-badge">{ideas.length} идей</span></div>{ideas.length ? <div className="ideas-list">{ideas.map((film) => <article className="idea-row" key={film.id}><span className="idea-spark">✳</span><div className="idea-text"><h3>{film.title}</h3>{film.note && <p>{film.note}</p>}</div><button className="idea-add" onClick={() => changeStatus(film.id, "queue")} disabled={busyId === film.id}>+ В список</button><button className="icon-button" title="Удалить предложение" aria-label={"Удалить " + film.title} onClick={() => removeFilm(film)} disabled={busyId === film.id}>×</button></article>)}</div> : <div className="ideas-empty">Есть фильм на примете? Предложите его первым ↓</div>}</div></section>

      <section className="lower page-width"><div className="add-panel" id="add"><span className="section-index">03 / ВАША ОЧЕРЕДЬ</span><h2>Есть идея<br /><em>для вечера?</em></h2><p>Поделитесь фильмом — он сразу появится у всех приглашённых участников.</p><form onSubmit={addFilm}><label htmlFor="film-title">Название фильма</label><input id="film-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Например, Отель «Гранд Будапешт»" required /><label htmlFor="film-note">Почему стоит посмотреть <span>(необязательно)</span></label><textarea id="film-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} placeholder="Пара слов о фильме..." rows={3} /><div className="form-choice" role="group" aria-label="Куда добавить фильм"><button type="button" className={formType === "idea" ? "choice-active" : ""} onClick={() => setFormType("idea")}>В предложения</button><button type="button" className={formType === "queue" ? "choice-active" : ""} onClick={() => setFormType("queue")}>Сразу в список</button></div><button className="submit-button" disabled={formBusy}>{formBusy ? "Добавляем..." : "Добавить фильм"} <span>↗</span></button></form></div><div className="watched-panel" id="watched"><span className="section-index">04 / ИСТОРИЯ</span><h2>Уже посмотрели</h2><p>Наш небольшой киноархив.</p>{watched.length ? <div className="watched-list">{watched.map((film) => <div className="watched-row" key={film.id}><span className="watched-check">✓</span><div><strong>{film.title}</strong><small>{film.watchedAt ? new Date(film.watchedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "Просмотрено"}</small></div><button title="Вернуть в список" onClick={() => changeStatus(film.id, "queue")} disabled={busyId === film.id}>↶</button></div>)}</div> : <div className="watched-empty"><span>◌</span><p>Здесь появятся фильмы, которые вы посмотрели вместе.</p></div>}</div></section>

      {error && <div className="toast" role="alert">{error}<button aria-label="Закрыть сообщение" onClick={() => setError("")}>×</button></div>}
      <footer className="site-footer page-width"><span>✳ &nbsp; киновечер</span><span>Хорошее кино начинается с хорошей компании.</span><div><button className="logout-link" onClick={leave}>Выйти</button><a href="#">Наверх ↑</a></div></footer>
    </main>
  );
}
