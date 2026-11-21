import { useId, useMemo, useRef } from 'react';
import type { Deposit, Goal } from '../lib/types';
import { formatDate, formatKcSigned } from '../lib/format';
import { Icon } from './Icon';

type Props = {
  goal: Goal;
  readOnly?: boolean;
  onDelete: (deposit: Deposit) => void;
};

/** Historie pohybů od nejnovějšího; výběry červeně, × smaže pohyb (s možností vrátit v hlášce). */
export function History({ goal, readOnly = false, onDelete }: Props) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const items = useMemo(
    () =>
      goal.deposits
        .map((deposit, index) => ({ deposit, index }))
        .sort((a, b) => (a.deposit.date === b.deposit.date ? b.index - a.index : a.deposit.date < b.deposit.date ? 1 : -1))
        .map(({ deposit }) => deposit),
    [goal.deposits],
  );

  function remove(deposit: Deposit, position: number) {
    // Fokus přesuneme na sousední řádek, aby se po smazání neztratil.
    const neighbour = items[position + 1] ?? items[position - 1];
    onDelete(deposit);
    requestAnimationFrame(() => {
      const next = neighbour
        ? listRef.current?.querySelector<HTMLButtonElement>(`[data-deposit="${CSS.escape(neighbour.id)}"]`)
        : null;
      (next ?? headingRef.current)?.focus();
    });
  }

  return (
    <section className="panel" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="panel-title">
        Historie
        <span className="panel-count">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="muted">Zatím tu nejsou žádné pohyby. Zapiš první vklad.</p>
      ) : (
        <ul ref={listRef} className="history">
          {items.map((deposit, position) => {
            const label = deposit.note || (deposit.amount > 0 ? 'Vklad' : 'Výběr');
            return (
              <li key={deposit.id} className="history-item">
                <span className="history-date">{formatDate(deposit.date)}</span>
                <span className="history-note" title={label}>
                  {label}
                </span>
                <span className={`history-amount${deposit.amount < 0 ? ' is-negative' : ''}`}>{formatKcSigned(deposit.amount)}</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm history-delete"
                    data-deposit={deposit.id}
                    aria-label={`Smazat ${deposit.amount > 0 ? 'vklad' : 'výběr'} ${formatKcSigned(deposit.amount)} ze dne ${formatDate(deposit.date)}`}
                    onClick={() => remove(deposit, position)}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
