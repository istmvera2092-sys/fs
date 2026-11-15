import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const films = sqliteTable("films", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("idea"),
  createdAt: text("created_at").notNull(),
  watchedAt: text("watched_at"),
});
