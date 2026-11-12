import type { CSSProperties } from 'react';
import { HUB, type ThemeConfig } from '../data/themes';
import { useActionBar } from '../hooks/useActionBar';
import { useChat } from '../hooks/useChat';
import { useRooms, useWorldSession } from '../hooks/useWorldSession';
import { FRIENDS } from '../mock';
import { useMoa } from '../store';
import c from '../styles/common.module.scss';
import s from '../styles/WorldScreen.module.scss';
import { AvatarCanvas } from './AvatarCanvas';
import { GameCanvas } from './GameCanvas';
import { CheerBoard, FocusTimer, ThemePreview } from './Panels';

const EMOTES = ['👋', '❤️', '😆', '😮', '✨'];

export function WorldScreen() {
  const { theme, panel, preview } = useWorldSession();
  if (!theme) return null;

  return (
    <div className={s.layout}>
      <TopBar theme={theme} />
      <Sidebar theme={theme} />
      <main className={s.stage} style={{ '--stage-bg': theme.background.sky[0] } as CSSProperties}>
        <GameCanvas theme={theme} className={s.game} />
        <ActionBar theme={theme} />
        {panel === 'board' && <CheerBoard />}
        {panel === 'timer' && <FocusTimer />}
        {preview && <ThemePreview id={preview} />}
        <p className={s.hint}>
          방향키 이동 · Enter 채팅 · {theme.themeId === HUB ? '건물을 클릭해 입장' : '오브젝트 클릭'}
        </p>
      </main>
      <ChatPanel />
    </div>
  );
}

function TopBar({ theme }: { theme: ThemeConfig }) {
  const me = useMoa((st) => st.me);
  const { go, enterTheme } = useMoa.getState();
  return (
    <header className={s.top}>
      <h1 className={c.logo}>MOA</h1>
      <div className={s.place}>
        <span aria-hidden>{theme.emoji}</span>
        <strong>{theme.name}</strong>
        <span className={s.live}>{FRIENDS.length + 1}명 접속 중</span>
      </div>
      <div className={s.user}>
        {theme.themeId !== HUB && (
          <button className={c.btn} onClick={() => enterTheme(HUB)}>
            ⛲ 광장으로
          </button>
        )}
        <AvatarCanvas look={me.look} scale={1} rows={19} />
        <span className={s.nick}>{me.nickname}</span>
        <button className={c.btn} onClick={() => go('create')}>
          🎨 꾸미기
        </button>
      </div>
    </header>
  );
}

function Sidebar({ theme }: { theme: ThemeConfig }) {
  const me = useMoa((st) => st.me);
  const setLook = useMoa((st) => st.setLook);
  const rooms = useRooms(theme.themeId);
  return (
    <aside className={s.side}>
      <section>
        <h2>공간 이동</h2>
        <ul className={s.places}>
          {rooms.map((r) => (
            <li key={r.themeId}>
              <button aria-current={r.here ? 'location' : undefined} onClick={r.go}>
                <span aria-hidden>{r.emoji}</span>
                {r.name}
                {!r.open && <em>준비 중</em>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>친구 {FRIENDS.length + 1}</h2>
        <ul className={s.friends}>
          {[me, ...FRIENDS].map((p) => (
            <li key={p.id}>
              <AvatarCanvas look={p.look} scale={1} rows={19} />
              <span>
                {p.nickname}
                {p.id === 'me' && <small> (나)</small>}
              </span>
              <i className={s.online} aria-label="온라인" />
            </li>
          ))}
        </ul>
      </section>

      {theme.recommendedOutfits.length > 0 && (
        <section>
          <h2>추천 코디</h2>
          <div className={s.outfits}>
            {theme.recommendedOutfits.map((o) => (
              <button key={o.name} className={c.chip} onClick={() => setLook(o.look)}>
                {o.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

function ActionBar({ theme }: { theme: ThemeConfig }) {
  const { target, actions, run, clearTarget } = useActionBar(theme);
  return (
    <div className={s.actions}>
      {target && (
        <span className={s.target}>
          {target.icon} {target.label}
          <button aria-label="닫기" onClick={clearTarget}>
            ×
          </button>
        </span>
      )}
      {actions.map((a) => (
        <button key={a.id} className={c.chip} aria-pressed={a.active} onClick={() => run(a.id)}>
          {a.icon} {a.label}
        </button>
      ))}
    </div>
  );
}

function ChatPanel() {
  const { messages, text, setText, inputRef, logRef, sendEmote, submit, blurOnEscape } = useChat();
  return (
    <section className={s.chat}>
      <ol ref={logRef} className={s.log} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.system ? s.system : m.playerId === 'me' ? s.mine : undefined}>
            {!m.system && <b>{m.nickname}</b>}
            {m.text}
          </li>
        ))}
      </ol>
      <form className={s.compose} onSubmit={submit}>
        <div className={s.emotes}>
          {EMOTES.map((e) => (
            <button key={e} type="button" aria-label={`감정 표현 ${e}`} onClick={() => sendEmote(e)}>
              {e}
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          value={text}
          maxLength={80}
          placeholder="Enter를 눌러 대화하기"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={blurOnEscape}
        />
        <button type="submit" className={c.primary}>
          전송
        </button>
      </form>
    </section>
  );
}
