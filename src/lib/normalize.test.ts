import { describe, expect, it } from 'vitest';
import { dedupeGoalIds, extractGoalList, normalizeGoals } from './normalize';
import { parseStored } from './storage';
import { DEFAULT_COLOR } from './colors';

const TODAY = '2026-11-21';

describe('normalizeGoals', () => {
  it('pro cokoli jiného než pole vrátí prázdný seznam', () => {
    for (const input of [null, undefined, 42, 'text', {}, { goals: 'x' }]) {
      expect(normalizeGoals(input, TODAY).goals).toEqual([]);
    }
  });

  it('nechá platný cíl beze změny', () => {
    const goal = {
      id: 'a',
      name: 'Kolo',
      target: 15_000,
      deadline: '2027-05-01',
      color: '#2563eb',
      createdAt: '2026-10-01',
      deposits: [{ id: 'd1', amount: 1_000, date: '2026-10-01', note: 'Start' }],
    };
    expect(normalizeGoals([goal], TODAY)).toEqual({ goals: [goal], skippedGoals: 0, skippedDeposits: 0 });
  });

  it('přeskočí cíle bez názvu nebo s neplatnou částkou', () => {
    const result = normalizeGoals(
      [
        { name: '', target: 100 },
        { name: '   ', target: 100 },
        { name: 'Bez částky' },
        { name: 'Nula', target: 0 },
        { name: 'Záporná', target: -5 },
        { name: 'Text', target: 'hodně' },
        { name: 'Obří', target: 1e15 },
        'nesmysl',
        null,
        { name: 'Dobrý', target: 100 },
      ],
      TODAY,
    );
    expect(result.goals.map((g) => g.name)).toEqual(['Dobrý']);
    expect(result.skippedGoals).toBe(9);
  });

  it('opraví, co se opravit dá', () => {
    const [goal] = normalizeGoals(
      [
        {
          name: `  ${'x'.repeat(80)}  `,
          target: '30 000',
          deadline: '2026-02-30',
          color: 'purple',
          createdAt: 'včera',
          deposits: [{ amount: '1 500,5', date: '2026-09-15', note: `  ${'n'.repeat(200)}` }],
        },
      ],
      TODAY,
    ).goals;
    expect(goal.name).toHaveLength(60);
    expect(goal.target).toBe(30_000);
    expect(goal.deadline).toBeUndefined();
    expect('deadline' in goal).toBe(false);
    expect(goal.color).toBe(DEFAULT_COLOR);
    expect(goal.createdAt).toBe('2026-09-15');
    expect(goal.id).toBeTruthy();
    expect(goal.deposits[0].amount).toBe(1_500.5);
    expect(goal.deposits[0].note).toHaveLength(120);
    expect(goal.deposits[0].id).toBeTruthy();
  });

  it('bez data založení a bez vkladů použije dnešek', () => {
    expect(normalizeGoals([{ name: 'A', target: 1 }], TODAY).goals[0].createdAt).toBe(TODAY);
  });

  it('zahodí neplatné pohyby a spočítá je', () => {
    const result = normalizeGoals(
      [
        {
          id: 'g',
          name: 'A',
          target: 1_000,
          createdAt: '2026-10-01',
          deposits: [
            { id: '1', amount: 100, date: '2026-10-01' },
            { id: '2', amount: 0, date: '2026-10-01' },
            { id: '3', amount: Number.NaN, date: '2026-10-01' },
            { id: '4', amount: 100, date: '1. 10. 2026' },
            { id: '5', amount: 100 },
            'vklad',
            null,
            { id: '1', amount: 50, date: '2026-10-02' },
          ],
        },
      ],
      TODAY,
    );
    const deposits = result.goals[0].deposits;
    expect(deposits.map((d) => d.amount)).toEqual([100, 50]);
    expect(result.skippedDeposits).toBe(6);
    expect(new Set(deposits.map((d) => d.id)).size).toBe(2);
  });

  it('pole deposits, které není pole, bere jako prázdné', () => {
    expect(normalizeGoals([{ name: 'A', target: 1, deposits: 'x' }], TODAY).goals[0].deposits).toEqual([]);
  });
});

describe('extractGoalList a dedupeGoalIds', () => {
  it('najde cíle v poli i v objektu zálohy', () => {
    expect(extractGoalList([1])).toEqual([1]);
    expect(extractGoalList({ goals: [2] })).toEqual([2]);
    expect(extractGoalList({ cile: [] })).toBeNull();
    expect(extractGoalList('x')).toBeNull();
  });

  it('druhému cíli se stejným id dá nové id', () => {
    const base = { name: 'A', target: 1, color: DEFAULT_COLOR, createdAt: TODAY, deposits: [] };
    const result = dedupeGoalIds([
      { ...base, id: 'x' },
      { ...base, id: 'x' },
    ]);
    expect(result[0].id).toBe('x');
    expect(result[1].id).not.toBe('x');
  });
});

describe('poškozené úložiště aplikaci neshodí', () => {
  it.each([
    ['nevalidní JSON', '{"goals": [', 'corrupt'],
    ['jiný tvar dat', '"ahoj"', 'corrupt'],
    ['null', 'null', 'corrupt'],
  ])('%s', (_label, raw, problem) => {
    expect(parseStored(raw, TODAY)).toEqual({ goals: [], problem });
  });

  it('prázdné úložiště není problém', () => {
    expect(parseStored(null, TODAY)).toEqual({ goals: [], problem: null });
  });

  it('částečně poškozená data opraví a nahlásí', () => {
    const raw = JSON.stringify({ version: 1, goals: [{ name: 'A', target: 100 }, { name: 'B' }] });
    const result = parseStored(raw, TODAY);
    expect(result.goals).toHaveLength(1);
    expect(result.problem).toBe('repaired');
  });
});
