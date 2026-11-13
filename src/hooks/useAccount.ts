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

/** Supabase's (English) errors → what to do about them. */
const WHY: [RegExp, string][] = [
  [/not authorized/i, '이 주소로는 아직 메일을 보낼 수 없어요. Supabase에 메일 서버(SMTP)를 연결해야 해요.'],
  [/rate limit|after \d+ seconds/i, '메일을 너무 자주 요청했어요. 잠시 뒤에 다시 해 주세요.'],
  [/sending/i, '메일을 보내지 못했어요. Supabase의 SMTP 설정(Gmail 주소·앱 비밀번호)을 확인해 주세요.'],
  [/format/i, '이메일 주소를 다시 확인해 주세요.'],
  [/expired|invalid/i, '링크나 코드가 만료됐거나 이미 쓰였어요. 메일을 다시 받아 주세요.'],
  [/fetch/i, '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'],
];
const failed = (m: string) => {
  const hit = WHY.find(([re]) => re.test(m));
  return `로그인하지 못했어요: ${hit ? `${hit[1]} (${m})` : m}`;
};

/** A mail link that didn't work comes back as #error_description=… (read before supabase-js tidies the URL). */
const linkError = new URLSearchParams(location.hash.slice(1)).get('error_description');

/** The email sign-in form: a 6-digit code (or the link in the same email). */
export function useLogin() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? failed(linkError) : '');
  const run = async (e: FormEvent, task: () => Promise<{ error: { message: string } | null }>) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await task();
    setBusy(false);
    if (error) setError(failed(error.message));
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
