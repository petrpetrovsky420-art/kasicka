import type { Goal } from './types';
import { addDays, daysBetween } from './dates';
import { roundCents } from './parse';

export type GoalStatus = 'done' | 'late' | 'new' | 'free' | 'ok' | 'behind';

/** Tempo počítáme aspoň ze 30 dní, aby jeden velký první vklad nezkreslil odhad. */
export const MIN_RATE_DAYS = 30;
/** Průměrná délka měsíce (365,25 / 12). */
export const DAYS_PER_MONTH = 30.4375;
/** Odhad dál než asi 100 let už nemá smysl ukazovat jako datum. */
export const MAX_ESTIMATE_DAYS = 36_525;

export type GoalStats = {
  /** Součet všech pohybů, nikdy ne záporný. */
  saved: number;
  /** max(0, target − saved) */
  remaining: number;
  /** 0–1 */
  pct: number;
  /** Dřívější z createdAt a data prvního pohybu. */
  start: string;
  /** Kč za den. */
  rate: number;
  /** Odhad splnění ('YYYY-MM-DD'), jen když je co doplnit a tempo > 0. */
  estimate: string | null;
  /** Při současném tempu by to trvalo přes 100 let. */
  estimateTooFar: boolean;
  /** Dny od dneška do termínu (záporné = po termínu), bez termínu null. */
  daysToDeadline: number | null;
  /** Kolik odkládat měsíčně / týdně, aby to vyšlo do termínu. */
  monthly: number | null;
  weekly: number | null;
  status: GoalStatus;
  /** Kdy zůstatek naposledy dosáhl cílové částky (jen u splněných cílů). */
  reachedOn: string | null;
};

export type BalancePoint = { date: string; balance: number };

/** Součty pohybů po dnech, vzestupně podle data. */
function dailyTotals(goal: Goal): [string, number][] {
  const byDate = new Map<string, number>();
  for (const d of goal.deposits) byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.amount);
  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Zůstatek po každém dni s pohybem. Pro zobrazení ho ořízneme na 0, záporný zůstatek nedává smysl. */
export function balanceHistory(goal: Goal): BalancePoint[] {
  let running = 0;
  return dailyTotals(goal).map(([date, sum]) => {
    running = roundCents(running + sum);
    return { date, balance: Math.max(0, running) };
  });
}

function findReachedOn(goal: Goal): string | null {
  let running = 0;
  let reached: string | null = null;
  for (const [date, sum] of dailyTotals(goal)) {
    const before = running;
    running = roundCents(running + sum);
    if (before < goal.target && running >= goal.target) reached = date;
  }
  return reached;
}

export function stats(goal: Goal, today: string): GoalStats {
  const total = roundCents(goal.deposits.reduce((sum, d) => sum + d.amount, 0));
  const saved = Math.max(0, total);
  const remaining = Math.max(0, roundCents(goal.target - saved));
  const pct = goal.target > 0 ? Math.min(1, saved / goal.target) : 0;

  let start = goal.createdAt;
  for (const d of goal.deposits) if (d.date < start) start = d.date;

  const elapsed = Math.max(0, daysBetween(start, today));
  const rate = saved / Math.max(MIN_RATE_DAYS, elapsed);

  let estimate: string | null = null;
  let estimateTooFar = false;
  if (remaining > 0 && rate > 0) {
    const days = Math.ceil(remaining / rate);
    if (days > MAX_ESTIMATE_DAYS) estimateTooFar = true;
    else estimate = addDays(today, days);
  }

  const daysToDeadline = goal.deadline ? daysBetween(today, goal.deadline) : null;
  let monthly: number | null = null;
  let weekly: number | null = null;
  if (daysToDeadline !== null && daysToDeadline >= 0 && remaining > 0) {
    // Méně než měsíc (týden) do termínu bereme jako jeden celý měsíc (týden),
    // jinak by vyšlo „odkládej měsíčně“ víc, než vůbec zbývá.
    monthly = remaining / Math.max(1, daysToDeadline / DAYS_PER_MONTH);
    weekly = remaining / Math.max(1, daysToDeadline / 7);
  }

  let status: GoalStatus;
  if (remaining === 0) status = 'done';
  else if (daysToDeadline !== null && daysToDeadline < 0) status = 'late';
  else if (goal.deposits.length === 0) status = 'new';
  else if (!goal.deadline) status = 'free';
  else if (estimate !== null && estimate <= goal.deadline) status = 'ok';
  else status = 'behind';

  return {
    saved,
    remaining,
    pct,
    start,
    rate,
    estimate,
    estimateTooFar,
    daysToDeadline,
    monthly,
    weekly,
    status,
    reachedOn: status === 'done' ? findReachedOn(goal) : null,
  };
}
