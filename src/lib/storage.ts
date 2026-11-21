import type { Goal } from './types';
import { dedupeGoalIds, extractGoalList, normalizeGoals } from './normalize';

export const STORAGE_KEY = 'kasicka:v1';
/** Sem odložíme původní text, když byl poškozený, ať se dá ještě zachránit. */
export const DAMAGED_KEY = 'kasicka:v1:poskozena-data';

export type LoadProblem = 'unavailable' | 'corrupt' | 'repaired';

export type LoadResult = { goals: Goal[]; problem: LoadProblem | null };

function keepDamagedCopy(raw: string) {
  try {
    localStorage.setItem(DAMAGED_KEY, raw);
  } catch {
    // Když se nevejde ani kopie, nedá se nic dělat.
  }
}

/** Přečte uložený text. Cokoli rozbitého vrátí jako prázdný seznam, nikdy nespadne. */
export function parseStored(raw: string | null, today: string): LoadResult {
  if (raw === null) return { goals: [], problem: null };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    keepDamagedCopy(raw);
    return { goals: [], problem: 'corrupt' };
  }

  const list = extractGoalList(data);
  if (!list) {
    keepDamagedCopy(raw);
    return { goals: [], problem: 'corrupt' };
  }

  const { goals, skippedGoals, skippedDeposits } = normalizeGoals(list, today);
  const repaired = skippedGoals + skippedDeposits > 0;
  if (repaired) keepDamagedCopy(raw);
  return { goals: dedupeGoalIds(goals), problem: repaired ? 'repaired' : null };
}

export function readStorage(today: string): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { goals: [], problem: 'unavailable' };
  }
  return parseStored(raw, today);
}

export function serializeGoals(goals: Goal[]): string {
  return JSON.stringify({ version: 1, goals });
}

export function writeStorage(serialized: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function readRawStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Požádá prohlížeč, ať data nemaže při nedostatku místa. Když to nejde, nevadí. */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Starší prohlížeče Storage API nemají.
  }
}
