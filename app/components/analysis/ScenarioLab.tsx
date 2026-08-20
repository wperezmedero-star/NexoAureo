"use client";

import { useMemo, useState } from "react";
import { draftToPayload, money } from "./copy";
import type { DraftAssessment, EngineResult, ScenarioComparisonResponse } from "./types";

type ScenarioState = {
  emergencySavings: string;
  monthlyBudget: string;
  coverageYears: string;
  incomeReplacementPercent: string;
  finalExpenseTarget: string;
  finalExpenseReserved: string;
  deductibleCapacity: string;
  retirementHorizon: string;
  liquidNetWorth: string;
  careFundingYears: string;
};

function stateFromDraft(draft: DraftAssessment): ScenarioState {
  return {
    emergencySavings: draft.emergencySavings,
    monthlyBudget: draft.monthlyBudget,
    coverageYears: draft.coverageYears,
    incomeReplacementPercent: draft.life.incomeReplacementPercent === null ? "" : String(draft.life.incomeReplacementPercent),
    finalExpenseTarget: draft.finalExpense.targetAmount === null ? "" : String(draft.finalExpense.targetAmount),
    finalExpenseReserved: draft.finalExpense.reservedResources === null ? "" : String(draft.finalExpense.reservedResources),
    deductibleCapacity: draft.health.deductibleCapacity === null ? "" : String(draft.health.deductibleCapacity),
    retirementHorizon: draft.annuity.timeHorizonYears === null ? "" : String(draft.annuity.timeHorizonYears),
    liquidNetWorth: draft.annuity.liquidNetWorth === null ? "" : String(draft.annuity.liquidNetWorth),
    careFundingYears: draft.longTermCare.fundingYears === null ? "" : String(draft.longTermCare.fundingYears),
  };
}

function nullableNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftFromScenario(draft: DraftAssessment, scenario: ScenarioState): DraftAssessment {
  return {
    ...draft,
    emergencySavings: scenario.emergencySavings,
    monthlyBudget: scenario.monthlyBudget,
    coverageYears: scenario.coverageYears,
    life: { ...draft.life, incomeReplacementPercent: nullableNumber(scenario.incomeReplacementPercent) },
    health: { ...draft.health, deductibleCapacity: nullableNumber(scenario.deductibleCapacity) },
    annuity: {
      ...draft.annuity,
      timeHorizonYears: nullableNumber(scenario.retirementHorizon),
      liquidNetWorth: nullableNumber(scenario.liquidNetWorth),
    },
    finalExpense: {
      ...draft.finalExpense,
      targetAmount: nullableNumber(scenario.finalExpenseTarget),
      reservedResources: nullableNumber(scenario.finalExpenseReserved),
    },
    longTermCare: { ...draft.longTermCare, fundingYears: nullableNumber(scenario.careFundingYears) },
  };
}

function MetricDelta({ label, base, scenario, format = "number" }: { label: string; base: number; scenario: number; format?: "money" | "months" | "number" }) {
  const change = scenario - base;
  const render = (value: number) => format === "money" ? money.format(value) : format === "months" ? `${value.toFixed(1)} meses` : String(Math.round(value));
  return (
    <div className="nx-scenario__metric">
      <small>{label}</small>
      <div><span>Actual</span><b>{render(base)}</b></div>
      <div><span>Escenario</span><strong>{render(scenario)}</strong></div>
      <em className={change > 0 ? "positive" : change < 0 ? "negative" : undefined}>{change === 0 ? "Sin cambio" : `${change > 0 ? "+" : ""}${render(change)}`}</em>
    </div>
  );
}

