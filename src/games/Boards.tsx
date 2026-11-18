import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { sfx } from '../audio';
import { ACCESSORIES, CLOTH_COLORS, HAT_STYLES, LABELS, TOP_STYLES, type CharacterLook } from '../data/character';
import { useMoa } from '../store';
import s from '../styles/Boards.module.scss';
import c from '../styles/common.module.scss';
import { AvatarPreview, useAvatarThumb } from '../world/Preview';
import { useKeys } from './controls';
import {
  BREATH, bites, deal, DRINKS, FISH, fits, gauge, grade, guide, INGREDIENTS, isDrink, jerk, NEXT_LOOK, NEXT_ORDER,
  orders, PEEK, REDEAL, rep, REP_LOCK, REQUESTS, requests, wait, WOBBLE, type Ingredient, type Line,
  AFTER, BOOK_COLORS, cpuPick, cpuVote, DISHES, DRESS_SECS, FALL, NEXT_SHELF, nextLen, notes, panes, pressLane, recallOrder,
  shelf, SHOW, sky, straight, SYMBOLS, tally, tapStar, voteTheme, WRONG_BOOK, type Pick as VotePick, type StarRun,
} from './timed';

/**
 * The boards of the "points in N seconds" games (rules: ./timed.ts), each on the
 * card TimedGame puts over the world. Keys and touch do the same things.
 */
export interface BoardProps {
  seed: number;
  /** Seconds into the round (negative while counting down). */
  clock: () => number;
  /** Mine to play right now (not counting down, not over, not watching). */
  live: boolean;
  /** My points so far — or a computer player's (`who`), when the board decides theirs (votes). */
  score: (n: number, who?: string) => void;
  /** Everyone at the table (me too), in seat order. */
  players: { id: string; name: string; cpu: boolean; look: CharacterLook }[];
  me: string;
  /** Tell the others at the table something (breathing in, my look, my vote, a pane turned) — and hear theirs. */
  send: (v: unknown) => void;
  listen: (fn: (from: string, v: unknown) => void) => () => void;
}

/** Re-render every `ms` (a board's animation). */
function useTick(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return () => set((x) => x + 1);
}

/** A word over the board for a moment ("+2!", "도망갔어요…"). */
function useSay() {
  const [say, setSay] = useState({ text: '', at: 0 });
  const text = performance.now() - say.at < 1300 ? say.text : '';
  const tell = (t: string) => {
    sfx(/[+✨🎉]/u.test(t) ? 'good' : 'bad'); // points (or a thing finished) · a miss
    setSay({ text: t, at: performance.now() });
  };
  return [text, tell] as const;
}

const css = (vars: Record<string, number>) => vars as CSSProperties;

// ── 🎣 fishing ──────────────────────────────────────────────────────────────
export function Fishing({ seed, clock, live, score }: BoardProps) {
  useTick(50);
  const bs = useMemo(() => bites(seed), [seed]);
  const line = useRef<Line>({ next: 0, pts: 0 });
  const [say, tell] = useSay();
  // a bite that went by unhooked
  useEffect(() => {
    const w = wait(bs, line.current, clock());
    if (w === line.current) return;
    line.current = w;
    if (live) tell('놓쳤어요… 🫧');
  });
  const pull = () => {
    if (!live) return;
    const r = jerk(bs, line.current, clock());
    line.current = r.line;
    if (!r.caught) return tell('앗, 도망갔어요 💨');
    const f = FISH[r.caught.fish];
    tell(`${f.icon} ${f.name}! +${f.pts}`);
    score(r.line.pts);
  };
  useKeys(live, { Space: pull });
  const t = clock();
  const b = bs[line.current.next];
  const biting = live && b && t >= b.at && t <= b.at + FISH[b.fish].window;
  const nibble = live && b && !biting && t >= b.at - 0.6;
  return (
    <div className={s.body}>
      <div className={s.pond}>
        <span className={s.deco} style={{ left: '6%', bottom: '8%' }}>🌿</span>
        <span className={s.deco} style={{ right: '8%', top: '14%' }}>🪷</span>
        <span className={s.deco} style={{ right: '20%', bottom: '10%' }}>🪨</span>
        <i className={s.line} />
        <i className={s.ripple} />
        <i className={`${s.bobber} ${biting ? s.bite : nibble ? s.nibble : ''}`} />
        {biting && <b className={s.bang}>!</b>}
        <p className={s.pop}>{say || (live ? '' : '곧 시작해요')}</p>
      </div>
      <div className={s.row}>
        <span className={s.mine}>
          내 점수 <b>{line.current.pts}</b>
        </span>
        <button className={`${c.primary} ${s.act}`} disabled={!live} onPointerDown={pull}>
          🎣 낚아채기
        </button>
      </div>
    </div>
  );
}

