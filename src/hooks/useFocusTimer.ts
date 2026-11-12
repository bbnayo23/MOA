import { useEffect, useState } from 'react';
import { toGame } from '../bridge';
import { useMoa } from '../store';

const PRESETS = [5, 15, 25];

/**
 * Pomodoro-style countdown. Counts against an end timestamp, so a throttled
 * background tab still finishes on time.
 */
export function useFocusTimer() {
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [endAt, setEndAt] = useState<number | null>(null);

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const rest = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(rest);
      if (rest === 0) {
        setEndAt(null);
        useMoa.getState().system('⏰ 집중 시간 끝! 수고했어요 🎉');
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  const running = endAt !== null;
  return {
    presets: PRESETS,
    total,
    running,
    clock: `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`,
    progress: 1 - left / total,
    pick: (min: number) => {
      setEndAt(null);
      setTotal(min * 60);
      setLeft(min * 60);
    },
    toggle: () => {
      if (running) return setEndAt(null);
      const start = left || total; // finished → start a fresh round
      setLeft(start);
      setEndAt(Date.now() + start * 1000);
    },
    reset: () => {
      setEndAt(null);
      setLeft(total);
    },
    /** Stops my "studying" action, which closes the timer. */
    close: () => toGame.emit('stop', null),
  };
}
