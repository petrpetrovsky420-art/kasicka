import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deposit, Goal } from '../lib/types';
import { mergeGoals } from '../lib/backup';
import { todayISO } from '../lib/dates';
import { parseStored, readStorage, serializeGoals, STORAGE_KEY, writeStorage } from '../lib/storage';

export type GoalPatch = Partial<Pick<Goal, 'name' | 'target' | 'deadline' | 'color'>>;

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const copy = [...list];
  copy.splice(Math.max(0, Math.min(index, copy.length)), 0, item);
  return copy;
}

function applyPatch(goal: Goal, patch: GoalPatch): Goal {
  const next: Goal = { ...goal, ...patch };
  if (!next.deadline) delete next.deadline;
  return next;
}

/** Cíle v paměti + ukládání do localStorage + synchronizace mezi otevřenými záložkami. */
export function useGoals(onSaveError: () => void) {
  const [initial] = useState(() => readStorage(todayISO()));
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const lastWritten = useRef<string | null>(null);
  const onSaveErrorRef = useRef(onSaveError);

  useEffect(() => {
    onSaveErrorRef.current = onSaveError;
  });

  useEffect(() => {
    const serialized = serializeGoals(goals);
    if (serialized === lastWritten.current) return;
    if (writeStorage(serialized)) lastWritten.current = serialized;
    else onSaveErrorRef.current();
  }, [goals]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      if (event.newValue === lastWritten.current) return;
      lastWritten.current = event.newValue;
      setGoals(parseStored(event.newValue, todayISO()).goals);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      addGoal: (goal: Goal) => setGoals((gs) => [...gs, goal]),
      updateGoal: (id: string, patch: GoalPatch) =>
        setGoals((gs) => gs.map((g) => (g.id === id ? applyPatch(g, patch) : g))),
      deleteGoal: (id: string) => setGoals((gs) => gs.filter((g) => g.id !== id)),
      restoreGoal: (goal: Goal, index: number) =>
        setGoals((gs) => (gs.some((g) => g.id === goal.id) ? gs : insertAt(gs, goal, index))),
      addDeposit: (goalId: string, deposit: Deposit) =>
        setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, deposits: [...g.deposits, deposit] } : g))),
      deleteDeposit: (goalId: string, depositId: string) =>
        setGoals((gs) =>
          gs.map((g) => (g.id === goalId ? { ...g, deposits: g.deposits.filter((d) => d.id !== depositId) } : g)),
        ),
      restoreDeposit: (goalId: string, deposit: Deposit, index: number) =>
        setGoals((gs) =>
          gs.map((g) =>
            g.id === goalId && !g.deposits.some((d) => d.id === deposit.id)
              ? { ...g, deposits: insertAt(g.deposits, deposit, index) }
              : g,
          ),
        ),
      importGoals: (incoming: Goal[]) => setGoals((gs) => mergeGoals(gs, incoming)),
    }),
    [],
  );

  return { goals, actions, loadProblem: initial.problem };
}
