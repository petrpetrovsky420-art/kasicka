import { useId, useRef, useState, type FormEvent } from 'react';
import { AMOUNT_MAX } from '../lib/types';
import { parseAmount, roundCents } from '../lib/parse';

type Props = {
  goalName: string;
  disabled?: boolean;
  onDeposit: (amount: number) => void;
};

export function validateDepositAmount(text: string): string | null {
  if (!text.trim()) return 'Napiš částku, kterou chceš vložit.';
  const amount = parseAmount(text);
  if (amount === null) return 'Tohle není číslo. Napiš třeba 500.';
  if (amount <= 0) return 'Vklad musí být větší než 0 Kč.';
  if (amount > AMOUNT_MAX) return 'Tak velkou částku Kasička neumí.';
  return null;
}

/** Rychlý vklad na kartě: částka + „Vložit“, zapíše se s dnešním datem. */
export function QuickDeposit({ goalName, disabled = false, onDeposit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const errorId = `${id}-error`;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    const problem = validateDepositAmount(value);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    onDeposit(roundCents(parseAmount(value) ?? 0));
    setValue('');
    setError(null);
  }

  return (
    <form className="quick" onSubmit={submit} noValidate>
      <label htmlFor={id} className="sr-only">
        Rychlý vklad na cíl {goalName}
      </label>
      <div className="quick-row">
        <div className="input-wrap">
          <input
            ref={inputRef}
            id={id}
            className="input"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={disabled ? 'Jen ukázka' : 'Částka'}
            value={value}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
          <span className="input-suffix" aria-hidden="true">
            Kč
          </span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          Vložit
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </form>
  );
}
