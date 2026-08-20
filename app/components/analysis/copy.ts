import type {
  AdaptiveQuestion,
  AssessmentInput,
  ComparisonEntry,
  DirectionBucket,
  DraftAssessment,
  EngineResult,
  ReadinessIssue,
  ReadinessSummary,
} from "./types";

export const money = new Intl.NumberFormat("es-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const dateTime = new Intl.DateTimeFormat("es-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const dateOnly = new Intl.DateTimeFormat("es-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type Option<T extends string> = { value: T; label: string; hint?: string };

export const GOAL_OPTIONS: Array<Option<AssessmentInput["goal"]> & { glyph: string; text: string }> = [
  { value: "proteccion", label: "Protección de vida e ingresos", glyph: "◈", text: "Obligaciones, dependientes e ingreso familiar." },
  { value: "salud", label: "Cobertura de salud", glyph: "✚", text: "Costo total, red de médicos y medicamentos." },
  { value: "retiro", label: "Retiro o anualidad", glyph: "◎", text: "Idoneidad, liquidez y objetivos financieros." },
  { value: "gastos_finales", label: "Gastos finales", glyph: "▣", text: "Monto objetivo y recursos ya reservados." },
  { value: "cuidado_prolongado", label: "Cuidado prolongado", glyph: "◐", text: "Preferencia de cuidado y capacidad de financiarlo." },
];

export const GOAL_LABELS: Record<AssessmentInput["goal"], string> = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<AssessmentInput["goal"], string>;

export const HEALTH_COVERAGE_OPTIONS: Option<AssessmentInput["healthCoverage"]>[] = [
  { value: "adecuada", label: "Adecuada" },
  { value: "brechas", label: "Con brechas" },
  { value: "ninguna", label: "Ninguna" },
  { value: "desconocida", label: "Por confirmar" },
];

export const LIQUIDITY_OPTIONS: Option<AssessmentInput["liquidityNeed"]>[] = [
  { value: "alta", label: "Alta" },
  { value: "moderada", label: "Moderada" },
  { value: "baja", label: "Baja" },
];

export const RISK_OPTIONS: Option<AssessmentInput["riskTolerance"]>[] = [
  { value: "conservadora", label: "Conservadora" },
  { value: "moderada", label: "Moderada" },
  { value: "crecimiento", label: "Crecimiento" },
  { value: "desconocida", label: "Por confirmar" },
];

export const REVIEW_STATE_OPTIONS: Option<"confirmado" | "no_aplica" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "confirmado", label: "Confirmado" },
  { value: "no_aplica", label: "No aplica" },
];

export const PERMANENT_NEED_OPTIONS: Option<"si" | "no" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "si", label: "Sí, existe una necesidad vitalicia" },
  { value: "no", label: "No, la necesidad tiene un plazo definido" },
];

export const HEALTH_USE_OPTIONS: Option<"bajo" | "moderado" | "alto" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "bajo", label: "Bajo — visitas ocasionales" },
  { value: "moderado", label: "Moderado — uso regular" },
  { value: "alto", label: "Alto — tratamientos frecuentes" },
];

export const FINANCIAL_EXPERIENCE_OPTIONS: Option<"ninguna" | "basica" | "intermedia" | "avanzada" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "ninguna", label: "Ninguna" },
  { value: "basica", label: "Básica" },
  { value: "intermedia", label: "Intermedia" },
  { value: "avanzada", label: "Avanzada" },
];

export const FINANCIAL_OBJECTIVE_OPTIONS: Option<"ingreso" | "acumulacion" | "preservacion" | "legado" | "otro" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "ingreso", label: "Generar ingreso" },
  { value: "acumulacion", label: "Acumular capital" },
  { value: "preservacion", label: "Preservar el capital" },
  { value: "legado", label: "Dejar un legado" },
  { value: "otro", label: "Otro" },
];

export const ANNUITY_USE_OPTIONS: Option<"ingreso_inmediato" | "ingreso_futuro" | "acumulacion_diferida" | "otro" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "ingreso_inmediato", label: "Ingreso inmediato" },
  { value: "ingreso_futuro", label: "Ingreso futuro" },
  { value: "acumulacion_diferida", label: "Acumulación diferida" },
  { value: "otro", label: "Otro" },
];

