CREATE TABLE `posts` (
	`slug` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`date` text NOT NULL,
	`read_time` integer NOT NULL,
	`size` text NOT NULL,
	`cover` text NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`draft` integer DEFAULT false NOT NULL,
	`author_id` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_id_unique` ON `posts` (`id`);--> statement-breakpoint
CREATE INDEX `posts_draft_idx` ON `posts` (`draft`);--> statement-breakpoint
CREATE INDEX `posts_date_idx` ON `posts` (`date`);--> statement-breakpoint
CREATE INDEX `posts_category_idx` ON `posts` (`category`);