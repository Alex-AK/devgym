ALTER TABLE `problems` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `tag` text;