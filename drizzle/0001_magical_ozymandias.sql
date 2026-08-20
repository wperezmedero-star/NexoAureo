CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`prospect_id` text,
	`attendee_reference` text NOT NULL,
	`starts_at` text NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`mode` text DEFAULT 'telefono' NOT NULL,
	`status` text DEFAULT 'programada' NOT NULL,
	`reminder_status` text DEFAULT 'borrador' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointments_owner_idx` ON `appointments` (`owner_email`);--> statement-breakpoint
CREATE INDEX `appointments_starts_idx` ON `appointments` (`starts_at`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`topic` text NOT NULL,
	`audience` text NOT NULL,
	`channel` text DEFAULT 'correo' NOT NULL,
	`status` text DEFAULT 'borrador' NOT NULL,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`disclaimer` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campaigns_owner_idx` ON `campaigns` (`owner_email`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);--> statement-breakpoint
CREATE TABLE `follow_up_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`prospect_id` text,
	`title` text NOT NULL,
	`due_at` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_owner_idx` ON `follow_up_tasks` (`owner_email`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `follow_up_tasks` (`due_at`);--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`full_name` text NOT NULL,
	`preferred_language` text DEFAULT 'es' NOT NULL,
	`preferred_channel` text DEFAULT 'telefono' NOT NULL,
	`contact_value` text DEFAULT '' NOT NULL,
	`interest` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'nuevo' NOT NULL,
	`consent_version` text NOT NULL,
	`consent_at` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`next_action_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `prospects_owner_idx` ON `prospects` (`owner_email`);--> statement-breakpoint
CREATE INDEX `prospects_status_idx` ON `prospects` (`status`);--> statement-breakpoint
CREATE INDEX `prospects_next_action_idx` ON `prospects` (`next_action_at`);