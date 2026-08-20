"use client";

import type { EngineResult, WizardStepId } from "./types";

const STEP_LABELS: Record<WizardStepId, string> = {
  solicitante: "Solicitante",
  economia: "Economía",
  cobertura: "Cobertura",
  perfil: "Perfil",
  resumen: "Resumen",
};

export const WIZARD_STEPS: WizardStepId[] = ["solicitante", "economia", "cobertura", "perfil", "resumen"];

export function ProgressSteps({
  currentIndex,
  furthestIndex,
  onJump,
}: {
  currentIndex: number;
  furthestIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <ol className="nx-steps" aria-label="Etapas de la entrevista">
      {WIZARD_STEPS.map((id, index) => {
        const reachable = index <= furthestIndex;
        const state = index === currentIndex ? "current" : index < currentIndex ? "done" : "upcoming";
        return (
          <li key={id} className={`nx-steps__item nx-steps__item--${state}`}>
            <button
              type="button"
              disabled={!reachable}
              aria-current={index === currentIndex ? "step" : undefined}
              onClick={() => reachable && onJump(index)}
            >
              <span className="nx-steps__dot" aria-hidden="true">
                {index < currentIndex ? "✓" : index + 1}
              </span>
              <span className="nx-steps__label">{STEP_LABELS[id]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Traducción visible del bloqueo de cumplimiento. Nunca convierte
    `productRecommendationAllowed: false` en un mensaje de venta: solo
    explica, con las razones exactas del motor, por qué el sistema
    permanece en modo educativo. */
export function ComplianceBanner({ decisionGate }: { decisionGate: EngineResult["decisionGate"] }) {
  return (
    <div className="nx-compliance" role="note">
      <div className="nx-compliance__mark" aria-hidden="true">
        ◆
      </div>
      <div className="nx-compliance__body">
        <strong>Modo educativo interno · nombramiento pendiente</strong>
        <p>
          Esta dirección no constituye solicitud, cotización, aprobación ni recomendación de un producto. Ningún
          nombre de aseguradora o producto puede presentarse mientras el nombramiento continúe pendiente.
        </p>
        <ul>
          {decisionGate.blockedReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
