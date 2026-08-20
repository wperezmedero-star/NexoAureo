import { FACT_FINDER_VERSION } from "./fact-finder.ts";
import type { AssessmentInput } from "./fact-finder.ts";

export { FACT_FINDER_VERSION, normalizeAssessmentPayload, validateAssessment } from "./fact-finder.ts";
export type { AssessmentInput, FactFinderProfiles } from "./fact-finder.ts";

export const ENGINE_VERSION = "NA-2026.08.19-v3";

function addUnique(target: string[], ...items: string[]) {
  for (const item of items) if (!target.includes(item)) target.push(item);
}

export function analyzeAssessment(input: AssessmentInput) {
  const monthlyIncome = input.annualIncome / 12;
  const disposable = monthlyIncome - input.monthlyExpenses;
  const emergencyMonths = input.monthlyExpenses > 0 ? input.emergencySavings / input.monthlyExpenses : 0;
  const lifeProfile = input.profiles?.life;
  const incomeReplacementPercentApplied = lifeProfile?.incomeReplacementPercent ?? 100;
  const incomeReplacement = input.annualIncome * input.coverageYears * (incomeReplacementPercentApplied / 100);
  const grossProtectionNeed = input.debts + input.mortgageBalance + input.educationGoal + incomeReplacement;
  const coverageNeed = Math.max(0, grossProtectionNeed - input.existingLifeCoverage);
  const finalExpenseTarget = input.profiles?.finalExpense?.targetAmount;
  const finalExpenseReserved = input.profiles?.finalExpense?.reservedResources;
  const finalExpenseGap = finalExpenseTarget === null || finalExpenseTarget === undefined || finalExpenseReserved === null || finalExpenseReserved === undefined
    ? null
    : Math.max(0, finalExpenseTarget - finalExpenseReserved);
  const missing: string[] = [];
  const cautions: string[] = [];
  const alternatives: string[] = [];
  const rationale: string[] = [];
  const assumptions: string[] = [
    "Los valores provienen de la información declarada y todavía no han sido verificados con documentos.",
    "La dirección no considera productos, precios, suscripción ni ilustraciones de una aseguradora.",
  ];
  const sourceIds = ["SAFE-001", "SAFE-002", "PRIV-001", "APPT-001"];
  let direction = "Completar el análisis antes de comparar soluciones.";
  let priority = "Completar información";

  rationale.push(
    `El flujo mensual disponible se calcula restando los gastos declarados al ingreso mensual: ${disposable.toFixed(2)}.`,
    `El fondo de emergencia declarado equivale aproximadamente a ${emergencyMonths.toFixed(1)} meses de gastos.`,
  );

  if (disposable < input.monthlyBudget) {
    cautions.push("El presupuesto indicado supera el flujo mensual disponible; revisa gastos y sostenibilidad antes de asumir una prima.");
  }
  if (disposable < 0) {
    cautions.push("Los gastos declarados superan los ingresos; la prioridad inmediata es estabilizar el flujo antes de asumir un compromiso nuevo.");
  }
  if (emergencyMonths < 3) {
    cautions.push(`El fondo de emergencia cubre aproximadamente ${emergencyMonths.toFixed(1)} meses; conviene fortalecer liquidez y evitar una prima difícil de mantener.`);
  }
  if (input.existingPolicy && input.wantsReplace) {
    cautions.push("No cancelar ni reemplazar la póliza vigente hasta comparar garantías, costos, valores, nueva suscripción y confirmación de vigencia.");
    if (lifeProfile?.existingPolicyDocumentsReviewed !== "confirmado") {
      addUnique(missing, "Documentación completa de la póliza vigente y formulario de comparación o reemplazo aplicable");
    }
  }
  if (input.healthCoverage === "ninguna" || input.healthCoverage === "brechas") {
    cautions.push("Existe una necesidad de salud que debe evaluarse por costo total, red de proveedores y medicamentos.");
  }

  if (input.goal === "proteccion") {
    sourceIds.push("LIFE-001", "LIFE-002", "LIFE-003");
    priority = "Protección de ingresos y obligaciones familiares";
    direction = lifeProfile?.permanentNeed === "si"
      ? "Comparar una cobertura temporal para las obligaciones con plazo y una alternativa permanente para la necesidad vitalicia declarada, verificando que ambas sean sostenibles."
      : input.coverageYears <= 30
      ? "Comparar primero una cobertura de vida temporal por el período de necesidad, junto con una alternativa permanente solo si existe una necesidad vitalicia y la prima es sostenible."
      : "Comparar alternativas permanentes y combinadas, verificando garantías, elementos no garantizados y capacidad de sostener la prima a largo plazo.";
    alternatives.push(
      "Cobertura temporal ajustada al período de hipoteca, dependencia e ingresos.",
      "Cobertura permanente para una necesidad vitalicia, sujeta a presupuesto e ilustración aprobada.",
    );
    rationale.push(`La necesidad ilustrativa integra obligaciones, hipoteca, educación, ${incomeReplacementPercentApplied}% del ingreso por el horizonte declarado y cobertura vigente.`);
    if (lifeProfile?.incomeReplacementPercent === null || lifeProfile?.incomeReplacementPercent === undefined) {
      addUnique(missing, "Porcentaje del ingreso que la familia necesita reemplazar");
      assumptions.push("Mientras se confirma el porcentaje necesario, el cálculo ilustrativo utiliza el 100% del ingreso anual durante los años indicados.");
    } else {
      assumptions.push(`El cálculo utiliza el ${lifeProfile.incomeReplacementPercent}% de reemplazo de ingreso declarado por la familia.`);
    }
    if (!lifeProfile || lifeProfile.permanentNeed === "pendiente") addUnique(missing, "Confirmación de si existe una necesidad de cobertura vitalicia");
    if (input.existingPolicy && lifeProfile?.existingPolicyDocumentsReviewed !== "confirmado") {
      addUnique(missing, "Revisión de la documentación de la póliza de vida vigente");
    }
  }

  if (input.goal === "gastos_finales") {
    sourceIds.push("LIFE-001", "LIFE-003");
    priority = "Gastos finales sin comprometer el presupuesto";
    direction = "Comparar cobertura permanente de monto moderado y alternativas de ahorro, validando salud, prima vitalicia, período de espera y beneficio disponible desde el inicio.";
    alternatives.push(
      "Seguro permanente orientado a gastos finales.",
      "Ahorro reservado si la cobertura disponible contiene esperas o resulta poco sostenible.",
    );
    if (finalExpenseTarget === null || finalExpenseTarget === undefined) addUnique(missing, "Monto objetivo de gastos finales");
    if (finalExpenseReserved === null || finalExpenseReserved === undefined) addUnique(missing, "Recursos ya reservados para gastos finales");
    if (finalExpenseGap !== null) rationale.push(`La brecha declarada para gastos finales es ${finalExpenseGap.toFixed(2)} antes de evaluar cualquier producto.`);
  }

  if (input.goal === "salud") {
    const healthProfile = input.profiles?.health;
    sourceIds.push("HEALTH-001", "HEALTH-002");
    priority = "Acceso médico y control del costo total";
    direction = "Comparar planes por costo anual estimado, deducible, máximo de bolsillo, red de médicos y cobertura de medicamentos; la prima por sí sola no decide la mejor opción.";
    alternatives.push(
      "Plan con red más limitada y menor costo total esperado.",
      "Plan con red más amplia si los médicos, hospitales o medicamentos son prioritarios.",
    );
    if (input.healthCoverage === "desconocida") addUnique(missing, "Confirmación de la cobertura de salud actual y su fecha de terminación");
    if (!healthProfile || healthProfile.providersReviewed === "pendiente") addUnique(missing, "Revisión de médicos y hospitales indispensables");
    if (!healthProfile || healthProfile.medicationsReviewed === "pendiente") addUnique(missing, "Revisión de medicamentos y farmacias preferidas");
    if (!healthProfile || healthProfile.expectedUse === "pendiente") addUnique(missing, "Uso médico esperado para el próximo período");
    if (!healthProfile || healthProfile.deductibleCapacity === null) addUnique(missing, "Capacidad familiar para deducible y máximo de bolsillo");
    rationale.push("La dirección prioriza el costo total esperado, la red y los medicamentos, no solamente la prima mensual.");
  }

  if (input.goal === "retiro") {
    const annuityProfile = input.profiles?.annuity;
    const pendingBeforeAnnuityProfile = missing.length;
    sourceIds.push("ANN-001", "ANN-002");
    priority = emergencyMonths < 3 || input.liquidityNeed === "alta" ? "Liquidez antes de inmovilizar fondos" : "Ingreso de retiro y preservación de liquidez";
    if (!annuityProfile || annuityProfile.financialExperience === "pendiente") addUnique(missing, "Experiencia financiera");
    if (!annuityProfile || annuityProfile.financialObjective === "pendiente") addUnique(missing, "Objetivo financiero específico");
    if (!annuityProfile || annuityProfile.intendedUse === "pendiente") addUnique(missing, "Uso previsto de la anualidad");
    if (!annuityProfile || annuityProfile.timeHorizonYears === null) addUnique(missing, "Horizonte financiero de la anualidad");
    if (!annuityProfile || annuityProfile.existingProductsReviewed === "pendiente") addUnique(missing, "Activos y productos financieros existentes");
    if (!annuityProfile || annuityProfile.liquidNetWorth === null) addUnique(missing, "Patrimonio líquido");
    if (!annuityProfile || annuityProfile.fundingSource === "pendiente") addUnique(missing, "Fuente exacta de los fondos");
    if (!annuityProfile || annuityProfile.taxStatus === "pendiente") addUnique(missing, "Situación fiscal");
    if (input.riskTolerance === "desconocida") addUnique(missing, "Tolerancia al riesgo y a elementos no garantizados");
    direction = missing.length === pendingBeforeAnnuityProfile
      ? "El perfil mínimo de idoneidad está completo, pero no debe evaluarse una anualidad específica hasta contar con nombramiento, capacitación, formularios y documentación oficial del producto."
      : "No recomendar una anualidad específica todavía. Primero completar los 14 datos de idoneidad exigidos en Florida y comparar liquidez, rescates, garantías, costos y objetivos.";
    rationale.push("Florida exige un perfil del consumidor completo y una razón documentada antes de recomendar una anualidad.");
  }

  if (input.goal === "cuidado_prolongado") {
    const longTermCare = input.profiles?.longTermCare;
    sourceIds.push("LTC-001");
    priority = "Financiar una posible necesidad de cuidado prolongado";
    direction = "Evaluar preferencia de cuidado, duración, recursos familiares y presupuesto; comparar seguro de cuidado prolongado y estrategias de autofinanciación sin asumir que Medicare cubrirá cuidado custodial.";
    if (!longTermCare || longTermCare.carePreference === "pendiente") addUnique(missing, "Preferencia de lugar de cuidado");
    if (!longTermCare || longTermCare.familySupportReviewed === "pendiente") addUnique(missing, "Revisión del apoyo familiar disponible");
    if (!longTermCare || longTermCare.functionalHealthReviewed === "pendiente") addUnique(missing, "Revisión funcional y de salud pertinente, sin guardar detalles clínicos");
    if (!longTermCare || longTermCare.fundingYears === null) addUnique(missing, "Período que la familia desea financiar para cuidado");
    rationale.push("La dirección reconoce que Medicare y la mayoría de los seguros médicos no cubren la mayor parte del cuidado custodial prolongado.");
  }

  const score = Math.max(25, 100 - (missing.length * 9));
  const confidence = missing.length === 0 ? "alta" : score >= 70 ? "moderada" : "limitada";
  const level = score >= 85 ? "sólida" : score >= 65 ? "parcial" : "insuficiente";
  const nextSteps = missing.map((item) => `Completar: ${item}.`);
  if (cautions.length) nextSteps.push("Revisar con la familia cada precaución y documentar cómo se resolverá.");
  nextSteps.push(
    "Confirmar un nombramiento activo antes de solicitar, cotizar o recomendar cualquier producto de seguro.",
    "Cargar documentación oficial, guías de suscripción y formularios aprobados antes de comparar productos específicos.",
  );

  return {
    engineVersion: ENGINE_VERSION,
    factFinderVersion: FACT_FINDER_VERSION,
    status: missing.length ? "informacion_pendiente" : "preliminar",
    confidence,
    priority,
    direction,
    alternatives,
    cautions,
    missing,
    rationale,
    assumptions,
    nextSteps,
    quality: {
      score,
      level,
      pendingItems: missing.length,
      cautionItems: cautions.length,
      directionReady: score >= 65,
    },
    metrics: {
      monthlyIncome,
      disposable,
      emergencyMonths,
      illustrativeCoverageNeed: coverageNeed,
      coverageBreakdown: {
        debts: input.debts,
        mortgageBalance: input.mortgageBalance,
        educationGoal: input.educationGoal,
        incomeReplacement,
        incomeReplacementPercentApplied,
        grossProtectionNeed,
        existingLifeCoverage: input.existingLifeCoverage,
      },
      finalExpenseGap,
    },
    decisionGate: {
      activityMode: "educativo_interno",
      licensedReviewRequired: true,
      appointmentStatus: "pendiente",
      productRecommendationAllowed: false,
      blockedReasons: [
        "Nombramiento con aseguradora pendiente.",
        "No se ha incorporado documentación oficial vigente de productos ni guías de suscripción.",
        ...(missing.length ? ["La entrevista contiene información pendiente."] : []),
      ],
    },
    sourceIds: [...new Set(sourceIds)],
    requiresLicensedReview: true,
    productRecommendationAllowed: false,
    statement: "Dirección educativa basada en información declarada y reglas verificadas. Con el nombramiento pendiente, no constituye solicitud, cotización, aprobación, garantía de cobertura ni recomendación de un producto.",
  };
}
