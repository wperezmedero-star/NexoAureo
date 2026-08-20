"use client";

import { ComplianceBanner } from "./flow-parts";
import { Badge, QualityGauge, ToneList } from "./primitives";
import { CONFIDENCE_META, GOAL_LABELS, STATUS_META, dateTime, money } from "./copy";
import type { AssessmentInput, AuditTrailEntry, EngineResult, EvidenceSource, RuleRow } from "./types";

/** Presenta únicamente los datos devueltos por el motor y los organiza para
    que el agente pueda explicar la dirección sin convertirla en una venta. */
export function ResultView({
  applicantReference,
  goal,
  createdAt,
  result,
  evidence,
  rules,
  auditTrail,
}: {
  applicantReference: string;
  goal: AssessmentInput["goal"];
  createdAt?: string;
  result: EngineResult;
  evidence: EvidenceSource[];
  rules: RuleRow[];
  auditTrail?: AuditTrailEntry[];
}) {
  const statusMeta = STATUS_META[result.status] ?? { label: result.status, tone: "info" as const };
  const confidenceMeta = CONFIDENCE_META[result.confidence] ?? { label: result.confidence, tone: "info" as const };
  const printedOn = dateTime.format(createdAt ? new Date(createdAt) : new Date());

  return (
    <div className="nx-result">
      {/* Solo visible al imprimir o exportar a PDF: el disclaimer viaja con
          el documento aunque salga del contexto de la pantalla. */}
      <div className="nx-print-header">
        <strong>NexoÁureo</strong>
        <span>Documento educativo interno · no constituye cotización, aprobación ni recomendación de producto</span>
        <span>{GOAL_LABELS[goal]} · {applicantReference || "Sin referencia"} · Generado el {printedOn}</span>
      </div>

      <div className="nx-result__print-bar">
        <button type="button" className="nx-btn nx-btn--ghost" onClick={() => window.print()}>
          ↓ Descargar PDF
        </button>
      </div>

      <header className="nx-result__head">
        <div>
          <span className="nx-result__eyebrow">
            {GOAL_LABELS[goal]} · {applicantReference || "Sin referencia"}
          </span>
          <h2>{result.priority}</h2>
          {createdAt && <small>Generado el {dateTime.format(new Date(createdAt))}</small>}
        </div>
        <div className="nx-result__badges">
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          <Badge tone={confidenceMeta.tone}>Confianza {confidenceMeta.label}</Badge>
        </div>
      </header>

      <section className="nx-result__section" aria-labelledby="nx-result-direction">
        <h3 id="nx-result-direction" className="nx-result__section-title">Dirección principal</h3>
        <p className="nx-result__direction">{result.direction}</p>
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-compliance">
        <h3 id="nx-result-compliance" className="nx-result__section-title">Bloqueos de cumplimiento</h3>
        <ComplianceBanner decisionGate={result.decisionGate} />
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-needs">
        <h3 id="nx-result-needs" className="nx-result__section-title">Necesidades detectadas</h3>
        <div className="nx-result__quality">
          <QualityGauge score={result.quality.score} level={result.quality.level} />
          <dl>
            <div><dt>Datos pendientes</dt><dd>{result.quality.pendingItems}</dd></div>
            <div><dt>Precauciones</dt><dd>{result.quality.cautionItems}</dd></div>
            <div><dt>Lista para profundizar</dt><dd>{result.quality.directionReady ? "Sí" : "Todavía no"}</dd></div>
          </dl>
        </div>

        <div className="nx-metrics">
          <div><small>Flujo mensual disponible</small><strong>{money.format(result.metrics.disposable)}</strong></div>
          <div><small>Fondo de emergencia</small><strong>{result.metrics.emergencyMonths.toFixed(1)} meses</strong></div>
          {goal === "proteccion" && (
            <div className="nx-metrics__wide">
              <small>Necesidad ilustrativa de protección</small>
              <strong>{money.format(result.metrics.illustrativeCoverageNeed)}</strong>
              <em>
                Deudas ({money.format(result.metrics.coverageBreakdown.debts)}) + hipoteca ({money.format(result.metrics.coverageBreakdown.mortgageBalance)}) + educación ({money.format(result.metrics.coverageBreakdown.educationGoal)}) + ingreso por plazo al {result.metrics.coverageBreakdown.incomeReplacementPercentApplied}% ({money.format(result.metrics.coverageBreakdown.incomeReplacement)}) − cobertura vigente ({money.format(result.metrics.coverageBreakdown.existingLifeCoverage)})
              </em>
            </div>
          )}
          {goal === "gastos_finales" && result.metrics.finalExpenseGap !== null && (
            <div className="nx-metrics__wide">
              <small>Brecha declarada para gastos finales</small>
              <strong>{money.format(result.metrics.finalExpenseGap)}</strong>
              <em>Monto objetivo declarado − recursos ya reservados</em>
            </div>
          )}
        </div>
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-rationale">
        <h3 id="nx-result-rationale" className="nx-result__section-title">Razones verificables</h3>
        <ToneList title="Cómo se llegó a esta dirección" items={result.rationale} tone="neutral" />
        <ToneList title="Supuestos utilizados" items={result.assumptions} tone="neutral" />
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-pending">
        <h3 id="nx-result-pending" className="nx-result__section-title">Datos o documentos pendientes</h3>
        <ToneList title="Información pendiente" items={result.missing} tone="missing" />
        <ToneList title="Precauciones" items={result.cautions} tone="warn" />
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-alternatives">
        <h3 id="nx-result-alternatives" className="nx-result__section-title">Alternativas que podrían explorarse</h3>
        <ToneList title="Direcciones para comparar" items={result.alternatives} tone="good" />
      </section>

      <section className="nx-result__section" aria-labelledby="nx-result-next">
        <h3 id="nx-result-next" className="nx-result__section-title">Próximos pasos</h3>
        <ToneList title="Próximos pasos" items={result.nextSteps} tone="info" />
      </section>

      {(evidence.length > 0 || rules.length > 0) && (
        <section className="nx-result__section" aria-labelledby="nx-result-sources">
          <h3 id="nx-result-sources" className="nx-result__section-title">Reglas y fuentes utilizadas</h3>
          {evidence.length > 0 && (
            <div className="nx-evidence">
              <strong>Fuentes verificadas utilizadas</strong>
              {evidence.map((source) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                  <span>{source.organization} · {source.title}</span>
                  <small>Verificada {source.verifiedOn}</small>
                </a>
              ))}
            </div>
          )}
          {rules.length > 0 && (
            <div className="nx-rules">
              <strong>Reglas aplicadas</strong>
              {rules.map((rule) => (
                <div key={rule.id} className="nx-rules__row">
                  <span className={rule.ruleType === "bloqueo" ? "nx-rules__tag nx-rules__tag--stop" : "nx-rules__tag"}>{rule.ruleType}</span>
                  <div>
                    <strong>{rule.title}</strong>
                    <p>{rule.guidance}</p>
                    <small>{rule.domain} · revisada {rule.reviewedOn}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {auditTrail && auditTrail.length > 0 && (
        <div className="nx-audit">
          <strong>Trazabilidad</strong>
          <ol>
            {auditTrail.map((entry, index) => (
              <li key={`${entry.action}-${index}`}>
                <span>{dateTime.format(new Date(entry.createdAt))}</span>
                <p>{entry.action === "analisis_generado" ? "Análisis generado y guardado" : entry.action}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="nx-result__statement">{result.statement}</p>
    </div>
  );
}
