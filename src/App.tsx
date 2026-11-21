import { useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_DEPOSIT_NOTE, type Deposit, type Goal } from './lib/types';
import { stats } from './lib/stats';
import { uid } from './lib/id';
import { makeDemoGoals } from './lib/demo';
import { nextFreeColor } from './lib/colors';
import { formatKc } from './lib/format';
import { requestPersistentStorage, type LoadProblem } from './lib/storage';
import { useGoals } from './hooks/useGoals';
import { useToday } from './hooks/useToday';
import { useToast, ToastViewport } from './components/Toasts';
import { Logo } from './components/Logo';
import { Icon } from './components/Icon';
import { Summary } from './components/Summary';
import { Welcome } from './components/Welcome';
import { GoalCard } from './components/GoalCard';
import { Modal } from './components/Modal';
import { GoalForm, type GoalFormValues } from './components/GoalForm';
import { GoalDetail } from './components/GoalDetail';
import { BackupDialog } from './components/BackupDialog';
import type { NewMovement } from './components/MovementForm';

type FormState = { mode: 'new' } | { mode: 'edit'; goalId: string } | null;

const LOAD_PROBLEM_TEXT: Record<LoadProblem, string> = {
  unavailable: 'Prohlížeč nedovolil ukládat data (třeba v anonymním okně). Změny se po zavření ztratí.',
  corrupt: 'Uložená data byla poškozená a nešla načíst. Původní text zůstal schovaný v prohlížeči.',
  repaired: 'Některé uložené záznamy byly poškozené, proto byly přeskočeny.',
};

