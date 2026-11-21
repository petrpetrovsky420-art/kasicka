import { describe, expect, it } from 'vitest';
import type { Deposit, Goal } from './types';
import { balanceHistory, stats } from './stats';
import { addDays } from './dates';

const TODAY = '2026-11-21';

function goal(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Dovolená',
    target: 30_000,
    color: '#16a34a',
    createdAt: addDays(TODAY, -60),
    deposits: [],
    ...partial,
  };
}

let seq = 0;
function dep(amount: number, date: string): Deposit {
  seq += 1;
  return { id: `d${seq}`, amount, date };
}

describe('naspořeno, zbývá, procenta', () => {
  it('sečte vklady i výběry', () => {
    const s = stats(goal({ deposits: [dep(10_000, '2026-10-01'), dep(5_000, '2026-10-15'), dep(-2_000, '2026-11-01')] }), TODAY);
    expect(s.saved).toBe(13_000);
    expect(s.remaining).toBe(17_000);
    expect(s.pct).toBeCloseTo(13_000 / 30_000);
  });

  it('nikdy neukáže záporné naspořeno', () => {
    const s = stats(goal({ deposits: [dep(1_000, '2026-10-01'), dep(-3_000, '2026-10-02')] }), TODAY);
    expect(s.saved).toBe(0);
    expect(s.remaining).toBe(30_000);
    expect(s.pct).toBe(0);
  });

  it('nad cílovou částkou ořízne procenta na 100 % a zbývá na 0', () => {
    const s = stats(goal({ deposits: [dep(35_000, '2026-10-01')] }), TODAY);
    expect(s.pct).toBe(1);
    expect(s.remaining).toBe(0);
    expect(s.status).toBe('done');
  });

  it('desetinná čísla sčítá bez šumu', () => {
    const s = stats(goal({ target: 1, deposits: [dep(0.1, '2026-10-01'), dep(0.2, '2026-10-02')] }), TODAY);
    expect(s.saved).toBe(0.3);
    expect(s.remaining).toBe(0.7);
  });
});

