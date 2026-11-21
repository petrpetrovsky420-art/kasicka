import { useId, useRef, useState, type FormEvent } from 'react';
import { AMOUNT_MAX, NOTE_MAX } from '../lib/types';
import { isISODate } from '../lib/dates';
import { formatInputAmount } from '../lib/format';
import { parseAmount, roundCents } from '../lib/parse';
import { describedBy, Field } from './ui';

export type NewMovement = { amount: number; date: string; note?: string };
type Kind = 'deposit' | 'withdrawal';
type Errors = { amount?: string; date?: string };

type Props = {
  saved: number;
  today: string;
  onAdd: (movement: NewMovement) => void;
};

/** „Přidat pohyb“ v detailu: vklad nebo výběr, částka, datum (výchozí dnes) a poznámka. */
export function MovementForm({ saved, today, onAdd }: Props) {
  const [kind, setKind] = useState<Kind>('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const id = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const ids = { amount: `${id}-amount`, date: `${id}-date`, note: `${id}-note` };

  function validate(): Errors {
    const found: Errors = {};
    const value = parseAmount(amount);
    if (!amount.trim()) found.amount = kind === 'deposit' ? 'Napiš, kolik vkládáš.' : 'Napiš, kolik vybíráš.';
    else if (value === null) found.amount = 'Tohle není číslo. Napiš třeba 500.';
    else if (value <= 0) found.amount = 'Částka musí být větší než 0 Kč.';
    else if (value > AMOUNT_MAX) found.amount = 'Tak velkou částku Kasička neumí.';
    else if (kind === 'withdrawal' && value > saved + 1e-9) {
      found.amount = saved > 0 ? `Vybrat můžeš nejvýš ${formatInputAmount(saved)} Kč, víc tu není.` : 'Zatím tu nic není, není z čeho vybírat.';
    }

    if (dateRef.current?.validity.badInput || !isISODate(date)) found.date = 'Zadej platné datum.';
    else if (date > today) found.date = 'Datum nemůže být v budoucnosti.';
    return found;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (found.amount) return amountRef.current?.focus();
    if (found.date) return dateRef.current?.focus();

    const value = roundCents(parseAmount(amount) ?? 0);
    const trimmed = note.trim();
    onAdd({ amount: kind === 'deposit' ? value : -value, date, ...(trimmed ? { note: trimmed } : {}) });
    setAmount('');
    setNote('');
    setDate(today);
    setErrors({});
    amountRef.current?.focus();
  }

  return (
    <section className="panel" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="panel-title">
        Přidat pohyb
      </h3>
      <form className="movement-form" onSubmit={submit} noValidate>
        <fieldset className="segmented">
          <legend className="sr-only">Druh pohybu</legend>
          {(['deposit', 'withdrawal'] as const).map((option) => (
            <label key={option} className="segmented-option">
              <input
                type="radio"
                className="sr-only"
                name={`${id}-kind`}
                value={option}
                checked={kind === option}
                onChange={() => {
                  setKind(option);
                  setErrors((current) => ({ ...current, amount: undefined }));
                }}
              />
              <span className={option === 'withdrawal' ? 'is-withdrawal' : undefined}>
                {option === 'deposit' ? 'Vklad' : 'Výběr'}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="movement-grid">
          <Field id={ids.amount} label="Částka" error={errors.amount}>
            <div className="input-wrap">
              <input
                ref={amountRef}
                id={ids.amount}
                className="input"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={amount}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={describedBy(ids.amount, errors.amount)}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }));
                }}
              />
              <span className="input-suffix" aria-hidden="true">
                Kč
              </span>
            </div>
          </Field>

          <Field id={ids.date} label="Datum" error={errors.date}>
            <input
              ref={dateRef}
              id={ids.date}
              type="date"
              className="input"
              value={date}
              max={today}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={describedBy(ids.date, errors.date)}
              onChange={(event) => {
                setDate(event.target.value);
                if (errors.date) setErrors((current) => ({ ...current, date: undefined }));
              }}
            />
          </Field>

          <Field id={ids.note} label="Poznámka" optional className="span-all">
            <input
              id={ids.note}
              className="input"
              value={note}
              maxLength={NOTE_MAX}
              autoComplete="off"
              placeholder={kind === 'deposit' ? 'Třeba Z výplaty' : 'Třeba Oprava auta'}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>

        <div>
          <button type="submit" className={kind === 'deposit' ? 'btn btn-primary' : 'btn btn-danger'}>
            {kind === 'deposit' ? 'Přidat vklad' : 'Zapsat výběr'}
          </button>
        </div>
      </form>
    </section>
  );
}
