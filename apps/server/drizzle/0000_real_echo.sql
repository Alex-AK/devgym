CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`problem_id` integer NOT NULL,
	`answer` text NOT NULL,
	`verdict` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_user_problem_idx` ON `attempts` (`user_id`,`problem_id`);--> statement-breakpoint
CREATE INDEX `attempts_created_at_idx` ON `attempts` (`created_at`);--> statement-breakpoint
CREATE TABLE `problem_progress` (
	`user_id` integer NOT NULL,
	`problem_id` integer NOT NULL,
	`status` text DEFAULT 'unseen' NOT NULL,
	`attempts_count` integer DEFAULT 0 NOT NULL,
	`hints_revealed` integer DEFAULT 0 NOT NULL,
	`solution_viewed` integer DEFAULT 0 NOT NULL,
	`last_skipped_at` text,
	`solved_at` text,
	`last_seen_at` text,
	PRIMARY KEY(`user_id`, `problem_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`difficulty` text NOT NULL,
	`type` text NOT NULL,
	`position` integer NOT NULL,
	`prompt` text NOT NULL,
	`grader_config` text NOT NULL,
	`solution` text NOT NULL,
	`explanation` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_slug_unique` ON `problems` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
