export const INTERVIEW_INTELLIGENCE_VERSION = "NA-II-2026.08-v1";

export const INTAKE_FIELDS = [
  "age",
  "dependents",
  "annualIncome",
  "monthlyExpenses",
  "debts",
  "mortgageBalance",
  "educationGoal",
  "existingLifeCoverage",
  "emergencySavings",
  "coverageYears",
  "monthlyBudget",
  "goal",
  "healthCoverage",
  "existingPolicy",
  "wantsReplace",
  "life.incomeReplacementPercent",
  "life.permanentNeed",
  "finalExpense.targetAmount",
  "finalExpense.reservedResources",
] as const;

export type IntakeField = (typeof INTAKE_FIELDS)[number];
export type IntelligenceMode = "local_verificable" | "ia_estructurada";

export type IntakeSuggestion = {
  id: string;
  field: IntakeField;
  label: string;
  value: string;
  displayValue: string;
  evidence: string;
  confidence: "alta" | "media";
  targetStep: 0 | 1 | 2 | 3;
};

export type NarrativeInsight = {
  id: string;
  kind: "necesidad" | "prioridad" | "precaucion";
  label: string;
  evidence: string;
};

export type IntelligenceQuestion = {
  id: string;
  question: string;
  reason: string;
  targetStep: 0 | 1 | 2 | 3;
};

export type NarrativeAnalysis = {
  version: string;
  mode: IntelligenceMode;
  suggestions: IntakeSuggestion[];
  insights: NarrativeInsight[];
  followUps: IntelligenceQuestion[];
  conflicts: string[];
  notice: string;
};

export type SensitiveNarrativeIssue = {
  id: string;
  message: string;
};

const FIELD_META: Record<IntakeField, { label: string; targetStep: 0 | 1 | 2 | 3 }> = {
  age: { label: "Edad", targetStep: 0 },
  dependents: { label: "Dependientes", targetStep: 0 },
  annualIncome: { label: "Ingreso anual", targetStep: 1 },
  monthlyExpenses: { label: "Gastos mensuales", targetStep: 1 },
  debts: { label: "Deudas", targetStep: 1 },
  mortgageBalance: { label: "Saldo hipotecario", targetStep: 1 },
  educationGoal: { label: "Meta educativa", targetStep: 1 },
  existingLifeCoverage: { label: "Seguro de vida vigente", targetStep: 1 },
  emergencySavings: { label: "Fondo de emergencia", targetStep: 1 },
  coverageYears: { label: "Años de necesidad", targetStep: 1 },
  monthlyBudget: { label: "Presupuesto mensual disponible", targetStep: 1 },
  goal: { label: "Necesidad principal", targetStep: 0 },
  healthCoverage: { label: "Cobertura de salud", targetStep: 2 },
  existingPolicy: { label: "Póliza vigente", targetStep: 2 },
  wantsReplace: { label: "Posible reemplazo", targetStep: 2 },
  "life.incomeReplacementPercent": { label: "Ingreso a reemplazar", targetStep: 3 },
  "life.permanentNeed": { label: "Necesidad vitalicia", targetStep: 3 },
  "finalExpense.targetAmount": { label: "Monto objetivo de gastos finales", targetStep: 3 },
  "finalExpense.reservedResources": { label: "Recursos reservados para gastos finales", targetStep: 3 },
};

const MONEY_FIELDS = new Set<IntakeField>([
  "annualIncome",
  "monthlyExpenses",
  "debts",
  "mortgageBalance",
  "educationGoal",
  "existingLifeCoverage",
  "emergencySavings",
  "monthlyBudget",
  "finalExpense.targetAmount",
  "finalExpense.reservedResources",
]);

const GOAL_LABELS: Record<string, string> = {
  proteccion: "Protección de vida e ingresos",
  salud: "Cobertura de salud",
  retiro: "Retiro o anualidad",
  gastos_finales: "Gastos finales",
  cuidado_prolongado: "Cuidado prolongado",
};

const HEALTH_LABELS: Record<string, string> = {
  adecuada: "Adecuada",
  brechas: "Con brechas",
  ninguna: "Ninguna",
  desconocida: "Por confirmar",
};

const money = new Intl.NumberFormat("es-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-US")
    .replace(/\s+/g, " ")
    .trim();
}

function compactEvidence(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}