export default function App() {
  const today = useToday();
  const toast = useToast();
  const saveErrorShown = useRef(false);
  const { goals, actions, loadProblem } = useGoals(() => {
    if (saveErrorShown.current) return;
    saveErrorShown.current = true;
    toast('Změny se nepodařilo uložit. Zkontroluj místo v prohlížeči a stáhni si zálohu.', { tone: 'error' });
  });

  const [form, setForm] = useState<FormState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const loadProblemShown = useRef(false);
  useEffect(() => {
    if (!loadProblem || loadProblemShown.current) return;
    loadProblemShown.current = true;
    toast(LOAD_PROBLEM_TEXT[loadProblem], { tone: 'error' });
  }, [loadProblem, toast]);

  const isDemo = goals.length === 0;
  const demoGoals = useMemo(() => makeDemoGoals(today), [today]);
  const visibleGoals = isDemo ? demoGoals : goals;

  // Splněné cíle řadíme na konec, jinak zůstává pořadí, v jakém vznikly.
  const items = useMemo(() => {
    const list = visibleGoals.map((goal) => ({ goal, stats: stats(goal, today) }));
    return [...list.filter((i) => i.stats.status !== 'done'), ...list.filter((i) => i.stats.status === 'done')];
  }, [visibleGoals, today]);

  const detail = detailId ? (items.find((i) => i.goal.id === detailId) ?? null) : null;
  const editGoal = form?.mode === 'edit' ? goals.find((g) => g.id === form.goalId) : undefined;

  useEffect(() => {
    if (detailId && !detail) setDetailId(null);
  }, [detailId, detail]);

  useEffect(() => {
    if (form?.mode === 'edit' && !editGoal) setForm(null);
  }, [form, editGoal]);

  function addDepositWithToast(goal: Goal, movement: NewMovement, quick: boolean) {
    const deposit: Deposit = { id: uid(), ...movement };
    const wasDone = stats(goal, today).status === 'done';
    const nowDone = stats({ ...goal, deposits: [...goal.deposits, deposit] }, today).status === 'done';
    actions.addDeposit(goal.id, deposit);
    const undo = { label: 'Vrátit', onAction: () => actions.deleteDeposit(goal.id, deposit.id) };
    if (!wasDone && nowDone) toast(`Cíl „${goal.name}“ je splněný. Gratuluju!`, { action: undo });
    else if (movement.amount < 0) toast(`Výběr ${formatKc(-movement.amount)} zapsán.`, { action: undo });
    else toast(quick ? `Vklad ${formatKc(movement.amount)} přidán.` : 'Vklad přidán.', { action: undo });
  }

  function deleteDeposit(goal: Goal, deposit: Deposit) {
    const index = goal.deposits.findIndex((d) => d.id === deposit.id);
    actions.deleteDeposit(goal.id, deposit.id);
    toast('Pohyb smazán.', { action: { label: 'Vrátit', onAction: () => actions.restoreDeposit(goal.id, deposit, index) } });
  }

  function submitGoal(values: GoalFormValues) {
    if (form?.mode === 'edit') {
      actions.updateGoal(form.goalId, {
        name: values.name,
        target: values.target,
        deadline: values.deadline,
        color: values.color,
      });
      setForm(null);
      toast('Změny uloženy.');
      return;
    }
    const goal: Goal = {
      id: uid(),
      name: values.name,
      target: values.target,
      color: values.color,
      createdAt: today,
      deposits: values.initial > 0 ? [{ id: uid(), amount: values.initial, date: today, note: INITIAL_DEPOSIT_NOTE }] : [],
    };
    if (values.deadline) goal.deadline = values.deadline;
    actions.addGoal(goal);
    setForm(null);
    toast('Cíl vytvořen.');
    requestPersistentStorage();
  }

  function deleteGoal(goal: Goal) {
    const index = goals.findIndex((g) => g.id === goal.id);
    actions.deleteGoal(goal.id);
    setDetailId(null);
    toast('Cíl smazán.', { action: { label: 'Vrátit', onAction: () => actions.restoreGoal(goal, index) } });
  }

  function openNewGoal() {
    setDetailId(null);
    setForm({ mode: 'new' });
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="container header-inner">
          <h1 className="brand">
            <Logo />
            Kasička
          </h1>
          <div className="header-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setBackupOpen(true)}>
              <Icon name="archive" />
              Záloha
            </button>
            <button type="button" className="btn btn-primary" onClick={openNewGoal}>
              <Icon name="plus" />
              Nový cíl
            </button>
          </div>
        </div>
      </header>

      <main className="container main">
        {isDemo ? <Welcome onCreate={openNewGoal} /> : <Summary items={items} today={today} />}

        <section aria-labelledby="goals-title">
          <div className="section-head">
            <h2 id="goals-title" className="section-title">
              {isDemo ? 'Tohle je ukázka' : 'Moje cíle'}
            </h2>
            {isDemo && (
              <p className="section-note">
                Takhle budou vypadat tvoje cíle. Ukázka se nikam neukládá a zmizí, jakmile vytvoříš první vlastní cíl.
              </p>
            )}
          </div>
          <div className="goal-grid">
            {items.map(({ goal, stats: s }) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                stats={s}
                demo={isDemo}
                onOpen={() => setDetailId(goal.id)}
                onQuickDeposit={(amount) => addDepositWithToast(goal, { amount, date: today }, true)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="app-footer container">
        <p>Kasička ukládá data jen v tomhle zařízení a funguje i bez internetu. Zálohu najdeš pod tlačítkem Záloha.</p>
      </footer>

      <ToastViewport />

      {detail && (
        <GoalDetail
          goal={detail.goal}
          stats={detail.stats}
          today={today}
          demo={isDemo}
          onClose={() => setDetailId(null)}
          onEdit={() => setForm({ mode: 'edit', goalId: detail.goal.id })}
          onDelete={() => deleteGoal(detail.goal)}
          onAddMovement={(movement) => addDepositWithToast(detail.goal, movement, false)}
          onDeleteMovement={(deposit) => deleteDeposit(detail.goal, deposit)}
          onCreateFirst={openNewGoal}
        />
      )}

      {form && (form.mode === 'new' || editGoal) && (
        <Modal title={form.mode === 'new' ? 'Nový cíl' : 'Upravit cíl'} onClose={() => setForm(null)} closeOnBackdrop={false}>
          <GoalForm
            mode={form.mode}
            goal={editGoal}
            today={today}
            defaultColor={nextFreeColor(goals.map((g) => g.color))}
            onSubmit={submitGoal}
            onCancel={() => setForm(null)}
          />
        </Modal>
      )}

      {backupOpen && (
        <BackupDialog
          goals={goals}
          today={today}
          onClose={() => setBackupOpen(false)}
          onImport={(incoming, summary) => {
            actions.importGoals(incoming);
            setBackupOpen(false);
            toast(`Záloha obnovena. Nové cíle: ${summary.added}, přepsané: ${summary.replaced}.`);
            requestPersistentStorage();
          }}
        />
      )}
    </div>
  );
}
