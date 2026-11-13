import { useEffect } from 'react';
import { fromGame, toGame } from '../bridge';
import { openLink, type Message, type Motion, type Presence } from '../net/link';
import { useMoa } from '../store';

const presenceOf = (s: ReturnType<typeof useMoa.getState>): Presence => ({
  id: s.me.id,
  nickname: s.me.nickname,
  look: s.me.look,
  themeId: s.themeId!,
});

/**
 * While I'm in the world: tell everyone where I am and what I'm doing, and
 * bring everyone else in my space into it (positions, actions, chat).
 */
export function useRealtime() {
  useEffect(() => {
    let peers = new Map<string, Presence>();
    /** Each peer's latest motion, to re-place them when their look changes. */
    const motions = new Map<string, Motion>();
    let mine: Message | null = null;
    const here = (p?: Presence) => !!p && p.themeId === useMoa.getState().themeId;
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
      },
      message: (msg) => {
        const p = peers.get(msg.id);
        if (!p || msg.themeId !== useMoa.getState().themeId) return;
        if (msg.type === 'chat') return useMoa.getState().say(p, msg.text);
        const { type: _t, id: _i, themeId: _th, ...motion } = msg;
        motions.set(p.id, motion);
        show(p);
      },
    });

    const offs = [
      // my moves (from the world) and my words (from anywhere) go out
      fromGame.on('moved', (motion) => {
        const s = useMoa.getState();
        mine = { type: 'state', id: s.me.id, themeId: s.themeId!, ...motion };
        link.send(mine);
        s.setLast({ themeId: s.themeId!, pos: motion.pos });
      }),
      toGame.on('chat', ({ playerId, text }) => {
        const s = useMoa.getState();
        if (playerId === s.me.id) link.send({ type: 'chat', id: playerId, themeId: s.themeId!, text });
      }),
    ];
    // moving to another space, or changing clothes / name: update presence
    const unsub = useMoa.subscribe((s, prev) => {
      if (s.themeId !== prev.themeId) mine = null;
      if (s.themeId && (s.themeId !== prev.themeId || s.me !== prev.me)) link.track(presenceOf(s));
    });
    return () => {
      offs.forEach((off) => off());
      unsub();
      link.close();
      useMoa.getState().setPeers([]);
    };
  }, []);
}
