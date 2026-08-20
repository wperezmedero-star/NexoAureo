export const FACT_FINDER_VERSION = "NA-FF-2026.08-v1";

export type ReviewState = "confirmado" | "no_aplica" | "pendiente";

export type LifeProfile = {
  incomeReplacementPercent: number | null;
  permanentNeed: "si" | "no" | "pendiente";
  existingPolicyDocumentsReviewed: ReviewState;
};

export type HealthProfile = {
  providersReviewed: ReviewState;
  medicationsReviewed: ReviewState;
  expectedUse: "bajo" | "moderado" | "alto" | "pendiente";
  deductibleCapacity: number | null;
};

export type AnnuityProfile = {
  financialExperience: "ninguna" | "basica" | "intermedia" | "avanzada" | "pendiente";
  financialObjective: "ingreso" | "acumulacion" | "preservacion" | "legado" | "otro" | "pendiente";
  intendedUse: "ingreso_inmediato" | "ingreso_futuro" | "acumulacion_diferida" | "otro" | "pendiente";
  timeHorizonYears: number | null;
  existingProductsReviewed: ReviewState;
  existingProducts: Array<"efectivo" | "certificados" | "cuentas_retiro" | "fondos" | "acciones_bonos" | "seguros_vida" | "anualidades" | "otros">;
  liquidNetWorth: number | null;
  fundingSource: "ahorros" | "certificados" | "cuenta_retiro" | "venta_activo" | "reemplazo_anualidad" | "seguro_vida" | "otro" | "pendiente";
  taxStatus: "calificado" | "no_calificado" | "mixto" | "pendiente";
};

export type FinalExpenseProfile = {
  targetAmount: number | null;
  reservedResources: number | null;
};

export type LongTermCareProfile = {
  carePreference: "hogar" | "comunidad" | "institucion" | "flexible" | "pendiente";
  familySupportReviewed: ReviewState;
  functionalHealthReviewed: ReviewState;
  fundingYears: number | null;
};

export type FactFinderProfiles = {
  life?: LifeProfile;
  health?: HealthProfile;
  annuity?: AnnuityProfile;
  finalExpense?: FinalExpenseProfile;
  longTermCare?: LongTermCareProfile;
};

export type AssessmentInput = {
  applicantReference: string;
  age: number;
  dependents: number;
  annualIncome: number;
  monthlyExpenses: number;
  debts: number;
  mortgageBalance: number;
  educationGoal: number;
  existingLifeCoverage: number;
  emergencySavings: number;
  coverageYears: number;
  monthlyBudget: number;
  goal: "proteccion" | "salud" | "retiro" | "gastos_finales" | "cuidado_prolongado";
  healthCoverage: "adecuada" | "brechas" | "ninguna" | "desconocida";
  liquidityNeed: "alta" | "moderada" | "baja";
  riskTolerance: "conservadora" | "moderada" | "crecimiento" | "desconocida";
  existingPolicy: boolean;
  wantsReplace: boolean;
  profiles?: FactFinderProfiles;
};

const GOALS = new Set(["proteccion", "salud", "retiro", "gastos_finales", "cuidado_prolongado"]);
const HEALTH_COVERAGE = new Set(["adecuada", "brechas", "ninguna", "desconocida"]);
const LIQUIDITY_NEEDS = new Set(["alta", "moderada", "baja"]);
const RISK_TOLERANCES = new Set(["conservadora", "moderada", "crecimiento", "desconocida"]);
const REVIEW_STATES = new Set(["confirmado", "no_aplica", "pendiente"]);
const PERMANENT_NEEDS = new Set(["si", "no", "pendiente"]);
const HEALTH_USE = new Set(["bajo", "moderado", "alto", "pendiente"]);
const FINANCIAL_EXPERIENCE = new Set(["ninguna", "basica", "intermedia", "avanzada", "pendiente"]);
const FINANCIAL_OBJECTIVES = new Set(["ingreso", "acumulacion", "preservacion", "legado", "otro", "pendiente"]);
const ANNUITY_USES = new Set(["ingreso_inmediato", "ingreso_futuro", "acumulacion_diferida", "otro", "pendiente"]);
const PRODUCT_CATEGORIES = new Set(["efectivo", "certificados", "cuentas_retiro", "fondos", "acciones_bonos", "seguros_vida", "anualidades", "otros"]);
const FUNDING_SOURCES = new Set(["ahorros", "certificados", "cuenta_retiro", "venta_activo", "reemplazo_anualidad", "seguro_vida", "otro", "pendiente"]);
const TAX_STATUS = new Set(["calificado", "no_calificado", "mixto", "pendiente"]);
const CARE_PREFERENCES = new Set(["hogar", "comunidad", "institucion", "flexible", "pendiente"]);
const MAX_FINANCIAL_VALUE = 1_000_000_000;
const sensitivePatterns = [/@/, /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, /\b(?:calle|street|st\.|avenida|avenue|ave\.)\b/i];

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return numberValue(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 12) : [];
}

