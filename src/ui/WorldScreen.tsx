import { useEffect, useRef, useState } from 'react';
import { fromGame, toGame } from '../bridge';
import { ACTIONS } from '../data/actions';
import { THEMES, THEME_CONFIGS, type ThemeConfig } from '../data/themes';
import { FRIENDS, startMockFriends } from '../mock';
import { useMoa } from '../store';
import { AvatarCanvas } from './AvatarCanvas';
import c from './common.module.scss';
import { GameCanvas } from './GameCanvas';
import s from './WorldScreen.module.scss';

const EMOTES = ['👋', '❤️', '😆', '😮', '✨'];

export function WorldScreen() {
  const themeId = useMoa((st) => st.themeId);
  const theme = themeId ? THEME_CONFIGS[themeId] : undefined;

  useEffect(() => startMockFriends(), []);
  useEffect(() => {
    const st = useMoa.getState();
    const offs = [fromGame.on('objectClick', st.selectObject), fromGame.on('actionChange', st.setCurrentAction)];
    return () => offs.forEach((off) => off());
  }, []);

  if (!theme) return null;
  return (
    <div className={s.layout}>
      <TopBar theme={theme} />
      <Sidebar theme={theme} />
      <main className={s.stage} style={{ background: theme.background.sky[0] }}>
        <GameCanvas theme={theme} className={s.game} />
        <ActionBar theme={theme} />
        <p className={s.hint}>방향키 이동 · Enter 채팅 · 오브젝트 클릭</p>
      </main>
      <ChatPanel />
    </div>
  );
}

function TopBar({ theme }: { theme: ThemeConfig }) {
  const me = useMoa((st) => st.me);
  const go = useMoa((st) => st.go);
  return (
    <header className={s.top}>
      <h1 className={c.logo}>MOA</h1>
      <div className={s.place}>
        <span aria-hidden>{theme.emoji}</span>
        <strong>{theme.name}</strong>
        <span className={s.live}>{FRIENDS.length + 1}명 접속 중</span>
      </div>
      <div className={s.user}>
        <AvatarCanvas look={me.look} scale={1} rows={19} />
        <span className={s.nick}>{me.nickname}</span>
        <details className={s.menu}>
          <summary className={c.btn} aria-label="설정">⚙ 설정</summary>
          <div className={c.card}>
            <button onClick={() => go('create')}>🎨 캐릭터 꾸미기</button>
            <button onClick={() => go('themes')}>🗺️ 공간 고르기</button>
          </div>
        </details>
      </div>
    </header>
  );
}

function Sidebar({ theme }: { theme: ThemeConfig }) {
  const me = useMoa((st) => st.me);
  const { go, enterTheme, setLook } = useMoa.getState();
  return (
    <aside className={s.side}>
      <section>
        <h2>공간 이동</h2>
        <ul className={s.places}>
          {THEMES.map((t) => {
            const here = t.themeId === theme.themeId;
            const open = t.themeId in THEME_CONFIGS;
            return (
              <li key={t.themeId}>
                <button
                  aria-current={here ? 'location' : undefined}
                  onClick={() => !here && (open ? enterTheme(t.themeId) : go('themes', t.themeId))}
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.name}
                  {!open && <em>준비 중</em>}
                </button>
              </li>
            );
          })}
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
    </aside>
  );
}

function ActionBar({ theme }: { theme: ThemeConfig }) {
  const selected = useMoa((st) => st.selectedObject);
  const current = useMoa((st) => st.currentAction);
  const selectObject = useMoa((st) => st.selectObject);
  const obj = theme.interactionObjects.find((o) => o.id === selected);

  return (
    <div className={s.actions}>
      {obj && (
        <span className={s.target}>
          {obj.icon} {obj.label}
          <button aria-label="닫기" onClick={() => selectObject(null)}>
            ×
          </button>
        </span>
      )}
      {(obj ? obj.actions : theme.availableActions).map((id) => (
        <button
          key={id}
          className={c.chip}
          aria-pressed={current === id}
          onClick={() => {
            toGame.emit('act', id);
            selectObject(null);
          }}
        >
          {ACTIONS[id].icon} {ACTIONS[id].label}
        </button>
      ))}
    </div>
  );
}

function ChatPanel() {
  const messages = useMoa((st) => st.messages);
  const me = useMoa((st) => st.me);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLOListElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages]);

  // Enter anywhere opens the chat; Enter again sends and hands the keys back to the game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement !== input.current) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = (value: string) => {
    const v = value.trim();
    if (v) useMoa.getState().say(me, v);
  };

  return (
    <section className={s.chat}>
      <ol ref={log} className={s.log} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.system ? s.system : m.playerId === 'me' ? s.mine : undefined}>
            {!m.system && <b>{m.nickname}</b>}
            {m.text}
          </li>
        ))}
      </ol>
      <form
        className={s.compose}
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText('');
          input.current?.blur();
        }}
      >
        <div className={s.emotes}>
          {EMOTES.map((e) => (
            <button key={e} type="button" aria-label={`감정 표현 ${e}`} onClick={() => send(e)}>
              {e}
            </button>
          ))}
        </div>
        <input
          ref={input}
          value={text}
          maxLength={80}
          placeholder="Enter를 눌러 대화하기"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && input.current?.blur()}
        />
        <button type="submit" className={c.primary}>
          전송
        </button>
      </form>
    </section>
  );
}
