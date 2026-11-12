import { useState, type CSSProperties } from 'react';
import { THEMES, THEME_CONFIGS, type ThemeId } from '../data/themes';
import { useMoa } from '../store';
import { AvatarCanvas } from './AvatarCanvas';
import c from './common.module.scss';
import s from './ThemeScreen.module.scss';

const floor = (colors: [string, string]) => ({ '--a': colors[0], '--b': colors[1] }) as CSSProperties;

export function ThemeScreen() {
  const me = useMoa((st) => st.me);
  const { go, enterTheme } = useMoa.getState();
  const [sel, setSel] = useState<ThemeId>(useMoa.getState().preview);
  const theme = THEMES.find((t) => t.themeId === sel)!;
  const open = sel in THEME_CONFIGS;

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={c.logo}>MOA</h1>
        <button className={c.btn} onClick={() => go('create')}>
          <AvatarCanvas look={me.look} scale={1} rows={19} /> {me.nickname} · 꾸미기
        </button>
      </header>

      <div className={s.intro}>
        <span className={s.step}>STEP 2 · 공간 고르기</span>
        <h2>오늘은 어디서 모일까?</h2>
      </div>

      <main className={s.body}>
        <ul className={s.grid}>
          {THEMES.map((t) => {
            const playable = t.themeId in THEME_CONFIGS;
            return (
              <li key={t.themeId}>
                <button
                  className={s.card}
                  aria-pressed={sel === t.themeId}
                  onClick={() => setSel(t.themeId)}
                  onDoubleClick={() => playable && enterTheme(t.themeId)}
                >
                  <div className={s.scene} style={floor(t.colors)}>
                    <div className={s.iso} />
                    <span className={s.emoji}>{t.emoji}</span>
                  </div>
                  <strong>{t.name}</strong>
                  <span className={s.tagline}>{t.tagline}</span>
                  <span className={playable ? s.badgeOpen : s.badgeSoon}>{playable ? 'OPEN' : '준비 중'}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <aside className={`${c.card} ${s.detail}`}>
          <div className={s.scene} style={floor(theme.colors)}>
            <div className={s.iso} />
            <span className={s.emoji}>{theme.emoji}</span>
          </div>
          <h3>{theme.name}</h3>
          <p className={s.tagline}>{theme.tagline}</p>
          <h4>할 수 있는 것</h4>
          <ul className={s.acts}>
            {theme.activities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <button className={c.primary} disabled={!open} onClick={() => enterTheme(sel)}>
            {open ? `${theme.name} 입장하기 →` : '미리보기 · 곧 열려요'}
          </button>
        </aside>
      </main>
    </div>
  );
}
