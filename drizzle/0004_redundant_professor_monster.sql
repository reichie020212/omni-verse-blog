CREATE TABLE `post_covers` (
	`post_slug` text PRIMARY KEY NOT NULL,
	`image` blob NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`post_slug`) REFERENCES `posts`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `has_cover_image` integer DEFAULT false NOT NULL;