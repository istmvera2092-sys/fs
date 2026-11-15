"use client";

import { useState } from "react";
import WhiteTree from "./white-tree";
import StarField from "./star-field";

export default function AccessGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось войти.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось войти.");
      setBusy(false);
    }
  }

  return (
    <main className="gate-page">
      <StarField />
      <header className="gate-header"><div className="brand"><WhiteTree /><span>Киновечер</span></div><span>ДЛЯ СВОЕЙ КОМПАНИИ</span></header>
      <section className="gate-card">
        <div className="gate-icon"><WhiteTree /></div>
        <div className="eyebrow"><span className="eyebrow-dot" /> ДОСТУП ПО КОДУ</div>
        <h1>Вечер<br /><em>хорошего кино</em></h1>
        <p>Введите код вашей компании, чтобы выбрать фильм на вечер, предложить свой и отметить просмотренное.</p>
        <form onSubmit={enter} className="gate-form">
          <label htmlFor="access-code">Код доступа</label>
          <input id="access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Введите код" autoComplete="off" autoFocus required />
          {error && <div className="gate-error" role="alert">{error}</div>}
          <button className="submit-button" disabled={busy}>{busy ? "Проверяем…" : "Войти"}<span>↗</span></button>
        </form>
        <small>Код один для всех приглашённых участников.</small>
      </section>
      <footer className="gate-footer">Хороший фильм. Своя компания.</footer>
    </main>
  );
}
