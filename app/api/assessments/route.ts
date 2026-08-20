import { and, desc, eq } from "drizzle-orm";
import { assessments, auditEvents } from "../../../db/schema";
import { ensureDatabaseSchema, getDb } from "../../../db";
import { summarizeAssessmentResult } from "../../../lib/assessment-summary";
import { analyzeAssessment, ENGINE_VERSION } from "../../../lib/decision-engine";
import { FACT_FINDER_VERSION, normalizeAssessmentPayload, validateAssessment } from "../../../lib/fact-finder";
import { getKnowledgeBase, KNOWLEDGE_VERSION } from "../../../lib/knowledge-base";
import { authorizeMutation, authorizeRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authorization = authorizeRequest(request);
  if (!authorization.ok) return authorization.response;
  const ownerEmail = authorization.user.email;

  try {
    await ensureDatabaseSchema();
    const db = getDb();
    const assessmentId = new URL(request.url).searchParams.get("id")?.trim();
    if (assessmentId) {
      const [row] = await db.select({
        id: assessments.id,
        applicantReference: assessments.applicantReference,
        jurisdiction: assessments.jurisdiction,
        goal: assessments.goal,
        status: assessments.status,
        inputJson: assessments.inputJson,
        resultJson: assessments.resultJson,
        sourceVersion: assessments.sourceVersion,
        createdAt: assessments.createdAt,
        updatedAt: assessments.updatedAt,
      }).from(assessments).where(and(eq(assessments.id, assessmentId), eq(assessments.ownerEmail, ownerEmail))).limit(1);
      if (!row) return Response.json({ error: "Análisis no encontrado." }, { status: 404 });

      const events = await db.select({ action: auditEvents.action, detailsJson: auditEvents.detailsJson, createdAt: auditEvents.createdAt })
        .from(auditEvents).where(eq(auditEvents.assessmentId, assessmentId)).orderBy(desc(auditEvents.createdAt));
      const result = parseJson<{ sourceIds?: string[] }>(row.resultJson);
      const knowledge = await getKnowledgeBase();
      const usedRules = knowledge.rules.filter((rule) => result?.sourceIds?.includes(rule.id));
      const usedSourceIds = new Set(usedRules.map((rule) => rule.sourceId));

      return Response.json({
        assessment: {
          id: row.id,
          applicantReference: row.applicantReference,
          jurisdiction: row.jurisdiction,
          goal: row.goal,
          status: row.status,
          input: parseJson<Record<string, unknown>>(row.inputJson),
          result,
          sourceVersion: row.sourceVersion,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        evidence: knowledge.sources.filter((source) => usedSourceIds.has(source.id)),
        rules: usedRules,
        auditTrail: events.map((event) => ({ action: event.action, details: parseJson<Record<string, unknown>>(event.detailsJson), createdAt: event.createdAt })),
      });
    }

    const rows = await db.select({
      id: assessments.id,
      applicantReference: assessments.applicantReference,
      goal: assessments.goal,
      status: assessments.status,
      sourceVersion: assessments.sourceVersion,
      resultJson: assessments.resultJson,
      createdAt: assessments.createdAt,
      updatedAt: assessments.updatedAt,
    })
      .from(assessments).where(eq(assessments.ownerEmail, ownerEmail)).orderBy(desc(assessments.createdAt)).limit(12);
    return Response.json({
      assessments: rows.map(({ resultJson, ...row }) => ({
        ...row,
        summary: summarizeAssessmentResult(resultJson),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible consultar los análisis.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = authorizeMutation(request);
  if (!authorization.ok) return authorization.response;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const input = normalizeAssessmentPayload(payload);
    const errors = validateAssessment(input);
    if (errors.length) return Response.json({ error: "Información incompleta o no permitida.", details: errors }, { status: 400 });

    const knowledge = await getKnowledgeBase();
    const result = analyzeAssessment(input);
    const usedRules = knowledge.rules.filter((rule) => result.sourceIds.includes(rule.id));
    const usedSourceIds = new Set(usedRules.map((rule) => rule.sourceId));
    const evidence = knowledge.sources.filter((source) => usedSourceIds.has(source.id));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ensureDatabaseSchema();
    const db = getDb();
    await db.batch([
      db.insert(assessments).values({ id, ownerEmail: authorization.user.email, applicantReference: input.applicantReference, jurisdiction: "Florida", goal: input.goal, status: result.status, inputJson: JSON.stringify(input), resultJson: JSON.stringify(result), sourceVersion: KNOWLEDGE_VERSION, createdAt: now, updatedAt: now }),
      db.insert(auditEvents).values({
        id: crypto.randomUUID(),
        assessmentId: id,
        action: "analisis_generado",
        detailsJson: JSON.stringify({
          engineVersion: ENGINE_VERSION,
          factFinderVersion: FACT_FINDER_VERSION,
          knowledgeVersion: KNOWLEDGE_VERSION,
          ruleIds: result.sourceIds,
          sourceIds: [...usedSourceIds],
          qualityScore: result.quality.score,
          pendingItems: result.quality.pendingItems,
          capturedProfiles: Object.keys(input.profiles ?? {}),
          appointmentStatus: result.decisionGate.appointmentStatus,
          productRecommendationAllowed: false,
        }),
        createdAt: now,
      }),
    ]);
    return Response.json({ id, result, evidence, rules: usedRules, engineVersion: ENGINE_VERSION, factFinderVersion: FACT_FINDER_VERSION, knowledgeVersion: KNOWLEDGE_VERSION }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible guardar el análisis.";
    return Response.json({ error: message }, { status: 500 });
  }
}
