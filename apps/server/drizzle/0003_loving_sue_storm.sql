ALTER TABLE `problem_progress` ADD `due_at` text;--> statement-breakpoint
ALTER TABLE `problem_progress` ADD `review_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `problem_progress` ADD `review_count` integer DEFAULT 0 NOT NULL;