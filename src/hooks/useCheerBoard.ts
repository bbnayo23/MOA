import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toGame } from '../bridge';
import { useMoa } from '../store';

/** The cheer board: notes everyone left, plus my note composer. */
export function useCheerBoard() {
  const cheers = useMoa((st) => st.cheers);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [cheers]);

  return {
    cheers,
    text,
    setText,
    listRef,
    submit: (e: FormEvent) => {
      e.preventDefault();
      const v = text.trim();
      if (!v) return;
      const st = useMoa.getState();
      st.addCheer(st.me.nickname, v);
      setText('');
    },
    /** Stops my "writing" action, which closes the board. */
    close: () => toGame.emit('stop', null),
    blurOnEscape: (e: KeyboardEvent<HTMLInputElement>) => e.key === 'Escape' && e.currentTarget.blur(),
  };
}
