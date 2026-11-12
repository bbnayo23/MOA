import { useState } from 'react';
import { toGame } from '../bridge';
import { MENU, type MenuItem } from '../data/themes/restaurant';
import { useMoa } from '../store';

const SERVE_MS = 2500;

/** Ordering at the counter: say it out loud, and the dish is "served" a moment later. */
export function useMenu() {
  const [ordered, setOrdered] = useState<string[]>([]);

  return {
    menu: MENU,
    ordered,
    order: (item: MenuItem) => {
      const st = useMoa.getState();
      st.say(st.me, `${item.emoji} ${item.name} 주세요!`);
      setOrdered((o) => [...o, item.name]);
      // not cleared on close: you can walk to a table while it's being made
      setTimeout(() => {
        const now = useMoa.getState();
        if (now.themeId === 'restaurant')
          now.system(`${item.emoji} ${item.name} 나왔어요! 테이블에서 '식사하기'로 먹어 보세요`);
      }, SERVE_MS);
    },
    close: () => toGame.emit('stop', null),
  };
}