function normalizeProfiles(value: unknown): FactFinderProfiles | undefined {
  const profiles = recordValue(value);
  if (!profiles) return undefined;
  const normalized: FactFinderProfiles = {};
  const life = recordValue(profiles.life);
  const health = recordValue(profiles.health);
  const annuity = recordValue(profiles.annuity);
  const finalExpense = recordValue(profiles.finalExpense);
  const longTermCare = recordValue(profiles.longTermCare);

  if (life) {
    normalized.life = {
      incomeReplacementPercent: nullableNumber(life.incomeReplacementPercent),
      permanentNeed: stringValue(life.permanentNeed, "pendiente") as LifeProfile["permanentNeed"],
      existingPolicyDocumentsReviewed: stringValue(life.existingPolicyDocumentsReviewed, "pendiente") as ReviewState,
    };
  }
  if (health) {
    normalized.health = {
      providersReviewed: stringValue(health.providersReviewed, "pendiente") as ReviewState,
      medicationsReviewed: stringValue(health.medicationsReviewed, "pendiente") as ReviewState,
      expectedUse: stringValue(health.expectedUse, "pendiente") as HealthProfile["expectedUse"],
      deductibleCapacity: nullableNumber(health.deductibleCapacity),
    };
  }
  if (annuity) {
    normalized.annuity = {
      financialExperience: stringValue(annuity.financialExperience, "pendiente") as AnnuityProfile["financialExperience"],
      financialObjective: stringValue(annuity.financialObjective, "pendiente") as AnnuityProfile["financialObjective"],
      intendedUse: stringValue(annuity.intendedUse, "pendiente") as AnnuityProfile["intendedUse"],
      timeHorizonYears: nullableNumber(annuity.timeHorizonYears),
      existingProductsReviewed: stringValue(annuity.existingProductsReviewed, "pendiente") as ReviewState,
      existingProducts: stringArray(annuity.existingProducts) as AnnuityProfile["existingProducts"],
      liquidNetWorth: nullableNumber(annuity.liquidNetWorth),
      fundingSource: stringValue(annuity.fundingSource, "pendiente") as AnnuityProfile["fundingSource"],
      taxStatus: stringValue(annuity.taxStatus, "pendiente") as AnnuityProfile["taxStatus"],
    };
  }
  if (finalExpense) {
    normalized.finalExpense = {
      targetAmount: nullableNumber(finalExpense.targetAmount),
      reservedResources: nullableNumber(finalExpense.reservedResources),
    };
  }
  if (longTermCare) {
    normalized.longTermCare = {
      carePreference: stringValue(longTermCare.carePreference, "pendiente") as LongTermCareProfile["carePreference"],
      familySupportReviewed: stringValue(longTermCare.familySupportReviewed, "pendiente") as ReviewState,
      functionalHealthReviewed: stringValue(longTermCare.functionalHealthReviewed, "pendiente") as ReviewState,
      fundingYears: nullableNumber(longTermCare.fundingYears),
    };
  }

  return Object.keys(normalized).length ? normalized : undefined;
}

