/**
 * Převede to, co člověk napíše do pole s částkou, na číslo.
 * Zvládne „30 000“, „1 250,50“, „1250.5“, „30.000“, „500 Kč“ i „500,-“.
 * Když to číslo není, vrátí null.
 */
export function parseAmount(input: string): number | null {
  let s = input
    .replace(/[\s  ]/g, '')
    .replace(/kč$/i, '')
    .replace(/,[-–—]$/, '');
  if (s === '') return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot > lastComma) {
    // Anglický zápis „1,250.75“: čárky jsou tisíce.
    s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Český zápis „1.250,75“: čárka je desetinná, tečky jsou tisíce.
    if (s.indexOf(',') !== lastComma) return null;
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // „30.000“ nebo „1.250.000“: tečky jako oddělovače tisíců.
    s = s.replace(/\./g, '');
  }

  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/** Zaokrouhlí na haléře, ať se nesčítá šum typu 0,1 + 0,2. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
