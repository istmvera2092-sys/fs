import type { Metadata } from "next";
import "./globals.css";
import "./middle-earth.css";

export const metadata: Metadata = {
  title: "Киновечер — что посмотрим сегодня?",
  description: "Общий список фильмов, колесо выбора и идеи для следующего киновечера.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
