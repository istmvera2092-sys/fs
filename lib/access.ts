import { env } from "cloudflare:workers";

export const COOKIE_NAME = "film_access";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function config() {
  const code = env.FILM_ACCESS_CODE;
  const secret = env.FILM_SESSION_SECRET;
  if (!code || !secret) throw new Error("Film access configuration is missing");
  return { code, secret };
}

function constantTimeEqual(a: string, b: string) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

async function signature(message: string) {
  const { secret } = config();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validCode(input: string) {
  const { code } = config();
  return constantTimeEqual(input.trim().toUpperCase(), code.trim().toUpperCase());
}

export async function createAccessCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const message = "v1." + expires;
  return message + "." + await signature(message);
}

export async function verifyAccessCookie(value: string | undefined) {
  if (!value) return false;
  const match = /^v1\.(\d{10})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (expires < now || expires > now + SESSION_SECONDS) return false;
  const expected = await signature("v1." + expires);
  return constantTimeEqual(match[2], expected);
}

export async function requestHasAccess(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const encoded = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE_NAME + "="));
  const value = encoded?.slice(COOKIE_NAME.length + 1);
  return verifyAccessCookie(value);
}