export const PRODUCT_CATEGORY_OPTIONS: Option<
  "efectivo" | "certificados" | "cuentas_retiro" | "fondos" | "acciones_bonos" | "seguros_vida" | "anualidades" | "otros"
>[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "certificados", label: "Certificados (CD)" },
  { value: "cuentas_retiro", label: "Cuentas de retiro" },
  { value: "fondos", label: "Fondos mutuos" },
  { value: "acciones_bonos", label: "Acciones y bonos" },
  { value: "seguros_vida", label: "Seguros de vida" },
  { value: "anualidades", label: "Anualidades" },
  { value: "otros", label: "Otros" },
];

export const FUNDING_SOURCE_OPTIONS: Option<
  "ahorros" | "certificados" | "cuenta_retiro" | "venta_activo" | "reemplazo_anualidad" | "seguro_vida" | "otro" | "pendiente"
>[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "ahorros", label: "Ahorros" },
  { value: "certificados", label: "Certificados (CD)" },
  { value: "cuenta_retiro", label: "Cuenta de retiro" },
  { value: "venta_activo", label: "Venta de un activo" },
  { value: "reemplazo_anualidad", label: "Reemplazo de otra anualidad" },
  { value: "seguro_vida", label: "Seguro de vida" },
  { value: "otro", label: "Otro" },
];

export const TAX_STATUS_OPTIONS: Option<"calificado" | "no_calificado" | "mixto" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "calificado", label: "Calificado (retiro)" },
  { value: "no_calificado", label: "No calificado" },
  { value: "mixto", label: "Mixto" },
];

export const CARE_PREFERENCE_OPTIONS: Option<"hogar" | "comunidad" | "institucion" | "flexible" | "pendiente">[] = [
  { value: "pendiente", label: "Aún no lo sé" },
  { value: "hogar", label: "En el hogar" },
  { value: "comunidad", label: "Comunidad de cuidado" },
  { value: "institucion", label: "Institución especializada" },
  { value: "flexible", label: "Flexible, por definir" },
];

export const STATUS_META: Record<string, { label: string; tone: "good" | "info" }> = {
  preliminar: { label: "Dirección preliminar", tone: "good" },
  informacion_pendiente: { label: "Información pendiente", tone: "info" },
};

export const CONFIDENCE_META: Record<string, { label: string; tone: "good" | "warn" | "info" }> = {
  alta: { label: "Alta", tone: "good" },
  moderada: { label: "Moderada", tone: "warn" },
  limitada: { label: "Limitada", tone: "info" },
};

const SENSITIVE_HINT_PATTERNS = [
  /@/,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
  /\b(calle|street|st\.|avenida|avenue|ave\.)\b/i,
];

export function referenceLooksSensitive(value: string) {
  return SENSITIVE_HINT_PATTERNS.some((pattern) => pattern.test(value));
}

export function emptyDraft(): DraftAssessment {
  return {
    applicantReference: "",
    age: "",
    dependents: "",
    annualIncome: "",
    monthlyExpenses: "",
    debts: "",
    mortgageBalance: "",
    educationGoal: "",
    existingLifeCoverage: "",
    emergencySavings: "",
    coverageYears: "",
    monthlyBudget: "",
    goal: "proteccion",
    healthCoverage: "desconocida",
    liquidityNeed: "moderada",
    riskTolerance: "desconocida",
    existingPolicy: false,
    wantsReplace: false,
    life: { incomeReplacementPercent: null, permanentNeed: "pendiente", existingPolicyDocumentsReviewed: "pendiente" },
    health: { providersReviewed: "pendiente", medicationsReviewed: "pendiente", expectedUse: "pendiente", deductibleCapacity: null },
    annuity: {
      financialExperience: "pendiente",
      financialObjective: "pendiente",
      intendedUse: "pendiente",
      timeHorizonYears: null,
      existingProductsReviewed: "pendiente",
      existingProducts: [],
      liquidNetWorth: null,
      fundingSource: "pendiente",
      taxStatus: "pendiente",
    },
    finalExpense: { targetAmount: null, reservedResources: null },
    longTermCare: { carePreference: "pendiente", familySupportReviewed: "pendiente", functionalHealthReviewed: "pendiente", fundingYears: null },
  };
}

