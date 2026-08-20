import { analyzeAssessment, ENGINE_VERSION } from "../../../lib/decision-engine";
import { FACT_FINDER_VERSION, normalizeAssessmentPayload, validateAssessment } from "../../../lib/fact-finder";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 60_000) return Response.json({ error: "La simulación es demasiado extensa." }, { status: 413, headers: noStoreHeaders });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const basePayload = recordValue(body.base);
    const scenarioPayload = recordValue(body.scenario);
    if (!basePayload || !scenarioPayload) {
      return Response.json({ error: "Faltan los datos del caso actual o del escenario." }, { status: 400, headers: noStoreHeaders });
    }

    const base = normalizeAssessmentPayload(basePayload);
    const scenario = normalizeAssessmentPayload(scenarioPayload);
    const baseErrors = validateAssessment(base);
    const scenarioErrors = validateAssessment(scenario);
    if (baseErrors.length || scenarioErrors.length) {
      return Response.json({
        error: "Revisa los datos antes de comparar el escenario.",
        details: [...new Set([...baseErrors, ...scenarioErrors])],
      }, { status: 400, headers: noStoreHeaders });
    }
    if (base.applicantReference !== scenario.applicantReference || base.goal !== scenario.goal) {
      return Response.json({ error: "La comparación debe pertenecer a la misma referencia anónima y necesidad principal." }, { status: 400, headers: noStoreHeaders });
    }

    return Response.json({
      baseline: analyzeAssessment(base),
      scenario: analyzeAssessment(scenario),
      engineVersion: ENGINE_VERSION,
      factFinderVersion: FACT_FINDER_VERSION,
      persisted: false,
    }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "No fue posible comparar el escenario." }, { status: 400, headers: noStoreHeaders });
  }
}
