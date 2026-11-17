import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { GAMES } from '../data/games';
import s from '../styles/Boards.module.scss';
import { Barista, Breath, Fishing, Memory, Squat, Styling, type BoardProps } from './Boards';
import { ev, finish, onEvent, type Match } from './session';
import { cpuScore, ROUND, type TimedId } from './timed';

const BOARDS: Record<TimedId, ComponentType<BoardProps>> = { fishing: Fishing, barista: Barista, squat: Squat, memory: Memory, styling: Styling, breath: Breath };

/** In-game events: my points, my final points, breathing in / out. */
type TimedEv = { k: 's'; n: number } | { k: 'fin'; n: number } | { k: 'h'; on: boolean };

/**
 * Every "points in N seconds" game: one clock for the table, everyone's points
 * live as they make them, and at the bell each player's final count goes round
 * so all report the same result. Computer players' scores come from the seed.
 */
export function TimedGame({ match, meId }: { match: Match; meId: string }) {
  const game = match.game as TimedId;
  const def = GAMES[game];
  const { secs } = ROUND[game];
  const playing = match.role === 'player';
  const latest = useRef(match);
  latest.current = match;
  const clock = () => (performance.now() - match.startAt) / 1000;
  const st = useRef({ pts: {} as Record<string, number>, fin: {} as Record<string, number>, hold: {} as Record<string, boolean> }).current;
  const cpu = useMemo(
    () => Object.fromEntries(match.seats.filter((x) => x.cpu).map((x, i) => [x.id, cpuScore(game, match.seed, i)])),
    [game, match.seats, match.seed],
  );
  const [t, setT] = useState(-3);

  useEffect(
    () =>
      onEvent((data, from) => {
        const e = data as TimedEv;
        if (e.k === 's') st.pts[from] = e.n;
        if (e.k === 'fin') st.fin[from] = st.pts[from] = e.n;
        if (e.k === 'h') st.hold[from] = e.on;
      }),
    [st],
  );

  // the clock (and the HUD) a few times a second; at the bell my count goes out, then everyone's is in
  useEffect(() => {
    let rang = false;
    const id = setInterval(() => {
      const now = clock();
      setT(now);
      if (now < secs) return;
      const m = latest.current;
      if (!rang) {
        rang = true;
        if (playing) {
          st.fin[meId] = st.pts[meId] ?? 0;
          ev({ k: 'fin', n: st.fin[meId] } satisfies TimedEv);
        }
      }
      const waiting = m.seats.some((x) => !x.cpu && !m.left.includes(x.id) && !(x.id in st.fin));
      if (waiting && now < secs + 4) return;
      clearInterval(id);
      finish(Object.fromEntries(m.seats.map((x) => [x.id, m.left.includes(x.id) ? null : x.cpu ? cpu[x.id] : (st.fin[x.id] ?? st.pts[x.id] ?? 0)])));
    }, 200);
    return () => clearInterval(id);
  }, []); // one round per mount (the stage keys it by seed)

  const Board = BOARDS[game];
  const name = (id: string) => (id === meId ? '나' : (match.seats.find((x) => x.id === id)?.nickname ?? id));
  const shown = (id: string) => (id in cpu ? Math.floor(cpu[id] * Math.min(1, Math.max(0, t) / secs)) : (st.pts[id] ?? 0));
  const order = match.seats.map((x) => x.id).sort((a, b) => shown(b) - shown(a));
  return (
    <div className={s.card}>
      <header className={s.hud}>
        <b>
          {def.icon} {def.name}
        </b>
        <span className={s.secs}>{Math.max(0, Math.ceil(secs - Math.max(0, t)))}초</span>
        <i className={s.time} style={{ '--left': Math.max(0, 1 - Math.max(0, t) / secs) } as CSSProperties} />
        <ol className={s.scores}>
          {order.map((id) => (
            <li key={id} className={id === meId ? s.me : undefined}>
              {name(id)}
              {match.left.includes(id) ? ' · 나감' : def.score === 'none' ? '' : <b>{shown(id)}</b>}
            </li>
          ))}
        </ol>
      </header>
      {playing ? (
        <Board
          seed={match.seed}
          clock={clock}
          live={t >= 0 && t < secs && match.phase === 'play'}
          score={(n) => {
            if (st.pts[meId] === n) return;
            st.pts[meId] = n;
            ev({ k: 's', n } satisfies TimedEv);
          }}
          hold={(on) => {
            st.hold[meId] = on;
            ev({ k: 'h', on } satisfies TimedEv);
          }}
          holds={() => match.seats.filter((x) => x.id !== meId && !x.cpu).map((x) => ({ id: x.id, name: x.nickname, on: !!st.hold[x.id] }))}
        />
      ) : (
        <p className={s.say}>👀 관전 중 — 점수가 실시간으로 올라가요</p>
      )}
    </div>
  );
}
