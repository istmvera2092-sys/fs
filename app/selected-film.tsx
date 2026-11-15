"use client";

import { useState } from "react";
import catalog from "./film-catalog.json";
import WhiteTree from "./white-tree";

type Film = { id: number; title: string; note: string; status: "idea" | "queue" | "watched" };
type Metadata = { poster?: string; year: string; source: string };

export default function SelectedFilm({ film, busy, onWatched }: {
  film: Film;
  busy: boolean;
  onWatched: (watched: boolean) => void;
}) {
  const [failed, setFailed] = useState(false);
  const key = Object.keys(catalog).find((title) => title.toLocaleLowerCase("ru").replaceAll("ё", "е") === film.title.toLocaleLowerCase("ru").replaceAll("ё", "е"));
  const metadata = key ? (catalog as Record<string, Metadata>)[key] : undefined;
  return <article className="chosen-card">
    <div className="chosen-poster">
      {metadata?.poster && !failed
        ? <img src={metadata.poster} alt={"Постер «" + film.title + "»"} onError={() => setFailed(true)} />
        : <div className="poster-fallback"><WhiteTree /><span>КИНОВЕЧЕР</span></div>}
    </div>
    <div className="chosen-copy">
      <span className="small-caps">СЕГОДНЯ СМОТРИМ</span>
      <h2>{film.title}</h2>
      {metadata?.year && <span className="chosen-year">{metadata.year}{film.title === "Бригада" ? " · сериал" : " · фильм"}</span>}
      {film.note && <p>{film.note}</p>}
      <label className={"watched-toggle" + (film.status === "watched" ? " is-watched" : "")}>
        <input type="checkbox" checked={film.status === "watched"} onChange={(event) => onWatched(event.target.checked)} disabled={busy} />
        <span>{busy ? "Сохраняем…" : film.status === "watched" ? "Посмотрели" : "Отметить «Посмотрели»"}</span>
      </label>
      <p className="chosen-hint">{film.status === "watched" ? "Фильм сохранён в просмотренных и больше не выпадает." : "После просмотра поставьте галочку. Она сохранится у всех."}</p>
      {metadata?.poster && !failed && <a className="poster-credit" href={metadata.source} target="_blank" rel="noreferrer">О фильме и постере ↗</a>}
    </div>
  </article>;
}
