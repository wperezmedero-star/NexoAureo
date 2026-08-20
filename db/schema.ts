import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const knowledgeSources = sqliteTable("knowledge_sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  url: text("url").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  topic: text("topic").notNull(),
  publishedOn: text("published_on"),
  verifiedOn: text("verified_on").notNull(),
  status: text("status").notNull().default("vigente"),
  notes: text("notes").notNull(),
});

export const decisionRules = sqliteTable("decision_rules", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  ruleType: text("rule_type").notNull(),
  priority: integer("priority").notNull(),
  guidance: text("guidance").notNull(),
  sourceId: text("source_id").notNull().references(() => knowledgeSources.id),
  reviewedOn: text("reviewed_on").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (table) => [index("decision_rules_domain_idx").on(table.domain), index("decision_rules_source_idx").on(table.sourceId)]);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  applicantReference: text("applicant_reference").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("Florida"),
  goal: text("goal").notNull(),
  status: text("status").notNull(),
  inputJson: text("input_json").notNull(),
  resultJson: text("result_json").notNull(),
  sourceVersion: text("source_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("assessments_owner_idx").on(table.ownerEmail), index("assessments_created_idx").on(table.createdAt)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id),
  action: text("action").notNull(),
  detailsJson: text("details_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("audit_assessment_idx").on(table.assessmentId)]);

export const prospects = sqliteTable("prospects", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  fullName: text("full_name").notNull(),
  preferredLanguage: text("preferred_language").notNull().default("es"),
  preferredChannel: text("preferred_channel").notNull().default("telefono"),
  contactValue: text("contact_value").notNull().default(""),
  interest: text("interest").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("nuevo"),
  consentVersion: text("consent_version").notNull(),
  consentAt: text("consent_at").notNull(),
  notes: text("notes").notNull().default(""),
  nextActionAt: text("next_action_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("prospects_owner_idx").on(table.ownerEmail),
  index("prospects_status_idx").on(table.status),
  index("prospects_next_action_idx").on(table.nextActionAt),
]);

export const followUpTasks = sqliteTable("follow_up_tasks", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  prospectId: text("prospect_id").references(() => prospects.id),
  title: text("title").notNull(),
  dueAt: text("due_at").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pendiente"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("tasks_owner_idx").on(table.ownerEmail),
  index("tasks_due_idx").on(table.dueAt),
]);

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  prospectId: text("prospect_id").references(() => prospects.id),
  attendeeReference: text("attendee_reference").notNull(),
  startsAt: text("starts_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  mode: text("mode").notNull().default("telefono"),
  status: text("status").notNull().default("programada"),
  reminderStatus: text("reminder_status").notNull().default("borrador"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("appointments_owner_idx").on(table.ownerEmail),
  index("appointments_starts_idx").on(table.startsAt),
]);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  topic: text("topic").notNull(),
  audience: text("audience").notNull(),
  channel: text("channel").notNull().default("correo"),
  status: text("status").notNull().default("borrador"),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  disclaimer: text("disclaimer").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("campaigns_owner_idx").on(table.ownerEmail),
  index("campaigns_status_idx").on(table.status),
]);
