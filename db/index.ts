import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let schemaReady: Promise<void> | null = null;

export function ensureDatabaseSchema() {
  if (!env.DB) throw new Error("La base de datos protegida no está disponible.");
  if (!schemaReady) {
    const d1 = env.DB;
    schemaReady = d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS knowledge_sources (
        id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, organization TEXT NOT NULL,
        url TEXT NOT NULL, jurisdiction TEXT NOT NULL, topic TEXT NOT NULL,
        published_on TEXT, verified_on TEXT NOT NULL, status TEXT DEFAULT 'vigente' NOT NULL,
        notes TEXT NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS decision_rules (
        id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, title TEXT NOT NULL,
        rule_type TEXT NOT NULL, priority INTEGER NOT NULL, guidance TEXT NOT NULL,
        source_id TEXT NOT NULL, reviewed_on TEXT NOT NULL, active INTEGER DEFAULT 1 NOT NULL,
        FOREIGN KEY (source_id) REFERENCES knowledge_sources(id)
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, applicant_reference TEXT NOT NULL,
        jurisdiction TEXT DEFAULT 'Florida' NOT NULL, goal TEXT NOT NULL, status TEXT NOT NULL,
        input_json TEXT NOT NULL, result_json TEXT NOT NULL, source_version TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY NOT NULL, assessment_id TEXT NOT NULL, action TEXT NOT NULL,
        details_json TEXT NOT NULL, created_at TEXT NOT NULL,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id)
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, full_name TEXT NOT NULL,
        preferred_language TEXT DEFAULT 'es' NOT NULL, preferred_channel TEXT DEFAULT 'telefono' NOT NULL,
        contact_value TEXT DEFAULT '' NOT NULL, interest TEXT NOT NULL, source TEXT NOT NULL,
        status TEXT DEFAULT 'nuevo' NOT NULL, consent_version TEXT NOT NULL, consent_at TEXT NOT NULL,
        notes TEXT DEFAULT '' NOT NULL, next_action_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS follow_up_tasks (
        id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, prospect_id TEXT,
        title TEXT NOT NULL, due_at TEXT NOT NULL, priority TEXT DEFAULT 'normal' NOT NULL,
        status TEXT DEFAULT 'pendiente' NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id)
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, prospect_id TEXT,
        attendee_reference TEXT NOT NULL, starts_at TEXT NOT NULL, duration_minutes INTEGER DEFAULT 30 NOT NULL,
        mode TEXT DEFAULT 'telefono' NOT NULL, status TEXT DEFAULT 'programada' NOT NULL,
        reminder_status TEXT DEFAULT 'borrador' NOT NULL, notes TEXT DEFAULT '' NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id)
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY NOT NULL, owner_email TEXT NOT NULL, name TEXT NOT NULL,
        topic TEXT NOT NULL, audience TEXT NOT NULL, channel TEXT DEFAULT 'correo' NOT NULL,
        status TEXT DEFAULT 'borrador' NOT NULL, subject TEXT NOT NULL, content TEXT NOT NULL,
        disclaimer TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`),
      d1.prepare("CREATE INDEX IF NOT EXISTS decision_rules_domain_idx ON decision_rules(domain)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS decision_rules_source_idx ON decision_rules(source_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS assessments_owner_idx ON assessments(owner_email)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS assessments_created_idx ON assessments(created_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS audit_assessment_idx ON audit_events(assessment_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS prospects_owner_idx ON prospects(owner_email)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects(status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS prospects_next_action_idx ON prospects(next_action_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS tasks_owner_idx ON follow_up_tasks(owner_email)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS tasks_due_idx ON follow_up_tasks(due_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS appointments_owner_idx ON appointments(owner_email)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments(starts_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS campaigns_owner_idx ON campaigns(owner_email)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status)"),
    ]).then(() => undefined).catch((error) => { schemaReady = null; throw error; });
  }
  return schemaReady;
}
