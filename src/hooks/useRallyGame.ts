import { useEffect, useState } from 'react';
import { toGame } from '../bridge';
import { useMoa } from '../store';
import { startRally, stepRally, swingRally, ZONE, type Rally } from './rallyGame';

/** Runs the rally rules on animation frames; Space or the button swings. */
export function useRallyGame() {
  const [rally, setRally] = useState<Rally | null>(null);
  const [best, setBest] = useState(0);
  const playing = !!rally && !rally.over;
  const swing = () => setRally((r) => r && swingRally(r));

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function loop(now) {
      // read the step *now*: the updater runs later, after `last` has moved on
      const dt = (now - last) / 1000;
      last = now;
      setRally((r) => r && stepRally(r, dt));
      raf = requestAnimationFrame(loop);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || document.activeElement instanceof HTMLInputElement) return;
      e.preventDefault(); // also stops Space from "clicking" a focused button
      swing();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [playing]);

  const finalHits = rally?.over ? rally.hits : null;
  useEffect(() => {
    if (finalHits === null) return;
    setBest((b) => Math.max(b, finalHits));
    useMoa.getState().system(`🎾 하루와 랠리 ${finalHits}회!`);
  }, [finalHits]);

  return {
    zone: ZONE,
    pos: rally?.pos ?? 0,
    hits: rally?.hits ?? 0,
    best,
    state: !rally ? 'ready' : rally.over ? 'over' : 'playing',
    start: () => setRally(startRally()),
    swing,
    /** Stops my action, which closes the game. */
    close: () => toGame.emit('stop', null),
  } as const;
}
