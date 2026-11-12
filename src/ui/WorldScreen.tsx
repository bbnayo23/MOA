import { useEffect, useRef, useState } from 'react';
import { fromGame, toGame } from '../bridge';
import { ACTIONS } from '../data/actions';
import { HUB, THEMES, THEME_CONFIGS, type ThemeConfig, type ThemeId } from '../data/themes';
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

  const panel = useMoa((st) => (st.currentAction ? ACTIONS[st.currentAction].opens : undefined));
  const preview = useMoa((st) => st.preview);

  useEffect(() => (themeId ? startMockFriends(themeId) : undefined), [themeId]);
  useEffect(() => {
    const st = useMoa.getState();
    const offs = [
      fromGame.on('objectClick', st.selectObject),
      fromGame.on('actionChange', st.setCurrentAction),
      fromGame.on('portal', (id) => (THEME_CONFIGS[id] ? st.enterTheme(id) : st.showPreview(id))),
    ];
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
        {panel === 'board' && <CheerBoard />}
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
  const { showPreview, enterTheme, setLook } = useMoa.getState();
  const hub = THEME_CONFIGS[HUB]!;
  return (
    <aside className={s.side}>
      <section>
        <h2>공간 이동</h2>
        <ul className={s.places}>
          {[hub, ...THEMES].map((t) => {
            const here = t.themeId === theme.themeId;
            const open = t.themeId in THEME_CONFIGS;
            return (
              <li key={t.themeId}>
                <button
                  aria-current={here ? 'location' : undefined}
                  onClick={() => !here && (open ? enterTheme(t.themeId) : showPreview(t.themeId))}
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
            toGame.emit('act', { actionId: id, objectId: obj?.id });
            selectObject(null);
          }}
        >
          {ACTIONS[id].icon} {ACTIONS[id].label}
        </button>
      ))}
    </div>
  );
}

/** A building that isn't open yet: what you'll be able to do there. */
function ThemePreview({ id }: { id: ThemeId }) {
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

const NOTE_COLORS = ['#ffd6e0', '#fff1b8', '#d4e7ff', '#d7f3e3', '#e6dcff'];

/** Opens while I'm at the board (action `opens: 'board'`); moving away closes it. */
function CheerBoard() {
  const cheers = useMoa((st) => st.cheers);
  const me = useMoa((st) => st.me);
  const addCheer = useMoa((st) => st.addCheer);
  const [text, setText] = useState('');
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [cheers]);

  return (
    <section className={`${c.card} ${s.panel}`} aria-label="응원 보드">
      <header>
        <h2>💌 응원 보드</h2>
        <button aria-label="닫기" onClick={() => toGame.emit('stop', null)}>
          ×
        </button>
      </header>
      <ul ref={list} className={s.notes}>
        {cheers.map((n, i) => (
          <li key={n.id} style={{ background: NOTE_COLORS[i % NOTE_COLORS.length], rotate: `${(i % 3) - 1}deg` }}>
            <p>{n.text}</p>
            <span>— {n.nickname}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          addCheer(me.nickname, v);
          setText('');
        }}
      >
        <input
          autoFocus
          value={text}
          maxLength={40}
          placeholder="친구에게 응원 한마디"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        />
        <button type="submit" className={c.primary}>
          붙이기
        </button>
      </form>
    </section>
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

  // Enter (outside any text field) opens the chat; Enter again sends and hands the keys back to the game.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(document.activeElement instanceof HTMLInputElement)) {
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
