import { useEffect, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { fromGame } from '../bridge';
import type { CharacterLook } from '../data/character';
import { HUB, type ThemeConfig, type ThemeId } from '../data/themes';
import { useActionBar } from '../hooks/useActionBar';
import { useChat } from '../hooks/useChat';
import { useRoomList } from '../hooks/useLobby';
import { useRealtime } from '../hooks/useRealtime';
import { inviteHere, takeInvite, useAlerts, useUnread } from '../hooks/useSocialPanels';
import { useZoom } from '../hooks/useZoom';
import { usePlaces, useWorldSession } from '../hooks/useWorldSession';
import { FRIENDS } from '../mock';
import { ROOM_MAX, type Room } from '../net/rooms';
import { declineInvite, openDm, useSocial } from '../net/social';
import { supabase } from '../net/supabase';
import { roomOf, useMoa } from '../store';
import c from '../styles/common.module.scss';
import s from '../styles/WorldScreen.module.scss';
import { AvatarImage } from './AvatarImage';
import { ZOOM } from '../world/camera';
import { World } from '../world/World';
import { InstallButton } from './InstallButton';
import { CheerBoard, FocusTimer, Lobby, MenuPanel, RallyGame, ThemePreview, Wardrobe } from './Panels';
import { Alerts, InvitePanel, Notice, ProfileCard, SettingsPanel, Whispers } from './Social';

const EMOTES = ['👋', '❤️', '😆', '😮', '✨'];

/** The panel open on the right (one at a time). */
type Sheet = 'lobby' | 'alerts' | 'invite' | 'settings' | null;

/** The world fills the screen; every piece of UI floats on top of it. */
export function WorldScreen() {
  const { theme, panel, preview } = useWorldSession();
  useRealtime();
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const roomId = useMoa((st) => roomOf(st).id);
  useEffect(() => fromGame.on('playerClick', (id) => useSocial.setState({ profile: id })), []);
  // came in by an invite link (…/?invite=<id>): take it up, then tidy the address
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('invite');
    if (!id || !supabase) return;
    history.replaceState(null, '', location.pathname);
    void takeInvite(id);
  }, []);
  if (!theme) return null;
  const hub = theme.themeId === HUB;
  const close = () => setSheet(null);
  const toggle = (which: Sheet) => setSheet(sheet === which ? null : which);

  return (
    <div className={s.layout} style={{ '--stage-bg': theme.background.sky[0] } as CSSProperties}>
      {/* a fresh world per room: only its people are in it */}
      <World key={roomId} theme={theme} className={s.game} />
      {/* moving to another space or room: the new one fades in from its sky */}
      <div key={`${roomId}:${theme.themeId}`} className={s.curtain} aria-hidden />
      <TopBar theme={theme} drawer={drawer} toggleDrawer={() => setDrawer(!drawer)} open={toggle} />
      <ZoomControls />
      {drawer && <Sidebar theme={theme} close={() => setDrawer(false)} />}
      {sheet === 'lobby' && <Lobby close={close} invite={() => setSheet('invite')} />}
      {sheet === 'alerts' && <Alerts close={close} />}
      {sheet === 'invite' && <InvitePanel close={close} />}
      {sheet === 'settings' && <SettingsPanel close={close} />}
      {!sheet && (
        <>
          {panel === 'board' && <CheerBoard />}
          {panel === 'timer' && <FocusTimer />}
          {panel === 'menu' && <MenuPanel />}
          {panel === 'rally' && <RallyGame />}
          {panel === 'wardrobe' && <Wardrobe />}
        </>
      )}
      <InviteToast />
      <ProfileCard />
      <Whispers />
      <Notice />
      {preview && <ThemePreview id={preview} />}
      <div className={s.dock}>
        <ChatPanel open={panel === 'chat'} />
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
      <button aria-label="축소" onClick={z.zoomOut} disabled={z.pct <= z.min}>
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
  open: (sheet: Sheet) => void;
}