// ── ☕ barista ──────────────────────────────────────────────────────────────
export function Barista({ seed, clock, live, score }: BoardProps) {
  const redraw = useTick(100);
  const queue = useMemo(() => orders(seed), [seed]);
  const st = useRef({ i: 0, cup: [] as Ingredient[], ready: 0, pts: 0 }).current;
  const [say, tell] = useSay();
  const drink = DRINKS[queue[st.i % queue.length]];
  const waiting = clock() < st.ready;
  const add = (x: Ingredient) => {
    if (!live || clock() < st.ready || st.cup.includes(x) || st.cup.length >= 4) return;
    st.cup = [...st.cup, x];
    redraw();
  };
  const serve = () => {
    if (!live || clock() < st.ready || !st.cup.length) return;
    if (isDrink(st.cup, drink)) {
      st.pts++;
      st.i++;
      st.ready = clock() + NEXT_ORDER;
      score(st.pts);
      tell(`😋 ${drink.name} 완성! +1`);
    } else tell('🤔 주문이랑 달라요… 다시!');
    st.cup = [];
    redraw();
  };
  const empty = () => {
    st.cup = [];
    redraw();
  };
  useKeys(live, { Space: serve, Backspace: empty, ...Object.fromEntries(INGREDIENTS.map((g, i) => [`Digit${i + 1}`, () => add(g.id)])) });
  const color = (x: Ingredient) => INGREDIENTS.find((g) => g.id === x)!.color;
  return (
    <div className={`${s.body} ${s.cafe}`}>
      <div className={s.counter}>
        <p className={s.ticket}>{!live ? '곧 손님이 와요' : waiting ? '다음 손님…' : <>🧾 <b>{drink.name}</b></>}</p>
        <div className={s.cup} aria-label={`컵: ${st.cup.map((x) => INGREDIENTS.find((g) => g.id === x)!.name).join(', ') || '비어 있음'}`}>
          {st.cup.map((x) => (
            <i key={x} style={{ background: color(x) }} />
          ))}
        </div>
        <p className={s.pop}>{say}</p>
        <ul className={s.menu} aria-label="메뉴판">
          {DRINKS.map((d) => (
            <li key={d.name}>
              {d.name} <span>{d.recipe.map((x) => INGREDIENTS.find((g) => g.id === x)!.icon).join('')}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={s.keys}>
        {INGREDIENTS.map((g, i) => (
          <button key={g.id} disabled={!live || waiting} className={st.cup.includes(g.id) ? s.on : undefined} onClick={() => add(g.id)}>
            {g.icon}
            <small>
              {i + 1} {g.name}
            </small>
          </button>
        ))}
        <button className={s.clear} disabled={!live} onClick={empty}>
          🗑️<small>비우기</small>
        </button>
        <button className={`${c.primary} ${s.serve}`} disabled={!live || waiting || !st.cup.length} onClick={serve}>
          ☕ 내기 <small>Space</small>
        </button>
        <span className={s.mine}>
          만든 잔 <b>{st.pts}</b>
        </span>
      </div>
    </div>
  );
}

// ── 🦵 squats ───────────────────────────────────────────────────────────────
export function Squat({ seed, clock, live, score }: BoardProps) {
  useTick(30);
  const st = useRef({ n: 0, from: 0, lock: 0, pts: 0 }).current;
  const [say, tell] = useSay();
  const t = clock();
  const r = rep(seed, st.n);
  const p = !live || t < st.lock ? 0 : gauge(r.period, t - st.from);
  const press = () => {
    const now = clock();
    if (!live || now < st.lock) return;
    const cur = rep(seed, st.n);
    const g = grade(cur, gauge(cur.period, now - st.from));
    if (g) {
      st.pts += g;
      st.n++;
      score(st.pts);
      tell(g === 2 ? '완벽해요! +2 💯' : '좋아요 +1 👍');
    } else tell('휘청… 😵');
    st.lock = st.from = now + (g ? REP_LOCK : WOBBLE);
  };
  useKeys(live, { Space: press });
  return (
    <div className={`${s.body} ${s.squat}`}>
      <div className={s.meter} aria-hidden>
        <i className={s.zone} style={css({ '--a': r.c - r.w, '--b': r.c + r.w })} />
        <i className={s.sweet} style={css({ '--a': r.c - 0.04, '--b': r.c + 0.04 })} />
        <i className={s.marker} style={css({ '--p': p })} />
      </div>
      <div className={s.side}>
        <p className={s.big}>
          🏋️ {st.n}
          <small>회</small>
        </p>
        <p className={s.pop}>{say || (live ? (t < st.lock ? '일어나는 중…' : '초록 칸에서 누르세요') : '곧 시작해요')}</p>
        <span className={s.mine}>
          내 점수 <b>{st.pts}</b>
        </span>
        <button className={`${c.primary} ${s.act}`} disabled={!live} onPointerDown={press}>
          🦵 스쿼트!
        </button>
      </div>
    </div>
  );
}

// ── 🃏 memory cards ─────────────────────────────────────────────────────────
export function Memory({ seed, clock, live, score }: BoardProps) {
  const redraw = useTick(100);
  const st = useRef({ k: 0, got: new Set<number>(), open: [] as number[], peek: 0, redeal: 0, pts: 0 }).current;
  const t = clock();
  // a wrong pair turns back over; a cleared table is dealt again
  if (st.peek && t >= st.peek) Object.assign(st, { open: [], peek: 0 });
  if (st.redeal && t >= st.redeal) Object.assign(st, { k: st.k + 1, got: new Set(), redeal: 0 });
  const cards = useMemo(() => deal(seed, st.k), [seed, st.k]);
  const [say, tell] = useSay();
  const flip = (i: number) => {
    if (!live || st.peek || st.redeal || st.got.has(i) || st.open.includes(i)) return;
    st.open = [...st.open, i];
    if (st.open.length === 2) {
      const [a, b] = st.open;
      if (cards[a] === cards[b]) {
        st.got.add(a).add(b);
        st.open = [];
        st.pts++;
        score(st.pts);
        if (st.got.size === cards.length) {
          st.redeal = clock() + REDEAL;
          tell('🎉 다 찾았어요! 새 판');
        } else tell(`${cards[a]} 짝! +1`);
      } else st.peek = clock() + PEEK;
    }
    redraw();
  };
  return (
    <div className={s.body}>
      <div className={s.cards}>
        {cards.map((icon, i) => {
          const up = st.got.has(i) || st.open.includes(i);
          return (
            <button key={`${st.k}-${i}`} className={`${s.card3} ${up ? s.up : ''} ${st.got.has(i) ? s.got : ''}`} disabled={!live} onClick={() => flip(i)} aria-label={up ? icon : '뒤집힌 카드'}>
              <span className={s.inner}>
                <span className={s.back} />
                <span className={s.front}>{icon}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className={s.row}>
        <p className={s.pop}>{say || (live ? '' : '곧 시작해요')}</p>
        <span className={s.mine}>
          찾은 짝 <b>{st.pts}</b>
        </span>
      </div>
    </div>
  );
}

// ── 👗 styling ──────────────────────────────────────────────────────────────
const ROWS = [
  ['hat', '모자', HAT_STYLES],
  ['top', '옷', TOP_STYLES],
  ['accessory', '소품', ACCESSORIES],
] as const;

export function Styling({ seed, clock, live, score }: BoardProps) {
  useTick(200);
  const look = useMoa((x) => x.me.look);
  const queue = useMemo(() => requests(seed), [seed]);
  const [pick, setPick] = useState({ hat: look.hat, top: look.top, accessory: look.accessory });
  const st = useRef({ i: 0, ready: 0, pts: 0 }).current;
  const [say, tell] = useSay();
  const req = REQUESTS[queue[st.i % queue.length]];
  const waiting = clock() < st.ready;
  const done = () => {
    if (!live || clock() < st.ready) return;
    if (!fits(pick, req)) return tell('🤔 손님 주문이랑 조금 달라요');
    st.pts++;
    st.i++;
    st.ready = clock() + NEXT_LOOK;
    score(st.pts);
    tell('📸 찰칵! 손님이 좋아해요 +1');
  };
  useKeys(live, { Space: done });
  return (
    <div className={`${s.body} ${s.style}`}>
      <AvatarPreview className={s.preview} look={{ ...look, ...pick }} anim="pose" />
      <div className={s.side}>
        <p className={s.ticket}>{!live ? '곧 손님이 와요' : waiting ? '다음 손님이 들어와요…' : <>👤 <b>{req.name}</b></>}</p>
        {live && !waiting && (
          <p className={s.want}>
            {ROWS.map(([k, label]) => (
              <span key={k}>
                {label} <b>{LABELS[req[k]]}</b>
              </span>
            ))}
          </p>
        )}
        {ROWS.map(([k, label, values]) => (
          <div key={k} className={s.pickRow} role="group" aria-label={label}>
            {values.map((v) => (
              <button key={v} className={pick[k] === v ? s.on : undefined} aria-pressed={pick[k] === v} disabled={!live} onClick={() => setPick((x) => ({ ...x, [k]: v }))}>
                {LABELS[v]}
              </button>
            ))}
          </div>
        ))}
        <p className={s.pop}>{say}</p>
        <div className={s.row}>
          <span className={s.mine}>
            코디 <b>{st.pts}</b>
          </span>
          <button className={`${c.primary} ${s.act}`} disabled={!live || waiting} onClick={done}>
            📸 완성!
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 🕊️ breathing together ───────────────────────────────────────────────────
export function Breath({ clock, live, players, me, send, listen }: BoardProps) {
  useTick(50);
  const st = useRef({ on: false, me: 0, last: 0, them: {} as Record<string, number>, holding: {} as Record<string, boolean> }).current;
  useEffect(() => listen((from, v) => void (st.holding[from] = !!v)), [listen, st]);
  const t = clock();
  const dt = Math.min(0.1, Math.max(0, t - st.last));
  st.last = t;
  const grow = (x: number, on: boolean) => Math.min(1, Math.max(0, x + ((on ? 1 : -1) * dt) / BREATH));
  st.me = grow(st.me, st.on);
  const others = players.filter((p) => p.id !== me && !p.cpu);
  for (const o of others) st.them[o.id] = grow(st.them[o.id] ?? 0, !!st.holding[o.id]);
  const g = live ? guide(t) : { inhale: true, size: 0 };
  const set = (on: boolean) => {
    if ((on && !live) || st.on === on) return;
    st.on = on;
    send(on);
  };
  useKeys(live, { Space: () => set(true) }, { Space: () => set(false) });
  useEffect(() => {
    if (!live) set(false);
  });
  return (
    <div className={`${s.body} ${s.breathe}`}>
      <div className={s.circles}>
        <i className={s.guideRing} style={css({ '--g': g.size })} />
        <i className={s.mineCircle} style={css({ '--m': st.me })} />
        <p>{!live ? '편하게 앉아요' : g.inhale ? '들이쉬어요…' : '내쉬어요…'}</p>
      </div>
      {others.length > 0 && (
        <ul className={s.together} aria-label="함께 호흡하는 친구">
          {others.map((o) => (
            <li key={o.id}>
              <i style={css({ '--s': st.them[o.id] ?? 0 })} />
              {o.name}
            </li>
          ))}
        </ul>
      )}
      <p className={s.calm}>{live && Math.abs(st.me - g.size) < 0.2 ? '호흡이 잘 맞고 있어요 ✨' : ' '}</p>
      <button
        className={`${c.primary} ${s.act}`}
        disabled={!live}
        onPointerDown={() => set(true)}
        onPointerUp={() => set(false)}
        onPointerLeave={() => set(false)}
        onPointerCancel={() => set(false)}
      >
        꾹 누르고 들이쉬기
      </button>
    </div>
  );
}


// ── 🌌 constellations ───────────────────────────────────────────────────────
/** Faint background stars, the same every night. */
const TWINKLES = Array.from({ length: 40 }, (_, i) => [((i * 37) % 97) + 1.5, ((i * 61) % 57) + 1.5, i % 3 ? 0.35 : 0.6] as const);

export function Stars({ seed, clock, live, score }: BoardProps) {
  const redraw = useTick(120);
  const run = useRef<StarRun>({ k: 0, next: 0, pts: 0, hold: 0, last: -9 });
  const done = useRef<{ name: string; stars: [number, number][]; until: number } | null>(null);
  const [say, tell] = useSay();
  const r = run.current;
  const t = clock();
  const cur = sky(seed, r.k);
  const cheer = done.current && t < done.current.until ? done.current : null;
  const shown = cheer ?? cur;
  const lit = cheer ? shown.stars.length : r.next;
  const tap = (i: number) => {
    if (!live) return;
    const now = clock();
    const res = tapStar(run.current, i, now, cur.stars.length);
    run.current = res.run;
    if (res.ok === null) return;
    if (!res.ok) tell('그 별이 아니에요 💫');
    else {
      score(res.run.pts);
      if (res.run.k !== r.k) {
        done.current = { ...cur, until: now + 1 };
        tell(`✨ ${cur.name} 완성!`);
      }
    }
    redraw();
  };
  const P = (i: number) => [5 + shown.stars[i][0] * 90, 5 + shown.stars[i][1] * 50] as const;
  return (
    <div className={s.body}>
      <p className={s.ticket}>
        {live ? (
          <>
            🌌 <b>{shown.name}</b> — 1번부터 차례로 이어요
          </>
        ) : (
          '곧 별이 떠요'
        )}
      </p>
      <svg className={s.sky} viewBox="0 0 100 60" role="group" aria-label={`별자리 ${shown.name}`}>
        {TWINKLES.map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr * 0.5} fill="#fff" opacity={0.5} />
        ))}
        {shown.stars.slice(1, lit).map((_, i) => (
          <line key={i} x1={P(i)[0]} y1={P(i)[1]} x2={P(i + 1)[0]} y2={P(i + 1)[1]} stroke="#ffe9a8" strokeWidth={0.6} strokeLinecap="round" />
        ))}
        {shown.stars.map((_, i) => (
          <g key={i} role="button" aria-label={`${i + 1}번 별`} onPointerDown={() => !cheer && tap(i)} className={s.star}>
            <circle cx={P(i)[0]} cy={P(i)[1]} r={4.2} fill="transparent" />
            <circle cx={P(i)[0]} cy={P(i)[1]} r={i < lit ? 1.9 : 1.4} fill={i < lit ? '#ffe9a8' : '#fffdf5'} className={i === lit && live && !cheer ? s.nextStar : undefined} />
            {!cheer && (
              <text x={P(i)[0] + 2.4} y={P(i)[1] - 1.6} fontSize={3.2} fill="#cfd8ff">
                {i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className={s.row}>
        <p className={s.pop}>{say}</p>
        <span className={s.mine}>
          이은 별 <b>{r.pts}</b>
        </span>
      </div>
    </div>
  );
}

// ── 🧾 remember the order ───────────────────────────────────────────────────
export function Recall({ seed, clock, live, score }: BoardProps) {
  const redraw = useTick(80);
  const st = useRef({ n: 0, len: 3, from: 0, got: 0, pts: 0, after: 0, ok: true, size: 3 }).current;
  const t = clock();
  // the word after an order is over: the next one starts showing
  if (st.after && t >= st.after) Object.assign(st, { n: st.n + 1, from: st.after, after: 0, got: 0, size: st.len });
  const order = useMemo(() => recallOrder(seed, st.n, st.size), [seed, st.n, st.size]);
  const showEnd = st.from + order.length * SHOW;
  const showing = !st.after && t >= st.from && t < showEnd;
  const idx = showing ? Math.floor((t - st.from) / SHOW) : -1;
  const tap = (d: number) => {
    const now = clock();
    if (!live || st.after || now < showEnd) return;
    if (d === order[st.got]) {
      st.got++;
      if (st.got === order.length) Object.assign(st, { pts: st.pts + order.length, ok: true, after: now + AFTER, len: nextLen(st.len, true) });
      if (!st.after) return redraw();
      score(st.pts);
    } else Object.assign(st, { ok: false, after: now + AFTER, len: nextLen(st.len, false) });
    redraw();
  };
  useKeys(live, Object.fromEntries(DISHES.map((_, i) => [`Digit${i + 1}`, () => tap(i)])));
  return (
    <div className={s.body}>
      <div className={s.plate} aria-live="polite">
        {!live ? (
          <p>주문을 잘 보고 기억해요</p>
        ) : st.after ? (
          <p className={s.big}>{st.ok ? `😋 정확해요! +${order.length}` : '🙈 앗, 순서가 달라요'}</p>
        ) : showing ? (
          <>
            <span key={`${st.n}-${idx}`} className={s.dish}>
              {DISHES[order[idx]]}
            </span>
            <small>
              주문 {idx + 1} / {order.length}
            </small>
          </>
        ) : (
          <>
            <p>주문한 순서대로 눌러요</p>
            <p className={s.dots}>{order.map((_, i) => (i < st.got ? '●' : '○')).join(' ')}</p>
          </>
        )}
      </div>
      <div className={s.dishes}>
        {DISHES.map((d, i) => (
          <button key={d} disabled={!live || showing || !!st.after} onClick={() => tap(i)}>
            {d}
            <small>{i + 1}</small>
          </button>
        ))}
      </div>
      <span className={s.mine}>
        기억한 메뉴 <b>{st.pts}</b>
      </span>
    </div>
  );
}

// ── 🎵 rhythm workout ───────────────────────────────────────────────────────
const LANES = [
  { key: 'KeyJ', label: 'J', color: '#ff8fab' },
  { key: 'KeyK', label: 'K', color: '#ffd166' },
  { key: 'KeyL', label: 'L', color: '#7fb8f0' },
];

export function Rhythm({ seed, clock, live, score }: BoardProps) {
  useTick(30);
  const ns = useMemo(() => notes(seed), [seed]);
  const st = useRef({ hit: new Set<number>(), pts: 0, flash: [-9, -9, -9] }).current;
  const [say, tell] = useSay();
  const t = clock();
  const press = (lane: number) => {
    if (!live) return;
    const now = clock();
    st.flash[lane] = now;
    const r = pressLane(ns, st.hit, lane, now);
    if (r) {
      st.hit.add(r.i);
      st.pts += r.pts;
      tell(r.pts === 2 ? '퍼펙트! +2' : '굿 +1');
    } else {
      st.pts = Math.max(0, st.pts - 1);
      tell('빗나감 −1');
    }
    score(st.pts);
  };
  // (J K L, not the arrows: those still walk me about in the world behind the card)
  useKeys(live, Object.fromEntries(LANES.map((l, i) => [l.key, () => press(i)])));
  return (
    <div className={s.body}>
      <div className={s.lanes} aria-hidden>
        {LANES.map((l, i) => (
          <div key={l.key} className={s.lane}>
            {ns.map((n, k) =>
              n.lane === i && !st.hit.has(k) && t > n.at - FALL && t < n.at + 0.3 ? (
                <i key={k} className={s.note} style={{ top: `${(1 - (n.at - t) / FALL) * 82}%`, background: l.color }} />
              ) : null,
            )}
            <b className={t - st.flash[i] < 0.12 ? `${s.hitLine} ${s.on}` : s.hitLine} />
          </div>
        ))}
      </div>
      <p className={s.pop}>{say || (live ? '음표가 선에 닿을 때 눌러요' : '곧 음악이 나와요')}</p>
      <div className={s.row}>
        {LANES.map((l, i) => (
          <button key={l.key} className={s.pad3} style={{ background: l.color }} disabled={!live} onPointerDown={() => press(i)}>
            {l.label}
          </button>
        ))}
        <span className={s.mine}>
          점수 <b>{st.pts}</b>
        </span>
      </div>
    </div>
  );
}

// ── 📖 find the book ────────────────────────────────────────────────────────
const COLOR_NAMES = ['분홍', '파랑', '노랑', '초록', '보라', '주황'];
const bookName = (b: number) => `${COLOR_NAMES[Math.floor(b / 6)]} ${SYMBOLS[b % 6]}`;

function Book({ b, big }: { b: number; big?: boolean }) {
  return (
    <span className={big ? `${s.book} ${s.bigBook}` : s.book} style={{ background: BOOK_COLORS[Math.floor(b / 6)] }}>
      {SYMBOLS[b % 6]}
    </span>
  );
}

export function BookHunt({ seed, clock, live, score }: BoardProps) {
  const redraw = useTick(150);
  const st = useRef({ k: 0, pts: 0, hold: 0 }).current;
  const [say, tell] = useSay();
  const sh = useMemo(() => shelf(seed, st.k), [seed, st.k]);
  const waiting = clock() < st.hold;
  const pick = (b: number) => {
    const now = clock();
    if (!live || now < st.hold) return;
    if (b === sh.want) {
      Object.assign(st, { pts: st.pts + 1, k: st.k + 1, hold: now + NEXT_SHELF });
      score(st.pts);
      tell('📖 찾았다! +1');
    } else {
      st.hold = now + WRONG_BOOK;
      tell('그 책이 아니에요');
    }
    redraw();
  };
  return (
    <div className={s.body}>
      <div className={s.row}>
        <p className={s.ticket}>{live ? '이 책을 찾아 주세요 →' : '곧 손님이 와요'}</p>
        {live && <Book b={sh.want} big />}
        <span className={s.mine}>
          찾은 책 <b>{st.pts}</b>
        </span>
      </div>
      <div className={s.shelf}>
        {sh.books.map((b) => (
          <button key={`${st.k}-${b}`} disabled={!live || waiting} onClick={() => pick(b)} aria-label={bookName(b)}>
            <Book b={b} />
          </button>
        ))}
      </div>
      <p className={s.pop}>{say}</p>
    </div>
  );
}

// ── 👗 dress to the theme, then vote ────────────────────────────────────────
const OPTS = { hat: HAT_STYLES, top: TOP_STYLES, accessory: ACCESSORIES, color: CLOTH_COLORS };

/** One player's look as a picture, with their votes and a button to vote for them. */
function LookCard({ look, name, votes, mine, chosen, onVote }: { look: CharacterLook; name: string; votes: number; mine: boolean; chosen: boolean; onVote?: () => void }) {
  const src = useAvatarThumb(look, 'full');
  return (
    <li className={chosen ? `${s.lookCard} ${s.on}` : s.lookCard}>
      {src ? <img src={src} alt={`${name}의 코디`} /> : <span className={s.thumbWait} />}
      <b>{name}</b>
      <span>❤️ {votes}</span>
      {mine ? (
        <small>나</small>
      ) : (
        <button disabled={!onVote} aria-pressed={chosen} onClick={onVote}>
          {chosen ? '투표함' : '투표'}
        </button>
      )}
    </li>
  );
}

export function Vote({ seed, clock, live, score, players, me, send, listen }: BoardProps) {
  useTick(250);
  const theme = useMemo(() => voteTheme(seed), [seed]);
  const base = useMoa((x) => x.me.look);
  const [pick, setPick] = useState<VotePick>({ hat: base.hat, top: base.top, accessory: base.accessory, topColor: base.topColor });
  const st = useRef({ looks: {} as Record<string, VotePick>, votes: {} as Record<string, string | null>, sent: false, cpuVoted: false }).current;
  const t = clock();
  const voting = t >= DRESS_SECS;
  useEffect(
    () =>
      listen((from, v) => {
        const d = v as { look?: VotePick; vote?: string };
        if (d.look) st.looks[from] = d.look;
        if (d.vote) st.votes[from] = d.vote;
      }),
    [listen, st],
  );
  // dressing's over: my look goes round, the computers dress, and a little later they vote
  if (voting && !st.sent) {
    st.sent = true;
    st.looks[me] = pick;
    send({ look: pick });
    players.filter((p) => p.cpu).forEach((p, i) => (st.looks[p.id] = cpuPick(seed, i, theme, OPTS)));
  }
  if (voting && !st.cpuVoted && t > DRESS_SECS + 2.5) {
    st.cpuVoted = true;
    const looks = Object.entries(st.looks);
    players.filter((p) => p.cpu).forEach((p) => (st.votes[p.id] = cpuVote(p.id, looks, theme)));
  }
  const counts = tally(st.votes);
  useEffect(() => {
    score(counts[me] ?? 0);
    players.filter((p) => p.cpu).forEach((p) => score(counts[p.id] ?? 0, p.id));
  });
  const vote = (id: string) => {
    if (!live) return;
    st.votes[me] = id;
    send({ vote: id });
  };
  if (!voting)
    return (
      <div className={`${s.body} ${s.style}`}>
        <AvatarPreview className={s.preview} look={{ ...base, ...pick }} anim="pose" />
        <div className={s.side}>
          <p className={s.ticket}>
            오늘의 주제 · <b>{theme.name}</b>
          </p>
          <p className={s.want}>{live ? `투표까지 ${Math.max(0, Math.ceil(DRESS_SECS - t))}초 — 주제에 어울리게 입어요` : '곧 시작해요'}</p>
          {ROWS.map(([k, label, values]) => (
            <div key={k} className={s.pickRow} role="group" aria-label={label}>
              {values.map((v) => (
                <button key={v} className={pick[k] === v ? s.on : undefined} aria-pressed={pick[k] === v} disabled={!live} onClick={() => setPick((x) => ({ ...x, [k]: v }))}>
                  {LABELS[v]}
                </button>
              ))}
            </div>
          ))}
          <div className={s.pickRow} role="group" aria-label="상의 색">
            {CLOTH_COLORS.map((col) => (
              <button key={col} className={pick.topColor === col ? `${s.swatch} ${s.on}` : s.swatch} style={{ background: col }} aria-label={col} aria-pressed={pick.topColor === col} disabled={!live} onClick={() => setPick((x) => ({ ...x, topColor: col }))} />
            ))}
          </div>
        </div>
      </div>
    );
  return (
    <div className={s.body}>
      <p className={s.ticket}>
        🗳️ <b>{theme.name}</b>에 가장 잘 어울리는 코디에 투표해요 (나 말고)
      </p>
      <ul className={s.lookCards}>
        {players.map((p) => {
          const look = { ...p.look, ...(st.looks[p.id] ?? (p.id === me ? pick : {})) };
          return (
            <LookCard
              key={p.id}
              look={look}
              name={p.id === me ? '나' : p.name}
              votes={counts[p.id] ?? 0}
              mine={p.id === me}
              chosen={st.votes[me] === p.id}
              onVote={live && st.looks[p.id] ? () => vote(p.id) : undefined}
            />
          );
        })}
      </ul>
    </div>
  );
}

// ── 🧩 a stained-glass window, together ─────────────────────────────────────
const GLASS_PALETTES = [
  ['#ffb3c6', '#a9cdfc', '#ffe08a', '#b5e8c9', '#ff8fab', '#7fb8f0', '#ffd166', '#8fd6a4', '#cbb8ff'],
  ['#cbb8ff', '#ffd38a', '#9fe3c4', '#ff9a7a', '#b79cf2', '#ffc46b', '#7fd6b4', '#ff8a6b', '#a9cdfc'],
  ['#a9cdfc', '#ffb3c6', '#b5e8c9', '#ffe08a', '#7fb8f0', '#ff8fab', '#8fd6a4', '#ffd166', '#ffd6e0'],
];
const LEAD = '#3b3150';

/** The whole window (300 × 300): a rose of eight petals, no two alike, so a turned pane always shows. */
function Rose({ k }: { k: number }) {
  const p = GLASS_PALETTES[k % GLASS_PALETTES.length];
  return (
    <>
      <rect width={300} height={300} fill={p[8]} />
      {[[0, 0], [300, 0], [0, 300], [300, 300]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={70} fill={p[i]} stroke={LEAD} strokeWidth={4} />
      ))}
      <circle cx={150} cy={150} r={140} fill="#fffaf2" stroke={LEAD} strokeWidth={5} />
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx={150 + 78 * Math.cos((i * Math.PI) / 4)} cy={150 + 78 * Math.sin((i * Math.PI) / 4)} rx={56} ry={28} transform={`rotate(${i * 45} ${150 + 78 * Math.cos((i * Math.PI) / 4)} ${150 + 78 * Math.sin((i * Math.PI) / 4)})`} fill={p[i]} stroke={LEAD} strokeWidth={4} />
      ))}
      <circle cx={150} cy={150} r={38} fill={p[(k + 3) % 8]} stroke={LEAD} strokeWidth={4} />
      <circle cx={150} cy={150} r={14} fill="#fff3c4" stroke={LEAD} strokeWidth={3} />
    </>
  );
}

export function Glass({ seed, clock, live, score, send, listen }: BoardProps) {
  const redraw = useTick(200);
  const st = useRef({ k: 0, turns: panes(seed, 0), done: 0, glow: 0 }).current;
  const turn = (k: number, i: number) => {
    if (k !== st.k) return; // a turn on a window we've finished already
    st.turns = st.turns.map((x, j) => (j === i ? (x + 1) % 4 : x));
    if (straight(st.turns)) {
      Object.assign(st, { done: st.done + 1, k: st.k + 1, turns: panes(seed, st.k + 1), glow: clock() + 1.6 });
      score(st.done);
    }
    redraw();
  };
  useEffect(() => listen((_, v) => turn((v as { k: number }).k, (v as { i: number }).i)), [listen]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (i: number) => {
    if (!live) return;
    send({ k: st.k, i });
    turn(st.k, i);
  };
  const glowing = st.done > 0 && clock() < st.glow; // (the clock runs negative in the countdown)
  return (
    <div className={s.body}>
      <p className={s.ticket}>{glowing ? `✨ 창이 완성됐어요! (${st.done}장)` : live ? '조각을 눌러 돌려서, 모두 함께 창을 완성해요' : '곧 시작해요'}</p>
      <div className={glowing ? `${s.glass} ${s.glowing}` : s.glass}>
        {(glowing ? Array(9).fill(0) : st.turns).map((q, i) => (
          <button key={`${st.k}-${i}`} disabled={!live || glowing} onClick={() => tap(i)} aria-label={`${i + 1}번 조각 돌리기`} style={{ rotate: `${q * 90}deg` }}>
            <svg viewBox={`${(i % 3) * 100} ${Math.floor(i / 3) * 100} 100 100`} aria-hidden>
              <Rose k={glowing ? st.k - 1 : st.k} />
            </svg>
          </button>
        ))}
      </div>
      <span className={s.mine}>
        함께 완성한 창 <b>{st.done}</b>
      </span>
    </div>
  );
}
