import { useState, type FormEvent } from 'react';
import { logIn, startFresh } from '../hooks/useAccount';
import c from '../styles/common.module.scss';
import s from '../styles/OfflineScreen.module.scss';

/**
 * Not signed in. Logged out on purpose (no `why`): log back in with an ID, or
 * start a new character. Otherwise the server wouldn't let us in (it's down,
 * or anonymous sign-ins are switched off in Supabase).
 */
export function OfflineScreen({ why }: { why: string }) {
  return (
    <main className={s.page}>
      <section className={`${c.card} ${s.card}`}>
        <h1 className={c.logo}>
          MOA <small>우리의 순간이 모이는 곳</small>
        </h1>
        {why ? (
          <>
            <p className={s.error}>
              MOA에 들어가지 못했어요. 잠시 뒤에 다시 열어 주세요.
              <small>({why})</small>
            </p>
            <button className={c.primary} onClick={() => location.reload()}>
              다시 시도
            </button>
          </>
        ) : (
          <>
            <LoginForm />
            <button className={c.btn} onClick={() => void startFresh()}>
              새 캐릭터로 시작하기
            </button>
          </>
        )}
      </section>
    </main>
  );
}

/** ID + password → that account (its character, space and whispers). */
export function LoginForm() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await logIn(id, password));
    setBusy(false);
  };
  return (
    <form className={s.login} onSubmit={submit}>
      <input value={id} autoComplete="username" placeholder="아이디" aria-label="아이디" onChange={(e) => setId(e.target.value)} />
      <input value={password} type="password" autoComplete="current-password" placeholder="비밀번호" aria-label="비밀번호" onChange={(e) => setPassword(e.target.value)} />
      {error && <p className={s.error}>{error}</p>}
      <button className={c.primary} disabled={busy || !id || !password}>
        {busy ? '들어가는 중…' : '로그인'}
      </button>
    </form>
  );
}
