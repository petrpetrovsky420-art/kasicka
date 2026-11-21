import type { CSSProperties } from 'react';

export type GoalColor = {
  /** Ukládá se do dat a používá ve světlém režimu. */
  value: string;
  /** Světlejší odstín pro tmavý režim. */
  dark: string;
  name: string;
};

export const GOAL_COLORS: readonly GoalColor[] = [
  { value: '#16a34a', dark: '#4ade80', name: 'Zelená' },
  { value: '#2563eb', dark: '#60a5fa', name: 'Modrá' },
  { value: '#9333ea', dark: '#c084fc', name: 'Fialová' },
  { value: '#db2777', dark: '#f472b6', name: 'Růžová' },
  { value: '#ea580c', dark: '#fb923c', name: 'Oranžová' },
  { value: '#0d9488', dark: '#2dd4bf', name: 'Tyrkysová' },
];

export const DEFAULT_COLOR = GOAL_COLORS[0].value;

export function normalizeColor(value: unknown): string {
  if (typeof value === 'string') {
    const wanted = value.trim().toLowerCase();
    const match = GOAL_COLORS.find((c) => c.value === wanted);
    if (match) return match.value;
  }
  return DEFAULT_COLOR;
}

export function colorInfo(value: string): GoalColor {
  return GOAL_COLORS.find((c) => c.value === value) ?? GOAL_COLORS[0];
}

/** První barva, kterou ještě žádný cíl nemá; když jsou všechny pryč, jedeme dokola. */
export function nextFreeColor(used: readonly string[]): string {
  const free = GOAL_COLORS.find((c) => !used.includes(c.value));
  return (free ?? GOAL_COLORS[used.length % GOAL_COLORS.length]).value;
}

/** CSS proměnné pro barvu cíle; --goal se z nich vybere podle světlého/tmavého režimu. */
export function goalStyle(value: string): CSSProperties {
  const color = colorInfo(value);
  return { '--goal-l': color.value, '--goal-d': color.dark } as CSSProperties;
}
