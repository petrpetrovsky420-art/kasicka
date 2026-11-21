export type Deposit = {
  id: string;
  /** Kladné = vklad, záporné = výběr. */
  amount: number;
  /** 'YYYY-MM-DD' */
  date: string;
  note?: string;
};

export type Goal = {
  id: string;
  name: string;
  /** Cílová částka v Kč, > 0. */
  target: number;
  /** 'YYYY-MM-DD', nepovinné. */
  deadline?: string;
  /** Jedna ze 6 předdefinovaných barev (viz colors.ts). */
  color: string;
  /** 'YYYY-MM-DD' */
  createdAt: string;
  deposits: Deposit[];
};

/** Poznámka prvního vkladu, který vznikne z pole „Už mám naspořeno“. */
export const INITIAL_DEPOSIT_NOTE = 'Počáteční stav';

export const NAME_MAX = 60;
export const NOTE_MAX = 120;
/** Strop pro jednu částku, ať nás nerozhodí nesmysl jako 1e300. */
export const AMOUNT_MAX = 1_000_000_000;
