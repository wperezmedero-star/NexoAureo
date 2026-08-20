import assert from "node:assert/strict";
import test from "node:test";
import { analyzeAssessment, ENGINE_VERSION, FACT_FINDER_VERSION, normalizeAssessmentPayload, validateAssessment } from "../lib/decision-engine.ts";
import type { AssessmentInput } from "../lib/decision-engine.ts";
import { analyzeNarrativeLocally, findSensitiveNarrativeIssues } from "../lib/interview-intelligence.ts";
import { summarizeAssessmentResult } from "../lib/assessment-summary.ts";
import { buildAdaptiveQuestions, computeReadiness, deriveDirectionBucket, draftToPayload, emptyDraft } from "../app/components/analysis/copy.ts";

const validProtection: AssessmentInput = {
  applicantReference: "Familia R.",
  age: 38,
  dependents: 2,
  annualIncome: 72_000,
  monthlyExpenses: 4_300,
  debts: 18_000,
  mortgageBalance: 210_000,
  educationGoal: 80_000,
  existingLifeCoverage: 50_000,
  emergencySavings: 9_000,
  coverageYears: 20,
  monthlyBudget: 140,
  goal: "proteccion",
  healthCoverage: "adecuada",
  liquidityNeed: "moderada",
  riskTolerance: "conservadora",
  existingPolicy: true,
  wantsReplace: false,
  profiles: {
    life: {
      incomeReplacementPercent: 100,
      permanentNeed: "no",
      existingPolicyDocumentsReviewed: "confirmado",
    },
  },
};

test("acepta una entrevista coherente y rechaza datos sensibles o rangos alterados", () => {
  assert.deepEqual(validateAssessment(validProtection), []);

  const errors = validateAssessment({
    ...validProtection,
    applicantReference: "cliente@email.com",
    dependents: 99,
    goal: "otro" as AssessmentInput["goal"],
    wantsReplace: true,
    existingPolicy: false,
  });

  assert.ok(errors.some((message) => message.includes("correo")));
  assert.ok(errors.some((message) => message.includes("Dependientes")));
  assert.ok(errors.some((message) => message.includes("necesidad principal")));
  assert.ok(errors.some((message) => message.includes("reemplazo")));
});

test("expone el cálculo de protección, sus supuestos y el bloqueo por nombramiento", () => {
  const result = analyzeAssessment(validProtection);

  assert.equal(result.engineVersion, ENGINE_VERSION);
  assert.equal(result.factFinderVersion, FACT_FINDER_VERSION);
  assert.equal(result.metrics.illustrativeCoverageNeed, 1_698_000);
  assert.equal(result.metrics.coverageBreakdown.incomeReplacement, 1_440_000);
  assert.equal(result.quality.score, 100);
  assert.equal(result.quality.directionReady, true);
  assert.equal(result.productRecommendationAllowed, false);
  assert.equal(result.decisionGate.appointmentStatus, "pendiente");
  assert.equal(result.decisionGate.activityMode, "educativo_interno");
  assert.ok(result.sourceIds.includes("APPT-001"));
  assert.ok(result.assumptions.some((item) => item.includes("100%")));
});

test("permite que la familia defina el porcentaje de ingreso que necesita reemplazar", () => {
  const result = analyzeAssessment({
    ...validProtection,
    profiles: {
      life: {
        incomeReplacementPercent: 60,
        permanentNeed: "no",
        existingPolicyDocumentsReviewed: "confirmado",
      },
    },
  });

  assert.equal(result.metrics.coverageBreakdown.incomeReplacementPercentApplied, 60);
  assert.equal(result.metrics.coverageBreakdown.incomeReplacement, 864_000);
  assert.equal(result.metrics.illustrativeCoverageNeed, 1_122_000);
  assert.ok(result.assumptions.some((item) => item.includes("60%")));
});

test("mantiene salud como dirección preliminar hasta confirmar red, medicamentos y costo total", () => {
  const result = analyzeAssessment({ ...validProtection, goal: "salud", healthCoverage: "desconocida" });

  assert.equal(result.status, "informacion_pendiente");
  assert.equal(result.confidence, "limitada");
  assert.ok(result.missing.some((item) => item.includes("médicos")));
  assert.ok(result.missing.some((item) => item.includes("medicamentos")));
  assert.ok(result.missing.some((item) => item.includes("máximo de bolsillo")));
  assert.ok(result.sourceIds.includes("HEALTH-001"));
  assert.ok(result.sourceIds.includes("HEALTH-002"));
});

test("reconoce un perfil de salud completo sin guardar detalles clínicos", () => {
  const result = analyzeAssessment({
    ...validProtection,
    goal: "salud",
    profiles: {
      ...validProtection.profiles,
      health: {
        providersReviewed: "confirmado",
        medicationsReviewed: "no_aplica",
        expectedUse: "moderado",
        deductibleCapacity: 3_500,
      },
    },
  });

  assert.equal(result.status, "preliminar");
  assert.equal(result.missing.length, 0);
  assert.equal(result.confidence, "alta");
  assert.equal(result.productRecommendationAllowed, false);
});

