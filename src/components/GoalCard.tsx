import { useId } from 'react';
import type { Goal } from '../lib/types';
import type { GoalStats } from '../lib/stats';
import { advice, estimateStat, planStat, type StatCell } from '../lib/advice';
import { goalStyle } from '../lib/colors';
import { formatDate, formatKc, formatPercent } from '../lib/format';
import { ProgressBar, StatusBadge } from './ui';
import { QuickDeposit } from './QuickDeposit';

type Props = {
  goal: Goal;
  stats: GoalStats;
  demo?: boolean;
  onOpen: () => void;
  onQuickDeposit: (amount: number) => void;
};

export function StatRow({ cells }: { cells: StatCell[] }) {
  return (
    <dl className="stat-row">
      {cells.map((cell) => (
        <div key={cell.label} className="stat">
          <dt>{cell.label}</dt>
          <dd className={cell.tone ? `is-${cell.tone}` : undefined}>{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function goalCells(goal: Goal, s: GoalStats): StatCell[] {
  return [{ label: 'Zbývá', value: formatKc(s.remaining) }, planStat(goal, s), estimateStat(s)];
}

export function GoalCard({ goal, stats: s, demo = false, onOpen, onQuickDeposit }: Props) {
  const headingId = useId();
  return (
    <article className={`goal-card goal-scope${demo ? ' is-demo' : ''}`} style={goalStyle(goal.color)} aria-labelledby={headingId}>
      {demo && <p className="demo-tag">Tohle je ukázka</p>}
      <header className="goal-card-head">
        <h3 id={headingId} className="goal-card-title">
          {goal.name}
        </h3>
        <StatusBadge status={s.status} />
      </header>

      <p className="amount">
        <span className="amount-big">{formatKc(s.saved)}</span>
        <span className="amount-of">z {formatKc(goal.target)}</span>
      </p>

      <div>
        <ProgressBar pct={s.pct} label={`${goal.name}: naspořeno`} />
        <div className="progress-meta">
          <strong>{formatPercent(s.pct)}</strong>
          <span>{goal.deadline ? `termín ${formatDate(goal.deadline)}` : 'bez termínu'}</span>
        </div>
      </div>

      <StatRow cells={goalCells(goal, s)} />

      <p className={`advice advice-${s.status}`}>{advice(goal, s)}</p>

      <QuickDeposit goalName={goal.name} disabled={demo} onDeposit={onQuickDeposit} />

      <button type="button" className="link-btn" onClick={onOpen}>
        Graf, historie a úpravy <span className="arrow" aria-hidden="true">→</span>
      </button>
    </article>
  );
}
