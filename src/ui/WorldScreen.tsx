import { useState, type CSSProperties } from 'react';
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
import { InstallButton } from './InstallButton';
import { CheerBoard, FocusTimer, MenuPanel, RallyGame, ThemePreview, Wardrobe } from './Panels';

const EMOTES = ['👋', '❤️', '😆', '😮', '✨'];

/** The world fills the screen; every piece of UI floats on top of it. */
export function WorldScreen() {
  const { theme, panel, preview } = useWorldSession();
  const [drawer, setDrawer] = useState(false);
  if (!theme) return null;
  const hub = theme.themeId === HUB;

  return (
    <div className={s.layout} style={{ '--stage-bg': theme.background.sky[0] } as CSSProperties}>
      <GameCanvas theme={theme} className={s.game} />
      <TopBar theme={theme} drawer={drawer} toggleDrawer={() => setDrawer(!drawer)} />
      {drawer && <Sidebar theme={theme} close={() => setDrawer(false)} />}
      {panel === 'board' && <CheerBoard />}
      {panel === 'timer' && <FocusTimer />}
      {panel === 'menu' && <MenuPanel />}
      {panel === 'rally' && <RallyGame />}
      {panel === 'wardrobe' && <Wardrobe />}
      {preview && <ThemePreview id={preview} />}
      <div className={s.dock}>
        <ChatPanel />
        <ActionBar theme={theme} />
        <p className={s.hint}>
          <span className={s.keys}>클릭·방향키 이동 · Enter 채팅 · </span>
          {hub ? '건물을 눌러 입장' : '오브젝트를 눌러 행동'}
        </p>
      </div>
    </div>
  );
}

interface TopBarProps {
  theme: ThemeConfig;
  drawer: boolean;
  toggleDrawer: () => void;
}

function TopBar({ theme, drawer, toggleDrawer }: TopBarProps) {
  const me = useMoa((st) => st.me);
  const { go, enterTheme } = useMoa.getState();
  return (
    <header className={s.top}>
      <button className={s.menu} aria-label="공간 · 친구 목록" aria-expanded={drawer} onClick={toggleDrawer}>
        ☰
      </button>
      <h1 className={c.logo}>MOA</h1>
      <div className={s.place}>
        <span aria-hidden>{theme.emoji}</span>
        <strong>{theme.name}</strong>
        <span className={s.live}>{FRIENDS.length + 1}명</span>
      </div>
      <div className={s.user}>
        {theme.themeId !== HUB && (
          <button className={c.btn} aria-label="광장으로" onClick={() => enterTheme(HUB)}>
            ⛲<span className={s.label}> 광장으로</span>
          </button>
        )}
        <button className={c.btn} aria-label="꾸미기" onClick={() => go('create')}>
          <AvatarCanvas look={me.look} scale={1} rows={19} />
          <span className={s.label}>{me.nickname} · 꾸미기</span>
        </button>
      </div>
    </header>
  );
}

function Sidebar({ theme, close }: { theme: ThemeConfig; close: () => void }) {
  const me = useMoa((st) => st.me);
  const setLook = useMoa((st) => st.setLook);
  const rooms = useRooms(theme.themeId);
  return (
    <aside className={`${c.card} ${s.side}`}>
      <section>
        <h2>공간 이동</h2>
        <ul className={s.places}>
          {rooms.map((r) => (
            <li key={r.themeId}>
              <button
                aria-current={r.here ? 'location' : undefined}
                onClick={() => {
                  r.go();
                  close();
                }}
              >
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

      <InstallButton />
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
          placeholder="친구들에게 한마디"
          enterKeyHint="send"
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