function parseQuantity(raw: string, scale = "") {
  let normalized = raw.replace(/[$\s]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) normalized = normalized.replace(/,/g, "");
  else if (normalized.includes(",")) {
    const pieces = normalized.split(",");
    normalized = pieces.at(-1)?.length === 3 ? pieces.join("") : normalized.replace(",", ".");
  }
  const base = Number(normalized);
  if (!Number.isFinite(base) || base < 0) return null;
  const multiplier = /millon/.test(scale) ? 1_000_000 : /(?:mil|k)/.test(scale) ? 1_000 : 1;
  const value = Math.round(base * multiplier);
  return value <= 1_000_000_000 ? value : null;
}

function displayFor(field: IntakeField, value: string) {
  if (MONEY_FIELDS.has(field)) return money.format(Number(value));
  if (field === "age") return `${value} años`;
  if (field === "coverageYears") return `${value} años`;
  if (field === "dependents") return value;
  if (field === "goal") return GOAL_LABELS[value] ?? value;
  if (field === "healthCoverage") return HEALTH_LABELS[value] ?? value;
  if (field === "existingPolicy" || field === "wantsReplace") return value === "true" ? "Sí" : "No";
  if (field === "life.incomeReplacementPercent") return `${value}%`;
  if (field === "life.permanentNeed") return value === "si" ? "Sí, vitalicia" : "No, con plazo";
  return value;
}

function addSuggestion(
  suggestions: IntakeSuggestion[],
  field: IntakeField,
  value: string,
  evidence: string,
  confidence: "alta" | "media" = "alta",
) {
  if (suggestions.some((item) => item.field === field)) return;
  const meta = FIELD_META[field];
  suggestions.push({
    id: `extract-${field.replace(/\./g, "-")}`,
    field,
    label: meta.label,
    value,
    displayValue: displayFor(field, value),
    evidence: compactEvidence(evidence),
    confidence,
    targetStep: meta.targetStep,
  });
}

function captureInteger(text: string, pattern: RegExp, minimum: number, maximum: number) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < minimum || value > maximum) return null;
  return { value, evidence: match[0] };
}

function captureMoney(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = parseQuantity(match[1], match[2] ?? "");
  return value === null ? null : { value, evidence: match[0] };
}

export function findSensitiveNarrativeIssues(narrative: string): SensitiveNarrativeIssue[] {
  const checks: Array<{ id: string; pattern: RegExp; message: string }> = [
    { id: "email", pattern: /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i, message: "Elimina el correo electrónico del relato." },
    { id: "phone", pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/, message: "Elimina el número de teléfono del relato." },
    { id: "ssn", pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, message: "Elimina el número de Seguro Social del relato." },
    { id: "account", pattern: /\b(?:cuenta bancaria|routing|numero de cuenta|número de cuenta)\b/i, message: "No incluyas cuentas bancarias ni números de ruta." },
    { id: "address", pattern: /\b\d{1,6}\s+(?:calle|avenida|ave\.?|street|st\.?|road|rd\.?|boulevard|blvd\.?)\b/i, message: "Elimina la dirección exacta del relato." },
  ];
  return checks.filter((check) => check.pattern.test(narrative)).map(({ id, message }) => ({ id, message }));
}

