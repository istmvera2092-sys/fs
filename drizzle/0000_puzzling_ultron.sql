CREATE TABLE `films` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`created_at` text NOT NULL,
	`watched_at` text
);
