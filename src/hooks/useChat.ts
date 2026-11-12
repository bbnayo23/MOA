import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMoa } from '../store';

/** Chat log + composer. Enter opens the chat from anywhere; Enter again sends and returns the keys to the game. */
export function useChat() {
  const messages = useMoa((st) => st.messages);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const say = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const st = useMoa.getState();
    st.say(st.me, v);
  };

  return {
    messages,
    text,
    setText,
    inputRef,
    logRef,
    sendEmote: say,
    submit: (e: FormEvent) => {
      e.preventDefault();
      say(text);
      setText('');
      inputRef.current?.blur();
    },
    blurOnEscape: (e: KeyboardEvent<HTMLInputElement>) => e.key === 'Escape' && e.currentTarget.blur(),
  };
}
