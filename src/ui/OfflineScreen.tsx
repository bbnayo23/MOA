import c from '../styles/common.module.scss';
import s from '../styles/OfflineScreen.module.scss';

/** The server wouldn't let us in (it's down, or anonymous sign-ins are switched off in Supabase). */
export function OfflineScreen({ why }: { why: string }) {
  return (
    <main className={s.page}>
      <section className={`${c.card} ${s.card}`}>
        <h1 className={c.logo}>
          MOA <small>우리의 순간이 모이는 곳</small>
        </h1>
        <p className={s.error}>
          MOA에 들어가지 못했어요. 잠시 뒤에 다시 열어 주세요.
          <small>({why})</small>
        </p>
        <button className={c.primary} onClick={() => location.reload()}>
          다시 시도
        </button>
      </section>
    </main>
  );
}
