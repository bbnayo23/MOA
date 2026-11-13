import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { translate } from '../net/translate';
import { useMoa } from '../store';

/**
 * Chat log + composer. Enter opens the chat from anywhere; Enter again sends and
 * returns the keys to the game. With a bubble language set, what you type goes
 * out translated (shown as you type, once you pause).
 */
export function useChat() {
  const messages = useMoa((st) => st.messages);
  const lang = useMoa((st) => st.lang);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState({ of: '', text: '' });
  const [busy, setBusy] = useState(false);
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

  const typed = text.trim();
  useEffect(() => {
    if (!lang || !typed) return;
    let live = true;
    const t = setTimeout(() => {
      translate(typed, lang).then((out) => live && setPreview({ of: `${lang}:${typed}`, text: out }), () => {});
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [typed, lang]);

  const say = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    const to = useMoa.getState().lang;
    let out = v;
    if (to) {
      setBusy(true);
      out = await translate(v, to).catch(() => {
        useMoa.getState().system('번역이 안 돼서 쓴 그대로 보냈어요.');
        return v;
      });
      setBusy(false);
    }
    const st = useMoa.getState();
    st.say(st.me, out, out === v ? undefined : v);
  };

  return {
    messages,
    lang,
    setLang: useMoa((st) => st.setLang),
    /** What the bubble will say, when it differs from what's typed. */
    preview: lang && preview.of === `${lang}:${typed}` && preview.text !== typed ? preview.text : '',
    busy,
    text,
    setText,
    inputRef,
    logRef,
    sendEmote: say,
    submit: (e: FormEvent) => {
      e.preventDefault();
      void say(text);
      setText('');
      inputRef.current?.blur();
    },
    blurOnEscape: (e: KeyboardEvent<HTMLInputElement>) => e.key === 'Escape' && e.currentTarget.blur(),
  };
}
