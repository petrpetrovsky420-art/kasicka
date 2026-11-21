import { useEffect, useState } from 'react';
import type { Deposit, Goal } from '../lib/types';
import type { GoalStats } from '../lib/stats';
import { advice } from '../lib/advice';
import { goalStyle } from '../lib/colors';
import { formatDate, formatKc, formatPercent } from '../lib/format';
import { Modal } from './Modal';
import { GoalChart } from './GoalChart';
import { MovementForm, type NewMovement } from './MovementForm';
import { History } from './History';
import { Icon } from './Icon';
import { goalCells, StatRow } from './GoalCard';
import { ProgressBar, StatusBadge } from './ui';

type Props = {
  goal: Goal;
  stats: GoalStats;
  today: string;
  demo: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMovement: (movement: NewMovement) => void;
  onDeleteMovement: (deposit: Deposit) => void;
  onCreateFirst: () => void;
};

/** Smazání cíle se potvrzuje druhým kliknutím na stejné tlačítko (do 5 s), žádné confirm(). */
function DeleteGoalButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={armed ? 'btn btn-danger' : 'btn btn-danger-ghost'}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      <Icon name="trash" />
      <span aria-live="polite">{armed ? 'Klikni znovu a cíl smažu' : 'Smazat cíl'}</span>
    </button>
  );
}

export function GoalDetail(props: Props) {
  const { goal, stats: s, today, demo } = props;
  return (
    <Modal
      title={goal.name}
      onClose={props.onClose}
      size="lg"
      className="goal-scope modal-goal"
      style={goalStyle(goal.color)}
      aside={<StatusBadge status={s.status} />}
    >
      {demo && (
        <div className="demo-banner">
          <p>
            <strong>Tohle je ukázka.</strong> Vytvoř si vlastní cíl a můžeš zapisovat vklady.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={props.onCreateFirst}>
            Vytvořit první cíl
          </button>
        </div>
      )}

      <div className="detail-top">
        <p className="amount">
          <span className="amount-big">{formatKc(s.saved)}</span>
          <span className="amount-of">z {formatKc(goal.target)}</span>
        </p>
        <ProgressBar pct={s.pct} label={`${goal.name}: naspořeno`} />
        <div className="progress-meta">
          <strong>{formatPercent(s.pct)}</strong>
          <span>{goal.deadline ? `termín ${formatDate(goal.deadline)}` : 'bez termínu'}</span>
        </div>
        <StatRow cells={goalCells(goal, s)} />
        <p className={`advice advice-${s.status}`}>{advice(goal, s)}</p>
      </div>

      <GoalChart goal={goal} stats={s} today={today} />

      {!demo && <MovementForm key={goal.id} saved={s.saved} today={today} onAdd={props.onAddMovement} />}

      <History goal={goal} readOnly={demo} onDelete={props.onDeleteMovement} />

      {!demo && (
        <div className="detail-actions">
          <button type="button" className="btn btn-secondary" onClick={props.onEdit}>
            <Icon name="edit" />
            Upravit cíl
          </button>
          <DeleteGoalButton onConfirm={props.onDelete} />
        </div>
      )}
    </Modal>
  );
}
