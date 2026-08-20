CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`applicant_reference` text NOT NULL,
	`jurisdiction` text DEFAULT 'Florida' NOT NULL,
	`goal` text NOT NULL,
	`status` text NOT NULL,
	`input_json` text NOT NULL,
	`result_json` text NOT NULL,
	`source_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assessments_owner_idx` ON `assessments` (`owner_email`);--> statement-breakpoint
CREATE INDEX `assessments_created_idx` ON `assessments` (`created_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`action` text NOT NULL,
	`details_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_assessment_idx` ON `audit_events` (`assessment_id`);--> statement-breakpoint
CREATE TABLE `decision_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`title` text NOT NULL,
	`rule_type` text NOT NULL,
	`priority` integer NOT NULL,
	`guidance` text NOT NULL,
	`source_id` text NOT NULL,
	`reviewed_on` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `knowledge_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `decision_rules_domain_idx` ON `decision_rules` (`domain`);--> statement-breakpoint
CREATE INDEX `decision_rules_source_idx` ON `decision_rules` (`source_id`);--> statement-breakpoint
CREATE TABLE `knowledge_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`organization` text NOT NULL,
	`url` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`topic` text NOT NULL,
	`published_on` text,
	`verified_on` text NOT NULL,
	`status` text DEFAULT 'vigente' NOT NULL,
	`notes` text NOT NULL
);
