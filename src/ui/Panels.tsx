import { THEMES, type ThemeId } from '../data/themes';
import { useCheerBoard } from '../hooks/useCheerBoard';
import { useMoa } from '../store';
import c from '../styles/common.module.scss';
import s from '../styles/Panels.module.scss';

/** A building that isn't open yet: what you'll be able to do there. */
export function ThemePreview({ id }: { id: ThemeId }) {
  const t = THEMES.find((x) => x.themeId === id)!;
  const showPreview = useMoa((st) => st.showPreview);
  return (
    <section className={`${c.card} ${s.panel}`} aria-label={`${t.name} 미리보기`}>
      <header>
        <h2>
          {t.emoji} {t.name}
        </h2>
        <button aria-label="닫기" onClick={() => showPreview(null)}>
          ×
        </button>
      </header>
      <p className={s.tagline}>{t.tagline}</p>
      <ul className={s.acts}>
        {t.activities.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p className={s.soon}>🔒 아직 공사 중이에요. 곧 열려요!</p>
    </section>
  );
}

/** Opens while I'm at the board (action `opens: 'board'`); moving away closes it. */
export function CheerBoard() {
  const { cheers, text, setText, listRef, submit, close, blurOnEscape } = useCheerBoard();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="응원 보드">
      <header>
        <h2>💌 응원 보드</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <ul ref={listRef} className={s.notes}>
        {cheers.map((n) => (
          <li key={n.id}>
            <p>{n.text}</p>
            <span>— {n.nickname}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <input
          autoFocus
          value={text}
          maxLength={40}
          placeholder="친구에게 응원 한마디"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={blurOnEscape}
        />
        <button type="submit" className={c.primary}>
          붙이기
        </button>
      </form>
    </section>
  );
}