export function parseAmount(value: string) {
  if (value.trim() === "") return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function isWholeInRange(value: string, minimum: number, maximum: number) {
  const parsed = parseAmount(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum;
}

/** Convierte el borrador de la interfaz en el cuerpo exacto que espera
    POST /api/assessments, incluyendo solo el perfil de la necesidad activa. */
export function draftToPayload(draft: DraftAssessment): Record<string, unknown> {
  const profiles: Record<string, unknown> = {};
  if (draft.goal === "proteccion") profiles.life = draft.life;
  if (draft.goal === "salud") profiles.health = draft.health;
  if (draft.goal === "retiro") profiles.annuity = draft.annuity;
  if (draft.goal === "gastos_finales") profiles.finalExpense = draft.finalExpense;
  if (draft.goal === "cuidado_prolongado") profiles.longTermCare = draft.longTermCare;

  return {
    applicantReference: draft.applicantReference.trim(),
    age: parseAmount(draft.age),
    dependents: parseAmount(draft.dependents),
    annualIncome: parseAmount(draft.annualIncome),
    monthlyExpenses: parseAmount(draft.monthlyExpenses),
    debts: parseAmount(draft.debts),
    mortgageBalance: parseAmount(draft.mortgageBalance),
    educationGoal: parseAmount(draft.educationGoal),
    existingLifeCoverage: parseAmount(draft.existingLifeCoverage),
    emergencySavings: parseAmount(draft.emergencySavings),
    coverageYears: parseAmount(draft.coverageYears),
    monthlyBudget: parseAmount(draft.monthlyBudget),
    goal: draft.goal,
    healthCoverage: draft.healthCoverage,
    liquidityNeed: draft.liquidityNeed,
    riskTolerance: draft.riskTolerance,
    existingPolicy: draft.existingPolicy,
    wantsReplace: draft.existingPolicy ? draft.wantsReplace : false,
    profiles,
  };
}

export function isBlank(value: string) {
  return value.trim() === "";
}

export function labelFrom<Value extends string>(options: Array<{ value: Value; label: string }>, value: Value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

/* Resumen compartido por el paso final y el panel en vivo. */
export type SummaryLine = { label: string; value: string; answered: boolean };

export function coreSummaryLines(draft: DraftAssessment): SummaryLine[] {
  return [
    { label: "Referencia", value: draft.applicantReference || "Sin declarar", answered: !isBlank(draft.applicantReference) },
    { label: "Edad", value: draft.age ? `${draft.age} años` : "Sin declarar", answered: !isBlank(draft.age) },
    { label: "Dependientes", value: draft.dependents || "Sin declarar", answered: !isBlank(draft.dependents) },
    { label: "Necesidad principal", value: GOAL_LABELS[draft.goal], answered: true },
  ];
}

export function economySummaryLines(draft: DraftAssessment): SummaryLine[] {
  const rows: Array<[string, string]> = [
    ["Ingreso anual", draft.annualIncome],
    ["Gastos mensuales", draft.monthlyExpenses],
    ["Presupuesto mensual", draft.monthlyBudget],
    ["Deudas", draft.debts],
    ["Hipoteca", draft.mortgageBalance],
    ["Meta educativa", draft.educationGoal],
    ["Vida vigente", draft.existingLifeCoverage],
    ["Fondo de emergencia", draft.emergencySavings],
  ];
  return [
    ...rows.map(([label, raw]) => ({
      label,
      value: isBlank(raw) ? "Sin declarar" : money.format(parseAmount(raw) || 0),
      answered: !isBlank(raw),
    })),
    { label: "Años de necesidad", value: draft.coverageYears ? `${draft.coverageYears} años` : "Sin declarar", answered: !isBlank(draft.coverageYears) },
  ];
}

export function coverageSummaryLines(draft: DraftAssessment): SummaryLine[] {
  return [
    { label: "Cobertura de salud", value: labelFrom(HEALTH_COVERAGE_OPTIONS, draft.healthCoverage), answered: draft.healthCoverage !== "desconocida" },
    { label: "Liquidez", value: labelFrom(LIQUIDITY_OPTIONS, draft.liquidityNeed), answered: true },
    { label: "Riesgo", value: labelFrom(RISK_OPTIONS, draft.riskTolerance), answered: draft.riskTolerance !== "desconocida" },
    { label: "Póliza vigente", value: draft.existingPolicy ? "Sí" : "No", answered: true },
    { label: "Considera reemplazo", value: draft.wantsReplace ? "Sí" : "No", answered: true },
  ];
}

export function profileSummaryLines(draft: DraftAssessment): SummaryLine[] {
  if (draft.goal === "proteccion") {
    const reviewApplies = draft.existingPolicy;
    return [
      { label: "Ingreso a reemplazar", value: draft.life.incomeReplacementPercent === null ? "Aún no lo sé" : `${draft.life.incomeReplacementPercent}%`, answered: draft.life.incomeReplacementPercent !== null },
      { label: "Necesidad vitalicia", value: labelFrom(PERMANENT_NEED_OPTIONS, draft.life.permanentNeed), answered: draft.life.permanentNeed !== "pendiente" },
      { label: "Revisión póliza vigente", value: reviewApplies ? labelFrom(REVIEW_STATE_OPTIONS, draft.life.existingPolicyDocumentsReviewed) : "No aplica", answered: !reviewApplies || draft.life.existingPolicyDocumentsReviewed !== "pendiente" },
    ];
  }
  if (draft.goal === "salud") {
    return [
      { label: "Médicos revisados", value: labelFrom(REVIEW_STATE_OPTIONS, draft.health.providersReviewed), answered: draft.health.providersReviewed !== "pendiente" },
      { label: "Medicamentos revisados", value: labelFrom(REVIEW_STATE_OPTIONS, draft.health.medicationsReviewed), answered: draft.health.medicationsReviewed !== "pendiente" },
      { label: "Uso esperado", value: labelFrom(HEALTH_USE_OPTIONS, draft.health.expectedUse), answered: draft.health.expectedUse !== "pendiente" },
      { label: "Capacidad de deducible", value: draft.health.deductibleCapacity === null ? "Aún no lo sé" : money.format(draft.health.deductibleCapacity), answered: draft.health.deductibleCapacity !== null },
    ];
  }
  if (draft.goal === "retiro") {
    return [
      { label: "Experiencia financiera", value: labelFrom(FINANCIAL_EXPERIENCE_OPTIONS, draft.annuity.financialExperience), answered: draft.annuity.financialExperience !== "pendiente" },
      { label: "Objetivo financiero", value: labelFrom(FINANCIAL_OBJECTIVE_OPTIONS, draft.annuity.financialObjective), answered: draft.annuity.financialObjective !== "pendiente" },
      { label: "Uso previsto", value: labelFrom(ANNUITY_USE_OPTIONS, draft.annuity.intendedUse), answered: draft.annuity.intendedUse !== "pendiente" },
      { label: "Horizonte", value: draft.annuity.timeHorizonYears === null ? "Aún no lo sé" : `${draft.annuity.timeHorizonYears} años`, answered: draft.annuity.timeHorizonYears !== null },
      { label: "Activos revisados", value: labelFrom(REVIEW_STATE_OPTIONS, draft.annuity.existingProductsReviewed), answered: draft.annuity.existingProductsReviewed !== "pendiente" },
      { label: "Patrimonio líquido", value: draft.annuity.liquidNetWorth === null ? "Aún no lo sé" : money.format(draft.annuity.liquidNetWorth), answered: draft.annuity.liquidNetWorth !== null },
      { label: "Fuente de fondos", value: labelFrom(FUNDING_SOURCE_OPTIONS, draft.annuity.fundingSource), answered: draft.annuity.fundingSource !== "pendiente" },
      { label: "Situación fiscal", value: labelFrom(TAX_STATUS_OPTIONS, draft.annuity.taxStatus), answered: draft.annuity.taxStatus !== "pendiente" },
      { label: "Productos existentes", value: draft.annuity.existingProducts.length ? draft.annuity.existingProducts.map((item) => labelFrom(PRODUCT_CATEGORY_OPTIONS, item)).join(", ") : "Ninguno declarado", answered: draft.annuity.existingProductsReviewed !== "pendiente" },
    ];
  }
  if (draft.goal === "gastos_finales") {
    return [
      { label: "Monto objetivo", value: draft.finalExpense.targetAmount === null ? "Aún no lo sé" : money.format(draft.finalExpense.targetAmount), answered: draft.finalExpense.targetAmount !== null },
      { label: "Recursos reservados", value: draft.finalExpense.reservedResources === null ? "Aún no lo sé" : money.format(draft.finalExpense.reservedResources), answered: draft.finalExpense.reservedResources !== null },
    ];
  }
  return [
    { label: "Preferencia de cuidado", value: labelFrom(CARE_PREFERENCE_OPTIONS, draft.longTermCare.carePreference), answered: draft.longTermCare.carePreference !== "pendiente" },
    { label: "Apoyo familiar revisado", value: labelFrom(REVIEW_STATE_OPTIONS, draft.longTermCare.familySupportReviewed), answered: draft.longTermCare.familySupportReviewed !== "pendiente" },
    { label: "Revisión funcional/salud", value: labelFrom(REVIEW_STATE_OPTIONS, draft.longTermCare.functionalHealthReviewed), answered: draft.longTermCare.functionalHealthReviewed !== "pendiente" },
    { label: "Período a financiar", value: draft.longTermCare.fundingYears === null ? "Aún no lo sé" : `${draft.longTermCare.fundingYears} años`, answered: draft.longTermCare.fundingYears !== null },
  ];
}

/* El límite coincide con el contrato autoritativo del servidor. */
const MAX_FINANCIAL_VALUE = 1_000_000_000;
type FieldCheck = { id: string; message: string; check: (draft: DraftAssessment) => boolean };

const REQUIRED_FIELD_CHECKS: FieldCheck[] = [
  { id: "applicantReference", message: "Referencia anónima breve del solicitante", check: (d) => !isBlank(d.applicantReference) && d.applicantReference.trim().length <= 40 && !referenceLooksSensitive(d.applicantReference) },
  { id: "age", message: "Edad válida entre 18 y 100 años", check: (d) => isWholeInRange(d.age, 18, 100) },
  { id: "dependents", message: "Dependientes válidos entre 0 y 12", check: (d) => isWholeInRange(d.dependents, 0, 12) },
  { id: "annualIncome", message: "Ingreso anual válido", check: (d) => Number.isFinite(parseAmount(d.annualIncome)) && parseAmount(d.annualIncome) >= 0 && parseAmount(d.annualIncome) <= MAX_FINANCIAL_VALUE },
  { id: "monthlyExpenses", message: "Gastos mensuales mayores que cero", check: (d) => Number.isFinite(parseAmount(d.monthlyExpenses)) && parseAmount(d.monthlyExpenses) > 0 && parseAmount(d.monthlyExpenses) <= MAX_FINANCIAL_VALUE },
  { id: "monthlyBudget", message: "Presupuesto mensual disponible válido", check: (d) => Number.isFinite(parseAmount(d.monthlyBudget)) && parseAmount(d.monthlyBudget) >= 0 && parseAmount(d.monthlyBudget) <= MAX_FINANCIAL_VALUE },
  { id: "debts", message: "Deudas válidas", check: (d) => Number.isFinite(parseAmount(d.debts)) && parseAmount(d.debts) >= 0 && parseAmount(d.debts) <= MAX_FINANCIAL_VALUE },
  { id: "mortgageBalance", message: "Saldo hipotecario válido", check: (d) => Number.isFinite(parseAmount(d.mortgageBalance)) && parseAmount(d.mortgageBalance) >= 0 && parseAmount(d.mortgageBalance) <= MAX_FINANCIAL_VALUE },
  { id: "educationGoal", message: "Meta educativa válida", check: (d) => Number.isFinite(parseAmount(d.educationGoal)) && parseAmount(d.educationGoal) >= 0 && parseAmount(d.educationGoal) <= MAX_FINANCIAL_VALUE },
  { id: "existingLifeCoverage", message: "Seguro de vida vigente válido", check: (d) => Number.isFinite(parseAmount(d.existingLifeCoverage)) && parseAmount(d.existingLifeCoverage) >= 0 && parseAmount(d.existingLifeCoverage) <= MAX_FINANCIAL_VALUE },
  { id: "emergencySavings", message: "Fondo de emergencia válido", check: (d) => Number.isFinite(parseAmount(d.emergencySavings)) && parseAmount(d.emergencySavings) >= 0 && parseAmount(d.emergencySavings) <= MAX_FINANCIAL_VALUE },
  { id: "coverageYears", message: "Años de necesidad entre 1 y 50", check: (d) => isWholeInRange(d.coverageYears, 1, 50) },
];

const SOFT_FIELD_CHECKS: FieldCheck[] = [
  { id: "healthCoverage", message: "confirmar la cobertura de salud actual", check: (d) => d.healthCoverage !== "desconocida" },
  { id: "riskTolerance", message: "confirmar la tolerancia al riesgo", check: (d) => d.riskTolerance !== "desconocida" },
];

function profileFieldTotals(draft: DraftAssessment) {
  const lines = profileSummaryLines(draft);
  return { total: lines.length, answered: lines.filter((line) => line.answered).length };
}

export function computeReadiness(draft: DraftAssessment): ReadinessSummary {
  const blockingErrors: ReadinessIssue[] = [];
  let confirmedRequired = 0;
  for (const field of REQUIRED_FIELD_CHECKS) {
    if (field.check(draft)) confirmedRequired += 1;
    else blockingErrors.push({ id: field.id, message: field.message });
  }
  if (!isBlank(draft.applicantReference) && referenceLooksSensitive(draft.applicantReference)) {
    const referenceIssue = blockingErrors.findIndex((issue) => issue.id === "applicantReference");
    const sensitiveIssue = { id: "applicantReference", message: "La referencia no puede contener correo, teléfono, SSN ni dirección." };
    if (referenceIssue >= 0) blockingErrors[referenceIssue] = sensitiveIssue;
    else blockingErrors.push(sensitiveIssue);
  }

  const followUpWarnings: ReadinessIssue[] = [];
  let confirmedSoft = 0;
  for (const field of SOFT_FIELD_CHECKS) {
    if (field.check(draft)) confirmedSoft += 1;
    else followUpWarnings.push({ id: field.id, message: `Aún falta ${field.message}.` });
  }
  if (draft.goal === "proteccion" && draft.existingPolicy && draft.wantsReplace && draft.life.existingPolicyDocumentsReviewed !== "confirmado") {
    followUpWarnings.push({ id: "replace-without-review", message: "Confirma la revisión de la póliza vigente antes de considerar un reemplazo." });
  }

  const { total: totalProfileFields, answered: answeredProfileFields } = profileFieldTotals(draft);
  if (totalProfileFields > 0 && answeredProfileFields === 0) {
    followUpWarnings.push({ id: "profile-untouched", message: `Aún no respondiste ninguna pregunta del perfil de ${GOAL_LABELS[draft.goal].toLowerCase()}.` });
  }

  const totalCount = REQUIRED_FIELD_CHECKS.length + SOFT_FIELD_CHECKS.length + totalProfileFields;
  const confirmedCount = confirmedRequired + confirmedSoft + answeredProfileFields;
  const pendingCount = Math.max(0, totalCount - confirmedCount - blockingErrors.length);
  const percentComplete = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;
  return { percentComplete, confirmedCount, totalCount, pendingCount, blockingErrors, followUpWarnings };
}

/** Selecciona las próximas preguntas a partir de datos faltantes y relaciones
    matemáticas visibles. No usa elegibilidad, productos ni datos de terceros. */
export function buildAdaptiveQuestions(draft: DraftAssessment): AdaptiveQuestion[] {
  const questions: AdaptiveQuestion[] = [];
  const add = (question: AdaptiveQuestion) => {
    if (!questions.some((item) => item.id === question.id)) questions.push(question);
  };

  if (isBlank(draft.applicantReference) || referenceLooksSensitive(draft.applicantReference)) {
    add({ id: "anonymous-reference", question: "¿Qué referencia anónima usaremos para reconocer este caso?", reason: "Protege la identidad y permite guardar el expediente sin datos de contacto.", targetStep: 0, tone: "essential" });
  }
  if (!isWholeInRange(draft.age, 18, 100)) {
    add({ id: "age", question: "¿Cuál es la edad del solicitante?", reason: "La etapa de vida cambia el horizonte de la necesidad, pero no determina aprobación.", targetStep: 0, tone: "essential" });
  }
  if (!isWholeInRange(draft.dependents, 0, 12)) {
    add({ id: "dependents", question: "¿Cuántas personas dependen económicamente de este ingreso?", reason: "Permite dimensionar la continuidad económica familiar.", targetStep: 0, tone: "essential" });
  }

  const financialQuestions: Array<{ id: string; valid: boolean; question: string; reason: string }> = [
    { id: "annual-income", valid: Number.isFinite(parseAmount(draft.annualIncome)), question: "¿Cuál es el ingreso anual aproximado del hogar?", reason: "Es necesario para medir capacidad y obligaciones sin suponer cifras." },
    { id: "monthly-expenses", valid: parseAmount(draft.monthlyExpenses) > 0, question: "¿Cuánto necesita el hogar para sus gastos mensuales?", reason: "Permite comprobar sostenibilidad y liquidez." },
    { id: "emergency-savings", valid: Number.isFinite(parseAmount(draft.emergencySavings)), question: "¿Cuánto conserva la familia como fondo de emergencia?", reason: "La reserva disponible puede cambiar la prioridad inmediata." },
    { id: "monthly-budget", valid: Number.isFinite(parseAmount(draft.monthlyBudget)), question: "¿Qué cantidad mensual podría sostener sin afectar gastos esenciales?", reason: "Es capacidad declarada, no una prima ni una cotización." },
  ];
  for (const item of financialQuestions) {
    if (!item.valid) add({ id: item.id, question: item.question, reason: item.reason, targetStep: 1, tone: "essential" });
  }

  const annualIncome = parseAmount(draft.annualIncome);
  const monthlyExpenses = parseAmount(draft.monthlyExpenses);
  const monthlyBudget = parseAmount(draft.monthlyBudget);
  const emergencySavings = parseAmount(draft.emergencySavings);
  if ([annualIncome, monthlyExpenses, monthlyBudget].every(Number.isFinite)) {
    const disposable = annualIncome / 12 - monthlyExpenses;
    if (monthlyBudget > disposable) {
      add({ id: "budget-conflict", question: "El presupuesto declarado supera el flujo disponible. ¿Qué cifra puede sostener realmente la familia?", reason: "Resolver esta diferencia evita orientar hacia un compromiso difícil de mantener.", targetStep: 1, tone: "caution" });
    }
  }
  if (Number.isFinite(monthlyExpenses) && monthlyExpenses > 0 && Number.isFinite(emergencySavings) && emergencySavings / monthlyExpenses < 3) {
    add({ id: "liquidity-gap", question: "Con menos de tres meses de reserva, ¿qué nivel de liquidez necesita conservar la familia?", reason: "La prioridad puede ser fortalecer la estabilidad antes de asumir un compromiso nuevo.", targetStep: 2, tone: "caution" });
  }

  if (draft.healthCoverage === "desconocida") {
    add({ id: "health-coverage", question: "¿La cobertura de salud actual es adecuada, tiene brechas o no existe?", reason: "Evita pasar por alto una necesidad médica inmediata.", targetStep: 2, tone: "clarify" });
  }
  if (draft.riskTolerance === "desconocida") {
    add({ id: "risk-tolerance", question: "¿Cómo se siente la persona ante variaciones, pérdidas o elementos no garantizados?", reason: "La tolerancia debe declararse; nunca debe inferirse por edad o patrimonio.", targetStep: 2, tone: "clarify" });
  }

  if (draft.goal === "proteccion") {
    if (draft.life.incomeReplacementPercent === null) add({ id: "life-income", question: "¿Qué porcentaje del ingreso necesitaría conservar la familia si faltara el proveedor?", reason: "El cálculo ilustrativo debe reflejar la necesidad declarada, no una regla automática.", targetStep: 3, tone: "clarify" });
    if (draft.life.permanentNeed === "pendiente") add({ id: "life-duration", question: "¿La necesidad termina en un plazo o existe una obligación que sería vitalicia?", reason: "Separa obligaciones temporales de necesidades permanentes.", targetStep: 3, tone: "clarify" });
    if (draft.existingPolicy && draft.life.existingPolicyDocumentsReviewed === "pendiente") add({ id: "life-review", question: "¿Ya se revisó la póliza vigente completa?", reason: "No debe considerarse un reemplazo sin comparar garantías, costos y nueva vigencia.", targetStep: 3, tone: "caution" });
  }
  if (draft.goal === "salud") {
    if (draft.health.providersReviewed === "pendiente") add({ id: "health-providers", question: "¿Qué médicos y hospitales son indispensables?", reason: "La red puede ser tan importante como el costo mensual.", targetStep: 3, tone: "clarify" });
    if (draft.health.medicationsReviewed === "pendiente") add({ id: "health-medications", question: "¿Ya se verificaron los medicamentos y farmacias necesarios?", reason: "Evita comparar planes sin confirmar su cobertura real.", targetStep: 3, tone: "clarify" });
    if (draft.health.expectedUse === "pendiente") add({ id: "health-use", question: "¿Qué nivel de uso médico espera durante el próximo período?", reason: "Ayuda a comparar costo total, no solo prima.", targetStep: 3, tone: "clarify" });
  }
  if (draft.goal === "retiro") {
    if (draft.annuity.financialObjective === "pendiente") add({ id: "retirement-objective", question: "¿El objetivo principal es ingreso, acumulación, preservación o legado?", reason: "La finalidad debe estar documentada antes de considerar cualquier anualidad.", targetStep: 3, tone: "essential" });
    if (draft.annuity.timeHorizonYears === null) add({ id: "retirement-horizon", question: "¿Cuándo espera utilizar estos fondos?", reason: "El horizonte permite evaluar necesidades de acceso y liquidez.", targetStep: 3, tone: "essential" });
    if (draft.annuity.liquidNetWorth === null) add({ id: "retirement-liquidity", question: "¿Qué patrimonio permanecería líquido después de destinar esos fondos?", reason: "Evita inmovilizar recursos que podrían necesitarse.", targetStep: 3, tone: "essential" });
  }
  if (draft.goal === "gastos_finales") {
    if (draft.finalExpense.targetAmount === null) add({ id: "final-target", question: "¿Qué monto desea reservar para gastos finales?", reason: "La necesidad debe partir de una cifra elegida por la familia.", targetStep: 3, tone: "clarify" });
    if (draft.finalExpense.reservedResources === null) add({ id: "final-reserved", question: "¿Qué recursos ya están separados para ese propósito?", reason: "Permite calcular únicamente la brecha declarada.", targetStep: 3, tone: "clarify" });
  }
  if (draft.goal === "cuidado_prolongado") {
    if (draft.longTermCare.carePreference === "pendiente") add({ id: "care-place", question: "¿Dónde preferiría recibir cuidado si llegara a necesitarlo?", reason: "La preferencia cambia el tipo de planificación necesaria.", targetStep: 3, tone: "clarify" });
    if (draft.longTermCare.familySupportReviewed === "pendiente") add({ id: "care-support", question: "¿Se revisó qué apoyo familiar estaría realmente disponible?", reason: "Distingue apoyo posible de apoyo confirmado.", targetStep: 3, tone: "clarify" });
  }

  return questions.slice(0, 6);
}

export const BUCKET_META: Record<DirectionBucket, { label: string; tone: "good" | "warn" | "info"; description: string }> = {
  lista: { label: "Lista para continuar", tone: "good", description: "Información completa y sin precauciones abiertas." },
  precaucion: { label: "Resolver precauciones", tone: "warn", description: "El motor señaló precauciones que conviene conversar antes de avanzar." },
  informacion: { label: "Requiere más información", tone: "info", description: "Aún falta información para completar el análisis." },
};

export function deriveDirectionBucket(result: Pick<EngineResult, "status" | "quality" | "cautions" | "missing">): DirectionBucket {
  if (result.cautions.length > 0) return "precaucion";
  if (result.status === "informacion_pendiente" || result.missing.length > 0 || !result.quality.directionReady) return "informacion";
  return "lista";
}

export function buildComparisonEntry(base: {
  id: string;
  applicantReference: string;
  goal: AssessmentInput["goal"];
  createdAt: string;
  result: EngineResult;
}): ComparisonEntry {
  return {
    id: base.id,
    applicantReference: base.applicantReference,
    goal: base.goal,
    createdAt: base.createdAt,
    status: base.result.status,
    bucket: deriveDirectionBucket(base.result),
    qualityScore: base.result.quality.score,
    directionReady: base.result.quality.directionReady,
    cautionCount: base.result.cautions.length,
    missingCount: base.result.missing.length,
    priority: base.result.priority,
  };
}
