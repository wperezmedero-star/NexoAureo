import { env } from "cloudflare:workers";
import {
  INTAKE_FIELDS,
  INTERVIEW_INTELLIGENCE_VERSION,
  analyzeNarrativeLocally,
  findSensitiveNarrativeIssues,
  normalizeExternalSuggestion,
  type IntelligenceQuestion,
  type NarrativeAnalysis,
  type NarrativeInsight,
} from "../../../lib/interview-intelligence";

export const dynamic = "force-dynamic";

type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const noStoreHeaders = { "cache-control": "no-store" };

function runtime() {
  return env as unknown as RuntimeEnv;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function safeSnapshot(value: unknown) {
  const source = recordValue(value);
  if (!source) return undefined;
  const allowed = [
    "age", "dependents", "annualIncome", "monthlyExpenses", "debts", "mortgageBalance", "educationGoal",
    "existingLifeCoverage", "emergencySavings", "coverageYears", "monthlyBudget", "goal", "healthCoverage",
    "liquidityNeed", "riskTolerance", "existingPolicy", "wantsReplace",
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    const item = source[key];
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") result[key] = item;
  }
  for (const group of ["life", "finalExpense"]) {
    const nested = recordValue(source[group]);
    if (!nested) continue;
    result[group] = Object.fromEntries(Object.entries(nested).filter(([, item]) => typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null));
  }
  return result;
}

function outputText(payload: ResponsesPayload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function cleanText(value: unknown, maximum = 240) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function normalizeInsight(value: unknown, index: number): NarrativeInsight | null {
  const row = recordValue(value);
  if (!row) return null;
  const kind = row.kind;
  if (kind !== "necesidad" && kind !== "prioridad" && kind !== "precaucion") return null;
  const label = cleanText(row.label);
  const evidence = cleanText(row.evidence);
  if (!label || !evidence) return null;
  return { id: `ai-insight-${index}`, kind, label, evidence };
}

function normalizeQuestion(value: unknown, index: number): IntelligenceQuestion | null {
  const row = recordValue(value);
  if (!row) return null;
  const question = cleanText(row.question);
  const reason = cleanText(row.reason);
  const target = Number(row.targetStep);
  if (!question || !reason || !Number.isInteger(target) || target < 0 || target > 3) return null;
  return { id: `ai-question-${index}`, question, reason, targetStep: target as 0 | 1 | 2 | 3 };
}

const structuredSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      maxItems: 18,
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: [...INTAKE_FIELDS] },
          value: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["alta", "media"] },
        },
        required: ["field", "value", "evidence", "confidence"],
        additionalProperties: false,
      },
    },
    insights: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["necesidad", "prioridad", "precaucion"] },
          label: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["kind", "label", "evidence"],
        additionalProperties: false,
      },
    },
    followUps: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          reason: { type: "string" },
          targetStep: { type: "integer", minimum: 0, maximum: 3 },
        },
        required: ["question", "reason", "targetStep"],
        additionalProperties: false,
      },
    },
    conflicts: { type: "array", maxItems: 5, items: { type: "string" } },
  },
  required: ["suggestions", "insights", "followUps", "conflicts"],
  additionalProperties: false,
} as const;

