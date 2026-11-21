import { describe, expect, it } from 'vitest';
import type { Goal } from './types';
import { createBackup, mergeGoals, previewImport } from './backup';

const TODAY = '2026-11-21';

const goal = (id: string, name = id): Goal => ({
  id,
  name,
  target: 1_000,
  color: '#16a34a',
  createdAt: '2026-10-01',
  deposits: [{ id: `${id}-d`, amount: 100, date: '2026-10-01' }],
});

describe('záloha a obnova', () => {
  it('záloha jde zpátky načíst beze ztráty', () => {
    const goals = [goal('a'), { ...goal('b'), deadline: '2027-01-01' }];
    const text = createBackup(goals, new Date('2026-11-21T10:00:00Z'));
    const data = JSON.parse(text);
    expect(data).toMatchObject({ app: 'kasicka', version: 1, exportedAt: '2026-11-21T10:00:00.000Z' });

    const preview = previewImport(text, [], TODAY);
    expect(preview).toEqual({ ok: true, goals, added: 2, replaced: 0, skippedGoals: 0, skippedDeposits: 0 });
  });

  it('přijme i holé pole cílů', () => {
    const preview = previewImport(JSON.stringify([goal('a')]), [], TODAY);
    expect(preview.ok && preview.added).toBe(1);
  });

  it('spočítá nové, přepsané a přeskočené', () => {
    const text = JSON.stringify({
      goals: [goal('a', 'Nové A'), goal('x'), { name: '' }, { ...goal('y'), deposits: [{ amount: 'x' }] }],
    });
    const preview = previewImport(text, [goal('a'), goal('b')], TODAY);
    expect(preview).toMatchObject({ ok: true, added: 2, replaced: 1, skippedGoals: 1, skippedDeposits: 1 });
  });

  it('nevalidní text odmítne s českou hláškou', () => {
    for (const text of ['', '{', '{"cile": []}', '[]', '[{"name": ""}]']) {
      const preview = previewImport(text, [], TODAY);
      expect(preview.ok).toBe(false);
      if (!preview.ok) expect(preview.error.length).toBeGreaterThan(10);
    }
  });
});

describe('mergeGoals', () => {
  it('nové přidá na konec a stejné id přepíše na jeho místě', () => {
    const merged = mergeGoals([goal('a'), goal('b')], [goal('b', 'Nové B'), goal('c')]);
    expect(merged.map((g) => `${g.id}:${g.name}`)).toEqual(['a:a', 'b:Nové B', 'c:c']);
  });

  it('dvě stejná id v záloze: vyhraje poslední', () => {
    const merged = mergeGoals([], [goal('a', 'První'), goal('a', 'Druhý')]);
    expect(merged.map((g) => g.name)).toEqual(['Druhý']);
  });
});
