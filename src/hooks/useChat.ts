import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { openDm, sendDm, useSocial } from '../net/social';
import { supabase } from '../net/supabase';
import { roomOf, useMoa } from '../store';

/**
 * Chat log + composer. Enter opens the chat from anywhere; Enter again sends and
 * returns the keys to the game. The mode picks who hears it: everyone in this
 * place, or (with a server) one person as a whisper.
 */
export function useChat() {
  const messages = useMoa((st) => st.messages);
  const [text, setText] = useState('');
  const [to, setTo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const targets = useWhisperTargets();

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
    if (to) {
      void sendDm(to, v);
      if (!useSocial.getState().dm.open) openDm(to);
      return;
    }
    const st = useMoa.getState();
    st.say(st.me, v);
  };

  return {
    messages,
    text,
    setText,
    /** '' : everyone here; otherwise whom I'm whispering to. */
    to,
    setTo,
    targets,
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

/** Whom I could whisper to from the chat box: people in my place, friends, and whoever I've whispered with. */
function useWhisperTargets() {
  const [peers, roomId] = useMoa(useShallow((st) => [st.peers, roomOf(st).id]));
  const { people, friends, dms, blocks } = useSocial(useShallow((s) => ({ people: s.people, friends: s.friends, dms: s.dms, blocks: s.blocks })));
  if (!supabase) return [];
  const me = useMoa.getState().me.id;
  const names = new Map<string, string>();
  for (const p of peers) if (p.room.id === roomId) names.set(p.id, p.nickname);
  for (const f of friends) if (f.accepted) names.set(f.from_id === me ? f.to_id : f.from_id, '');
  for (const d of dms) names.set(d.from_id === me ? d.to_id : d.from_id, '');
  return [...names]
    .filter(([id]) => id !== me && !blocks.includes(id))
    .map(([id, n]) => ({ id, nickname: n || people[id]?.nickname || '…' }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
}
