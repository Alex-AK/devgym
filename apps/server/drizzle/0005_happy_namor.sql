CREATE TABLE `workout_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`slug` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`last_run` text,
	`best_passed` integer DEFAULT 0 NOT NULL,
	`solution_viewed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
