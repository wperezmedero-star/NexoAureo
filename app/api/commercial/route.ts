import { and, asc, desc, eq } from "drizzle-orm";
import { appointments, campaigns, followUpTasks, prospects } from "../../../db/schema";
import { ensureDatabaseSchema, getDb } from "../../../db";
import { authorizeMutation, authorizeRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const CONSENT_VERSION = "contacto-educativo-v1-2026-08-19";
const leadStatuses = new Set(["nuevo", "contactado", "cita", "entrevista", "seguimiento", "cliente", "no_continuar"]);
const interests = new Set(["vida", "salud", "retiro", "gastos_finales", "educacion", "general"]);

function clean(value: unknown, limit: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function ensureNoSensitiveNotes(value: string) {
  const forbidden = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b(ssn|seguro social|routing|cuenta bancaria|tarjeta de cr[eé]dito)\b/i,
    /\b(historia m[eé]dica|diagn[oó]stico|medicamento|direcci[oó]n residencial)\b/i,
  ];
  if (forbidden.some((pattern) => pattern.test(value))) {
    throw new Error("Las notas comerciales no admiten información médica, bancaria, domicilio ni identificadores sensibles.");
  }
}

function maskContact(value: string) {
  if (!value) return "Sin contacto guardado";
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain || "correo"}`;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `••• ••• ${digits.slice(-4)}` : "Contacto protegido";
}

async function loadOverview(ownerEmail: string) {
  const db = getDb();
  const [leadRows, taskRows, appointmentRows, campaignRows] = await Promise.all([
    db.select().from(prospects).where(eq(prospects.ownerEmail, ownerEmail)).orderBy(desc(prospects.updatedAt)),
    db.select().from(followUpTasks).where(eq(followUpTasks.ownerEmail, ownerEmail)).orderBy(asc(followUpTasks.dueAt)),
    db.select().from(appointments).where(eq(appointments.ownerEmail, ownerEmail)).orderBy(asc(appointments.startsAt)),
    db.select().from(campaigns).where(eq(campaigns.ownerEmail, ownerEmail)).orderBy(desc(campaigns.updatedAt)),
  ]);
  const safeLeads = leadRows.map(({ contactValue, ...lead }) => ({ ...lead, contactPreview: maskContact(contactValue) }));
  return {
    prospects: safeLeads,
    tasks: taskRows,
    appointments: appointmentRows,
    campaigns: campaignRows,
    metrics: {
      totalProspects: leadRows.length,
      pendingTasks: taskRows.filter((task) => task.status === "pendiente").length,
      upcomingAppointments: appointmentRows.filter((item) => item.status === "programada" && item.startsAt >= new Date().toISOString()).length,
      draftCampaigns: campaignRows.filter((campaign) => campaign.status === "borrador").length,
    },
    controls: {
      consentVersion: CONSENT_VERSION,
      automaticSendingEnabled: false,
      productPromotionEnabled: false,
      appointmentRequired: true,
    },
  };
}

export async function GET(request: Request) {
  const authorization = authorizeRequest(request);
  if (!authorization.ok) return authorization.response;

  try {
    await ensureDatabaseSchema();
    const ownerEmail = authorization.user.email;
    return Response.json(await loadOverview(ownerEmail));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar el espacio comercial.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = authorizeMutation(request);
  if (!authorization.ok) return authorization.response;

  try {
    await ensureDatabaseSchema();
    const ownerEmail = authorization.user.email;
    const body = (await request.json()) as Record<string, unknown>;
    const action = clean(body.action, 40);
    const now = new Date().toISOString();
    const db = getDb();

    if (action === "create_prospect") {
      const fullName = clean(body.fullName, 80);
      const interest = clean(body.interest, 30);
      const source = clean(body.source, 60);
      const notes = clean(body.notes, 500);
      const contactValue = clean(body.contactValue, 120);
      if (fullName.length < 2 || !interests.has(interest) || !source) throw new Error("Completa nombre, interés y procedencia.");
      if (contactValue && body.consent !== true) throw new Error("El consentimiento de contacto es obligatorio antes de guardar un medio de contacto.");
      ensureNoSensitiveNotes(notes);
      const id = crypto.randomUUID();
      await db.insert(prospects).values({ id, ownerEmail, fullName, preferredLanguage: body.preferredLanguage === "en" ? "en" : "es", preferredChannel: clean(body.preferredChannel, 20) || "telefono", contactValue, interest, source, status: "nuevo", consentVersion: CONSENT_VERSION, consentAt: now, notes, nextActionAt: body.nextActionAt ? new Date(String(body.nextActionAt)).toISOString() : null, createdAt: now, updatedAt: now });
      return Response.json({ ok: true, id, overview: await loadOverview(ownerEmail) }, { status: 201 });
    }

    if (action === "update_prospect_status") {
      const id = clean(body.id, 50);
      const status = clean(body.status, 30);
      if (!leadStatuses.has(status)) throw new Error("La etapa seleccionada no es válida.");
      await db.update(prospects).set({ status, updatedAt: now }).where(and(eq(prospects.id, id), eq(prospects.ownerEmail, ownerEmail)));
      return Response.json({ ok: true, overview: await loadOverview(ownerEmail) });
    }

    if (action === "create_task") {
      const title = clean(body.title, 120);
      if (!title || !body.dueAt) throw new Error("Completa la tarea y su fecha.");
      await db.insert(followUpTasks).values({ id: crypto.randomUUID(), ownerEmail, prospectId: clean(body.prospectId, 50) || null, title, dueAt: new Date(String(body.dueAt)).toISOString(), priority: body.priority === "alta" ? "alta" : "normal", status: "pendiente", createdAt: now, updatedAt: now });
      return Response.json({ ok: true, overview: await loadOverview(ownerEmail) }, { status: 201 });
    }

    if (action === "complete_task") {
      const id = clean(body.id, 50);
      await db.update(followUpTasks).set({ status: "completada", updatedAt: now }).where(and(eq(followUpTasks.id, id), eq(followUpTasks.ownerEmail, ownerEmail)));
      return Response.json({ ok: true, overview: await loadOverview(ownerEmail) });
    }

    if (action === "create_appointment") {
      const attendeeReference = clean(body.attendeeReference, 80);
      const notes = clean(body.notes, 300);
      ensureNoSensitiveNotes(notes);
      if (!attendeeReference || !body.startsAt) throw new Error("Completa la referencia y la fecha de la cita.");
      await db.insert(appointments).values({ id: crypto.randomUUID(), ownerEmail, prospectId: clean(body.prospectId, 50) || null, attendeeReference, startsAt: new Date(String(body.startsAt)).toISOString(), durationMinutes: Math.max(15, Math.min(90, Number(body.durationMinutes) || 30)), mode: clean(body.mode, 20) || "telefono", status: "programada", reminderStatus: "borrador", notes, createdAt: now, updatedAt: now });
      return Response.json({ ok: true, overview: await loadOverview(ownerEmail) }, { status: 201 });
    }

    if (action === "create_campaign") {
      const name = clean(body.name, 100);
      const subject = clean(body.subject, 140);
      const content = clean(body.content, 2000);
      if (!name || !subject || content.length < 20) throw new Error("Completa nombre, asunto y contenido educativo.");
      ensureNoSensitiveNotes(content);
      await db.insert(campaigns).values({ id: crypto.randomUUID(), ownerEmail, name, topic: clean(body.topic, 40) || "general", audience: clean(body.audience, 100) || "Contactos con consentimiento vigente", channel: clean(body.channel, 20) || "correo", status: "borrador", subject, content, disclaimer: "Contenido educativo. No constituye cotización, solicitud ni recomendación de un producto.", createdAt: now, updatedAt: now });
      return Response.json({ ok: true, overview: await loadOverview(ownerEmail) }, { status: 201 });
    }

    throw new Error("Acción no reconocida.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible completar la operación.";
    return Response.json({ error: message }, { status: 400 });
  }
}
