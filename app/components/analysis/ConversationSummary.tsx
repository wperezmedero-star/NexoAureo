"use client";

import {
  GOAL_LABELS,
  coreSummaryLines,
  coverageSummaryLines,
  economySummaryLines,
  profileSummaryLines,
  type SummaryLine,
} from "./copy";
import type { DraftAssessment } from "./types";

/** Presenta únicamente datos declarados. No calcula ni sugiere una
    dirección: esa responsabilidad permanece en el motor del servidor. */
export function ConversationSummary({
  draft,
  clientMode,
  onToggleClientMode,
}: {
  draft: DraftAssessment;
  clientMode: boolean;
  onToggleClientMode: () => void;
}) {
  const groups: Array<{ title: string; lines: SummaryLine[] }> = [
    { title: "Solicitante", lines: coreSummaryLines(draft) },
    { title: "Situación económica", lines: economySummaryLines(draft) },
    { title: "Cobertura y preferencias", lines: coverageSummaryLines(draft) },
    { title: `Perfil · ${GOAL_LABELS[draft.goal]}`, lines: profileSummaryLines(draft) },
  ];

  const answeredCount = groups.reduce((total, group) => total + group.lines.filter((line) => line.answered).length, 0);

  return (
    <details className="nx-summary-panel" open>
      <summary>
        <span className="nx-summary-panel__title">
          <b aria-hidden="true">▾</b>
          Resumen de la conversación
        </span>
        <span className="nx-summary-panel__count">{answeredCount} declarados</span>
      </summary>

      <div className="nx-summary-panel__body">
        <button
          type="button"
          className={`nx-btn nx-btn--ghost nx-summary-panel__toggle${clientMode ? " active" : ""}`}
          aria-pressed={clientMode}
          onClick={onToggleClientMode}
        >
          {clientMode ? "◈ Vista del agente" : "◇ Mostrar al solicitante"}
        </button>

        {clientMode && (
          <p className="nx-summary-panel__note">
            Solo se muestra lo que ya declaraste. Nada de esto es una recomendación.
          </p>
        )}

        {groups.map((group) => {
          const visible = clientMode ? group.lines.filter((line) => line.answered) : group.lines;
          if (clientMode && visible.length === 0) return null;
          return (
            <div className="nx-summary-panel__group" key={group.title}>
              <strong>{group.title}</strong>
              <dl>
                {visible.map((line) => (
                  <div key={line.label} className={line.answered ? undefined : "nx-summary-panel__row--pending"}>
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}

        {clientMode && answeredCount === 0 && (
          <p className="nx-summary-panel__note">Todavía no hay información declarada para mostrar.</p>
        )}
      </div>
    </details>
  );
}
