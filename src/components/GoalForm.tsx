import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { Goal } from '../lib/types';
import { AMOUNT_MAX, NAME_MAX } from '../lib/types';
import { GOAL_COLORS } from '../lib/colors';
import { addDays, isISODate } from '../lib/dates';
import { formatDateLong, formatInputAmount } from '../lib/format';
import { parseAmount, roundCents } from '../lib/parse';
import { describedBy, Field } from './ui';

export type GoalFormValues = {
  name: string;
  target: number;
  deadline?: string;
  color: string;
  /** Už naspořeno (jen u nového cíle). */
  initial: number;
};

type Props = {
  mode: 'new' | 'edit';
  goal?: Goal;
  today: string;
  defaultColor: string;
  onSubmit: (values: GoalFormValues) => void;
  onCancel: () => void;
};

type FieldName = 'name' | 'target' | 'deadline' | 'initial';
type Errors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ['name', 'target', 'deadline', 'initial'];

function amountError(text: string, { required, allowZero }: { required: boolean; allowZero: boolean }): string | undefined {
  if (!text.trim()) return required ? 'Zadej cílovou částku.' : undefined;
  const value = parseAmount(text);
  if (value === null) return 'Tohle není číslo. Napiš třeba 30 000.';
  if (value < 0) return 'Částka nemůže být záporná.';
  if (value === 0 && !allowZero) return 'Částka musí být větší než 0 Kč.';
  if (value > AMOUNT_MAX) return 'Tak velkou částku Kasička neumí. Zkus nejvýš miliardu.';
  return undefined;
}

export function GoalForm({ mode, goal, today, defaultColor, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? formatInputAmount(goal.target) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [initial, setInitial] = useState('');
  const [color, setColor] = useState(goal?.color ?? defaultColor);
  const [errors, setErrors] = useState<Errors>({});
  const id = useId();
  const refs = {
    name: useRef<HTMLInputElement>(null),
    target: useRef<HTMLInputElement>(null),
    deadline: useRef<HTMLInputElement>(null),
    initial: useRef<HTMLInputElement>(null),
  };
  const ids = { name: `${id}-name`, target: `${id}-target`, deadline: `${id}-deadline`, initial: `${id}-initial` };
  const tomorrow = addDays(today, 1);
  const keepsPastDeadline = mode === 'edit' && !!goal?.deadline && goal.deadline < today && deadline === goal.deadline;

  function validate(): Errors {
    const found: Errors = {};
    const trimmed = name.trim();
    if (!trimmed) found.name = 'Napiš, na co spoříš.';
    else if (trimmed.length > NAME_MAX) found.name = `Název může mít nejvýš ${NAME_MAX} znaků.`;

    found.target = amountError(target, { required: true, allowZero: false });

    if (refs.deadline.current?.validity.badInput) found.deadline = 'Datum není celé. Doplň ho, nebo pole vymaž.';
    else if (deadline && !isISODate(deadline)) found.deadline = 'Zadej platné datum.';
    else if (deadline && deadline <= today && !keepsPastDeadline) found.deadline = 'Termín musí být v budoucnosti.';

    if (mode === 'new') found.initial = amountError(initial, { required: false, allowZero: true });

    for (const key of FIELD_ORDER) if (!found[key]) delete found[key];
    return found;
  }

  function clearError(field: FieldName) {
    if (!errors[field]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function reformat(value: string, set: (v: string) => void) {
    const parsed = parseAmount(value);
    if (parsed !== null && parsed > 0) set(formatInputAmount(parsed));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) {
      refs[first].current?.focus();
      return;
    }
    onSubmit({
      name: name.trim(),
      target: roundCents(parseAmount(target) ?? 0),
      deadline: deadline || undefined,
      color,
      initial: mode === 'new' ? roundCents(parseAmount(initial) ?? 0) : 0,
    });
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id={ids.name} label="Na co spoříš?" error={errors.name}>
        <input
          ref={refs.name}
          id={ids.name}
          className="input"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          placeholder="Třeba Dovolená u moře"
          data-autofocus
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(ids.name, errors.name)}
          onChange={(event) => {
            setName(event.target.value);
            clearError('name');
          }}
        />
      </Field>

      <div className="form-grid">
        <Field id={ids.target} label="Cílová částka" error={errors.target}>
          <div className="input-wrap">
            <input
              ref={refs.target}
              id={ids.target}
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="30 000"
              value={target}
              aria-invalid={errors.target ? true : undefined}
              aria-describedby={describedBy(ids.target, errors.target)}
              onChange={(event) => {
                setTarget(event.target.value);
                clearError('target');
              }}
              onBlur={() => reformat(target, setTarget)}
            />
            <span className="input-suffix" aria-hidden="true">
              Kč
            </span>
          </div>
        </Field>

        <Field
          id={ids.deadline}
          label="Do kdy?"
          optional
          error={errors.deadline}
          hint={deadline ? undefined : 'Bez termínu ukážu jen odhad, kdy to stihneš.'}
        >
          <div className="date-row">
            <input
              ref={refs.deadline}
              id={ids.deadline}
              type="date"
              className="input"
              value={deadline}
              min={keepsPastDeadline ? undefined : tomorrow}
              aria-invalid={errors.deadline ? true : undefined}
              aria-describedby={describedBy(ids.deadline, errors.deadline, !deadline)}
              onChange={(event) => {
                setDeadline(event.target.value);
                clearError('deadline');
              }}
            />
            {deadline && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDeadline('');
                  clearError('deadline');
                }}
              >
                Bez termínu
              </button>
            )}
          </div>
        </Field>
      </div>

      {keepsPastDeadline && goal?.deadline && (
        <p className="notice notice-warn">
          Termín {formatDateLong(goal.deadline)} už uplynul, proto je cíl „Po termínu“. Posuň ho na nové datum, nebo ho nech, jak je.
        </p>
      )}

      {mode === 'new' && (
        <Field
          id={ids.initial}
          label="Už mám naspořeno"
          optional
          error={errors.initial}
          hint="Uloží se jako první vklad „Počáteční stav“."
        >
          <div className="input-wrap">
            <input
              ref={refs.initial}
              id={ids.initial}
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={initial}
              aria-invalid={errors.initial ? true : undefined}
              aria-describedby={describedBy(ids.initial, errors.initial, true)}
              onChange={(event) => {
                setInitial(event.target.value);
                clearError('initial');
              }}
              onBlur={() => reformat(initial, setInitial)}
            />
            <span className="input-suffix" aria-hidden="true">
              Kč
            </span>
          </div>
        </Field>
      )}

      <fieldset className="color-field">
        <legend className="field-label">Barva</legend>
        <div className="color-options">
          {GOAL_COLORS.map((option) => (
            <label key={option.value} className="color-option" title={option.name}>
              <input
                type="radio"
                className="sr-only"
                name={`${id}-color`}
                value={option.value}
                aria-label={option.name}
                checked={color === option.value}
                onChange={() => setColor(option.value)}
              />
              <span
                className="swatch"
                style={{ '--swatch-l': option.value, '--swatch-d': option.dark } as CSSProperties}
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Zrušit
        </button>
        <button type="submit" className="btn btn-primary">
          {mode === 'new' ? 'Vytvořit cíl' : 'Uložit změny'}
        </button>
      </div>
    </form>
  );
}
