import { INITIAL_DEPOSIT_NOTE, type Goal } from '../lib/types';
import type { GoalStats } from '../lib/stats';
import { formatKc, inMonth, plural } from '../lib/format';
import { ProgressBar } from './ui';

type Item = { goal: Goal; stats: GoalStats };

export function Summary({ items, today }: { items: Item[]; today: string }) {
  let saved = 0;
  let target = 0;
  let remaining = 0;
  let open = 0;
  let monthNet = 0;
  let monthDeposits = 0;
  let monthWithdrawals = 0;
  const month = today.slice(0, 7);

  for (const { goal, stats } of items) {
    saved += stats.saved;
    target += goal.target;
    remaining += stats.remaining;
    if (stats.remaining > 0) open++;
    for (const d of goal.deposits) {
      // Počáteční stav jsou peníze naspořené dřív, ne odložené tento měsíc.
      if (!d.date.startsWith(month) || d.note === INITIAL_DEPOSIT_NOTE) continue;
      monthNet += d.amount;
      if (d.amount > 0) monthDeposits++;
      else monthWithdrawals++;
    }
  }

  const monthParts = [
    monthDeposits > 0 && `${monthDeposits} ${plural(monthDeposits, 'vklad', 'vklady', 'vkladů')}`,
    monthWithdrawals > 0 && `${monthWithdrawals} ${plural(monthWithdrawals, 'výběr', 'výběry', 'výběrů')}`,
  ].filter(Boolean);

  return (
    <section className="summary" aria-label="Souhrn">
      <div className="tile tile-main">
        <p className="tile-label">Celkem naspořeno</p>
        <p className="tile-value">{formatKc(saved)}</p>
        <ProgressBar pct={target > 0 ? saved / target : 0} label="Naspořeno ze všech cílů" />
        <p className="tile-sub">z {formatKc(target)} ve všech cílech</p>
      </div>
      <div className="tile">
        <p className="tile-label">Zbývá do všech cílů</p>
        <p className="tile-value">{formatKc(remaining)}</p>
        <p className="tile-sub">
          {open === 0 ? 'Všechny cíle jsou splněné' : `${open} ${plural(open, 'nesplněný cíl', 'nesplněné cíle', 'nesplněných cílů')}`}
        </p>
      </div>
      <div className="tile">
        <p className="tile-label">Odloženo tento měsíc</p>
        <p className={`tile-value${monthNet < 0 ? ' is-negative' : ''}`}>
          {monthNet < 0 ? `−${formatKc(-monthNet)}` : formatKc(monthNet)}
        </p>
        <p className="tile-sub">
          {monthParts.length ? `${monthParts.join(', ')} ${inMonth(today)}` : `Zatím žádný vklad ${inMonth(today)}`}
        </p>
      </div>
    </section>
  );
}
