import { describe, expect, it } from 'vitest';
import type { Deposit, Goal } from './types';
import { advice, estimateStat, planStat, STATUS_LABEL } from './advice';
import { stats } from './stats';
import { addDays } from './dates';

const TODAY = '2026-11-21';

const goal = (partial: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  name: 'Dovolená',
  target: 30_000,
  color: '#16a34a',
  createdAt: addDays(TODAY, -60),
  deposits: [],
  ...partial,
});
const dep = (amount: number, date: string): Deposit => ({ id: `${date}-${amount}`, amount, date });

// Intl píše mezi tisíce a před „Kč“ nezlomitelné mezery; pro porovnání je srovnáme.
const sentence = (g: Goal) => advice(g, stats(g, TODAY)).replace(/\s/g, ' ');

describe('věty s radou', () => {
  it('done', () => {
    expect(sentence(goal({ deposits: [dep(30_000, TODAY)] }))).toBe('Hotovo, cíl je splněný. Gratuluju!');
  });

  it('late', () => {
    const g = goal({ deadline: '2026-11-01', deposits: [dep(10_000, '2026-10-01')] });
    expect(sentence(g)).toBe('Termín 1. listopadu 2026 už uplynul. Posuň ho, nebo dospoř 20 000 Kč.');
  });

  it('new s termínem', () => {
    // 365 dní, 30 000 Kč → 2 501,71… → zaokrouhleno nahoru 2 502 Kč.
    const g = goal({ deadline: addDays(TODAY, 365) });
    expect(sentence(g)).toBe('Aby to vyšlo do 21. listopadu 2027, odkládej 2 502 Kč měsíčně.');
  });

  it('new bez termínu', () => {
    expect(sentence(goal())).toBe('Zapiš první vklad a ukážu ti, kdy cíl splníš.');
  });

  it('free', () => {
    // Tempo 100 Kč/den, zbývá 24 000 → 240 dní.
    const g = goal({ deposits: [dep(6_000, addDays(TODAY, -60))] });
    expect(sentence(g)).toBe('Při současném tempu cíl splníš kolem 19. července 2027.');
  });

  it('free bez naspořených peněz', () => {
    const g = goal({ deposits: [dep(500, '2026-10-01'), dep(-500, '2026-10-02')] });
    expect(sentence(g)).toBe('Zatím nemáš nic naspořeno. Zapiš vklad a ukážu ti odhad.');
  });

  it('ok', () => {
    const g = goal({ deadline: '2027-12-31', deposits: [dep(6_000, addDays(TODAY, -60))] });
    expect(sentence(g)).toBe('Při současném tempu budeš mít naspořeno kolem 19. července 2027, termín je 31. prosince 2027.');
  });

  it('behind', () => {
    // 70 dní, zbývá 24 000 → měsíčně 24 000 × 30,4375 / 70 = 10 435,71 → 10 436, týdně 2 400.
    const g = goal({ deadline: addDays(TODAY, 70), deposits: [dep(6_000, addDays(TODAY, -60))] });
    expect(sentence(g)).toBe('Do 30. ledna 2027 zbývá 70 dní. Odkládej aspoň 10 436 Kč měsíčně (2 400 Kč týdně).');
  });

  it('behind se správným tvarem pro 2–4 dny a 1 den', () => {
    const three = goal({ deadline: addDays(TODAY, 3), deposits: [dep(100, addDays(TODAY, -60))] });
    expect(sentence(three)).toContain('zbývají 3 dny.');
    const one = goal({ deadline: addDays(TODAY, 1), deposits: [dep(100, addDays(TODAY, -60))] });
    expect(sentence(one)).toContain('zbývá 1 den.');
  });

  it('termín dnes', () => {
    const g = goal({ deadline: TODAY, deposits: [dep(1_000, addDays(TODAY, -60))] });
    expect(sentence(g)).toBe('Termín je dnes a chybí ještě 29 000 Kč.');
  });
});

describe('údaje na kartě', () => {
  it('štítky stavů', () => {
    expect(STATUS_LABEL).toEqual({
      done: 'Splněno',
      late: 'Po termínu',
      new: 'Nový',
      free: 'Bez termínu',
      ok: 'Stíháš',
      behind: 'Zrychli',
    });
  });

  it('bez termínu ukáže „Termín: žádný“', () => {
    const g = goal();
    expect(planStat(g, stats(g, TODAY))).toEqual({ label: 'Termín', value: 'žádný' });
  });

  it('s termínem ukáže měsíční částku', () => {
    const g = goal({ deadline: addDays(TODAY, 365) });
    const cell = planStat(g, stats(g, TODAY));
    expect(cell.label).toBe('Měsíčně odkládat');
    expect(cell.value.replace(/\s/g, ' ')).toBe('2 502 Kč');
  });

  it('splněný cíl ukáže datum splnění', () => {
    const g = goal({ deposits: [dep(30_000, '2026-10-05')] });
    expect(estimateStat(stats(g, TODAY)).value.replace(/\s/g, ' ')).toBe('5. 10. 2026');
  });
});