test("calcula la brecha declarada de gastos finales sin convertirla en cotización", () => {
  const result = analyzeAssessment({
    ...validProtection,
    goal: "gastos_finales",
    profiles: {
      ...validProtection.profiles,
      finalExpense: { targetAmount: 25_000, reservedResources: 7_000 },
    },
  });

  assert.equal(result.metrics.finalExpenseGap, 18_000);
  assert.equal(result.missing.length, 0);
  assert.equal(result.productRecommendationAllowed, false);
});

test("completa el perfil de cuidado prolongado sin almacenar historia clínica", () => {
  const result = analyzeAssessment({
    ...validProtection,
    goal: "cuidado_prolongado",
    profiles: {
      ...validProtection.profiles,
      longTermCare: {
        carePreference: "hogar",
        familySupportReviewed: "confirmado",
        functionalHealthReviewed: "confirmado",
        fundingYears: 4,
      },
    },
  });

  assert.equal(result.missing.length, 0);
  assert.equal(result.status, "preliminar");
  assert.ok(result.rationale.some((item) => item.includes("cuidado custodial")));
});

test("detiene una dirección de anualidad cuando faltan datos del perfil exigido", () => {
  const result = analyzeAssessment({
    ...validProtection,
    goal: "retiro",
    riskTolerance: "desconocida",
    liquidityNeed: "alta",
  });

  assert.equal(result.status, "informacion_pendiente");
  assert.equal(result.confidence, "limitada");
  assert.equal(result.quality.directionReady, false);
  assert.ok(result.missing.includes("Experiencia financiera"));
  assert.ok(result.missing.includes("Patrimonio líquido"));
  assert.ok(result.missing.includes("Situación fiscal"));
  assert.ok(result.missing.some((item) => item.includes("Tolerancia al riesgo")));
  assert.ok(result.direction.startsWith("No recomendar una anualidad específica"));
});

test("reconoce los 14 elementos del perfil de anualidad y mantiene el bloqueo de producto", () => {
  const result = analyzeAssessment({
    ...validProtection,
    goal: "retiro",
    profiles: {
      ...validProtection.profiles,
      annuity: {
        financialExperience: "intermedia",
        financialObjective: "ingreso",
        intendedUse: "ingreso_futuro",
        timeHorizonYears: 15,
        existingProductsReviewed: "confirmado",
        existingProducts: ["cuentas_retiro", "efectivo"],
        liquidNetWorth: 180_000,
        fundingSource: "cuenta_retiro",
        taxStatus: "calificado",
      },
    },
  });

  assert.equal(result.status, "preliminar");
  assert.equal(result.missing.length, 0);
  assert.equal(result.quality.directionReady, true);
  assert.ok(result.direction.startsWith("El perfil mínimo de idoneidad está completo"));
  assert.equal(result.decisionGate.productRecommendationAllowed, false);
});

test("normaliza el contrato anidado y rechaza categorías alteradas", () => {
  const normalized = normalizeAssessmentPayload({
    ...validProtection,
    profiles: {
      annuity: {
        financialExperience: "intermedia",
        financialObjective: "ingreso",
        intendedUse: "ingreso_futuro",
        timeHorizonYears: "15",
        existingProductsReviewed: "confirmado",
        existingProducts: ["cuentas_retiro", "categoria_inventada"],
        liquidNetWorth: "180000",
        fundingSource: "cuenta_retiro",
        taxStatus: "calificado",
      },
    },
  });

  assert.equal(normalized.profiles?.annuity?.timeHorizonYears, 15);
  assert.equal(normalized.profiles?.annuity?.liquidNetWorth, 180_000);
  assert.ok(validateAssessment(normalized).some((message) => message.includes("Categoría válida")));
});

test("prioriza estabilidad cuando los gastos superan los ingresos", () => {
  const result = analyzeAssessment({ ...validProtection, annualIncome: 36_000, monthlyExpenses: 4_300, monthlyBudget: 200 });

  assert.ok(result.metrics.disposable < 0);
  assert.ok(result.cautions.some((item) => item.includes("superan los ingresos")));
  assert.ok(result.cautions.some((item) => item.includes("presupuesto indicado")));
  assert.ok(result.nextSteps.some((item) => item.includes("precaución")));
});

test("la interfaz envía únicamente el perfil correspondiente a la necesidad seleccionada", () => {
  const profileKeys = {
    proteccion: "life",
    salud: "health",
    retiro: "annuity",
    gastos_finales: "finalExpense",
    cuidado_prolongado: "longTermCare",
  } as const;

  for (const [goal, expectedProfile] of Object.entries(profileKeys)) {
    const draft = emptyDraft();
    draft.goal = goal as AssessmentInput["goal"];
    draft.applicantReference = "Familia QA";
    draft.age = "45";
    draft.dependents = "1";
    draft.annualIncome = "80000";
    draft.monthlyExpenses = "4200";
    draft.debts = "10000";
    draft.mortgageBalance = "150000";
    draft.educationGoal = "25000";
    draft.existingLifeCoverage = "50000";
    draft.emergencySavings = "18000";
    draft.coverageYears = "20";
    draft.monthlyBudget = "300";
    draft.wantsReplace = true;

    const payload = draftToPayload(draft);
    assert.deepEqual(Object.keys(payload.profiles as Record<string, unknown>), [expectedProfile]);
    assert.equal(payload.wantsReplace, false);
    assert.equal(validateAssessment(normalizeAssessmentPayload(payload)).length, 0);
  }
});

