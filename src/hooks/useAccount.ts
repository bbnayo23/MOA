import { useEffect, useState } from 'react';
import { startSocial } from '../net/social';
import { loadProfile, saveProfile, supabase } from '../net/supabase';
import { useMoa } from '../store';

/** 'out' with no `why`: signed out on purpose (log in, or start a new character). */
export type Account = { status: 'loading' | 'in' } | { status: 'out'; why: string };

// An ID + password make the account one you can log back into (from any device). Supabase
// accounts are keyed by email, so the ID becomes one at a domain that never receives mail
// (needs Authentication → Email → "Confirm email" off: there's nothing to confirm).
const DOMAIN = 'users.moa.invalid';
export const ID_RULE = /^[a-z0-9_]{3,20}$/;
/** The ID this account logs in with, if it has one. */
export const accountId = (email?: string | null) => (email?.endsWith(`@${DOMAIN}`) ? email.slice(0, -DOMAIN.length - 1) : null);

const why = (message: string) =>
  /invalid login/i.test(message)
    ? '아이디나 비밀번호가 맞지 않아요.'
    : /already|exists|registered/i.test(message)
      ? '이미 쓰고 있는 아이디예요.'
      : /password/i.test(message)
        ? '비밀번호는 6자 이상으로 해 주세요.'
        : message;

/** Give this (anonymous) account an ID and password. Returns an error to show, or ''. */
export async function claimAccount(id: string, password: string) {
  const { data, error } = await supabase!.auth.updateUser({ email: `${id}@${DOMAIN}`, password });
  if (error) return why(error.message);
  // still waiting on a confirmation mail: the project wants emails confirmed
  return data.user.email ? '' : 'Supabase에서 이메일 확인(Confirm email)을 꺼야 아이디를 만들 수 있어요.';
}

export async function logIn(id: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email: `${id.trim().toLowerCase()}@${DOMAIN}`, password });
  return error ? why(error.message) : '';
}

export const logOut = () => supabase!.auth.signOut();

/** A brand-new character (a new anonymous account). */
export const startFresh = async () => {
  const { error } = await supabase!.auth.signInAnonymously();
  return error ? why(error.message) : '';
};

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
      if (event === 'SIGNED_OUT') {
        who = '';
        useMoa.getState().signOut();
        setAccount({ status: 'out', why: '' });
        return;
      }
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

  // friends, whispers, invites: loaded and kept live while signed in (as whoever I am now)
  const meId = useMoa((st) => st.me.id);
  useEffect(() => (supabase && state === 'in' ? startSocial() : undefined), [state, meId]);

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
