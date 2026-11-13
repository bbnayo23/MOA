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
              로그인 메일 받기
            </button>
          </form>
        ) : (
          // the email's link signs you in; a code only appears if the email template carries one
          <form onSubmit={l.verify} className={s.form}>
            <p className={s.sent}>
              📩 <b>{l.email}</b>로 로그인 메일을 보냈어요.
              <br />
              메일 속 <b>로그인 링크</b>를 누르면 바로 들어와져요.
            </p>
            <label>
              <span>메일에 6자리 코드가 있다면</span>
              <input inputMode="numeric" autoComplete="one-time-code" required value={l.code} placeholder="123456" onChange={(e) => l.setCode(e.target.value)} />
            </label>
            <button className={c.btn} disabled={l.busy}>
              코드로 들어가기
            </button>
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
