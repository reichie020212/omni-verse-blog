-- Orphan sweep: drop engagement rows whose post_slug no longer matches any
-- post (e.g., MDX files renamed/deleted before posts moved to the DB). Without
-- this, the FK alter below would fail on the table-rebuild copy step.
DELETE FROM `likes` WHERE `post_slug` NOT IN (SELECT `slug` FROM `posts`);--> statement-breakpoint
DELETE FROM `bookmarks` WHERE `post_slug` NOT IN (SELECT `slug` FROM `posts`);--> statement-breakpoint
DELETE FROM `comments` WHERE `post_slug` NOT IN (SELECT `slug` FROM `posts`);--> statement-breakpoint
ALTER TABLE `bookmarks` ALTER COLUMN "post_slug" TO "post_slug" text NOT NULL REFERENCES posts(slug) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ALTER COLUMN "post_slug" TO "post_slug" text NOT NULL REFERENCES posts(slug) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `likes` ALTER COLUMN "post_slug" TO "post_slug" text NOT NULL REFERENCES posts(slug) ON DELETE cascade ON UPDATE no action;
