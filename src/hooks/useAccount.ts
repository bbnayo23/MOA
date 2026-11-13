import { useEffect, useState, type FormEvent } from 'react';
import { loadProfile, saveProfile, supabase } from '../net/supabase';
import { useMoa } from '../store';

/**
 * Sign-in state. Without Supabase there are no accounts: you're simply "in".
 * With it: restore the session, load the profile (look, nickname, last place),
 * and from then on keep the profile saved as things change.
 */
export function useAccount() {
  const [state, setState] = useState<'loading' | 'out' | 'in'>(supabase ? 'loading' : 'in');

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
      if (!session) return setState('out');
      // supabase-js: don't await its own calls inside this callback
      setTimeout(async () => {
        const profile = await loadProfile(session.user.id).catch(() => null);
        useMoa.getState().signIn(session.user.id, profile);
        setState('in');
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

  return state;
}

/** The email sign-in form: a 6-digit code (or the link in the same email). */
export function useLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (e: FormEvent, task: () => Promise<{ error: { message: string } | null }>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await task();
    setBusy(false);
    if (error) setError(`로그인하지 못했어요: ${error.message}`);
    return !error;
  };
  return {
    email, setEmail, code, setCode, sent, busy, error,
    sendCode: async (e: FormEvent) => {
      const ok = await run(e, () => supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } }));
      if (ok) setSent(true);
    },
    verify: (e: FormEvent) => run(e, () => supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })),
    restart: () => (setSent(false), setCode(''), setError('')),
  };
}

export const signOut = () => supabase?.auth.signOut();
