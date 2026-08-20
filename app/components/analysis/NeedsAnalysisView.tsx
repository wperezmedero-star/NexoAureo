"use client";

import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ConversationSummary } from "./ConversationSummary";
import { DirectionsCompare } from "./DirectionsCompare";
import { InterviewCopilot } from "./InterviewCopilot";
import { ProgressSteps, WIZARD_STEPS } from "./flow-parts";
import {
  Badge,
  ChipMultiSelect,
  CheckboxField,
  ConnectionBanner,
  EmptyState,
  ErrorState,
  Field,
  FormSection,
  MoneyField,
  NullableNumberField,
  NumberField,
  ReadinessMeter,
  SelectField,
  SkeletonRows,
  TextField,
} from "./primitives";
import { ResultView } from "./ResultView";
import { ScenarioLab } from "./ScenarioLab";
import {
  ANNUITY_USE_OPTIONS,
  CARE_PREFERENCE_OPTIONS,
  FINANCIAL_EXPERIENCE_OPTIONS,
  FINANCIAL_OBJECTIVE_OPTIONS,
  FUNDING_SOURCE_OPTIONS,
  GOAL_LABELS,
  GOAL_OPTIONS,
  HEALTH_COVERAGE_OPTIONS,
  HEALTH_USE_OPTIONS,
  LIQUIDITY_OPTIONS,
  PERMANENT_NEED_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  REVIEW_STATE_OPTIONS,
  RISK_OPTIONS,
  STATUS_META,
  TAX_STATUS_OPTIONS,
  computeReadiness,
  coreSummaryLines,
  coverageSummaryLines,
  dateOnly,
  draftToPayload,
  economySummaryLines,
  emptyDraft,
  isWholeInRange,
  parseAmount,
  profileSummaryLines,
  referenceLooksSensitive,
} from "./copy";
import { useOnlineStatus } from "./use-online-status";
import type {
  AnnuityProfile,
  AssessmentDetail,
  AssessmentListItem,
  CreateAssessmentResponse,
  DraftAssessment,
  FinalExpenseProfile,
  HealthProfile,
  LifeProfile,
  LongTermCareProfile,
  ReadinessSummary,
} from "./types";

/* Función pura, fuera del componente: la reutilizan tanto el efecto de
   carga automática como el botón "Reintentar", y no toca estado por sí
   misma, así que es segura de llamar desde un efecto. */
async function fetchAssessmentList(): Promise<AssessmentListItem[]> {
  const request = await fetch("/api/assessments");
  const body = await request.json();
  if (!request.ok) throw new Error(body.error || "No fue posible cargar el historial.");
  return body.assessments as AssessmentListItem[];
}

/* ------------------------------------------------------------------------ */
/* Validación de cada etapa (independiente del motor: solo guía al agente   */
/* antes de enviar; la validación autoritativa siempre ocurre en el API).   */
/* ------------------------------------------------------------------------ */

function step0Valid(draft: DraftAssessment) {
  const ref = draft.applicantReference.trim();
  return (
    ref.length > 0 &&
    ref.length <= 40 &&
    !referenceLooksSensitive(ref) &&
    isWholeInRange(draft.age, 18, 100) &&
    isWholeInRange(draft.dependents, 0, 12)
  );
}

function step1Valid(draft: DraftAssessment) {
  const nonNegative = [draft.annualIncome, draft.debts, draft.mortgageBalance, draft.educationGoal, draft.existingLifeCoverage, draft.emergencySavings, draft.monthlyBudget];
  const nonNegativeOk = nonNegative.every((value) => Number.isFinite(parseAmount(value)) && parseAmount(value) >= 0 && parseAmount(value) <= 1_000_000_000);
  const expensesOk = Number.isFinite(parseAmount(draft.monthlyExpenses)) && parseAmount(draft.monthlyExpenses) > 0 && parseAmount(draft.monthlyExpenses) <= 1_000_000_000;
  return nonNegativeOk && expensesOk && isWholeInRange(draft.coverageYears, 1, 50);
}