function goalScores(text: string) {
  const patterns: Record<string, RegExp[]> = {
    proteccion: [/seguro de vida/, /proteccion familiar/, /reemplaz(?:ar|o) (?:el )?ingreso/, /fallec/, /beneficiari/],
    salud: [/seguro de salud/, /obamacare/, /\baca\b/, /cobertura medica/, /medicamentos?/, /hospital/],
    retiro: [/retiro/, /jubil/, /anualidad/, /ingreso futuro/, /preservar (?:el )?capital/],
    gastos_finales: [/gastos finales/, /funeral/, /entierro/, /cremacion/],
    cuidado_prolongado: [/cuidado prolongado/, /long term care/, /cuidado en (?:el )?hogar/, /asistencia diaria/],
  };
  return Object.entries(patterns)
    .map(([goal, expressions]) => ({ goal, score: expressions.filter((pattern) => pattern.test(text)).length }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function addMoneySuggestion(suggestions: IntakeSuggestion[], text: string, field: IntakeField, pattern: RegExp) {
  const captured = captureMoney(text, pattern);
  if (captured) addSuggestion(suggestions, field, String(captured.value), captured.evidence);
}

function currentValueAt(snapshot: Record<string, unknown> | undefined, field: IntakeField) {
  if (!snapshot) return undefined;
  if (!field.includes(".")) return snapshot[field];
  const [group, key] = field.split(".");
  const nested = snapshot[group];
  return typeof nested === "object" && nested !== null ? (nested as Record<string, unknown>)[key] : undefined;
}

function meaningfulCurrentValue(value: unknown) {
  return value !== undefined && value !== null && value !== "" && value !== "pendiente" && value !== "desconocida";
}

export function analyzeNarrativeLocally(narrative: string, snapshot?: Record<string, unknown>): NarrativeAnalysis {
  const text = normalizeText(narrative);
  const suggestions: IntakeSuggestion[] = [];
  const insights: NarrativeInsight[] = [];
  const conflicts: string[] = [];

  const age = captureInteger(text, /(?:tiene|edad(?: de)?|cuenta con)\s+(\d{2,3})\s+anos?\b/, 18, 100);
  if (age) addSuggestion(suggestions, "age", String(age.value), age.evidence);

  const dependents = captureInteger(text, /\b(\d{1,2})\s+(?:hijos?|dependientes?|personas? a cargo)\b/, 0, 12);
  if (dependents) addSuggestion(suggestions, "dependents", String(dependents.value), dependents.evidence);
  else if (/\b(?:sin hijos|no tiene dependientes|ninguna persona a cargo)\b/.test(text)) {
    addSuggestion(suggestions, "dependents", "0", "No tiene dependientes");
  }

  const amount = "(?:\\$?\\s*([0-9]+(?:[.,][0-9]+)?)\\s*(mil|k|millones?|millon)?)";
  addMoneySuggestion(suggestions, text, "annualIncome", new RegExp(`(?:ingreso anual|ingresos anuales|gana al ano|salario anual)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "monthlyExpenses", new RegExp(`(?:gastos mensuales|gasta al mes|gastos al mes)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "debts", new RegExp(`(?:deudas?|debe)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "mortgageBalance", new RegExp(`(?:saldo hipotecario|hipoteca)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "educationGoal", new RegExp(`(?:meta educativa|universidad|estudios de (?:los )?hijos)[^0-9$]{0,24}${amount}`));
  addMoneySuggestion(suggestions, text, "existingLifeCoverage", new RegExp(`(?:seguro de vida vigente|cobertura de vida actual|cobertura actual)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "emergencySavings", new RegExp(`(?:fondo de emergencia|ahorros de emergencia|reserva de emergencia)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "monthlyBudget", new RegExp(`(?:presupuesto mensual|puede destinar al mes|disponible al mes)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "finalExpense.targetAmount", new RegExp(`(?:objetivo de gastos finales|gastos finales|funeral)[^0-9$]{0,20}${amount}`));
  addMoneySuggestion(suggestions, text, "finalExpense.reservedResources", new RegExp(`(?:reservado para gastos finales|ahorrado para (?:el )?funeral)[^0-9$]{0,20}${amount}`));

  const years = captureInteger(text, /\b(\d{1,2})\s+anos?\s+(?:de cobertura|de proteccion|para reemplazar ingresos?)\b/, 1, 50);
  if (years) addSuggestion(suggestions, "coverageYears", String(years.value), years.evidence);

  const replacement = captureInteger(text, /\b(\d{1,3})\s*%\s+(?:del ingreso|de sus ingresos?)\b/, 0, 100);
  if (replacement) addSuggestion(suggestions, "life.incomeReplacementPercent", String(replacement.value), replacement.evidence);

  const scoredGoals = goalScores(text);
  if (scoredGoals.length) {
    for (const item of scoredGoals.slice(0, 3)) {
      insights.push({
        id: `need-${item.goal}`,
        kind: "necesidad",
        label: GOAL_LABELS[item.goal],
        evidence: "El relato contiene una intención explícita relacionada con esta necesidad.",
      });
    }
    if (scoredGoals.length === 1 || scoredGoals[0].score > scoredGoals[1].score) {
      addSuggestion(suggestions, "goal", scoredGoals[0].goal, `Necesidad mencionada: ${GOAL_LABELS[scoredGoals[0].goal]}`, "media");
    }
  }

  if (/\b(?:sin seguro de salud|no tiene seguro de salud|sin cobertura medica)\b/.test(text)) {
    addSuggestion(suggestions, "healthCoverage", "ninguna", "Sin cobertura médica declarada");
  } else if (/\b(?:cobertura de salud con brechas|seguro de salud insuficiente|cobertura incompleta)\b/.test(text)) {
    addSuggestion(suggestions, "healthCoverage", "brechas", "Cobertura de salud con brechas declarada");
  }

  if (/\b(?:tiene|cuenta con|mantiene) (?:una )?poliza (?:de vida )?vigente\b/.test(text)) {
    addSuggestion(suggestions, "existingPolicy", "true", "Póliza vigente declarada");
  } else if (/\b(?:no tiene|sin) (?:una )?poliza (?:de vida )?vigente\b/.test(text)) {
    addSuggestion(suggestions, "existingPolicy", "false", "Sin póliza vigente declarada");
  }
  if (/\b(?:reemplazar|cambiar|cancelar) (?:la|su|una) poliza\b/.test(text)) {
    addSuggestion(suggestions, "wantsReplace", "true", "Intención de revisar un posible reemplazo");
    if (!suggestions.some((item) => item.field === "existingPolicy")) addSuggestion(suggestions, "existingPolicy", "true", "Existe una póliza que se considera reemplazar");
    insights.push({ id: "replace-caution", kind: "precaucion", label: "No cancelar la póliza vigente antes de completar la comparación y confirmar la nueva vigencia.", evidence: "El relato menciona un posible reemplazo." });
  }

  if (/\b(?:de por vida|vitalicia|permanente)\b/.test(text)) {
    addSuggestion(suggestions, "life.permanentNeed", "si", "Necesidad vitalicia mencionada", "media");
  } else if (/\b(?:solo por|durante)\s+\d{1,2}\s+anos?\b/.test(text)) {
    addSuggestion(suggestions, "life.permanentNeed", "no", "Necesidad con plazo mencionado", "media");
  }

  const dependentsSuggestion = suggestions.find((item) => item.field === "dependents");
  if (dependentsSuggestion && Number(dependentsSuggestion.value) > 0) {
    insights.push({ id: "family-continuity", kind: "prioridad", label: "Continuidad económica de las personas dependientes", evidence: dependentsSuggestion.evidence });
  }
  const mortgageSuggestion = suggestions.find((item) => item.field === "mortgageBalance");
  if (mortgageSuggestion && Number(mortgageSuggestion.value) > 0) {
    insights.push({ id: "mortgage-duty", kind: "prioridad", label: "Obligación hipotecaria con plazo", evidence: mortgageSuggestion.evidence });
  }
  if (suggestions.some((item) => item.field === "healthCoverage" && item.value !== "adecuada")) {
    insights.push({ id: "health-gap", kind: "prioridad", label: "Revisar acceso médico, red, medicamentos y costo total", evidence: "El relato indica ausencia o brechas de cobertura." });
  }

  for (const suggestion of suggestions) {
    const current = currentValueAt(snapshot, suggestion.field);
    if (meaningfulCurrentValue(current) && String(current) !== suggestion.value) {
      conflicts.push(`${suggestion.label}: el relato sugiere ${suggestion.displayValue}, pero la entrevista ya contiene otro valor. Revísalo antes de aplicar.`);
    }
  }

  return {
    version: INTERVIEW_INTELLIGENCE_VERSION,
    mode: "local_verificable",
    suggestions,
    insights,
    followUps: [],
    conflicts,
    notice: "La interpretación local identifica únicamente expresiones explícitas. Nada se aplica sin tu revisión.",
  };
}

export function normalizeExternalSuggestion(value: unknown): IntakeSuggestion | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.field !== "string" || !INTAKE_FIELDS.includes(row.field as IntakeField) || typeof row.value !== "string") return null;
  const field = row.field as IntakeField;
  const rawValue = row.value.trim();
  let valid = false;
  if (MONEY_FIELDS.has(field)) valid = Number.isFinite(Number(rawValue)) && Number(rawValue) >= 0 && Number(rawValue) <= 1_000_000_000;
  else if (field === "age") valid = Number.isInteger(Number(rawValue)) && Number(rawValue) >= 18 && Number(rawValue) <= 100;
  else if (field === "dependents") valid = Number.isInteger(Number(rawValue)) && Number(rawValue) >= 0 && Number(rawValue) <= 12;
  else if (field === "coverageYears") valid = Number.isInteger(Number(rawValue)) && Number(rawValue) >= 1 && Number(rawValue) <= 50;
  else if (field === "life.incomeReplacementPercent") valid = Number(rawValue) >= 0 && Number(rawValue) <= 100;
  else if (field === "goal") valid = Object.hasOwn(GOAL_LABELS, rawValue);
  else if (field === "healthCoverage") valid = Object.hasOwn(HEALTH_LABELS, rawValue);
  else if (field === "existingPolicy" || field === "wantsReplace") valid = rawValue === "true" || rawValue === "false";
  else if (field === "life.permanentNeed") valid = rawValue === "si" || rawValue === "no";
  if (!valid) return null;
  const meta = FIELD_META[field];
  return {
    id: `extract-${field.replace(/\./g, "-")}`,
    field,
    label: meta.label,
    value: rawValue,
    displayValue: displayFor(field, rawValue),
    evidence: compactEvidence(typeof row.evidence === "string" ? row.evidence : "Dato explícito en el relato"),
    confidence: row.confidence === "media" ? "media" : "alta",
    targetStep: meta.targetStep,
  };
}