test("el indicador de preparación coincide con los límites del contrato del servidor", () => {
  const draft = emptyDraft();
  draft.applicantReference = "Familia QA";
  draft.age = "45";
  draft.dependents = "1";
  draft.annualIncome = "80000";
  draft.monthlyExpenses = "4200";
  draft.debts = "10000";
  draft.mortgageBalance = "150000";
  draft.educationGoal = "25000";
  draft.existingLifeCoverage = "50000";
  draft.emergencySavings = "18000";
  draft.coverageYears = "20";
  draft.monthlyBudget = "300";
  draft.healthCoverage = "adecuada";
  draft.riskTolerance = "conservadora";
  draft.life.incomeReplacementPercent = 70;
  draft.life.permanentNeed = "no";

  const ready = computeReadiness(draft);
  assert.equal(ready.percentComplete, 100);
  assert.equal(ready.blockingErrors.length, 0);

  draft.annualIncome = "1000000001";
  assert.ok(computeReadiness(draft).blockingErrors.some((issue) => issue.id === "annualIncome"));

  draft.annualIncome = "80000";
  draft.applicantReference = "cliente@email.com";
  const sensitive = computeReadiness(draft);
  assert.equal(sensitive.blockingErrors.filter((issue) => issue.id === "applicantReference").length, 1);
  assert.ok(sensitive.blockingErrors.some((issue) => issue.message.includes("correo")));
});

test("el panorama clasifica resultados guardados sin crear recomendaciones nuevas", () => {
  const base = analyzeAssessment(validProtection);
  const ready = {
    status: "preliminar" as const,
    quality: { ...base.quality, directionReady: true },
    cautions: [],
    missing: [],
  };

  assert.equal(deriveDirectionBucket(ready), "lista");
  assert.equal(deriveDirectionBucket({ ...ready, cautions: ["Revisar liquidez"] }), "precaucion");
  assert.equal(deriveDirectionBucket({ ...ready, status: "informacion_pendiente", missing: ["Confirmar red"] }), "informacion");
});

test("el listado resume calidad y precauciones sin exponer el expediente completo", () => {
  const result = analyzeAssessment({ ...validProtection, emergencySavings: 1_000 });
  const summary = summarizeAssessmentResult(JSON.stringify(result));

  assert.deepEqual(summary, {
    qualityScore: result.quality.score,
    directionReady: result.quality.directionReady,
    cautionCount: result.cautions.length,
    missingCount: result.missing.length,
    priority: result.priority,
  });
  assert.equal(summarizeAssessmentResult("{contenido-invalido"), null);
  assert.equal(summarizeAssessmentResult(JSON.stringify({ priority: "Sin calidad" })), null);
});

test("la inteligencia de entrevista extrae solo hechos explícitos y nunca los aplica", () => {
  const analysis = analyzeNarrativeLocally(
    "Tiene 42 años, 2 hijos, ingreso anual de 72 mil, gastos mensuales de 4,300, hipoteca de 210 mil y busca seguro de vida.",
  );
  const values = Object.fromEntries(analysis.suggestions.map((item) => [item.field, item.value]));

  assert.equal(analysis.mode, "local_verificable");
  assert.equal(values.age, "42");
  assert.equal(values.dependents, "2");
  assert.equal(values.annualIncome, "72000");
  assert.equal(values.monthlyExpenses, "4300");
  assert.equal(values.mortgageBalance, "210000");
  assert.equal(values.goal, "proteccion");
  assert.ok(analysis.insights.some((item) => item.id === "family-continuity"));
});

test("la inteligencia bloquea datos sensibles y calcula la próxima mejor pregunta", () => {
  assert.ok(findSensitiveNarrativeIssues("Puede llamarlo al 305-555-1212 y escribir a cliente@correo.com").length >= 2);

  const draft = emptyDraft();
  const questions = buildAdaptiveQuestions(draft);
  assert.equal(questions[0].targetStep, 0);
  assert.ok(questions.some((item) => item.id === "annual-income"));

  draft.applicantReference = "Familia QA";
  draft.age = "45";
  draft.dependents = "1";
  draft.annualIncome = "36000";
  draft.monthlyExpenses = "3500";
  draft.monthlyBudget = "500";
  draft.emergencySavings = "1000";
  const cautions = buildAdaptiveQuestions(draft);
  assert.ok(cautions.some((item) => item.id === "budget-conflict"));
  assert.ok(cautions.some((item) => item.id === "liquidity-gap"));
});
