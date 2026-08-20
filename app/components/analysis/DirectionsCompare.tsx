"use client";

import { useEffect, useState } from "react";
import { BUCKET_META, GOAL_LABELS, buildComparisonEntry, dateOnly } from "./copy";
import { Badge, EmptyState, ErrorState, SkeletonRows } from "./primitives";
import type { AssessmentDetail, AssessmentListItem, ComparisonEntry } from "./types";

/** Se muestran hasta ocho análisis recientes para mantener el panorama
    enfocado. El servidor incluye ahora un resumen seguro por fila. */
const COMPARE_LIMIT = 8;

function entryFromSummary(item: AssessmentListItem): ComparisonEntry | null {
  if (!item.summary) return null;
  const summary = item.summary;
  const bucket = summary.cautionCount > 0
    ? "precaucion"
    : item.status === "informacion_pendiente" || summary.missingCount > 0 || !summary.directionReady
      ? "informacion"
      : "lista";

  return {
    id: item.id,
    applicantReference: item.applicantReference,
    goal: item.goal,
    createdAt: item.createdAt,
    status: item.status,
    bucket,
    qualityScore: summary.qualityScore,
    directionReady: summary.directionReady,
    cautionCount: summary.cautionCount,
    missingCount: summary.missingCount,
    priority: summary.priority,
  };
}

async function fetchComparisonEntries(): Promise<{ entries: ComparisonEntry[]; totalHistory: number }> {
  const listRequest = await fetch("/api/assessments");
  const listBody = await listRequest.json();
  if (!listRequest.ok) throw new Error(listBody.error || "No fue posible cargar el historial.");
  const items = (listBody.assessments as AssessmentListItem[]) ?? [];
  const subset = items.slice(0, COMPARE_LIMIT);
  const entriesById = new Map<string, ComparisonEntry>();

  for (const item of subset) {
    const entry = entryFromSummary(item);
    if (entry) entriesById.set(item.id, entry);
  }

  const itemsWithoutSummary = subset.filter((item) => !entriesById.has(item.id));

  const details = await Promise.all(
    itemsWithoutSummary.map(async (item) => {
      const request = await fetch(`/api/assessments?id=${encodeURIComponent(item.id)}`);
      const body = await request.json();
      if (!request.ok) throw new Error(body.error || "No fue posible cargar un análisis del historial.");
      return body as AssessmentDetail;
    }),
  );

  for (const detail of details) {
    const result = detail.assessment.result;
    if (result) {
      entriesById.set(
        detail.assessment.id,
        buildComparisonEntry({
          id: detail.assessment.id,
          applicantReference: detail.assessment.applicantReference,
          goal: detail.assessment.goal,
          createdAt: detail.assessment.createdAt,
          result,
        }),
      );
    }
  }

  const entries = subset.flatMap((item) => {
    const entry = entriesById.get(item.id);
    return entry ? [entry] : [];
  });

  return { entries, totalHistory: items.length };
}

/** Panorama privado de análisis reales ya guardados. No compara productos ni
    presenta una familia como alternativa para otra. */
export function DirectionsCompare({ online, onOpenDetail }: { online: boolean; onOpenDetail: (id: string) => void }) {
  const [entries, setEntries] = useState<ComparisonEntry[] | null>(null);
  const [totalHistory, setTotalHistory] = useState(0);
  const [error, setError] = useState("");
  const loading = online && entries === null && !error;

  const load = async () => {
    setError("");
    setEntries(null);
    try {
      const result = await fetchComparisonEntries();
      setEntries(result.entries);
      setTotalHistory(result.totalHistory);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible comparar los análisis.");
    }
  };

  useEffect(() => {
    if (!online || entries !== null || error) return;
    let active = true;
    fetchComparisonEntries()
      .then((result) => {
        if (!active) return;
        setEntries(result.entries);
        setTotalHistory(result.totalHistory);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "No fue posible comparar los análisis.");
      });
    return () => {
      active = false;
    };
  }, [online, entries, error]);

  if (!online) {
    return (
      <div className="nx-card nx-card--pad">
        <EmptyState icon="⌁" title="Sin conexión" text="Este panorama necesita conexión para leer tu historial guardado." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nx-card nx-card--pad">
        <SkeletonRows count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="nx-card nx-card--pad">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!entries || entries.length < 2) {
    return (
      <div className="nx-card nx-card--pad">
        <EmptyState
          icon="◇"
          title="Necesitas al menos dos análisis guardados"
          text="Completa y guarda otro análisis para organizar las direcciones recientes por su estado real."
        />
      </div>
    );
  }

  return (
    <div className="nx-compare">
      <header className="nx-compare__intro">
        <span className="nx-eyebrow-gold">PANORAMA PRIVADO DEL AGENTE</span>
        <h2>Estado de los análisis recientes</h2>
        <p>Organiza expedientes reales por preparación y precauciones. No compara personas, productos ni cotizaciones.</p>
      </header>
      {totalHistory > entries.length && (
        <p className="nx-compare__note">
          Mostrando los {entries.length} análisis más recientes de {totalHistory} guardados.
        </p>
      )}
      <div className="nx-compare__grid">
        {entries.map((entry) => {
          const meta = BUCKET_META[entry.bucket];
          return (
            <article className="nx-compare__card" key={entry.id}>
              <header>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span>{dateOnly.format(new Date(entry.createdAt))}</span>
              </header>
              <h3>{entry.applicantReference || "Sin referencia"}</h3>
              <small>{GOAL_LABELS[entry.goal] ?? entry.goal}</small>
              <p>{entry.priority}</p>
              <dl>
                <div>
                  <dt>Calidad</dt>
                  <dd>{entry.qualityScore}/100</dd>
                </div>
                <div>
                  <dt>Pendientes</dt>
                  <dd>{entry.missingCount}</dd>
                </div>
                <div>
                  <dt>Precauciones</dt>
                  <dd>{entry.cautionCount}</dd>
                </div>
              </dl>
              <button type="button" className="nx-btn nx-btn--ghost" onClick={() => onOpenDetail(entry.id)}>
                Ver expediente completo →
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