function TopBar({ theme, drawer, toggleDrawer, open }: TopBarProps) {
  const me = useMoa((st) => st.me);
  const online = useMoa((st) => st.online);
  const { here } = useRoomList();
  const alerts = useAlerts().count;
  const unread = useUnread();
  const dmOpen = useSocial((x) => x.dm.open);
  const { go, enterTheme } = useMoa.getState();
  const max = here.max ?? ROOM_MAX;
  return (
    <header className={s.top}>
      <button className={s.menu} aria-label="공간 · 친구 목록" aria-expanded={drawer} onClick={toggleDrawer}>
        ☰
      </button>
      <h1 className={c.logo}>MOA</h1>
      <div className={s.place}>
        <span aria-hidden>{theme.emoji}</span>
        <strong>{theme.name}</strong>
        <button className={s.room} aria-label={`방 목록 (지금 ${here.name}, ${here.members.length}명)`} onClick={() => open('lobby')}>
          🚪<span className={s.label}>{here.name}</span>
          <span className={online ? s.live : `${s.live} ${s.off}`}>
            {online ? `${here.members.length}/${max}` : '다시 연결 중'}
          </span>
        </button>
      </div>
      <div className={s.user}>
        {supabase && (
          <>
            <button className={s.icon} aria-label={`알림${alerts ? ` ${alerts}개` : ''}`} onClick={() => open('alerts')}>
              🔔{alerts > 0 && <b>{alerts}</b>}
            </button>
            <button
              className={s.icon}
              aria-label={`귓속말${unread ? `, 안 읽은 ${unread}개` : ''}`}
              aria-pressed={dmOpen}
              onClick={() => (dmOpen ? useSocial.setState((x) => ({ dm: { ...x.dm, open: false } })) : openDm(null))}
            >
              💌{unread > 0 && <b>{unread}</b>}
            </button>
          </>
        )}
        <button className={s.icon} aria-label="설정" onClick={() => open('settings')}>
          ⚙️
        </button>
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

/** One line of the people list. */
interface Row {
  id: string;
  nickname: string;
  look: CharacterLook;
  themeId: ThemeId | null;
  room: Room | null;
  bot: boolean;
  online: boolean;
}

/**
 * The people list: me, my friends (online or not), then everyone else online
 * (or, without a server, the two mock friends) — with where they are.
 */
function usePeople(): { myRoom: Room; friends: Row[]; others: Row[] } {
  const [me, themeId, peers, room, spaceName] = useMoa(useShallow((st) => [st.me, st.themeId, st.peers, st.room, st.spaceName] as const));
  const { friends, people } = useSocial(useShallow((x) => ({ friends: x.friends, people: x.people })));
  const mine = roomOf({ room, me, spaceName });
  const bots = supabase ? [] : FRIENDS.map((f) => ({ ...f, themeId: themeId!, room: mine, bot: true, online: true }));
  const live = peers.map((p) => ({ ...p, bot: false, online: true }));
  const friendIds = friends.filter((f) => f.accepted).map((f) => (f.from_id === me.id ? f.to_id : f.from_id));
  const offline = friendIds
    .filter((id) => people[id] && !peers.some((p) => p.id === id))
    .map((id) => ({ ...people[id], themeId: null, room: null, bot: false, online: false }));
  const isFriend = (id: string) => friendIds.includes(id);
  return {
    myRoom: mine,
    friends: [...live.filter((p) => isFriend(p.id)), ...offline],
    others: [{ ...me, themeId: themeId!, room: mine, bot: false, online: true }, ...bots, ...live.filter((p) => !isFriend(p.id))],
  };
}

/** "So-and-so asked you over": join them (through the server, which checks the invite), or not. Fades after 30 s. */
function InviteToast() {
  const invite = useMoa((st) => st.invite);
  const { rooms } = useRoomList();
  useEffect(() => {
    if (!invite) return;
    const t = setTimeout(() => useMoa.getState().setInvite(null), 30_000);
    return () => clearTimeout(t);
  }, [invite]);
  if (!invite) return null;
  const st = useMoa.getState();
  const room = rooms.find((r) => r.id === invite.room.id);
  const full = (room?.members.length ?? 0) >= (room?.max ?? ROOM_MAX);
  return (
    <div className={s.invite} role="alertdialog" aria-label="초대">
      <p>
        💌 <b>{invite.from}</b>님이 <b>{invite.room.name}</b>에 초대했어요
      </p>
      <button className={c.primary} disabled={full} onClick={() => (invite.id ? void takeInvite(invite.id) : st.joinRoom(invite.room, invite.themeId))}>
        {full ? '가득 찼어요' : '수락'}
      </button>
      <button
        className={c.btn}
        onClick={() => {
          if (invite.id) void declineInvite(invite.id);
          st.setInvite(null);
        }}
      >
        거절
      </button>
    </div>
  );
}

function Sidebar({ theme, close }: { theme: ThemeConfig; close: () => void }) {
  const me = useMoa((st) => st.me);
  const setLook = useMoa((st) => st.setLook);
  const rooms = usePlaces(theme.themeId);
  const { myRoom, friends, others } = usePeople();
  const [invited, setInvited] = useState<string[]>([]);
  const profile = (id: string) => id !== me.id && useSocial.setState({ profile: id });
  const person = (p: Row) => (
    <li key={p.id} className={p.online ? undefined : s.away}>
      <button className={s.who} disabled={p.id === me.id || p.bot} onClick={() => profile(p.id)}>
        <AvatarImage look={p.look} className={s.face} />
        <span>
          {p.nickname}
          {p.id === me.id && <small> (나)</small>}
          {!p.online ? (
            <small> · 오프라인</small>
          ) : p.room && p.room.id !== myRoom.id ? (
            <small> · {p.room.listed ? p.room.name : '자기 공간'}</small>
          ) : (
            p.themeId !== theme.themeId && <small> · {rooms.find((r) => r.themeId === p.themeId)?.emoji}</small>
          )}
        </span>
      </button>
      {p.online && p.room && p.room.id !== myRoom.id && !p.bot && (
        <button
          className={s.inviteBtn}
          disabled={invited.includes(p.id)}
          onClick={() => {
            setInvited([...invited, p.id]);
            void inviteHere(p);
          }}
        >
          {invited.includes(p.id) ? '보냄' : '초대'}
        </button>
      )}
      {p.online && <i className={s.online} aria-label="온라인" />}
    </li>
  );
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

      {supabase && (
        <section>
          <h2>친구 {friends.length}</h2>
          <ul className={s.friends}>
            {friends.map(person)}
            {!friends.length && <li className={s.hintRow}>캐릭터를 누르고 👫 친구 추가를 해 보세요.</li>}
          </ul>
        </section>
      )}

      <section>
        <h2>접속 중 {others.length}</h2>
        <ul className={s.friends}>{others.map(person)}</ul>
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

/** The chat dock. `open` (💬 대화하기): the log opens up and the cursor waits in the box. */
function ChatPanel({ open }: { open: boolean }) {
  const { messages, to, setTo, targets, text, setText, inputRef, logRef, sendEmote, submit, blurOnEscape } = useChat();
  const myId = useMoa((st) => st.me.id);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, inputRef]);
  const whisperTo = targets.find((t) => t.id === to);
  return (
    <section className={open ? `${s.chat} ${s.open}` : s.chat} aria-label="채팅">
      <ol ref={logRef} className={s.log} aria-live="polite">
        {messages.map((m) => (
          <li key={m.id} className={m.system ? s.system : m.playerId === myId ? s.mine : undefined}>
            {!m.system && <b>{m.nickname}</b>}
            {m.text}
            {m.original && <small className={s.original}>{m.original}</small>}
          </li>
        ))}
      </ol>
      <form className={whisperTo ? `${s.compose} ${s.whisper}` : s.compose} onSubmit={submit}>
        <div className={s.emotes}>
          {EMOTES.map((e) => (
            <button key={e} type="button" aria-label={`감정 표현 ${e}`} onClick={() => sendEmote(e)}>
              {e}
            </button>
          ))}
          {targets.length > 0 && (
            <select className={s.mode} aria-label="채팅 모드" value={whisperTo ? to : ''} onChange={(e) => setTo(e.target.value)}>
              <option value="">💬 모두에게</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  💌 {t.nickname}
                </option>
              ))}
            </select>
          )}
        </div>
        <input
          ref={inputRef}
          value={text}
          maxLength={80}
          placeholder={whisperTo ? `${whisperTo.nickname}님에게만 귓속말` : '친구들에게 한마디'}
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
