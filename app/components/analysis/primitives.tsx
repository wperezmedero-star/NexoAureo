"use client";

import { useId, type ReactNode } from "react";
import type { ReadinessSummary } from "./types";

type Tone = "good" | "warn" | "info" | "missing" | "neutral";

/* ---------------------------------------------------------------------- */
/* Estructura                                                              */
/* ---------------------------------------------------------------------- */

export function FormSection({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="nx-section">
      <legend>
        {eyebrow && <span className="nx-section__eyebrow">{eyebrow}</span>}
        <span className="nx-section__title">{title}</span>
        {hint && <span className="nx-section__hint">{hint}</span>}
      </legend>
      <div className="nx-section__grid">{children}</div>
    </fieldset>
  );
}

export function Field({
  label,
  hint,
  wide,
  inputId,
  hintId,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  inputId?: string;
  hintId?: string;
  children: ReactNode;
}) {
  return (
    <div className={`nx-field${wide ? " nx-field--wide" : ""}`}>
      {inputId ? (
        <label className="nx-field__label" htmlFor={inputId}>{label}</label>
      ) : (
        <span className="nx-field__label">{label}</span>
      )}
      {children}
      {hint && <span className="nx-field__hint" id={hintId}>{hint}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Entradas                                                                */
/* ---------------------------------------------------------------------- */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  wide,
  maxLength,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  maxLength?: number;
  invalid?: boolean;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return (
    <Field label={label} hint={hint} wide={wide} inputId={inputId} hintId={hint ? hintId : undefined}>
      <input
        id={inputId}
        className="nx-input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? hintId : undefined}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return (
    <Field label={label} hint={hint} inputId={inputId} hintId={hint ? hintId : undefined}>
      <div className="nx-input-unit">
        <input
          id={inputId}
          className="nx-input"
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hint ? hintId : undefined}
        />
        {suffix && <span>{suffix}</span>}
      </div>
    </Field>
  );
}

export function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return (
    <Field label={label} hint={hint} inputId={inputId} hintId={hint ? hintId : undefined}>
      <div className="nx-input-money">
        <span aria-hidden="true">$</span>
        <input
          id={inputId}
          className="nx-input"
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hint ? hintId : undefined}
        />
      </div>
    </Field>
  );
}

/** Campo numérico que además puede quedar en null ("pendiente"). El motor
    trata esto como información todavía no disponible, no como un error. */
export function NullableNumberField({
  label,
  value,
  onChange,
  hint,
  unit = "plain",
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  unit?: "money" | "years" | "percent" | "plain";
  min?: number;
  max?: number;
}) {
  const pending = value === null;
  const suffix = unit === "years" ? "años" : unit === "percent" ? "%" : undefined;
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const pendingId = `${inputId}-pending`;
  return (
    <Field label={label} hint={hint} inputId={inputId} hintId={hint ? hintId : undefined}>
      <div className={unit === "money" ? "nx-input-money" : "nx-input-unit"}>
        {unit === "money" && <span aria-hidden="true">$</span>}
        <input
          id={inputId}
          className="nx-input"
          type="number"
          inputMode="decimal"
          min={min ?? 0}
          max={max}
          disabled={pending}
          value={value === null ? "" : value}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          aria-describedby={hint ? hintId : undefined}
        />
        {suffix && !pending && <span>{suffix}</span>}
      </div>
      <label className="nx-pending-toggle">
        <input
          id={pendingId}
          type="checkbox"
          checked={pending}
          onChange={(event) => onChange(event.target.checked ? null : (min ?? 0))}
        />
        Aún no lo sé
      </label>
    </Field>
  );
}

