import { getDb } from "@/db";
import { films } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requestHasAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  if (!(await requestHasAccess(request))) return error("Требуется код доступа.", 401);
  try {
    const rows = await getDb().select().from(films).orderBy(desc(films.id));
    return Response.json({ films: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to load films", cause);
    return error("Не удалось загрузить фильмы. Попробуйте позже.", 500);
  }
}

export async function POST(request: Request) {
  if (!(await requestHasAccess(request))) return error("Требуется код доступа.", 401);
  let body: { title?: unknown; note?: unknown; status?: unknown };
  try { body = await request.json(); } catch { return error("Неверный формат данных."); }
  const title = typeof body.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const status = body.status === "queue" ? "queue" : "idea";
  if (!title || title.length > 100) return error("Название должно содержать от 1 до 100 символов.");
  if (note.length > 280) return error("Комментарий слишком длинный.");
  try {
    const db = getDb();
    const rows = await db.select({ title: films.title }).from(films);
    if (rows.some((film) => film.title.toLocaleLowerCase("ru") === title.toLocaleLowerCase("ru"))) {
      return error("Такой фильм уже есть в списке.");
    }
    const [created] = await db.insert(films).values({
      title, note, status, createdAt: new Date().toISOString(),
    }).returning();
    return Response.json({ film: created }, { status: 201 });
  } catch (cause) {
    console.error("Failed to add film", cause);
    return error("Не удалось добавить фильм. Попробуйте позже.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!(await requestHasAccess(request))) return error("Требуется код доступа.", 401);
  let body: { id?: unknown; status?: unknown };
  try { body = await request.json(); } catch { return error("Неверный формат данных."); }
  const id = Number(body.id);
  const status = body.status;
  if (!Number.isSafeInteger(id) || id < 1 || !["idea", "queue", "watched"].includes(String(status))) {
    return error("Неверный фильм или статус.");
  }
  try {
    const [updated] = await getDb().update(films).set({
      status: status as string,
      watchedAt: status === "watched" ? new Date().toISOString() : null,
    }).where(eq(films.id, id)).returning();
    if (!updated) return error("Фильм не найден.", 404);
    return Response.json({ film: updated });
  } catch (cause) {
    console.error("Failed to update film", cause);
    return error("Не удалось обновить фильм. Попробуйте позже.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await requestHasAccess(request))) return error("Требуется код доступа.", 401);
  let body: { id?: unknown };
  try { body = await request.json(); } catch { return error("Неверный формат данных."); }
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return error("Неверный фильм.");
  try {
    const [deleted] = await getDb().delete(films).where(eq(films.id, id)).returning();
    if (!deleted) return error("Фильм не найден.", 404);
    return Response.json({ ok: true });
  } catch (cause) {
    console.error("Failed to delete film", cause);
    return error("Не удалось удалить фильм. Попробуйте позже.", 500);
  }
}