async function analyzeWithOpenAI(narrative: string, snapshot: Record<string, unknown> | undefined, local: NarrativeAnalysis) {
  const runtimeEnv = runtime();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${runtimeEnv.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: runtimeEnv.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      max_output_tokens: 1_600,
      input: [
        {
          role: "system",
          content: [
            "Eres el extractor estructurado de una entrevista financiera y de seguros en Florida.",
            "Trabaja exclusivamente con hechos explícitos del relato. No completes, estimes ni infieras cifras.",
            "No recomiendes productos, compañías, primas, elegibilidad, aprobación ni acciones de suscripción.",
            "Devuelve preguntas breves en español para verificar información faltante o contradictoria.",
            "Si una frase permite varias interpretaciones, no crees una sugerencia: conviértela en pregunta.",
            "No reproduzcas nombres, datos de contacto, direcciones, números de cuenta ni detalles clínicos.",
            "Los valores numéricos deben devolverse sin símbolos ni separadores. Los booleanos deben ser las cadenas true o false.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Relato anónimo:\n${narrative}\n\nEstado actual sin referencia personal:\n${JSON.stringify(snapshot ?? {})}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nexoaureo_interview_extraction",
          strict: true,
          schema: structuredSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = await response.json() as ResponsesPayload;
  if (!response.ok) throw new Error(payload.error?.message || "El servicio de IA no respondió correctamente.");
  const serialized = outputText(payload);
  if (!serialized) throw new Error("La respuesta estructurada llegó vacía.");
  const parsed = JSON.parse(serialized) as Record<string, unknown>;

  const suggestions = [...local.suggestions];
  for (const item of Array.isArray(parsed.suggestions) ? parsed.suggestions : []) {
    const suggestion = normalizeExternalSuggestion(item);
    if (suggestion && !suggestions.some((current) => current.field === suggestion.field)) suggestions.push(suggestion);
  }
  const insights = [...local.insights];
  for (const [index, item] of (Array.isArray(parsed.insights) ? parsed.insights : []).entries()) {
    const insight = normalizeInsight(item, index);
    if (insight && !insights.some((current) => current.label === insight.label)) insights.push(insight);
  }
  const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps : [])
    .map(normalizeQuestion)
    .filter((item): item is IntelligenceQuestion => item !== null);
  const conflicts = [
    ...local.conflicts,
    ...(Array.isArray(parsed.conflicts) ? parsed.conflicts.map((item) => cleanText(item)).filter(Boolean) : []),
  ].slice(0, 8);

  return {
    ...local,
    mode: "ia_estructurada" as const,
    suggestions,
    insights: insights.slice(0, 8),
    followUps,
    conflicts,
    notice: "La IA organizó datos explícitos con formato controlado. Revisa cada sugerencia antes de aplicarla.",
  };
}

export async function GET() {
  return Response.json({
    externalAiAvailable: Boolean(runtime().OPENAI_API_KEY),
    version: INTERVIEW_INTELLIGENCE_VERSION,
  }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return Response.json({ error: "La solicitud es demasiado extensa." }, { status: 413, headers: noStoreHeaders });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const narrative = typeof body.narrative === "string" ? body.narrative.trim() : "";
    if (narrative.length < 12 || narrative.length > 3_000) {
      return Response.json({ error: "Escribe un relato anónimo de entre 12 y 3,000 caracteres." }, { status: 400, headers: noStoreHeaders });
    }
    const sensitiveIssues = findSensitiveNarrativeIssues(narrative);
    if (sensitiveIssues.length) {
      return Response.json({ error: "Retira los datos sensibles antes de interpretar el relato.", details: sensitiveIssues.map((item) => item.message) }, { status: 400, headers: noStoreHeaders });
    }

    const snapshot = safeSnapshot(body.draft);
    const local = analyzeNarrativeLocally(narrative, snapshot);
    const allowExternalAi = body.allowExternalAi === true;
    if (!allowExternalAi || !runtime().OPENAI_API_KEY) {
      return Response.json({
        analysis: local,
        externalAiAvailable: Boolean(runtime().OPENAI_API_KEY),
        usedExternalAi: false,
      }, { headers: noStoreHeaders });
    }

    try {
      const analysis = await analyzeWithOpenAI(narrative, snapshot, local);
      return Response.json({ analysis, externalAiAvailable: true, usedExternalAi: true }, { headers: noStoreHeaders });
    } catch {
      return Response.json({
        analysis: { ...local, notice: "La IA externa no estuvo disponible. Se utilizó el análisis local verificable y nada se aplicó automáticamente." },
        externalAiAvailable: true,
        usedExternalAi: false,
        fallbackUsed: true,
      }, { headers: noStoreHeaders });
    }
  } catch {
    return Response.json({ error: "No fue posible interpretar el relato." }, { status: 400, headers: noStoreHeaders });
  }
}
