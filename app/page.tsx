import { cookies } from "next/headers";
import { verifyAccessCookie, COOKIE_NAME } from "@/lib/access";
import FilmApp from "./film-app";
import AccessGate from "./access-gate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const hasAccess = await verifyAccessCookie(cookieStore.get(COOKIE_NAME)?.value);
  return hasAccess ? <FilmApp /> : <AccessGate />;
}