export function normalizeAssessmentPayload(payload: Record<string, unknown>): AssessmentInput {
  return {
    applicantReference: String(payload.applicantReference ?? "").trim().slice(0, 40),
    age: numberValue(payload.age),
    dependents: numberValue(payload.dependents),
    annualIncome: numberValue(payload.annualIncome),
    monthlyExpenses: numberValue(payload.monthlyExpenses),
    debts: numberValue(payload.debts),
    mortgageBalance: numberValue(payload.mortgageBalance),
    educationGoal: numberValue(payload.educationGoal),
    existingLifeCoverage: numberValue(payload.existingLifeCoverage),
    emergencySavings: numberValue(payload.emergencySavings),
    coverageYears: numberValue(payload.coverageYears),
    monthlyBudget: numberValue(payload.monthlyBudget),
    goal: String(payload.goal ?? "") as AssessmentInput["goal"],
    healthCoverage: String(payload.healthCoverage ?? "") as AssessmentInput["healthCoverage"],
    liquidityNeed: String(payload.liquidityNeed ?? "") as AssessmentInput["liquidityNeed"],
    riskTolerance: String(payload.riskTolerance ?? "") as AssessmentInput["riskTolerance"],
    existingPolicy: payload.existingPolicy === true,
    wantsReplace: payload.wantsReplace === true,
    profiles: normalizeProfiles(payload.profiles),
  };
}