export function SelectField<Value extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  wide,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: Array<{ value: Value; label: string }>;
  hint?: string;
  wide?: boolean;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return (
    <Field label={label} hint={hint} wide={wide} inputId={inputId} hintId={hint ? hintId : undefined}>
      <select id={inputId} className="nx-input" value={value} onChange={(event) => onChange(event.target.value as Value)} aria-describedby={hint ? hintId : undefined}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`nx-checkbox${disabled ? " nx-checkbox--disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function ChipMultiSelect<Value extends string>({
  label,
  values,
  onChange,
  options,
  hint,
}: {
  label: string;
  values: Value[];
  onChange: (values: Value[]) => void;
  options: Array<{ value: Value; label: string }>;
  hint?: string;
}) {
  const toggle = (option: Value) => {
    onChange(values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  };
  return (
    <Field label={label} hint={hint} wide>
      <div className="nx-chips" role="group" aria-label={label}>
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              className={`nx-chip${active ? " nx-chip--active" : ""}`}
              aria-pressed={active}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/* ---------------------------------------------------------------------- */
/* Indicadores                                                             */
/* ---------------------------------------------------------------------- */

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`nx-badge nx-badge--${tone}`}>{children}</span>;
}

export function QualityGauge({ score, level }: { score: number; level: string }) {
  return (
    <div className="nx-gauge">
      <div className="nx-gauge__ring" style={{ ["--nx-gauge-value" as string]: `${score}%` }}>
        <strong>{score}</strong>
      </div>
      <div className="nx-gauge__copy">
        <small>CALIDAD DE LA INFORMACIÓN</small>
        <span>{level}</span>
      </div>
    </div>
  );
}

export function ToneList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: Tone;
}) {
  if (!items.length) return null;
  return (
    <div className={`nx-list nx-list--${tone}`}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Estados                                                                 */
/* ---------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="nx-empty">
      <span aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="nx-error" role="alert">
      <strong>No fue posible completar la solicitud</strong>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="nx-btn nx-btn--ghost" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="nx-skeleton" role="status" aria-live="polite">
      <span className="nx-visually-hidden">Cargando…</span>
      {Array.from({ length: count }).map((_, index) => (
        <i key={index} aria-hidden="true" />
      ))}
    </div>
  );
}

/** Conteo visible de campos requeridos; no representa elegibilidad ni una
    predicción del motor. */
export function ReadinessMeter({ summary }: { summary: ReadinessSummary }) {
  const blocked = summary.blockingErrors.length > 0;
  return (
    <section className="nx-readiness" aria-label="Preparación de la información">
      <div className="nx-readiness__head">
        <div className="nx-readiness__ring" style={{ ["--nx-gauge-value" as string]: `${summary.percentComplete}%` }} aria-hidden="true">
          <strong>{summary.percentComplete}%</strong>
        </div>
        <div>
          <span className="nx-eyebrow-gold">PREPARACIÓN DE LA INFORMACIÓN</span>
          <p>Campos requeridos completados según lo que ya escribiste. No es una predicción del motor.</p>
        </div>
      </div>
      <dl className="nx-readiness__stats">
        <div><dt>Confirmados</dt><dd>{summary.confirmedCount}/{summary.totalCount}</dd></div>
        <div><dt>Pendientes</dt><dd>{summary.pendingCount}</dd></div>
        <div className={blocked ? "nx-readiness__stat--danger" : undefined}><dt>Errores</dt><dd>{summary.blockingErrors.length}</dd></div>
        <div className={summary.followUpWarnings.length > 0 ? "nx-readiness__stat--warn" : undefined}><dt>Advertencias</dt><dd>{summary.followUpWarnings.length}</dd></div>
      </dl>
      {blocked && (
        <ul className="nx-readiness__issues nx-readiness__issues--danger">
          {summary.blockingErrors.map((issue) => <li key={issue.id}>{issue.message}</li>)}
        </ul>
      )}
      {summary.followUpWarnings.length > 0 && (
        <ul className="nx-readiness__issues">
          {summary.followUpWarnings.map((issue) => <li key={issue.id}>{issue.message}</li>)}
        </ul>
      )}
    </section>
  );
}

export function ConnectionBanner({ message = "Tus respuestas permanecen en pantalla, pero no podrás guardar ni consultar el historial hasta reconectarte." }: { message?: string }) {
  return (
    <div className="nx-connection" role="alert">
      <span aria-hidden="true">⌁</span>
      <div>
        <strong>Sin conexión a internet</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
