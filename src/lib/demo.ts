import type { Goal } from './types';
import { addDays } from './dates';
import { GOAL_COLORS } from './colors';

/**
 * Ukázkové cíle pro prázdný stav. Data jsou relativní k dnešku, takže stavy vypadají
 * pořád stejně: jeden cíl stíhá, jeden potřebuje zrychlit a jeden je bez termínu.
 * Nikam se neukládají.
 */
export function makeDemoGoals(today: string): Goal[] {
  const day = (offset: number) => addDays(today, offset);
  return [
    {
      id: 'demo-dovolena',
      name: 'Dovolená u moře',
      target: 30_000,
      deadline: day(236),
      color: GOAL_COLORS[1].value,
      createdAt: day(-95),
      deposits: [
        { id: 'demo-d1', amount: 5_000, date: day(-95), note: 'Počáteční stav' },
        { id: 'demo-d2', amount: 2_500, date: day(-75), note: 'Z výplaty' },
        { id: 'demo-d3', amount: 2_500, date: day(-45), note: 'Z výplaty' },
        { id: 'demo-d4', amount: 2_500, date: day(-14), note: 'Z výplaty' },
      ],
    },
    {
      id: 'demo-notebook',
      name: 'Nový notebook',
      target: 24_000,
      deadline: day(70),
      color: GOAL_COLORS[4].value,
      createdAt: day(-60),
      deposits: [
        { id: 'demo-n1', amount: 2_000, date: day(-60), note: 'Počáteční stav' },
        { id: 'demo-n2', amount: 1_500, date: day(-31), note: 'Z výplaty' },
        { id: 'demo-n3', amount: -500, date: day(-20), note: 'Oprava kola' },
        { id: 'demo-n4', amount: 1_500, date: day(-3), note: 'Z výplaty' },
      ],
    },
    {
      id: 'demo-rezerva',
      name: 'Rezerva na horší časy',
      target: 50_000,
      color: GOAL_COLORS[0].value,
      createdAt: day(-240),
      deposits: [
        { id: 'demo-r1', amount: 3_000, date: day(-240), note: 'Počáteční stav' },
        { id: 'demo-r2', amount: 2_500, date: day(-212), note: 'Trvalý příkaz' },
        { id: 'demo-r3', amount: 2_500, date: day(-182), note: 'Trvalý příkaz' },
        { id: 'demo-r4', amount: 2_500, date: day(-151), note: 'Trvalý příkaz' },
        { id: 'demo-r5', amount: 1_500, date: day(-130), note: 'Prodej starého mobilu' },
        { id: 'demo-r6', amount: 2_500, date: day(-121), note: 'Trvalý příkaz' },
        { id: 'demo-r7', amount: 2_500, date: day(-90), note: 'Trvalý příkaz' },
        { id: 'demo-r8', amount: 2_500, date: day(-60), note: 'Trvalý příkaz' },
        { id: 'demo-r9', amount: 2_500, date: day(-29), note: 'Trvalý příkaz' },
      ],
    },
  ];
}
