import type { Goal } from './types';
import { extractGoalList, normalizeGoals } from './normalize';

export const BACKUP_APP = 'kasicka';
export const BACKUP_VERSION = 1;

export function createBackup(goals: Goal[], now: Date = new Date()): string {
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), goals },
    null,
    2,
  );
}

export type ImportPreview =
  | {
      ok: true;
      goals: Goal[];
      added: number;
      replaced: number;
      skippedGoals: number;
      skippedDeposits: number;
    }
  | { ok: false; error: string };

/** Zkontroluje text zálohy a spočítá, co by import udělal. Nic neukládá. */
export function previewImport(text: string, existing: Goal[], today: string): ImportPreview {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Vlož text zálohy nebo nahraj soubor.' };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Tohle není platná záloha. Zkontroluj, že je vložený celý text.' };
  }

  const list = extractGoalList(data);
  if (!list) return { ok: false, error: 'V tomhle textu nejsou žádné cíle z Kasičky.' };

  const { goals, skippedGoals, skippedDeposits } = normalizeGoals(list, today);
  if (goals.length === 0) {
    return {
      ok: false,
      error: skippedGoals > 0 ? 'Žádný cíl v záloze není platný, není co obnovit.' : 'Záloha neobsahuje žádné cíle.',
    };
  }

  const existingIds = new Set(existing.map((g) => g.id));
  const incomingIds = new Set(goals.map((g) => g.id));
  let added = 0;
  let replaced = 0;
  for (const id of incomingIds) {
    if (existingIds.has(id)) replaced++;
    else added++;
  }
  return { ok: true, goals, added, replaced, skippedGoals, skippedDeposits };
}

/** Cíle ze zálohy přidá na konec; cíl se stejným id přepíše na jeho místě. */
export function mergeGoals(existing: Goal[], incoming: Goal[]): Goal[] {
  const result = [...existing];
  const indexById = new Map(result.map((g, i) => [g.id, i]));
  for (const goal of incoming) {
    const index = indexById.get(goal.id);
    if (index === undefined) {
      indexById.set(goal.id, result.length);
      result.push(goal);
    } else {
      result[index] = goal;
    }
  }
  return result;
}
