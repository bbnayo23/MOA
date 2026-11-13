import { useEffect, useState } from 'react';
import { loadProfile, saveProfile, supabase } from '../net/supabase';
import { useMoa } from '../store';

export type Account = { status: 'loading' | 'in' } | { status: 'out'; why: string };

/**
 * Sign-in state. Without Supabase there are no accounts: you're simply "in".
 * With it, coming in by the address is joining: the first visit makes an
 * anonymous account that lives in this browser (no email), whose profile
 * (look, nickname, last place) is loaded and from then on kept saved.
 */
export function useAccount() {
  const [account, setAccount] = useState<Account>({ status: supabase ? 'loading' : 'in' });
  const state = account.status;

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    let who = '';
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') return;
      // supabase-js: don't await its own calls inside this callback
      setTimeout(async () => {
        if (!session) {
          const { error } = await sb.auth.signInAnonymously(); // SIGNED_IN follows
          if (error) setAccount({ status: 'out', why: error.message });
          return;
        }
        // SIGNED_IN comes again whenever the tab is refocused: only the first one loads me
        if (session.user.id === who) return;
        who = session.user.id;
        const profile = await loadProfile(session.user.id).catch(() => null);
        useMoa.getState().signIn(session.user.id, profile);
        setAccount({ status: 'in' });
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || state !== 'in') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = undefined;
      const { me, last } = useMoa.getState();
      if (me.nickname) void saveProfile({ id: me.id, nickname: me.nickname, look: me.look, theme_id: last?.themeId ?? null, pos: last?.pos ?? null });
    };
    // look / name right away (debounced), position at most every 5 s
    const unsub = useMoa.subscribe((s, prev) => {
      if (s.me !== prev.me) {
        clearTimeout(timer);
        timer = setTimeout(save, 800);
      } else if (s.last !== prev.last && !timer) timer = setTimeout(save, 5000);
    });
    const flush = () => document.visibilityState === 'hidden' && save();
    document.addEventListener('visibilitychange', flush);
    return () => {
      unsub();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [state]);

  return account;
}