describe('start a tempo', () => {
  it('bez vkladů začíná dnem založení', () => {
    expect(stats(goal({ createdAt: '2026-09-01' }), TODAY).start).toBe('2026-09-01');
  });

  it('začíná prvním vkladem, když je dřív než založení', () => {
    const s = stats(goal({ createdAt: '2026-09-01', deposits: [dep(500, '2026-10-01'), dep(500, '2026-08-15')] }), TODAY);
    expect(s.start).toBe('2026-08-15');
  });

  it('tempo počítá aspoň ze 30 dní', () => {
    // Založeno před 5 dny, naspořeno 3 000 → 3 000 / 30 = 100 Kč za den.
    const s = stats(goal({ createdAt: addDays(TODAY, -5), deposits: [dep(3_000, addDays(TODAY, -5))] }), TODAY);
    expect(s.rate).toBe(100);
  });

  it('po 30 dnech počítá se skutečným počtem dní', () => {
    // 60 dní, naspořeno 6 000 → 100 Kč za den.
    const s = stats(goal({ createdAt: addDays(TODAY, -60), deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.rate).toBe(100);
  });

  it('založení dnes nedělí nulou', () => {
    const s = stats(goal({ createdAt: TODAY, deposits: [dep(3_000, TODAY)] }), TODAY);
    expect(s.rate).toBe(100);
    expect(Number.isFinite(s.rate)).toBe(true);
  });
});

describe('odhad splnění', () => {
  it('spočítá datum z tempa', () => {
    // Tempo 100 Kč/den, zbývá 3 000 → za 30 dní.
    const s = stats(goal({ target: 9_000, deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.estimate).toBe(addDays(TODAY, 30));
  });

  it('zaokrouhlí odhad nahoru na celý den', () => {
    const s = stats(goal({ target: 9_050, deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.estimate).toBe(addDays(TODAY, 31));
  });

  it('bez naspořených peněz odhad nedává', () => {
    const s = stats(goal({ deposits: [dep(1_000, '2026-10-01'), dep(-1_000, '2026-10-05')] }), TODAY);
    expect(s.rate).toBe(0);
    expect(s.estimate).toBeNull();
    expect(s.estimateTooFar).toBe(false);
  });

  it('odhad přes 100 let neukáže jako datum', () => {
    const s = stats(goal({ target: 1_000_000, createdAt: addDays(TODAY, -30), deposits: [dep(1, addDays(TODAY, -30))] }), TODAY);
    expect(s.estimate).toBeNull();
    expect(s.estimateTooFar).toBe(true);
  });

  it('splněný cíl odhad nemá', () => {
    const s = stats(goal({ deposits: [dep(30_000, '2026-10-01')] }), TODAY);
    expect(s.estimate).toBeNull();
  });
});

describe('měsíčně a týdně do termínu', () => {
  it('počítá ze zbývajících dní podle zadání', () => {
    const s = stats(goal({ target: 12_000, deadline: addDays(TODAY, 365) }), TODAY);
    expect(s.daysToDeadline).toBe(365);
    expect(s.monthly).toBeCloseTo(12_000 / (365 / 30.4375), 6);
    expect(s.weekly).toBeCloseTo(12_000 / (365 / 7), 6);
  });

  it('měsíčně nikdy nechce víc, než zbývá', () => {
    // 10 dní do termínu, zbývá 3 000: měsíčně 3 000, týdně 3 000 / (10/7) = 2 100.
    const s = stats(goal({ target: 3_000, deadline: addDays(TODAY, 10) }), TODAY);
    expect(s.monthly).toBe(3_000);
    expect(s.weekly).toBeCloseTo(2_100, 6);
  });

  it('méně než týden: celá zbývající částka týdně i měsíčně', () => {
    const s = stats(goal({ target: 3_000, deadline: addDays(TODAY, 3) }), TODAY);
    expect(s.monthly).toBe(3_000);
    expect(s.weekly).toBe(3_000);
  });

  it('bez termínu, po termínu a u splněného cíle částky nedává', () => {
    expect(stats(goal(), TODAY).monthly).toBeNull();
    expect(stats(goal({ deadline: addDays(TODAY, -1) }), TODAY).monthly).toBeNull();
    expect(stats(goal({ deadline: addDays(TODAY, 100), deposits: [dep(30_000, TODAY)] }), TODAY).monthly).toBeNull();
  });
});

describe('stavy', () => {
  it('done: splněno, i když je po termínu', () => {
    const s = stats(goal({ deadline: addDays(TODAY, -10), deposits: [dep(30_000, addDays(TODAY, -20))] }), TODAY);
    expect(s.status).toBe('done');
  });

  it('late: termín uplynul a cíl není splněný', () => {
    const s = stats(goal({ deadline: addDays(TODAY, -1), deposits: [dep(1_000, addDays(TODAY, -30))] }), TODAY);
    expect(s.status).toBe('late');
  });

  it('late má přednost před new', () => {
    expect(stats(goal({ deadline: addDays(TODAY, -1) }), TODAY).status).toBe('late');
  });

  it('termín dnes ještě není po termínu', () => {
    const s = stats(goal({ deadline: TODAY, deposits: [dep(1_000, addDays(TODAY, -30))] }), TODAY);
    expect(s.status).toBe('behind');
    expect(s.daysToDeadline).toBe(0);
    expect(s.monthly).toBe(29_000);
  });

  it('new: žádný pohyb', () => {
    expect(stats(goal({ deadline: addDays(TODAY, 100) }), TODAY).status).toBe('new');
    expect(stats(goal(), TODAY).status).toBe('new');
  });

  it('free: bez termínu', () => {
    expect(stats(goal({ deposits: [dep(1_000, '2026-10-01')] }), TODAY).status).toBe('free');
  });

  it('ok: odhad stihne termín', () => {
    // Tempo 100 Kč/den, zbývá 24 000 → 240 dní; termín za 300 dní.
    const s = stats(goal({ deadline: addDays(TODAY, 300), deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.status).toBe('ok');
  });

  it('ok: odhad přesně v den termínu', () => {
    const s = stats(goal({ deadline: addDays(TODAY, 240), deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.estimate).toBe(addDays(TODAY, 240));
    expect(s.status).toBe('ok');
  });

  it('behind: odhad je až po termínu', () => {
    const s = stats(goal({ deadline: addDays(TODAY, 239), deposits: [dep(6_000, addDays(TODAY, -60))] }), TODAY);
    expect(s.status).toBe('behind');
  });

  it('behind: pohyby jsou, ale naspořeno nic', () => {
    const s = stats(goal({ deadline: addDays(TODAY, 100), deposits: [dep(1_000, '2026-10-01'), dep(-1_000, '2026-10-02')] }), TODAY);
    expect(s.status).toBe('behind');
  });
});

describe('kdy byl cíl splněný a průběh zůstatku', () => {
  it('najde den, kdy zůstatek dosáhl cíle', () => {
    const s = stats(goal({ target: 1_000, deposits: [dep(600, '2026-09-01'), dep(500, '2026-10-01'), dep(100, '2026-11-01')] }), TODAY);
    expect(s.reachedOn).toBe('2026-10-01');
  });

  it('po výběru a novém dosažení bere poslední dosažení', () => {
    const s = stats(
      goal({ target: 1_000, deposits: [dep(1_000, '2026-09-01'), dep(-500, '2026-09-10'), dep(600, '2026-10-05')] }),
      TODAY,
    );
    expect(s.reachedOn).toBe('2026-10-05');
  });

  it('průběh sčítá pohyby po dnech a nejde pod nulu', () => {
    const history = balanceHistory(
      goal({ deposits: [dep(500, '2026-10-02'), dep(1_000, '2026-10-01'), dep(-3_000, '2026-10-03'), dep(200, '2026-10-02')] }),
    );
    expect(history).toEqual([
      { date: '2026-10-01', balance: 1_000 },
      { date: '2026-10-02', balance: 1_700 },
      { date: '2026-10-03', balance: 0 },
    ]);
  });
});
