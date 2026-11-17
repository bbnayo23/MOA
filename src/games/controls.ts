import { useEffect, useRef } from 'react';

const typing = () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

/**
 * A held direction (← → / A D, or a touch button held down) and an action key
 * (Space). Ignored while typing in the chat. Read `dir()` every frame.
 */
export function useHeld(active: boolean) {
  const st = useRef({ keys: new Set<string>(), touch: 0, act: () => {} }).current;
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (typing()) return;
      if ([...LEFT, ...RIGHT].includes(e.code)) {
        e.preventDefault();
        st.keys.add(e.code);
      } else if (e.code === 'Space') {
        e.preventDefault(); // and no "click" on a focused button
        if (!e.repeat) st.act();
      }
    };
    const up = (e: KeyboardEvent) => st.keys.delete(e.code);
    const clear = () => st.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [active, st]);
  return {
    /** −1 left · 0 · 1 right */
    dir: () => st.touch || (RIGHT.some((k) => st.keys.has(k)) ? 1 : 0) - (LEFT.some((k) => st.keys.has(k)) ? 1 : 0),
    press: (d: number) => (st.touch = d),
    onSwing: (fn: () => void) => (st.act = fn),
  };
}

/** Left / right as separate taps (← A · → D), e.g. strokes. Ignored while typing in the chat. */
export function useTaps(active: boolean, tap: (side: 'L' | 'R') => void) {
  const fn = useRef(tap);
  fn.current = tap;
  useEffect(() => {
    if (!active) return;
    const down = (e: KeyboardEvent) => {
      if (typing() || e.repeat) return;
      if (LEFT.includes(e.code)) fn.current('L');
      else if (RIGHT.includes(e.code)) fn.current('R');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [active]);
}

/** One-shot keys by code (Space, Digit1…), no auto-repeat; `up` fires on release. Ignored while typing in the chat. */
export function useKeys(active: boolean, down: Record<string, () => void>, up: Record<string, () => void> = {}) {
  const fns = useRef({ down, up });
  fns.current = { down, up };
  useEffect(() => {
    if (!active) return;
    const on = (which: 'down' | 'up') => (e: KeyboardEvent) => {
      const fn = fns.current[which][e.code];
      if (!fn || typing() || e.repeat) return;
      e.preventDefault(); // and no "click" on a focused button
      fn();
    };
    const d = on('down'), u = on('up');
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => {
      window.removeEventListener('keydown', d);
      window.removeEventListener('keyup', u);
    };
  }, [active]);
}
