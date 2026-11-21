import type { ReactNode } from 'react';
import type { GoalStatus } from '../lib/stats';
import { STATUS_LABEL } from '../lib/advice';
import { formatPercent } from '../lib/format';

export function StatusBadge({ status }: { status: GoalStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const value = Math.max(0, Math.min(1, pct));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(value * 100)}
      aria-valuetext={formatPercent(value)}
    >
      <div className="progress-fill" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Popisek + pole + nápověda nebo chyba. Pole si napojí aria-describedby přes describedBy(). */
export function Field({ id, label, optional, hint, error, className, children }: FieldProps) {
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="field-optional">nepovinné</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(id: string, error: string | undefined, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}