function wizardValidUpTo(draft: DraftAssessment, index: number) {
  if (index >= 0 && !step0Valid(draft)) return false;
  if (index >= 1 && !step1Valid(draft)) return false;
  return true;
}

export default function NeedsAnalysisView() {
  const online = useOnlineStatus();
  const [tab, setTab] = useState<"nueva" | "historial" | "comparar">("nueva");
  const [clientMode, setClientMode] = useState(false);

  const [draft, setDraft] = useState<DraftAssessment>(() => emptyDraft());
  const readiness = computeReadiness(draft);
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(0);
  const [stage, setStage] = useState<"wizard" | "result">("wizard");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitDetails, setSubmitDetails] = useState<string[]>([]);
  const [response, setResponse] = useState<CreateAssessmentResponse | null>(null);

  const [historyItems, setHistoryItems] = useState<AssessmentListItem[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const historyLoading = tab === "historial" && historyItems === null && !historyError;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  /** Botón "Reintentar": se dispara desde un clic, así que puede tocar
      estado de inmediato sin infringir las reglas de efectos. */
  const loadHistory = async () => {
    setHistoryError("");
    setHistoryItems(null);
    try {
      setHistoryItems(await fetchAssessmentList());
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "No fue posible cargar el historial.");
    }
  };

  /* Carga automática al entrar a la pestaña de historial. El cuerpo del
     efecto no toca estado de forma síncrona: todo ocurre dentro de los
     callbacks de la promesa, después de que el navegador ya cedió el
     control. */
  useEffect(() => {
    if (tab !== "historial" || historyItems !== null || historyError) return;
    let active = true;
    fetchAssessmentList()
      .then((items) => {
        if (active) setHistoryItems(items);
      })
      .catch((cause) => {
        if (active) setHistoryError(cause instanceof Error ? cause.message : "No fue posible cargar el historial.");
      });
    return () => {
      active = false;
    };
  }, [tab, historyItems, historyError]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const request = await fetch(`/api/assessments?id=${encodeURIComponent(id)}`);
      const body = await request.json();
      if (!request.ok) throw new Error(body.error || "No fue posible cargar el análisis.");
      setDetail(body as AssessmentDetail);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : "No fue posible cargar el análisis.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
  };

  const openFromCompare = (id: string) => {
    setTab("historial");
    void openDetail(id);
  };

  const resetWizard = () => {
    setDraft(emptyDraft());
    setStepIndex(0);
    setFurthestIndex(0);
    setStage("wizard");
    setResponse(null);
    setSubmitError("");
    setSubmitDetails([]);
  };

  const adoptScenario = (nextDraft: DraftAssessment) => {
    setDraft(nextDraft);
    setStepIndex(WIZARD_STEPS.length - 1);
    setFurthestIndex(WIZARD_STEPS.length - 1);
    setStage("wizard");
    setResponse(null);
    setSubmitError("");
    setSubmitDetails([]);
  };

  const goNext = () => {
    if (!wizardValidUpTo(draft, stepIndex)) return;
    const next = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    setStepIndex(next);
    setFurthestIndex((current) => Math.max(current, next));
  };

  const goBack = () => setStepIndex((current) => Math.max(0, current - 1));
  const jumpTo = (index: number) => index <= furthestIndex && setStepIndex(index);
  const revealStep = (index: number) => {
    setStepIndex(index);
    setFurthestIndex((current) => Math.max(current, index));
  };

  const updateLife = (patch: Partial<LifeProfile>) => setDraft((current) => ({ ...current, life: { ...current.life, ...patch } }));
  const updateHealth = (patch: Partial<HealthProfile>) => setDraft((current) => ({ ...current, health: { ...current.health, ...patch } }));
  const updateAnnuity = (patch: Partial<AnnuityProfile>) => setDraft((current) => ({ ...current, annuity: { ...current.annuity, ...patch } }));
  const updateFinalExpense = (patch: Partial<FinalExpenseProfile>) => setDraft((current) => ({ ...current, finalExpense: { ...current.finalExpense, ...patch } }));
  const updateLongTermCare = (patch: Partial<LongTermCareProfile>) => setDraft((current) => ({ ...current, longTermCare: { ...current.longTermCare, ...patch } }));

  const toggleExistingPolicy = (checked: boolean) => {
    setDraft((current) => ({
      ...current,
      existingPolicy: checked,
      wantsReplace: checked ? current.wantsReplace : false,
      life: checked
        ? { ...current.life, existingPolicyDocumentsReviewed: current.life.existingPolicyDocumentsReviewed === "no_aplica" ? "pendiente" : current.life.existingPolicyDocumentsReviewed }
        : { ...current.life, existingPolicyDocumentsReviewed: "no_aplica" },
    }));
  };

  const submit = async () => {
    if (!online) {
      setSubmitError("No hay conexión. Conserva la entrevista abierta y vuelve a intentar cuando se restablezca.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitDetails([]);
    try {
      const request = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      const body = await request.json();
      if (!request.ok) {
        setSubmitDetails(Array.isArray(body.details) ? body.details : []);
        throw new Error(body.error || "No fue posible completar el análisis.");
      }
      setResponse(body as CreateAssessmentResponse);
      setStage("result");
      setHistoryItems(null);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "No fue posible completar el análisis.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nx-interview">
      {!online && (
        <ConnectionBanner message="Estás sin conexión. La entrevista permanece en esta pantalla, pero no se enviará hasta recuperar la conexión." />
      )}

      <div className="nx-tabbar" role="tablist" aria-label="Entrevista y dirección">
        <button type="button" role="tab" id="nx-tab-nueva" aria-controls="nx-panel-nueva" aria-selected={tab === "nueva"} className={tab === "nueva" ? "active" : ""} onClick={() => setTab("nueva")}>
          Nueva entrevista
        </button>
        <button type="button" role="tab" id="nx-tab-historial" aria-controls="nx-panel-historial" aria-selected={tab === "historial"} className={tab === "historial" ? "active" : ""} onClick={() => setTab("historial")}>
          Historial privado
        </button>
        <button type="button" role="tab" id="nx-tab-comparar" aria-controls="nx-panel-comparar" aria-selected={tab === "comparar"} className={tab === "comparar" ? "active" : ""} onClick={() => setTab("comparar")}>
          Comparar direcciones
        </button>
      </div>

      {tab === "nueva" && (
        <section id="nx-panel-nueva" role="tabpanel" aria-labelledby="nx-tab-nueva">
          {stage === "wizard" && (
            <div className="nx-workspace">
              <WizardPanel
                draft={draft}
                setDraft={setDraft}
                stepIndex={stepIndex}
                furthestIndex={furthestIndex}
                onJump={jumpTo}
                onNext={goNext}
                onBack={goBack}
                onSubmit={submit}
                submitting={submitting}
                submitError={submitError}
                submitDetails={submitDetails}
                readiness={readiness}
                online={online}
                updateLife={updateLife}
                updateHealth={updateHealth}
                updateAnnuity={updateAnnuity}
                updateFinalExpense={updateFinalExpense}
                updateLongTermCare={updateLongTermCare}
                toggleExistingPolicy={toggleExistingPolicy}
              />
              <aside className="nx-intelligence-stack" aria-label="Asistencia inteligente de la entrevista">
                <InterviewCopilot draft={draft} setDraft={setDraft} onJump={revealStep} online={online} />
                <ConversationSummary draft={draft} clientMode={clientMode} onToggleClientMode={() => setClientMode((current) => !current)} />
              </aside>
            </div>
          )}

          {stage === "result" && response && (
            <div className="nx-result-screen">
              <ResultView
                applicantReference={draft.applicantReference}
                goal={draft.goal}
                result={response.result}
                evidence={response.evidence}
                rules={response.rules}
              />
              <ScenarioLab draft={draft} baseline={response.result} online={online} onAdopt={adoptScenario} />
              <div className="nx-result-actions">
                <button type="button" className="nx-btn nx-btn--primary" onClick={resetWizard}>
                  Nueva entrevista
                </button>
                <button
                  type="button"
                  className="nx-btn nx-btn--ghost"
                  onClick={() => {
                    setTab("historial");
                    setHistoryItems(null);
                  }}
                >
                  Ver historial →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "historial" && (
        <section id="nx-panel-historial" role="tabpanel" aria-labelledby="nx-tab-historial">
          {!selectedId && <HistoryList items={historyItems} loading={historyLoading} error={historyError} onRetry={loadHistory} onOpen={openDetail} onStart={() => { resetWizard(); setTab("nueva"); }} />}
          {selectedId && <DetailPanel detail={detail} loading={detailLoading} error={detailError} onBack={closeDetail} onRetry={() => openDetail(selectedId)} />}
        </section>
      )}

      {tab === "comparar" && (
        <section id="nx-panel-comparar" role="tabpanel" aria-labelledby="nx-tab-comparar">
          <DirectionsCompare online={online} onOpenDetail={openFromCompare} />
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Asistente por etapas                                                     */
/* ------------------------------------------------------------------------ */

function WizardPanel({
  draft,
  setDraft,
  stepIndex,
  furthestIndex,
  onJump,
  onNext,
  onBack,
  onSubmit,
  submitting,
  submitError,
  submitDetails,
  readiness,
  online,
  updateLife,
  updateHealth,
  updateAnnuity,
  updateFinalExpense,
  updateLongTermCare,
  toggleExistingPolicy,
}: {
  draft: DraftAssessment;
  setDraft: Dispatch<SetStateAction<DraftAssessment>>;
  stepIndex: number;
  furthestIndex: number;
  onJump: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string;
  submitDetails: string[];
  readiness: ReadinessSummary;
  online: boolean;
  updateLife: (patch: Partial<LifeProfile>) => void;
  updateHealth: (patch: Partial<HealthProfile>) => void;
  updateAnnuity: (patch: Partial<AnnuityProfile>) => void;
  updateFinalExpense: (patch: Partial<FinalExpenseProfile>) => void;
  updateLongTermCare: (patch: Partial<LongTermCareProfile>) => void;
  toggleExistingPolicy: (checked: boolean) => void;
}) {
  const set = <Key extends keyof DraftAssessment>(key: Key, value: DraftAssessment[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const stepId = WIZARD_STEPS[stepIndex];
  const canAdvance = stepId === "solicitante" ? step0Valid(draft) : stepId === "economia" ? step1Valid(draft) : true;
  const blockedAtSummary = stepId === "resumen" && readiness.blockingErrors.length > 0;

  return (
    <div className="nx-card nx-wizard">
      <div className="nx-wizard__intro">
        <div>
          <span className="nx-eyebrow-gold">ENTREVISTA PROTEGIDA</span>
          <h2>Conocer antes de orientar</h2>
          <p>Usa una referencia anónima. No escribas dirección, teléfono, correo, SSN, cuenta bancaria ni historia médica detallada.</p>
        </div>
        <Badge tone="info">Florida</Badge>
      </div>

      <ReadinessMeter summary={readiness} />
      <ProgressSteps currentIndex={stepIndex} furthestIndex={furthestIndex} onJump={onJump} />

      <div key={stepId} className="nx-step">
        {stepId === "solicitante" && (
          <FormSection eyebrow="ETAPA 1" title="Solicitante y necesidad principal" hint="Usa una referencia que no identifique a la persona, por ejemplo «Familia R.».">
            <TextField label="Referencia anónima" value={draft.applicantReference} onChange={(value) => set("applicantReference", value)} placeholder="Ej. Familia R." wide invalid={draft.applicantReference.length > 0 && referenceLooksSensitive(draft.applicantReference)} />
            <NumberField label="Edad" value={draft.age} onChange={(value) => set("age", value)} min={18} max={100} />
            <NumberField label="Dependientes" value={draft.dependents} onChange={(value) => set("dependents", value)} min={0} max={12} />
            {draft.applicantReference.length > 0 && referenceLooksSensitive(draft.applicantReference) && (
              <p className="nx-field-warning">No escribas correo, teléfono, SSN ni dirección en la referencia.</p>
            )}
            <div className="nx-goal-grid nx-field--wide">
              {GOAL_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`nx-goal-card${draft.goal === option.value ? " nx-goal-card--active" : ""}`}
                  aria-pressed={draft.goal === option.value}
                  onClick={() => set("goal", option.value)}
                >
                  <span aria-hidden="true">{option.glyph}</span>
                  <strong>{option.label}</strong>
                  <small>{option.text}</small>
                </button>
              ))}
            </div>
          </FormSection>
        )}

        {stepId === "economia" && (
          <>
            <FormSection eyebrow="ETAPA 2" title="Ingresos, gastos y presupuesto">
              <MoneyField label="Ingreso anual" value={draft.annualIncome} onChange={(value) => set("annualIncome", value)} />
              <MoneyField label="Gastos mensuales" value={draft.monthlyExpenses} onChange={(value) => set("monthlyExpenses", value)} />
              <MoneyField label="Presupuesto mensual disponible" value={draft.monthlyBudget} onChange={(value) => set("monthlyBudget", value)} hint="Lo que la familia podría destinar, no una prima ya cotizada." />
            </FormSection>
            <FormSection title="Obligaciones y reservas">
              <MoneyField label="Deudas" value={draft.debts} onChange={(value) => set("debts", value)} />
              <MoneyField label="Saldo hipotecario" value={draft.mortgageBalance} onChange={(value) => set("mortgageBalance", value)} />
              <MoneyField label="Meta educativa" value={draft.educationGoal} onChange={(value) => set("educationGoal", value)} />
              <MoneyField label="Seguro de vida vigente" value={draft.existingLifeCoverage} onChange={(value) => set("existingLifeCoverage", value)} />
              <MoneyField label="Fondo de emergencia" value={draft.emergencySavings} onChange={(value) => set("emergencySavings", value)} />
              <NumberField label="Años de necesidad" value={draft.coverageYears} onChange={(value) => set("coverageYears", value)} min={1} max={50} suffix="años" />
            </FormSection>
          </>
        )}

        {stepId === "cobertura" && (
          <FormSection eyebrow="ETAPA 3" title="Cobertura, liquidez y preferencias">
            <SelectField label="Cobertura de salud actual" value={draft.healthCoverage} onChange={(value) => set("healthCoverage", value)} options={HEALTH_COVERAGE_OPTIONS} />
            <SelectField label="Necesidad de liquidez" value={draft.liquidityNeed} onChange={(value) => set("liquidityNeed", value)} options={LIQUIDITY_OPTIONS} />
            <SelectField label="Tolerancia al riesgo" value={draft.riskTolerance} onChange={(value) => set("riskTolerance", value)} options={RISK_OPTIONS} />
            <div className="nx-field--wide nx-check-row">
              <CheckboxField label="Tiene una póliza vigente" checked={draft.existingPolicy} onChange={toggleExistingPolicy} />
              <CheckboxField label="Considera reemplazarla" checked={draft.wantsReplace} onChange={(checked) => set("wantsReplace", checked)} disabled={!draft.existingPolicy} hint={!draft.existingPolicy ? "Disponible solo si hay una póliza vigente." : undefined} />
            </div>
          </FormSection>
        )}

        {stepId === "perfil" && (
          <ProfileStep draft={draft} updateLife={updateLife} updateHealth={updateHealth} updateAnnuity={updateAnnuity} updateFinalExpense={updateFinalExpense} updateLongTermCare={updateLongTermCare} />
        )}

        {stepId === "resumen" && (
          <SummaryStep draft={draft} submitError={submitError} submitDetails={submitDetails} onJump={onJump} />
        )}
      </div>

      <div className="nx-wizard__nav">
        <button type="button" className="nx-btn nx-btn--ghost" onClick={onBack} disabled={stepIndex === 0}>
          ← Atrás
        </button>
        {stepId !== "resumen" ? (
          <button type="button" className="nx-btn nx-btn--primary" onClick={onNext} disabled={!canAdvance}>
            Continuar →
          </button>
        ) : (
          <button type="button" className="nx-btn nx-btn--primary" onClick={onSubmit} disabled={submitting || !online || blockedAtSummary}>
            {!online
              ? "Esperando conexión…"
              : blockedAtSummary
                ? "Completa los datos esenciales"
                : submitting
                  ? "Verificando reglas y guardando…"
                  : submitError
                    ? "Reintentar dirección fundamentada →"
                    : "Generar dirección fundamentada →"}
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileStep({
  draft,
  updateLife,
  updateHealth,
  updateAnnuity,
  updateFinalExpense,
  updateLongTermCare,
}: {
  draft: DraftAssessment;
  updateLife: (patch: Partial<LifeProfile>) => void;
  updateHealth: (patch: Partial<HealthProfile>) => void;
  updateAnnuity: (patch: Partial<AnnuityProfile>) => void;
  updateFinalExpense: (patch: Partial<FinalExpenseProfile>) => void;
  updateLongTermCare: (patch: Partial<LongTermCareProfile>) => void;
}) {
  const hint = "Nada de esto es obligatorio ahora: lo que dejes sin responder quedará marcado como información pendiente.";

  if (draft.goal === "proteccion") {
    return (
      <FormSection eyebrow="ETAPA 4" title="Perfil de protección de vida" hint={hint}>
        <NullableNumberField label="Porcentaje del ingreso a reemplazar" value={draft.life.incomeReplacementPercent} onChange={(value) => updateLife({ incomeReplacementPercent: value })} unit="percent" min={0} max={100} hint="Mientras falte, el cálculo ilustrativo usa 100%." />
        <SelectField label="¿Existe una necesidad de cobertura vitalicia?" value={draft.life.permanentNeed} onChange={(value) => updateLife({ permanentNeed: value })} options={PERMANENT_NEED_OPTIONS} />
        {draft.existingPolicy ? (
          <SelectField label="Revisión de la póliza vigente" value={draft.life.existingPolicyDocumentsReviewed} onChange={(value) => updateLife({ existingPolicyDocumentsReviewed: value })} options={REVIEW_STATE_OPTIONS} />
        ) : (
          <Field label="Revisión de la póliza vigente" hint="No aplica: no declaraste una póliza vigente en la etapa anterior." inputId="nx-policy-review-na">
            <input id="nx-policy-review-na" className="nx-input" value="No aplica" disabled />
          </Field>
        )}
      </FormSection>
    );
  }

  if (draft.goal === "salud") {
    return (
      <FormSection eyebrow="ETAPA 4" title="Perfil de salud" hint={hint}>
        <SelectField label="Revisión de médicos y hospitales indispensables" value={draft.health.providersReviewed} onChange={(value) => updateHealth({ providersReviewed: value })} options={REVIEW_STATE_OPTIONS} />
        <SelectField label="Revisión de medicamentos y farmacias" value={draft.health.medicationsReviewed} onChange={(value) => updateHealth({ medicationsReviewed: value })} options={REVIEW_STATE_OPTIONS} />
        <SelectField label="Uso médico esperado" value={draft.health.expectedUse} onChange={(value) => updateHealth({ expectedUse: value })} options={HEALTH_USE_OPTIONS} />
        <NullableNumberField label="Capacidad familiar para deducible" value={draft.health.deductibleCapacity} onChange={(value) => updateHealth({ deductibleCapacity: value })} unit="money" />
      </FormSection>
    );
  }

  if (draft.goal === "retiro") {
    return (
      <FormSection eyebrow="ETAPA 4" title="Perfil de retiro o anualidad" hint="Florida exige un perfil de idoneidad completo antes de recomendar una anualidad específica.">
        <SelectField label="Experiencia financiera" value={draft.annuity.financialExperience} onChange={(value) => updateAnnuity({ financialExperience: value })} options={FINANCIAL_EXPERIENCE_OPTIONS} />
        <SelectField label="Objetivo financiero" value={draft.annuity.financialObjective} onChange={(value) => updateAnnuity({ financialObjective: value })} options={FINANCIAL_OBJECTIVE_OPTIONS} />
        <SelectField label="Uso previsto de la anualidad" value={draft.annuity.intendedUse} onChange={(value) => updateAnnuity({ intendedUse: value })} options={ANNUITY_USE_OPTIONS} />
        <NullableNumberField label="Horizonte financiero" value={draft.annuity.timeHorizonYears} onChange={(value) => updateAnnuity({ timeHorizonYears: value })} unit="years" min={1} max={60} />
        <SelectField label="Revisión de activos y productos existentes" value={draft.annuity.existingProductsReviewed} onChange={(value) => updateAnnuity({ existingProductsReviewed: value })} options={REVIEW_STATE_OPTIONS} />
        <NullableNumberField label="Patrimonio líquido" value={draft.annuity.liquidNetWorth} onChange={(value) => updateAnnuity({ liquidNetWorth: value })} unit="money" />
        <SelectField label="Fuente de los fondos" value={draft.annuity.fundingSource} onChange={(value) => updateAnnuity({ fundingSource: value })} options={FUNDING_SOURCE_OPTIONS} />
        <SelectField label="Situación fiscal" value={draft.annuity.taxStatus} onChange={(value) => updateAnnuity({ taxStatus: value })} options={TAX_STATUS_OPTIONS} />
        <ChipMultiSelect label="Activos y productos financieros existentes" values={draft.annuity.existingProducts} onChange={(values) => updateAnnuity({ existingProducts: values })} options={PRODUCT_CATEGORY_OPTIONS} />
      </FormSection>
    );
  }

  if (draft.goal === "gastos_finales") {
    return (
      <FormSection eyebrow="ETAPA 4" title="Perfil de gastos finales" hint={hint}>
        <NullableNumberField label="Monto objetivo" value={draft.finalExpense.targetAmount} onChange={(value) => updateFinalExpense({ targetAmount: value })} unit="money" />
        <NullableNumberField label="Recursos ya reservados" value={draft.finalExpense.reservedResources} onChange={(value) => updateFinalExpense({ reservedResources: value })} unit="money" />
      </FormSection>
    );
  }

  return (
    <FormSection eyebrow="ETAPA 4" title="Perfil de cuidado prolongado" hint={hint}>
      <SelectField label="Preferencia de lugar de cuidado" value={draft.longTermCare.carePreference} onChange={(value) => updateLongTermCare({ carePreference: value })} options={CARE_PREFERENCE_OPTIONS} />
      <SelectField label="Revisión del apoyo familiar disponible" value={draft.longTermCare.familySupportReviewed} onChange={(value) => updateLongTermCare({ familySupportReviewed: value })} options={REVIEW_STATE_OPTIONS} />
      <SelectField label="Revisión funcional y de salud" value={draft.longTermCare.functionalHealthReviewed} onChange={(value) => updateLongTermCare({ functionalHealthReviewed: value })} options={REVIEW_STATE_OPTIONS} hint="Solo el estado de la revisión; no se guardan detalles clínicos." />
      <NullableNumberField label="Período que desea financiar" value={draft.longTermCare.fundingYears} onChange={(value) => updateLongTermCare({ fundingYears: value })} unit="years" min={0} max={20} />
    </FormSection>
  );
}

function SummaryStep({
  draft,
  submitError,
  submitDetails,
  onJump,
}: {
  draft: DraftAssessment;
  submitError: string;
  submitDetails: string[];
  onJump: (index: number) => void;
}) {
  return (
    <FormSection eyebrow="ETAPA 5" title="Resumen antes de generar la dirección" hint="Revisa la información. El motor validará todo nuevamente antes de guardar.">
      <div className="nx-summary nx-field--wide">
        <SummaryBlock title="Solicitante" onEdit={() => onJump(0)}>
          {coreSummaryLines(draft).map((line) => (
            <SummaryRow key={line.label} label={line.label} value={line.value} />
          ))}
        </SummaryBlock>
        <SummaryBlock title="Situación económica" onEdit={() => onJump(1)}>
          {economySummaryLines(draft).map((line) => (
            <SummaryRow key={line.label} label={line.label} value={line.value} />
          ))}
        </SummaryBlock>
        <SummaryBlock title="Cobertura y preferencias" onEdit={() => onJump(2)}>
          {coverageSummaryLines(draft).map((line) => (
            <SummaryRow key={line.label} label={line.label} value={line.value} />
          ))}
        </SummaryBlock>
        <SummaryBlock title={`Perfil · ${GOAL_LABELS[draft.goal]}`} onEdit={() => onJump(3)}>
          {profileSummaryLines(draft).map((line) => (
            <SummaryRow key={line.label} label={line.label} value={line.value} />
          ))}
        </SummaryBlock>
      </div>

      {(submitError || submitDetails.length > 0) && (
        <div className="nx-alert nx-alert--error nx-field--wide" role="alert">
          <strong>{submitError || "Revisa la información antes de continuar."}</strong>
          {submitDetails.length > 0 && (
            <ul>
              {submitDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FormSection>
  );
}

function SummaryBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="nx-summary__block">
      <header>
        <strong>{title}</strong>
        <button type="button" onClick={onEdit}>
          Editar
        </button>
      </header>
      <div>{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="nx-summary__row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Historial privado                                                        */
/* ------------------------------------------------------------------------ */

function HistoryList({
  items,
  loading,
  error,
  onRetry,
  onOpen,
  onStart,
}: {
  items: AssessmentListItem[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onStart: () => void;
}) {
  if (loading) {
    return (
      <div className="nx-card nx-card--pad">
        <SkeletonRows count={4} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="nx-card nx-card--pad">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <div className="nx-card nx-card--pad">
        <EmptyState
          icon="◇"
          title="Aún no has completado ninguna entrevista"
          text="Cuando generes una dirección fundamentada, aparecerá aquí con su evidencia y trazabilidad completas."
          action={
            <button type="button" className="nx-btn nx-btn--primary" onClick={onStart}>
              Comenzar una entrevista
            </button>
          }
        />
      </div>
    );
  }
  return (
    <div className="nx-card nx-history">
      {items.map((item) => {
        const meta = STATUS_META[item.status] ?? { label: item.status, tone: "info" as const };
        return (
          <button type="button" className="nx-history__row" key={item.id} onClick={() => onOpen(item.id)}>
            <div>
              <strong>{item.applicantReference || "Sin referencia"}</strong>
              <small>
                {GOAL_LABELS[item.goal] ?? item.goal} · {dateOnly.format(new Date(item.createdAt))}
              </small>
            </div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span aria-hidden="true">→</span>
          </button>
        );
      })}
    </div>
  );
}

function DetailPanel({
  detail,
  loading,
  error,
  onBack,
  onRetry,
}: {
  detail: AssessmentDetail | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="nx-detail">
      <button type="button" className="nx-btn nx-btn--ghost nx-detail__back" onClick={onBack}>
        ← Volver al historial
      </button>
      {loading && (
        <div className="nx-card nx-card--pad">
          <SkeletonRows count={5} />
        </div>
      )}
      {!loading && error && (
        <div className="nx-card nx-card--pad">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      )}
      {!loading && !error && detail?.assessment.result && (
        <ResultView
          applicantReference={detail.assessment.applicantReference}
          goal={detail.assessment.goal}
          createdAt={detail.assessment.createdAt}
          result={detail.assessment.result}
          evidence={detail.evidence}
          rules={detail.rules}
          auditTrail={detail.auditTrail}
        />
      )}
      {!loading && !error && detail && !detail.assessment.result && (
        <div className="nx-card nx-card--pad">
          <EmptyState icon="◇" title="Sin resultado guardado" text="Este registro no contiene un resultado del motor para mostrar." />
        </div>
      )}
    </div>
  );
}
