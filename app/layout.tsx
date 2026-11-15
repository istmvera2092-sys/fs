import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Киновечер — решим, что смотреть",
  description: "Общий список фильмов, колесо выбора и идеи для следующего киновечера.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