export function ScenarioLab({
  draft,
  baseline,
  online,
  onAdopt,
}: {
  draft: DraftAssessment;
  baseline: EngineResult;
  online: boolean;
  onAdopt: (draft: DraftAssessment) => void;
}) {
  const initial = useMemo(() => stateFromDraft(draft), [draft]);
  const [scenario, setScenario] = useState<ScenarioState>(initial);
  const [comparison, setComparison] = useState<ScenarioComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const scenarioDraft = draftFromScenario(draft, scenario);
  const update = (key: keyof ScenarioState, value: string) => {
    setScenario((current) => ({ ...current, [key]: value }));
    setComparison(null);
    setError("");
    setDetails([]);
  };

  const compare = async () => {
    if (!online) {
      setError("Recupera la conexión para ejecutar la comparación protegida.");
      return;
    }
    setLoading(true);
    setError("");
    setDetails([]);
    try {
      const request = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ base: draftToPayload(draft), scenario: draftToPayload(scenarioDraft) }),
      });
      const body = await request.json();
      if (!request.ok) {
        setDetails(Array.isArray(body.details) ? body.details : []);
        throw new Error(body.error || "No fue posible comparar el escenario.");
      }
      setComparison(body as ScenarioComparisonResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible comparar el escenario.");
    } finally {
      setLoading(false);
    }
  };

  const scenarioResult = comparison?.scenario;

  return (
    <section className="nx-scenario" aria-labelledby="nx-scenario-title">
      <header className="nx-scenario__head">
        <div>
          <span>LABORATORIO DE ESCENARIOS</span>
          <h2 id="nx-scenario-title">Comprueba el efecto antes de decidir</h2>
          <p>Ajusta supuestos declarados para la misma familia. La simulación usa el mismo motor, no se guarda y no compara productos.</p>
        </div>
        <div className="nx-scenario__seal"><i /> SIMULACIÓN PRIVADA</div>
      </header>

      <div className="nx-scenario__controls">
        <ScenarioInput label="Fondo de emergencia" value={scenario.emergencySavings} onChange={(value) => update("emergencySavings", value)} prefix="$" min={0} />
        <ScenarioInput label="Presupuesto mensual" value={scenario.monthlyBudget} onChange={(value) => update("monthlyBudget", value)} prefix="$" min={0} />

        {draft.goal === "proteccion" && (
          <>
            <ScenarioInput label="Años de necesidad" value={scenario.coverageYears} onChange={(value) => update("coverageYears", value)} suffix="años" min={1} max={50} />
            <ScenarioInput label="Ingreso a reemplazar" value={scenario.incomeReplacementPercent} onChange={(value) => update("incomeReplacementPercent", value)} suffix="%" min={0} max={100} />
          </>
        )}
        {draft.goal === "salud" && <ScenarioInput label="Capacidad para deducible" value={scenario.deductibleCapacity} onChange={(value) => update("deductibleCapacity", value)} prefix="$" min={0} />}
        {draft.goal === "retiro" && (
          <>
            <ScenarioInput label="Horizonte financiero" value={scenario.retirementHorizon} onChange={(value) => update("retirementHorizon", value)} suffix="años" min={1} max={60} />
            <ScenarioInput label="Patrimonio líquido" value={scenario.liquidNetWorth} onChange={(value) => update("liquidNetWorth", value)} prefix="$" min={0} />
          </>
        )}
        {draft.goal === "gastos_finales" && (
          <>
            <ScenarioInput label="Monto objetivo" value={scenario.finalExpenseTarget} onChange={(value) => update("finalExpenseTarget", value)} prefix="$" min={0} />
            <ScenarioInput label="Recursos reservados" value={scenario.finalExpenseReserved} onChange={(value) => update("finalExpenseReserved", value)} prefix="$" min={0} />
          </>
        )}
        {draft.goal === "cuidado_prolongado" && <ScenarioInput label="Período a financiar" value={scenario.careFundingYears} onChange={(value) => update("careFundingYears", value)} suffix="años" min={0} max={20} />}
      </div>

      <div className="nx-scenario__actions">
        <button type="button" className="nx-btn nx-btn--primary" onClick={compare} disabled={loading || !online}>{loading ? "Comparando…" : "Comparar escenario →"}</button>
        <button type="button" className="nx-btn nx-btn--ghost" onClick={() => { setScenario(initial); setComparison(null); setError(""); }}>Restablecer</button>
      </div>

      {error && <div className="nx-alert nx-alert--error" role="alert"><strong>{error}</strong>{details.length > 0 && <ul>{details.map((item) => <li key={item}>{item}</li>)}</ul>}</div>}

      {scenarioResult && (
        <div className="nx-scenario__result" aria-live="polite">
          <div className="nx-scenario__metrics">
            <MetricDelta label="Calidad de información" base={baseline.quality.score} scenario={scenarioResult.quality.score} />
            <MetricDelta label="Flujo mensual disponible" base={baseline.metrics.disposable} scenario={scenarioResult.metrics.disposable} format="money" />
            <MetricDelta label="Reserva de emergencia" base={baseline.metrics.emergencyMonths} scenario={scenarioResult.metrics.emergencyMonths} format="months" />
            {draft.goal === "proteccion" && <MetricDelta label="Necesidad ilustrativa" base={baseline.metrics.illustrativeCoverageNeed} scenario={scenarioResult.metrics.illustrativeCoverageNeed} format="money" />}
            {draft.goal === "gastos_finales" && baseline.metrics.finalExpenseGap !== null && scenarioResult.metrics.finalExpenseGap !== null && <MetricDelta label="Brecha de gastos finales" base={baseline.metrics.finalExpenseGap} scenario={scenarioResult.metrics.finalExpenseGap} format="money" />}
          </div>
          <div className="nx-scenario__direction">
            <span>DIRECCIÓN DEL ESCENARIO</span>
            <h3>{scenarioResult.priority}</h3>
            <p>{scenarioResult.direction}</p>
            <div><b>{scenarioResult.missing.length}</b> pendientes <b>{scenarioResult.cautions.length}</b> precauciones</div>
          </div>
          <div className="nx-scenario__review">
            <p>¿Este escenario refleja mejor lo que la familia realmente declaró? Llévalo al resumen para revisarlo antes de generar un nuevo análisis.</p>
            <button type="button" className="nx-btn nx-btn--ghost" onClick={() => onAdopt(scenarioDraft)}>Llevar a revisión →</button>
          </div>
        </div>
      )}

      <footer>Ilustración educativa · sin cotización · sin aseguradora · sin almacenamiento automático</footer>
    </section>
  );
}

function ScenarioInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="nx-scenario__input">
      <span>{label}</span>
      <div>{prefix && <b>{prefix}</b>}<input type="number" inputMode="decimal" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />{suffix && <b>{suffix}</b>}</div>
    </label>
  );
}