function isFiniteInRange(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isNullableNumberInRange(value: number | null, minimum: number, maximum: number) {
  return value === null || isFiniteInRange(value, minimum, maximum);
}

export function validateAssessment(input: Partial<AssessmentInput>) {
  const errors: string[] = [];
  const ref = String(input.applicantReference ?? "").trim();

  if (!ref || ref.length > 40) errors.push("Usa una referencia breve, por ejemplo ‘Familia R.’");
  if (sensitivePatterns.some((pattern) => pattern.test(ref))) errors.push("No escribas correo, teléfono, SSN ni dirección en la referencia.");
  if (!isFiniteInRange(input.age, 18, 100) || !Number.isInteger(input.age)) errors.push("Edad válida entre 18 y 100 años.");
  if (!isFiniteInRange(input.dependents, 0, 12) || !Number.isInteger(input.dependents)) errors.push("Dependientes válidos entre 0 y 12.");
  if (!isFiniteInRange(input.annualIncome, 0, MAX_FINANCIAL_VALUE)) errors.push("Ingreso anual válido.");
  if (!isFiniteInRange(input.monthlyExpenses, 0.01, MAX_FINANCIAL_VALUE)) errors.push("Gastos mensuales mayores que cero.");
  if (!isFiniteInRange(input.monthlyBudget, 0, MAX_FINANCIAL_VALUE)) errors.push("Presupuesto mensual válido.");

  const nonNegativeFields: Array<[unknown, string]> = [
    [input.debts, "Deudas válidas."],
    [input.mortgageBalance, "Saldo hipotecario válido."],
    [input.educationGoal, "Meta educativa válida."],
    [input.existingLifeCoverage, "Cobertura de vida vigente válida."],
    [input.emergencySavings, "Fondo de emergencia válido."],
  ];
  for (const [value, message] of nonNegativeFields) {
    if (!isFiniteInRange(value, 0, MAX_FINANCIAL_VALUE)) errors.push(message);
  }

  if (!isFiniteInRange(input.coverageYears, 1, 50) || !Number.isInteger(input.coverageYears)) errors.push("Horizonte válido entre 1 y 50 años.");
  if (!GOALS.has(String(input.goal ?? ""))) errors.push("Selecciona una necesidad principal válida.");
  if (!HEALTH_COVERAGE.has(String(input.healthCoverage ?? ""))) errors.push("Selecciona un estado de cobertura de salud válido.");
  if (!LIQUIDITY_NEEDS.has(String(input.liquidityNeed ?? ""))) errors.push("Selecciona una necesidad de liquidez válida.");
  if (!RISK_TOLERANCES.has(String(input.riskTolerance ?? ""))) errors.push("Selecciona una tolerancia al riesgo válida.");
  if (typeof input.existingPolicy !== "boolean" || typeof input.wantsReplace !== "boolean") errors.push("Confirma correctamente la situación de la póliza vigente.");
  if (input.wantsReplace && !input.existingPolicy) errors.push("No se puede considerar un reemplazo sin declarar una póliza vigente.");

  const life = input.profiles?.life;
  if (life) {
    if (!isNullableNumberInRange(life.incomeReplacementPercent, 0, 100)) errors.push("Porcentaje de reemplazo de ingreso válido entre 0 y 100.");
    if (!PERMANENT_NEEDS.has(life.permanentNeed)) errors.push("Necesidad permanente válida.");
    if (!REVIEW_STATES.has(life.existingPolicyDocumentsReviewed)) errors.push("Estado válido de revisión de la póliza vigente.");
  }

  const health = input.profiles?.health;
  if (health) {
    if (!REVIEW_STATES.has(health.providersReviewed)) errors.push("Estado válido de revisión de proveedores.");
    if (!REVIEW_STATES.has(health.medicationsReviewed)) errors.push("Estado válido de revisión de medicamentos.");
    if (!HEALTH_USE.has(health.expectedUse)) errors.push("Uso médico esperado válido.");
    if (!isNullableNumberInRange(health.deductibleCapacity, 0, MAX_FINANCIAL_VALUE)) errors.push("Capacidad para deducible válida.");
  }

  const annuity = input.profiles?.annuity;
  if (annuity) {
    if (!FINANCIAL_EXPERIENCE.has(annuity.financialExperience)) errors.push("Experiencia financiera válida.");
    if (!FINANCIAL_OBJECTIVES.has(annuity.financialObjective)) errors.push("Objetivo financiero válido.");
    if (!ANNUITY_USES.has(annuity.intendedUse)) errors.push("Uso previsto de la anualidad válido.");
    if (!isNullableNumberInRange(annuity.timeHorizonYears, 1, 60) || (annuity.timeHorizonYears !== null && !Number.isInteger(annuity.timeHorizonYears))) errors.push("Horizonte financiero válido entre 1 y 60 años.");
    if (!REVIEW_STATES.has(annuity.existingProductsReviewed)) errors.push("Estado válido de revisión de activos y productos existentes.");
    if (annuity.existingProducts.some((item) => !PRODUCT_CATEGORIES.has(item))) errors.push("Categoría válida de producto financiero existente.");
    if (!isNullableNumberInRange(annuity.liquidNetWorth, 0, MAX_FINANCIAL_VALUE)) errors.push("Patrimonio líquido válido.");
    if (!FUNDING_SOURCES.has(annuity.fundingSource)) errors.push("Fuente de fondos válida.");
    if (!TAX_STATUS.has(annuity.taxStatus)) errors.push("Situación fiscal válida.");
  }

  const finalExpense = input.profiles?.finalExpense;
  if (finalExpense) {
    if (!isNullableNumberInRange(finalExpense.targetAmount, 0, MAX_FINANCIAL_VALUE)) errors.push("Monto objetivo de gastos finales válido.");
    if (!isNullableNumberInRange(finalExpense.reservedResources, 0, MAX_FINANCIAL_VALUE)) errors.push("Recursos reservados para gastos finales válidos.");
  }

  const longTermCare = input.profiles?.longTermCare;
  if (longTermCare) {
    if (!CARE_PREFERENCES.has(longTermCare.carePreference)) errors.push("Preferencia de cuidado válida.");
    if (!REVIEW_STATES.has(longTermCare.familySupportReviewed)) errors.push("Estado válido de revisión del apoyo familiar.");
    if (!REVIEW_STATES.has(longTermCare.functionalHealthReviewed)) errors.push("Estado válido de revisión funcional y de salud.");
    if (!isNullableNumberInRange(longTermCare.fundingYears, 0, 20)) errors.push("Período de financiamiento de cuidado válido entre 0 y 20 años.");
  }

  return [...new Set(errors)];
}
