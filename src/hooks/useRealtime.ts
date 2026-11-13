import { useEffect } from 'react';
import { fromGame, toGame } from '../bridge';
import { openLink, type Message, type Motion, type Presence } from '../net/link';
import { bumped, roomsOf } from '../net/rooms';
import { presenceOf, roomOf, useMoa } from '../store';

/**
 * While I'm in the world: tell everyone where I am and what I'm doing, and
 * bring everyone else in my room and space into it (positions, actions, chat).
 * Invitations to me come in here too.
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

    const link = openLink(presenceOf(useMoa.getState()), {
      presence: (all) => {
        const s = useMoa.getState();
        const next = new Map(all.filter((p) => p.id !== s.me.id).map((p) => [p.id, p]));
        let newcomer = false;
        for (const [id, p] of next) {
          const was = peers.get(id);
          if (here(p) && !here(was)) newcomer = true;
          else if (here(p) && was && (was.look !== p.look || was.nickname !== p.nickname)) show(p);
        }
        for (const [id, was] of peers) if (here(was) && !here(next.get(id))) toGame.emit('peerLeave', id);
        peers = next;
        s.setPeers([...next.values()]);
        if (newcomer && mine) link.send(mine); // let them see me right away
        // someone else's room that's now over the limit, and I came in last: back home
        const room = roomsOf(all).find((r) => r.id === roomOf(s).id);
        if (s.room && s.room.id !== s.me.id && room && bumped(room, s.me.id)) {
          s.setRoom(null);
          s.system('방이 가득 차서(10명) 내 공간으로 돌아왔어요.');
        }
      },
      message: (msg) => {
        const s = useMoa.getState();
        if (msg.type === 'invite') {
          if (msg.to === s.me.id) s.setInvite({ from: msg.nickname, room: msg.room, themeId: msg.themeId });
          return;
        }
        const p = peers.get(msg.id);
        if (!p || msg.roomId !== roomOf(s).id || msg.themeId !== s.themeId) return;
        if (msg.type === 'chat') return s.say(p, msg.text, msg.original);
        const { type: _t, id: _i, themeId: _th, ...motion } = msg;
        motions.set(p.id, motion);
        show(p);
      },
    });

    const offs = [
      // my moves (from the world) and my words (from anywhere) go out
      fromGame.on('moved', (motion) => {
        const s = useMoa.getState();
        mine = { type: 'state', id: s.me.id, roomId: roomOf(s).id, themeId: s.themeId!, ...motion };
        link.send(mine);
        s.setLast({ themeId: s.themeId!, pos: motion.pos });
      }),
      toGame.on('chat', ({ playerId, text, original }) => {
        const s = useMoa.getState();
        if (playerId === s.me.id) link.send({ type: 'chat', id: playerId, roomId: roomOf(s).id, themeId: s.themeId!, text, original });
      }),
      toGame.on('invite', (to) => {
        const s = useMoa.getState();
        link.send({ type: 'invite', id: s.me.id, to, nickname: s.me.nickname, room: roomOf(s), themeId: s.themeId! });
      }),
    ];
    // moving to another space or room, or changing clothes / name: update presence
    const unsub = useMoa.subscribe((s, prev) => {
      const moved = s.themeId !== prev.themeId || s.room !== prev.room;
      if (moved) mine = null;
      if (s.themeId && (moved || s.me !== prev.me)) link.track(presenceOf(s));
    });
    return () => {
      offs.forEach((off) => off());
      unsub();
      link.close();
      useMoa.getState().setPeers([]);
    };
  }, []);
}
