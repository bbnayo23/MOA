import { useEffect } from 'react';
import { fromGame, toGame } from '../bridge';
import { bindGameLink, leaveSpace, present, receive } from '../games/session';
import { openLink, type Message, type Motion, type Presence } from '../net/link';
import { bumped, roomsOf } from '../net/rooms';
import { useSocial } from '../net/social';
import { langOf, translate, type Lang } from '../net/translate';
import { presenceOf, roomOf, useMoa } from '../store';

/**
 * While I'm in the world: tell everyone where I am (presence), and in my place's
 * channel what I'm doing and saying; bring everyone else in my room and space
 * into it (positions, actions, chat — translated into my language as it comes).
 */
export function useRealtime() {
  useEffect(() => {
    let peers = new Map<string, Presence>();
    /** Each peer's latest motion, to re-place them when their look changes. */
    const motions = new Map<string, Motion>();
    let mine: Message | null = null;
    const here = (p?: Presence) => {
      const s = useMoa.getState();
      return !!p && p.room.id === roomOf(s).id && p.themeId === s.themeId;
    };
    const show = (p: Presence) => {
      const m = motions.get(p.id);
      if (m) toGame.emit('peer', { player: { id: p.id, nickname: p.nickname, look: p.look }, ...m });
    };
    const blocked = (id: string) => useSocial.getState().blocks.includes(id);

    const link = openLink(presenceOf(useMoa.getState()), {
      presence: (all) => {
        const s = useMoa.getState();
        const next = new Map(all.filter((p) => p.id !== s.me.id).map((p) => [p.id, p]));
        let newcomer = false;
        for (const [id, p] of next) {
          const was = peers.get(id);
          if (here(p) && !here(was)) {
            newcomer = true;
            show(p); // where they are may have come before who they are
          } else if (here(p) && was && (was.look !== p.look || was.nickname !== p.nickname)) show(p);
        }
        for (const [id, was] of peers)
          if (here(was) && !here(next.get(id))) {
            motions.delete(id);
            toGame.emit('peerLeave', id);
          }
        peers = next;
        s.setPeers([...next.values()]);
        present([...next.values()].filter(here).map((p) => p.id));
        if (newcomer && mine) link.send(mine); // let them see me right away
        // someone else's room that's now over its limit, and I came in last: back home
        const room = roomsOf(all).find((r) => r.id === roomOf(s).id);
        if (s.room && room && bumped(room, s.me.id)) {
          s.setRoom(null);
          s.system(`방이 가득 차서(${room.max ?? 10}명) 내 공간으로 돌아왔어요.`);
        }
      },
      message: (msg) => {
        const s = useMoa.getState();
        if (msg.type === 'invite') {
          if (msg.to === s.me.id) s.setInvite({ from: msg.nickname, room: msg.room, themeId: msg.themeId });
          return;
        }
        if (msg.roomId !== roomOf(s).id) return;
        if (msg.type === 'kick') {
          if (msg.to === s.me.id) {
            s.setRoom(null);
            s.system('🚪 주인이 공간에서 내보냈어요. 내 공간으로 돌아왔어요.');
          }
          return;
        }
        if (msg.type === 'game') {
          // a game's table lives in its space; an ask (and its answer) reaches anywhere in the room
          if ((msg.themeId === s.themeId || msg.g.k === 'ask' || msg.g.k === 'nope') && !blocked(msg.id)) receive(msg.id, msg.g);
          return;
        }
        if (msg.themeId !== s.themeId || blocked(msg.id)) return;
        const p = peers.get(msg.id);
        if (msg.type === 'state') {
          const { type: _t, id, themeId: _th, roomId: _r, ...motion } = msg;
          const first = !motions.has(id);
          motions.set(id, motion);
          // someone new here, and listening (they just sent): let them see me now, not at my next keep-alive
          if (first && mine) link.send(mine);
          if (here(p)) show(p!); // (if presence hasn't caught up yet, it shows them when it does)
          return;
        }
        if (!p) return;
        if (msg.type === 'chat') return s.say(p, msg.text, msg.mid);
        if (msg.type === 'tr' && msg.lang === s.lang && s.autoTranslate) s.translated(msg.mid, msg.text);
      },
      // anything I sent before the channel was up didn't go anywhere: show myself now
      joined: () => mine && link.send(mine),
      denied: (place) => {
        const s = useMoa.getState();
        if (roomOf(s).id !== place) return;
        s.setRoom(null);
        s.system('🔒 들어갈 수 없는 곳이에요. 내 공간으로 돌아왔어요.');
      },
      status: (live) => useMoa.getState().setOnline(live),
      taken: () => useMoa.getState().setTaken(true),
    });
    link.enter(roomOf(useMoa.getState()).id);
    bindGameLink((g) => {
      const s = useMoa.getState();
      link.send({ type: 'game', id: s.me.id, roomId: roomOf(s).id, themeId: s.themeId!, g });
    });

    /** Say a line to my place: as written first, then once per other language there (each reader picks theirs). */
    const say = (mid: string, text: string) => {
      const s = useMoa.getState();
      const where = { id: s.me.id, roomId: roomOf(s).id, themeId: s.themeId! };
      const from = langOf(text);
      link.send({ type: 'chat', ...where, mid, text, lang: from });
      const langs = new Set<Lang>([...peers.values()].filter(here).map((p) => p.lang));
      for (const to of langs) {
        if (!from || to === from) continue;
        translate(text, to).then(
          (out) => out !== text && link.send({ type: 'tr', ...where, mid, lang: to, text: out }),
          () => {}, // they get the original
        );
      }
    };

    const offs = [
      // my moves (from the world) and my words (from anywhere) go out
      fromGame.on('moved', (motion) => {
        const s = useMoa.getState();
        mine = { type: 'state', id: s.me.id, roomId: roomOf(s).id, themeId: s.themeId!, ...motion };
        link.send(mine);
        s.setLast({ themeId: s.themeId!, pos: motion.pos });
      }),
      toGame.on('chat', ({ playerId, text, mid }) => {
        const s = useMoa.getState();
        const line = s.messages.find((m) => m.mid === mid);
        // mine, and not a re-showing of a line already sent
        if (playerId === s.me.id && mid && line && !line.original) say(mid, text);
      }),
      // the owner sent someone out (the server already keeps them out): tell them to go now
      toGame.on('kick', (to) => {
        const s = useMoa.getState();
        link.send({ type: 'kick', id: s.me.id, roomId: roomOf(s).id, to });
      }),
      // without a server, invitations go between the tabs
      toGame.on('invite', (to) => {
        const s = useMoa.getState();
        link.send({ type: 'invite', id: s.me.id, to, nickname: s.me.nickname, room: roomOf(s), themeId: s.themeId! });
      }),
    ];
    // moving to another space or room, or changing clothes / name / language: update presence
    const unsub = useMoa.subscribe((s, prev) => {
      const moved = s.themeId !== prev.themeId || roomOf(s).id !== roomOf(prev).id;
      if (moved) {
        mine = null;
        motions.clear(); // whoever's in the new place shows up as they speak
        leaveSpace(); // a game table here stays here
      }
      if (roomOf(s).id !== roomOf(prev).id) link.enter(roomOf(s).id);
      if (s.themeId && (moved || s.me !== prev.me || s.lang !== prev.lang || s.spaceName !== prev.spaceName)) link.track(presenceOf(s));
    });
    return () => {
      offs.forEach((off) => off());
      unsub();
      leaveSpace();
      link.close();
      useMoa.getState().setPeers([]);
    };
  }, []);
}
