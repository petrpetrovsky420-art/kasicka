import { useEffect, useState } from 'react';
import { todayISO } from '../lib/dates';

/** Dnešní datum, které se samo přepne po půlnoci nebo po návratu do aplikace. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const check = () => setToday((current) => {
      const now = todayISO();
      return now === current ? current : now;
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, []);

  return today;
}
