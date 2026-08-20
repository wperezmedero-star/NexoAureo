"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  analyzeNarrativeLocally,
  findSensitiveNarrativeIssues,
  type IntakeSuggestion,
  type NarrativeAnalysis,
} from "../../../lib/interview-intelligence";
import { buildAdaptiveQuestions } from "./copy";
import type { DraftAssessment } from "./types";

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type IntelligenceResponse = {
  analysis: NarrativeAnalysis;
  externalAiAvailable: boolean;
  usedExternalAi: boolean;
  fallbackUsed?: boolean;
};

export function InterviewCopilot({
  draft,
  setDraft,
  onJump,
  online,
}: {
  draft: DraftAssessment;
  setDraft: Dispatch<SetStateAction<DraftAssessment>>;
  onJump: (index: number) => void;
  online: boolean;
}) {
  const [narrative, setNarrative] = useState("");
  const [analysis, setAnalysis] = useState<NarrativeAnalysis | null>(null);
  const [externalAiAvailable, setExternalAiAvailable] = useState(false);
  const [allowExternalAi, setAllowExternalAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechAvailable = typeof window !== "undefined" && Boolean((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);
  const adaptiveQuestions = buildAdaptiveQuestions(draft);
  const visibleQuestions = [...(analysis?.followUps ?? []), ...adaptiveQuestions]
    .filter((item, index, list) => list.findIndex((other) => other.question === item.question) === index)
    .slice(0, 4);

  useEffect(() => {
    if (!online) return;
    let active = true;
    fetch("/api/interview-intelligence", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "No fue posible comprobar la capacidad de IA.");
        return body as { externalAiAvailable: boolean };
      })
      .then((body) => {
        if (active) setExternalAiAvailable(body.externalAiAvailable);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [online]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const updateNarrative = (value: string) => {
    setNarrative(value.slice(0, 3_000));
    setAnalysis(null);
    setApplied([]);
    setError("");
    setDetails([]);
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("El dictado no está disponible en este navegador. Puedes escribir el relato.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      if (transcript.trim()) updateNarrative(`${narrative}${narrative ? " " : ""}${transcript.trim()}`);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("No se pudo usar el micrófono. Revisa el permiso o escribe el relato.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError("");
    setListening(true);
    recognition.start();
  };

  const interpret = async () => {
    const sensitive = findSensitiveNarrativeIssues(narrative);
    if (sensitive.length) {
      setError("Retira los datos sensibles antes de interpretar el relato.");
      setDetails(sensitive.map((item) => item.message));
      return;
    }
    if (narrative.trim().length < 12) {
      setError("Escribe un poco más sobre la situación y la intención del solicitante.");
      return;
    }
    setLoading(true);
    setError("");
    setDetails([]);
    setApplied([]);
    if (!online) {
      setAnalysis(analyzeNarrativeLocally(narrative, draft as unknown as Record<string, unknown>));
      setLoading(false);
      return;
    }
    try {
      const request = await fetch("/api/interview-intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ narrative, draft, allowExternalAi: allowExternalAi && externalAiAvailable }),
      });
      const body = await request.json();
      if (!request.ok) {
        setDetails(Array.isArray(body.details) ? body.details : []);
        throw new Error(body.error || "No fue posible interpretar el relato.");
      }
      const response = body as IntelligenceResponse;
      setExternalAiAvailable(response.externalAiAvailable);
      setAnalysis(response.analysis);
    } catch (cause) {
      const local = analyzeNarrativeLocally(narrative, draft as unknown as Record<string, unknown>);
      setAnalysis({ ...local, notice: "La conexión no respondió. Se utilizó el análisis local verificable." });
      setError(cause instanceof Error ? cause.message : "Se utilizó el análisis local.");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: IntakeSuggestion) => {
    setDraft((current) => {
      const value = suggestion.value;
      if (suggestion.field === "goal") return { ...current, goal: value as DraftAssessment["goal"] };
      if (suggestion.field === "healthCoverage") return { ...current, healthCoverage: value as DraftAssessment["healthCoverage"] };
      if (suggestion.field === "existingPolicy") {
        const checked = value === "true";
        return {
          ...current,
          existingPolicy: checked,
          wantsReplace: checked ? current.wantsReplace : false,
          life: checked
            ? { ...current.life, existingPolicyDocumentsReviewed: current.life.existingPolicyDocumentsReviewed === "no_aplica" ? "pendiente" : current.life.existingPolicyDocumentsReviewed }
            : { ...current.life, existingPolicyDocumentsReviewed: "no_aplica" },
        };
      }
      if (suggestion.field === "wantsReplace") {
        const checked = value === "true";
        return {
          ...current,
          existingPolicy: checked || current.existingPolicy,
          wantsReplace: checked,
          life: checked && current.life.existingPolicyDocumentsReviewed === "no_aplica"
            ? { ...current.life, existingPolicyDocumentsReviewed: "pendiente" }
            : current.life,
        };
      }
      if (suggestion.field === "life.incomeReplacementPercent") {
        return { ...current, life: { ...current.life, incomeReplacementPercent: Number(value) } };
      }
      if (suggestion.field === "life.permanentNeed") {
        return { ...current, life: { ...current.life, permanentNeed: value as "si" | "no" } };
      }
      if (suggestion.field === "finalExpense.targetAmount") {
        return { ...current, finalExpense: { ...current.finalExpense, targetAmount: Number(value) } };
      }
      if (suggestion.field === "finalExpense.reservedResources") {
        return { ...current, finalExpense: { ...current.finalExpense, reservedResources: Number(value) } };
      }
      return { ...current, [suggestion.field]: value };
    });
    setApplied((current) => current.includes(suggestion.id) ? current : [...current, suggestion.id]);
  };

  return (
    <section className="nx-copilot" aria-labelledby="nx-copilot-title">
      <div className="nx-copilot__scan" aria-hidden="true" />
      <header className="nx-copilot__head">
        <div>
          <span className="nx-copilot__kicker"><i /> NEXO INTELLIGENCE</span>
          <h2 id="nx-copilot-title">Copiloto de entrevista</h2>
        </div>
        <span className="nx-copilot__mode">HÍBRIDO</span>
      </header>

      <p className="nx-copilot__intro">Escucha el relato, identifica hechos explícitos y propone la siguiente pregunta. Tú decides qué aplicar.</p>

      <label className="nx-copilot__label" htmlFor="nx-client-story">Relato anónimo del solicitante</label>
      <textarea
        id="nx-client-story"
        value={narrative}
        onChange={(event) => updateNarrative(event.target.value)}
        placeholder="Ej.: Tiene 42 años, dos hijos, ingreso anual de 72 mil y desea proteger el ingreso familiar…"
        maxLength={3_000}
      />
      <div className="nx-copilot__counter">{narrative.length}/3,000</div>

      <div className="nx-copilot__actions">
        <button type="button" className={`nx-copilot__voice${listening ? " active" : ""}`} onClick={toggleListening} disabled={!speechAvailable && !listening} aria-pressed={listening}>
          <span aria-hidden="true">{listening ? "■" : "◉"}</span> {listening ? "Detener" : "Dictar"}
        </button>
        <button type="button" className="nx-btn nx-btn--primary" onClick={interpret} disabled={loading}>
          {loading ? "Interpretando…" : "Interpretar relato →"}
        </button>
      </div>

      <div className="nx-copilot__privacy">
        <span aria-hidden="true">◇</span>
        <p>No escribas nombres, teléfono, correo, dirección, SSN, cuentas ni detalles clínicos. El relato no se guarda.</p>
      </div>

      {externalAiAvailable ? (
        <label className="nx-copilot__consent">
          <input type="checkbox" checked={allowExternalAi} onChange={(event) => setAllowExternalAi(event.target.checked)} />
          <span>Autorizar en esta ocasión el análisis externo de IA del relato anónimo.</span>
        </label>
      ) : (
        <p className="nx-copilot__availability"><i /> Análisis local protegido activo · IA externa preparada, aún no conectada.</p>
      )}

      {error && (
        <div className="nx-copilot__error" role="alert">
          <strong>{error}</strong>
          {details.length > 0 && <ul>{details.map((item) => <li key={item}>{item}</li>)}</ul>}
        </div>
      )}

      {analysis && (
        <div className="nx-copilot__analysis" aria-live="polite">
          <div className="nx-copilot__analysis-head">
            <span>{analysis.mode === "ia_estructurada" ? "IA estructurada" : "Motor local verificable"}</span>
            <b>{analysis.suggestions.length} datos detectados</b>
          </div>
          <p>{analysis.notice}</p>

          {analysis.insights.length > 0 && (
            <div className="nx-copilot__insights">
              {analysis.insights.map((insight) => <span className={`is-${insight.kind}`} key={insight.id}>{insight.label}</span>)}
            </div>
          )}

          {analysis.suggestions.length > 0 ? (
            <div className="nx-copilot__suggestions">
              {analysis.suggestions.map((suggestion) => {
                const isApplied = applied.includes(suggestion.id);
                return (
                  <article key={suggestion.id}>
                    <div><small>{suggestion.label}</small><strong>{suggestion.displayValue}</strong><em>{suggestion.evidence}</em></div>
                    <button type="button" onClick={() => applySuggestion(suggestion)} disabled={isApplied}>{isApplied ? "Aplicado ✓" : "Aplicar"}</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="nx-copilot__empty">No encontré datos suficientemente explícitos. Utiliza las preguntas siguientes.</p>
          )}

          {analysis.conflicts.length > 0 && (
            <div className="nx-copilot__conflicts"><strong>Revisar contradicciones</strong>{analysis.conflicts.map((item) => <p key={item}>{item}</p>)}</div>
          )}
        </div>
      )}

      <div className="nx-copilot__questions">
        <div><span>PRÓXIMA MEJOR PREGUNTA</span><b>{visibleQuestions.length} sugerencias activas</b></div>
        {visibleQuestions.map((item, index) => (
          <button type="button" key={item.id} onClick={() => onJump(item.targetStep)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span><strong>{item.question}</strong><small>{item.reason}</small></span>
            <b aria-hidden="true">→</b>
          </button>
        ))}
      </div>

      <footer>Revisión humana obligatoria · sin recomendación de producto</footer>
    </section>
  );
}
