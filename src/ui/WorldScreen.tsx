import { useState, type CSSProperties } from 'react';
import { HUB, type ThemeConfig } from '../data/themes';
import { useActionBar } from '../hooks/useActionBar';
import { useChat } from '../hooks/useChat';
import { useRealtime } from '../hooks/useRealtime';
import { useZoom } from '../hooks/useZoom';
import { useRooms, useWorldSession } from '../hooks/useWorldSession';
import { FRIENDS } from '../mock';
import { supabase } from '../net/supabase';
import { useMoa } from '../store';
import c from '../styles/common.module.scss';
import s from '../styles/WorldScreen.module.scss';
import { AvatarImage } from './AvatarImage';
import { ZOOM } from '../world/camera';
import { World } from '../world/World';
import { InstallButton } from './InstallButton';
import { CheerBoard, FocusTimer, MenuPanel, RallyGame, ThemePreview, Wardrobe } from './Panels';

const EMOTES = ['👋', '❤️', '😆', '😮', '✨'];

/** The world fills the screen; every piece of UI floats on top of it. */
export function WorldScreen() {
  const { theme, panel, preview } = useWorldSession();
  useRealtime();
  const [drawer, setDrawer] = useState(false);
  if (!theme) return null;
  const hub = theme.themeId === HUB;

  return (
    <div className={s.layout} style={{ '--stage-bg': theme.background.sky[0] } as CSSProperties}>
      <World theme={theme} className={s.game} />
      <TopBar theme={theme} drawer={drawer} toggleDrawer={() => setDrawer(!drawer)} />
      <ZoomControls />
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

/** + / − / back to the default view, with the current zoom. */
function ZoomControls() {
  const z = useZoom();
  return (
    <div className={s.zoom} role="group" aria-label="화면 확대·축소">
      <button aria-label="확대" onClick={z.zoomIn} disabled={z.pct >= ZOOM.max * 100}>
        +
      </button>
      <span aria-live="polite">{z.pct}%</span>
      <button aria-label="축소" onClick={z.zoomOut} disabled={z.pct <= ZOOM.min * 100}>
        −
      </button>
      <button aria-label="기본 화면으로" onClick={z.reset} className={s.home}>
        ⟲
      </button>
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
  const online = useOnline();
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
        <span className={s.live}>{online.length}명</span>
      </div>
      <div className={s.user}>
        {theme.themeId !== HUB && (
          <button className={c.btn} aria-label="광장으로" onClick={() => enterTheme(HUB)}>
            ⛲<span className={s.label}> 광장으로</span>
          </button>
        )}
        <button className={c.btn} aria-label="꾸미기" onClick={() => go('create')}>
          <AvatarImage look={me.look} className={s.face} />
          <span className={s.label}>{me.nickname} · 꾸미기</span>
        </button>
      </div>
    </header>
  );
}

/** Everyone online: me, then real people (or, without a server, the two mock friends) with where they are. */
function useOnline() {
  const me = useMoa((st) => st.me);
  const themeId = useMoa((st) => st.themeId);
  const peers = useMoa((st) => st.peers);
  const others = supabase ? peers : [...FRIENDS.map((f) => ({ ...f, themeId: themeId! })), ...peers];
  return [{ ...me, themeId: themeId! }, ...others];
}

function Sidebar({ theme, close }: { theme: ThemeConfig; close: () => void }) {
  const me = useMoa((st) => st.me);
  const setLook = useMoa((st) => st.setLook);
  const rooms = useRooms(theme.themeId);
  const online = useOnline();
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
        <h2>친구 {online.length}</h2>
        <ul className={s.friends}>
          {online.map((p) => (
            <li key={p.id}>
              <AvatarImage look={p.look} className={s.face} />
              <span>
                {p.nickname}
                {p.id === me.id && <small> (나)</small>}
                {p.themeId !== theme.themeId && <small> · {rooms.find((r) => r.themeId === p.themeId)?.emoji}</small>}
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
  const myId = useMoa((st) => st.me.id);
  return (
    <section className={s.chat}>
      <ol ref={logRef} className={s.log} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.system ? s.system : m.playerId === myId ? s.mine : undefined}>
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
