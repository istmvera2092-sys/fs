"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WhiteTree from "./white-tree";
import StarField from "./star-field";
import SelectedFilm from "./selected-film";

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
              <span className="wheel-label" key={film.id} style={{ left: x + "%", top: y + "%", transform: "translate(-50%, -50%) rotate(" + (angle * 180 / Math.PI + (Math.cos(angle) < 0 ? 180 : 0)) + "deg)", fontSize: count > 10 ? "9px" : count > 6 ? "11px" : "13px" }}>
                {film.title.length > 24 ? film.title.slice(0, 22) + "…" : film.title}
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
      if (!spinningRef.current) {
        setFilms(data.films);
        let savedId = "";
        try { savedId = sessionStorage.getItem("kinovecher-pick") ?? ""; } catch {}
        setPicked((previous) => data.films.find((film) => film.id === (previous?.id ?? Number(savedId))) ?? null);
      }
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
    try { sessionStorage.removeItem("kinovecher-pick"); } catch {}
    setSpinning(true);
    requestAnimationFrame(() => setRotation(next));
    spinTimer.current = setTimeout(() => {
      spinningRef.current = false;
      setSpinning(false);
      setPicked(film);
      try { sessionStorage.setItem("kinovecher-pick", String(film.id)); } catch {}
      requestAnimationFrame(() => document.getElementById("tonight")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      refresh();
    }, 4700);
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
      setPicked((previous) => previous?.id === id ? { ...previous, status } : previous);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить фильм.");
    } finally {
      setBusyId(null);
    }
  }

  async function leave() {
    await fetch("/api/access", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <main className="cinema-page">
      <StarField />
      <header className="site-header">
        <a className="brand" href="#" aria-label="Киновечер"><WhiteTree /><span>Киновечер</span></a>
        <nav aria-label="Разделы"><a href="#watched">Просмотрено</a></nav>
      </header>

      <section className="cinema-hero page-width">
        <div className="cinema-intro">
          <span className="small-caps">ДЛЯ СВОЕЙ КОМПАНИИ</span>
          <h1>Что посмотрим <em>сегодня?</em></h1>
          <p>Собирайтесь вместе. Выбор фильма доверьте колесу.</p>
        </div>
        <div className="cinema-wheel" id="wheel">
          <div className="wheel-caption"><span /><WhiteTree /><span /></div>
          <Wheel films={queue} rotation={rotation} spinning={spinning} />
          <button className="primary-button spin-button" onClick={spin} disabled={loading || !queue.length || spinning}>
            <span aria-hidden="true">✧</span>{loading ? "Загружаем фильмы…" : spinning ? "Выбираем…" : "Выбрать фильм"}<span aria-hidden="true">✧</span>
          </button>
          <p className="wheel-hint" aria-live="polite">{loading ? "Подключаем общий список" : spinning ? "Ещё мгновение — и выбор сделан" : queue.length ? "В колесе: " + queue.length + " · Просмотренные не повторяются" : "Пока нет фильмов для выбора."}</p>
        </div>
      </section>

      <section className="tonight page-width" id="tonight" aria-live="polite" aria-label="Результат выбора">
        {picked && <SelectedFilm key={picked.id} film={picked} busy={busyId === picked.id || spinning} onWatched={(checked) => changeStatus(picked.id, checked ? "watched" : "queue")} />}
      </section>

      <section className="community page-width">
        <details className="watched-details" id="watched">
          <summary>Уже посмотрели <span>{watched.length}</span><span className="details-arrow">⌄</span></summary>
          {watched.length ? <div className="watched-list">{watched.map((film) => <div className="watched-row" key={film.id}>
            <span className="watched-check">✓</span><div><strong>{film.title}</strong><small>{film.watchedAt ? new Date(film.watchedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "Просмотрено"}</small></div>
            <button title="Вернуть в колесо" aria-label={"Вернуть в колесо: " + film.title} onClick={() => changeStatus(film.id, "queue")} disabled={busyId === film.id}>↶</button>
          </div>)}</div> : <p className="history-empty">Здесь сохранятся фильмы, которые вы отметите просмотренными.</p>}
        </details>
      </section>
      {error && <div className="toast" role="alert">{error}<button aria-label="Закрыть сообщение" onClick={() => setError("")}>×</button></div>}
      <footer className="site-footer page-width"><span>Киновечер</span><span>Хороший фильм. Своя компания.</span><div><button className="logout-link" onClick={leave}>Выйти</button><a href="#">Наверх ↑</a></div></footer>
    </main>
  );
}
