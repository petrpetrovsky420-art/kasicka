import type { Deposit, Goal } from './types';
import { AMOUNT_MAX, NAME_MAX, NOTE_MAX } from './types';
import { isISODate } from './dates';
import { normalizeColor } from './colors';
import { parseAmount, roundCents } from './parse';
import { uid } from './id';

// Všechno, co přijde z úložiště nebo ze zálohy, prochází tudy.
// Co se dá opravit, opravíme; co ne, přeskočíme a spočítáme. Nikdy nevyhodíme výjimku.

export type NormalizeResult = {
  goals: Goal[];
  skippedGoals: number;
  skippedDeposits: number;
};

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toAmount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseAmount(value) : null;
  if (n === null || !Number.isFinite(n) || Math.abs(n) > AMOUNT_MAX) return null;
  return roundCents(n);
}

function toId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 100);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return uid();
}

function normalizeDeposit(raw: unknown): Deposit | null {
  if (!isRecord(raw)) return null;
  const amount = toAmount(raw.amount);
  if (amount === null || amount === 0) return null;
  const date = raw.date;
  if (!isISODate(date)) return null;
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, NOTE_MAX) : '';
  const deposit: Deposit = { id: toId(raw.id), amount, date };
  if (note) deposit.note = note;
  return deposit;
}

function normalizeGoal(raw: unknown, today: string): { goal: Goal; skippedDeposits: number } | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, NAME_MAX).trim() : '';
  if (!name) return null;
  const target = toAmount(raw.target);
  if (target === null || target <= 0) return null;

  const deposits: Deposit[] = [];
  const depositIds = new Set<string>();
  let skippedDeposits = 0;
  for (const item of Array.isArray(raw.deposits) ? raw.deposits : []) {
    const deposit = normalizeDeposit(item);
    if (!deposit) {
      skippedDeposits++;
      continue;
    }
    if (depositIds.has(deposit.id)) deposit.id = uid();
    depositIds.add(deposit.id);
    deposits.push(deposit);
  }

  let firstDate: string | null = null;
  for (const d of deposits) if (firstDate === null || d.date < firstDate) firstDate = d.date;

  const createdAt = raw.createdAt;
  const deadline = raw.deadline;
  const goal: Goal = {
    id: toId(raw.id),
    name,
    target,
    color: normalizeColor(raw.color),
    createdAt: isISODate(createdAt) ? createdAt : (firstDate ?? today),
    deposits,
  };
  if (isISODate(deadline)) goal.deadline = deadline;
  return { goal, skippedDeposits };
}

export function normalizeGoals(input: unknown, today: string): NormalizeResult {
  const result: NormalizeResult = { goals: [], skippedGoals: 0, skippedDeposits: 0 };
  if (!Array.isArray(input)) return result;
  for (const item of input) {
    const normalized = normalizeGoal(item, today);
    if (!normalized) {
      result.skippedGoals++;
      continue;
    }
    result.skippedDeposits += normalized.skippedDeposits;
    result.goals.push(normalized.goal);
  }
  return result;
}

/** Najde seznam cílů v datech: buď přímo pole, nebo objekt s polem `goals`. */
export function extractGoalList(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.goals)) return data.goals;
  return null;
}

/** Dvě stejná id v úložišti by rozbila mazání a úpravy: druhému dáme nové. */
export function dedupeGoalIds(goals: Goal[]): Goal[] {
  const seen = new Set<string>();
  return goals.map((goal) => {
    if (!seen.has(goal.id)) {
      seen.add(goal.id);
      return goal;
    }
    const copy = { ...goal, id: uid() };
    seen.add(copy.id);
    return copy;
  });
}
