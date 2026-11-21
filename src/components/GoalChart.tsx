import { useId, useRef } from 'react';
import type { Goal } from '../lib/types';
import { balanceHistory, type GoalStats } from '../lib/stats';
import { dayNumber, fromDayNumber } from '../lib/dates';
import { formatCompact, formatDate, formatKc } from '../lib/format';
import { useElementWidth } from '../hooks/useElementWidth';

type Props = { goal: Goal; stats: GoalStats; today: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hezké dělení osy Y: 3–7 dílků po 1/2/2,5/5 × 10ⁿ, co nejtěsněji nad maximem. */
export function niceScale(maxValue: number): { max: number; ticks: number[] } {
  const top = maxValue > 0 ? maxValue : 1;
  let best: { max: number; step: number } | null = null;
  const exponent = Math.floor(Math.log10(top / 7));
  for (let e = exponent - 1; e <= exponent + 2; e++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * 10 ** e;
      const intervals = Math.ceil(top / step - 1e-9);
      if (intervals < 3 || intervals > 7) continue;
      const max = intervals * step;
      if (!best || max < best.max - 1e-9 || (Math.abs(max - best.max) < 1e-9 && step > best.step)) best = { max, step };
    }
  }
  const { max, step } = best ?? { max: top, step: top / 4 };
  const ticks: number[] = [];
  for (let i = 0; i * step <= max + step / 1000; i++) ticks.push(Math.round(i * step * 100) / 100);
  return { max, ticks };
}

export function GoalChart({ goal, stats: s, today }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useElementWidth(wrapRef);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const width = Math.max(280, measured || 640);
  const narrow = width < 480;
  const height = narrow ? 220 : 260;
  const pad = { top: 30, right: narrow ? 10 : 14, bottom: 30, left: narrow ? 46 : 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const points = balanceHistory(goal);
  const startN = dayNumber(s.start);
  const todayN = dayNumber(today);
  const deadlineN = goal.deadline ? dayNumber(goal.deadline) : null;
  const lastPointN = points.length ? dayNumber(points[points.length - 1].date) : startN;
  const lineEndN = Math.max(todayN, lastPointN, startN);
  let endN = Math.max(lineEndN, deadlineN ?? lineEndN);
  if (endN - startN < 14) endN = startN + 14;

  const peak = points.reduce((m, p) => Math.max(m, p.balance), 0);
  const scale = niceScale(Math.max(goal.target, peak) * 1.06);
  const x = (n: number) => round1(pad.left + ((n - startN) / (endN - startN)) * innerW);
  const y = (v: number) => round1(pad.top + innerH - (Math.min(Math.max(v, 0), scale.max) / scale.max) * innerH);

  // Schodovitá čára: zůstatek drží až do dalšího pohybu, pak skočí.
  let line = `M${x(startN)},${y(0)}`;
  for (const p of points) line += `H${x(dayNumber(p.date))}V${y(p.balance)}`;
  line += `H${x(lineEndN)}`;
  const area = `${line}V${y(0)}H${x(startN)}Z`;

  // Ideální průběh: od zůstatku v den startu rovnoměrně k cílové částce v den termínu.
  const startBalance = points.length && points[0].date === s.start ? points[0].balance : 0;
  const idealEnd = deadlineN !== null && deadlineN > startN ? deadlineN : null;

  const dotX = x(lineEndN);
  const dotY = y(s.saved);
  const dotOnRight = dotX > pad.left + innerW / 2;
  const valueY = dotY - 12 < pad.top + 4 ? dotY + 22 : dotY - 12;
  const targetY = y(goal.target);
  const todayX = x(todayN);
  const showToday = todayN >= startN && todayN <= endN;
  const todayAnchor = todayX > pad.left + innerW - 18 ? 'end' : todayX < pad.left + 18 ? 'start' : 'middle';
  const endLabel = `${deadlineN === endN ? 'termín ' : ''}${formatDate(fromDayNumber(endN))}`;

  const description =
    `Naspořeno ${formatKc(s.saved)} z ${formatKc(goal.target)}. Začátek ${formatDate(s.start)}` +
    (goal.deadline ? `, termín ${formatDate(goal.deadline)}.` : '.');

  return (
    <figure className="chart">
      <div ref={wrapRef} className="chart-canvas">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${uid}-t ${uid}-d`}>
          <title id={`${uid}-t`}>Vývoj naspořené částky</title>
          <desc id={`${uid}-d`}>{description}</desc>
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--goal)', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: 'var(--goal)', stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>

          {scale.ticks.map((value) => (
            <g key={value}>
              <line className="chart-grid" x1={pad.left} x2={pad.left + innerW} y1={y(value)} y2={y(value)} />
              <text className="chart-axis" x={pad.left - 8} y={y(value) + 4} textAnchor="end">
                {value === 0 ? '0' : formatCompact(value)}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#${uid}-fill)`} />
          {idealEnd !== null && (
            <line className="chart-ideal" x1={x(startN)} y1={y(startBalance)} x2={x(idealEnd)} y2={targetY} />
          )}
          <line className="chart-target" x1={pad.left} x2={pad.left + innerW} y1={targetY} y2={targetY} />
          {showToday && (
            <>
              <line className="chart-today" x1={todayX} x2={todayX} y1={pad.top - 4} y2={pad.top + innerH} />
              <text className="chart-axis chart-today-label" x={todayX} y={pad.top - 10} textAnchor={todayAnchor}>
                dnes
              </text>
            </>
          )}
          <path className="chart-line" d={line} />
          <circle className="chart-dot" cx={dotX} cy={dotY} r={5.5} />

          <text className="chart-label" x={dotOnRight ? dotX - 10 : dotX + 10} y={valueY} textAnchor={dotOnRight ? 'end' : 'start'}>
            {formatKc(s.saved)}
          </text>
          <text
            className="chart-label chart-label-muted"
            x={dotOnRight ? pad.left + 6 : pad.left + innerW - 6}
            y={targetY - 8}
            textAnchor={dotOnRight ? 'start' : 'end'}
          >
            Cíl {formatKc(goal.target)}
          </text>

          <text className="chart-axis" x={pad.left} y={height - 8} textAnchor="start">
            {formatDate(s.start)}
          </text>
          <text className="chart-axis" x={pad.left + innerW} y={height - 8} textAnchor="end">
            {endLabel}
          </text>
        </svg>
      </div>
      <figcaption className="chart-legend">
        <span className="legend-item">
          <span className="legend-mark legend-line" aria-hidden="true" />
          Naspořeno
        </span>
        <span className="legend-item">
          <span className="legend-mark legend-target" aria-hidden="true" />
          Cílová částka
        </span>
        {idealEnd !== null && (
          <span className="legend-item">
            <span className="legend-mark legend-ideal" aria-hidden="true" />
            Ideální průběh do termínu
          </span>
        )}
        <span className="legend-item">
          <span className="legend-mark legend-today" aria-hidden="true" />
          Dnes
        </span>
      </figcaption>
    </figure>
  );
}
