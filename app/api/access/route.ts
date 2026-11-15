import { COOKIE_NAME, createAccessCookie, validCode } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ error: "Введите код доступа." }, { status: 400 });
  }
  if (typeof body.code !== "string" || !validCode(body.code)) {
    return Response.json({ error: "Неверный код. Попробуйте ещё раз." }, { status: 401 });
  }
  const value = await createAccessCookie();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": COOKIE_NAME + "=" + value + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800" + secure,
    },
  });
}

export async function DELETE(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": COOKIE_NAME + "=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" + secure,
    },
  });
}
