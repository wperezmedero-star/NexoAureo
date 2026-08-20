export type AssessmentResultSummary = {
  qualityScore: number;
  directionReady: boolean;
  cautionCount: number;
  missingCount: number;
  priority: string;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Extrae únicamente los datos mínimos que necesita el panorama privado.
 * El resultado completo permanece disponible solo en el endpoint de detalle.
 */
export function summarizeAssessmentResult(resultJson: string): AssessmentResultSummary | null {
  try {
    const parsed: unknown = JSON.parse(resultJson);
    if (!isObject(parsed) || !isObject(parsed.quality)) return null;

    const qualityScore = parsed.quality.score;
    const directionReady = parsed.quality.directionReady;
    const priority = parsed.priority;
    const missingCount = Array.isArray(parsed.missing)
      ? parsed.missing.length
      : nonNegativeInteger(parsed.quality.pendingItems);
    const cautionCount = Array.isArray(parsed.cautions)
      ? parsed.cautions.length
      : nonNegativeInteger(parsed.quality.cautionItems);

    if (
      typeof qualityScore !== "number" ||
      !Number.isFinite(qualityScore) ||
      qualityScore < 0 ||
      qualityScore > 100 ||
      typeof directionReady !== "boolean" ||
      typeof priority !== "string" ||
      !priority.trim() ||
      missingCount === null ||
      cautionCount === null
    ) {
      return null;
    }

    return {
      qualityScore,
      directionReady,
      cautionCount,
      missingCount,
      priority,
    };
  } catch {
    return null;
  }
}
