import type { Goal } from './types';
import type { GoalStats, GoalStatus } from './stats';
import { formatDate, formatDateLong, formatKc, formatKcUp, plural } from './format';

export const STATUS_LABEL: Record<GoalStatus, string> = {
  done: 'Splněno',
  late: 'Po termínu',
  new: 'Nový',
  free: 'Bez termínu',
  ok: 'Stíháš',
  behind: 'Zrychli',
};

const dueToday = (s: GoalStats) => `Termín je dnes a chybí ještě ${formatKc(s.remaining)}.`;

/** Věta s radou podle stavu cíle. */
export function advice(goal: Goal, s: GoalStats): string {
  switch (s.status) {
    case 'done':
      return 'Hotovo, cíl je splněný. Gratuluju!';
    case 'late':
      return `Termín ${formatDateLong(goal.deadline ?? s.start)} už uplynul. Posuň ho, nebo dospoř ${formatKc(s.remaining)}.`;
    case 'new':
      if (goal.deadline && s.monthly !== null) {
        if (s.daysToDeadline === 0) return dueToday(s);
        return `Aby to vyšlo do ${formatDateLong(goal.deadline)}, odkládej ${formatKcUp(s.monthly)} měsíčně.`;
      }
      return 'Zapiš první vklad a ukážu ti, kdy cíl splníš.';
    case 'free':
      if (s.estimate) return `Při současném tempu cíl splníš kolem ${formatDateLong(s.estimate)}.`;
      if (s.estimateTooFar) return 'Při současném tempu by to trvalo přes sto let. Zkus odkládat víc.';
      return 'Zatím nemáš nic naspořeno. Zapiš vklad a ukážu ti odhad.';
    case 'ok':
      return `Při současném tempu budeš mít naspořeno kolem ${formatDateLong(s.estimate ?? s.start)}, termín je ${formatDateLong(goal.deadline ?? s.start)}.`;
    case 'behind': {
      const days = s.daysToDeadline ?? 0;
      if (days === 0) return dueToday(s);
      const verb = days >= 2 && days <= 4 ? 'zbývají' : 'zbývá';
      return (
        `Do ${formatDateLong(goal.deadline ?? s.start)} ${verb} ${days} ${plural(days, 'den', 'dny', 'dní')}. ` +
        `Odkládej aspoň ${formatKcUp(s.monthly ?? 0)} měsíčně (${formatKcUp(s.weekly ?? 0)} týdně).`
      );
    }
  }
}

export type StatCell = { label: string; value: string; tone?: 'danger' | 'ok' };

/** Prostřední údaj na kartě: kolik měsíčně odkládat, nebo stav termínu. */
export function planStat(goal: Goal, s: GoalStats): StatCell {
  if (!goal.deadline) return { label: 'Termín', value: 'žádný' };
  if (s.status === 'done') return { label: 'Termín', value: formatDate(goal.deadline) };
  if (s.status === 'late') return { label: 'Termín', value: 'uplynul', tone: 'danger' };
  return { label: 'Měsíčně odkládat', value: formatKcUp(s.monthly ?? 0) };
}

/** Třetí údaj na kartě: odhad splnění, nebo kdy byl cíl splněný. */
export function estimateStat(s: GoalStats): StatCell {
  if (s.status === 'done') return { label: 'Splněno', value: s.reachedOn ? formatDate(s.reachedOn) : 'ano', tone: 'ok' };
  if (s.estimate) return { label: 'Odhad splnění', value: formatDate(s.estimate) };
  if (s.estimateTooFar) return { label: 'Odhad splnění', value: 'přes 100 let' };
  return { label: 'Odhad splnění', value: '—' };
}
