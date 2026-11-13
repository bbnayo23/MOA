import { useLogin } from '../hooks/useAccount';
import c from '../styles/common.module.scss';
import s from '../styles/LoginScreen.module.scss';

/** Email sign-in (Supabase mode only). */
export function LoginScreen() {
  const l = useLogin();
  return (
    <main className={s.page}>
      <section className={`${c.card} ${s.card}`}>
        <h1 className={c.logo}>
          MOA <small>우리의 순간이 모이는 곳</small>
        </h1>
        {!l.sent ? (
          <form onSubmit={l.sendCode} className={s.form}>
            <label>
              <span>이메일로 들어가기</span>
              <input type="email" required autoComplete="email" value={l.email} placeholder="you@example.com" onChange={(e) => l.setEmail(e.target.value)} />
            </label>
            <button className={c.primary} disabled={l.busy}>
              로그인 코드 받기
            </button>
          </form>
        ) : (
          <form onSubmit={l.verify} className={s.form}>
            <label>
              <span>{l.email}로 보낸 6자리 코드</span>
              <input inputMode="numeric" autoComplete="one-time-code" required value={l.code} placeholder="123456" onChange={(e) => l.setCode(e.target.value)} />
            </label>
            <button className={c.primary} disabled={l.busy}>
              들어가기
            </button>
            <p className={c.note}>메일에 있는 링크를 눌러도 바로 들어와져요.</p>
            <button type="button" className={c.btn} onClick={l.restart}>
              다른 이메일로
            </button>
          </form>
        )}
        {l.error && <p className={s.error}>{l.error}</p>}
      </section>
    </main>
  );
}
