import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import s from '../styles/Minigame.module.scss';
import { PIXEL_FONT } from '../styles/fonts';
import { AvatarBody, useAvatarPose, useJoints } from '../world/Avatar';
import { Fan } from './Fan';
import { MODELS } from '../world/models';
import { PIXEL_GL, PixelPost, PixelRows } from '../world/pixel';
import { Sky } from '../world/Stage';
import { canvasTexture, toon } from '../world/toon';
import { useHeld } from './controls';
import { ev, finish, onEvent, type Match, type Seat } from './session';
import { seeded } from './swim';
import {
  ballAt,
  cpuReturns,
  flightTime,
  HALF_L,
  HALF_W,
  judge,
  laneOf,
  LATE,
  newScore,
  other,
  point,
  receiverOf,
  RUN,
  serve,
  serverOf,
  teamOf,
  winnerOf,
  type Flight,
  type Score,
  type Side,
} from './tennis';

/** One tennis match, as everyone at the table plays (or watches) it. */
interface Live {
  score: Score;
  flight: Flight | null;
  /** When the flight began, on this screen's clock (seconds). */
  t0: number;
  /** Each seat's place along its baseline. */
  x: number[];
  /** Where the other players last said they were. */
  seen: number[];
  swungAt: number[];
  /** When the last point was scored (the stands cheer). */
  pointAt: number;
  /** No serve before this. */
  until: number;
  over: boolean;
}

type TennisEv = { k: 'x'; seat: number; x: number } | { k: 'f'; f: Flight; by: number } | { k: 'pt'; score: Score; why: string };

const now = () => performance.now() / 1000;
const WHY: Record<string, string> = { far: '공이 너무 멀었어요', early: '너무 빨랐어요', late: '늦었어요' };

export function TennisGame({ match, meId }: { match: Match; meId: string }) {
  const n = match.seats.length;
  const doubles = n === 4;
  const mine = match.role === 'player' ? match.seats.findIndex((x) => x.id === meId) : -1;
  /** My team (null: watching); team 1 sees the court from the far end. */
  const side = mine >= 0 ? teamOf(mine) : null;
  // the host plays the computer seats, and tells everyone what they do
  const cpus = match.host === meId ? match.seats.flatMap((x, i) => (x.cpu ? [i] : [])) : [];
  const home = (i: number) => (doubles ? (i < 2 ? -1.6 : 1.6) : 0);
  const live = useRef<Live>({
    score: newScore(),
    flight: null,
    t0: 0,
    x: match.seats.map((_, i) => home(i)),
    seen: match.seats.map((_, i) => home(i)),
    swungAt: match.seats.map(() => -9),
    pointAt: -9,
    until: 0,
    over: false,
  }).current;
  const [hud, setHud] = useState({ score: live.score, msg: '' });
  const held = useHeld(mine >= 0);
  const rnd = useMemo(() => seeded(match.seed), [match.seed]);
  const say = (msg: string) => setHud({ score: live.score, msg });
  /** Everyone's points are their team's. */
  const scoresOf = (left: string[] = []) => Object.fromEntries(match.seats.map((p, i) => [p.id, left.includes(p.id) ? null : live.score.points[teamOf(i)]]));

  /** The point goes to team `winner` (decided by whoever missed — or by the host for a computer). */
  const scorePoint = (winner: Side, why: string, tell: boolean) => {
    live.score = point(live.score, winner);
    live.pointAt = now();
    live.flight = null;
    live.until = now() + 1.4;
    if (tell) ev({ k: 'pt', score: live.score, why } satisfies TennisEv);
    say(winner === side ? `득점! ${why}` : `실점 · ${why}`);
    const w = winnerOf(live.score);
    if (w !== null) end();
  };
  const end = () => {
    if (live.over) return;
    live.over = true;
    setTimeout(() => finish(scoresOf()), 1200);
  };
  /** A shot by seat `by` (its swing shows). */
  const shoot = (f: Flight, by: number, tell: boolean) => {
    live.flight = f;
    live.t0 = now();
    live.swungAt[by] = now();
    if (tell) ev({ k: 'f', f, by } satisfies TennisEv);
  };

  // what the others at the table do
  useEffect(
    () =>
      onEvent((data) => {
        const e = data as TennisEv;
        if (e.k === 'x') live.seen[e.seat] = e.x;
        if (e.k === 'f') shoot(e.f, e.by, false);
        if (e.k === 'pt') {
          const before = live.score;
          live.score = e.score;
          live.pointAt = now();
          live.flight = null;
          live.until = now() + 1.4;
          say(side === null ? e.why : e.score.points[side] > before.points[side] ? `득점! ${e.why}` : `실점 · ${e.why}`);
          if (winnerOf(e.score) !== null) end();
        }
      }),
    [],
  );
  // someone left mid-match: whoever's still here wins it
  useEffect(() => {
    if (!match.left.length || live.over) return;
    live.over = true;
    say('상대가 나갔어요 — 경기 종료');
    setTimeout(() => finish(scoresOf(match.left)), 1200);
  }, [match.left]);

  /** My swing (Space / 스윙): serve, return, or a whiff. */
  const swing = () => {
    if (side === null || live.over) return;
    const t = now();
    const aim = (held.dir() * (side === 0 ? 1 : -1)) as number; // screen left/right → court x
    const f = live.flight;
    if (!f && serverOf(live.score, doubles) === mine && t >= live.until) {
      shoot(serve(side, live.x[mine], aim), mine, true);
      say('');
      return;
    }
    if (!f || receiverOf(f, doubles) !== mine) return; // nothing coming at me (in doubles: it's my partner's)
    const v = judge(f, t - live.t0, live.x[mine], aim, live.score.rally);
    live.swungAt[mine] = t;
    if (v.ok) {
      live.score = { ...live.score, rally: live.score.rally + 1 };
      shoot(v.flight, mine, true);
      say(live.score.rally >= 4 ? `랠리 ${live.score.rally}!` : '');
    } else scorePoint(other(side), WHY[v.why], true);
  };
  held.onSwing(swing);

  // where a seat (mine, or a computer's) is, to the others, ≤ 10× a second
  const lastSent = useRef<Record<number, { at: number; x: number }>>({});
  const tellX = (seat: number, t: number) => {
    const l = lastSent.current[seat] ?? { at: 0, x: 99 };
    if (t - l.at <= 0.1 || Math.abs(l.x - live.x[seat]) <= 0.01) return;
    lastSent.current[seat] = { at: t, x: live.x[seat] };
    ev({ k: 'x', seat, x: live.x[seat] } satisfies TennisEv);
  };
  // every frame: run, play the computers, miss a ball I never swung at
  const step = (dt: number) => {
    const t = now();
    if (side !== null && !live.over) {
      const [lo, hi] = laneOf(mine, doubles);
      const dir = held.dir() * (side === 0 ? 1 : -1);
      live.x[mine] = Math.max(lo, Math.min(hi, live.x[mine] + dir * RUN * dt));
      tellX(mine, t);
      const f = live.flight;
      if (f && receiverOf(f, doubles) === mine && t - live.t0 > f.dur + LATE) scorePoint(other(side), '공을 놓쳤어요', true);
    }
    for (let i = 0; i < n; i++) if (i !== mine && !cpus.includes(i)) live.x[i] += (live.seen[i] - live.x[i]) * Math.min(1, dt * 12);
    if (!live.over) for (const c of cpus) cpuStep(c, t, dt);
  };
  const cpuStep = (c: number, t: number, dt: number) => {
    const f = live.flight;
    const team = teamOf(c);
    const [lo, hi] = laneOf(c, doubles);
    const ours = !!f && receiverOf(f, doubles) === c;
    const gap = (ours ? f.to : (lo + hi) / 2) - live.x[c];
    live.x[c] = Math.max(lo, Math.min(hi, live.x[c] + Math.sign(gap) * Math.min(Math.abs(gap), RUN * 0.8 * dt)));
    tellX(c, t);
    if (!f && serverOf(live.score, doubles) === c && t >= live.until + 0.6) shoot(serve(team, live.x[c], rnd() * 2 - 1), c, true);
    else if (f && ours && t - live.t0 >= f.dur - 0.04) {
      if (cpuReturns(f, live.x[c], live.score.rally, rnd())) {
        live.score = { ...live.score, rally: live.score.rally + 1 };
        shoot({ by: team, from: f.to, to: (rnd() * 2 - 1) * (HALF_W - 0.5), dur: flightTime(live.score.rally) }, c, true);
      } else scorePoint(other(team), '컴퓨터가 놓쳤어요', true);
    }
  };

  const [dpr, setDpr] = useState(0.3);
  const [me, them] = side === 1 ? [1, 0] : [0, 1];
  const name = (i: number) => (i === mine ? '나' : (match.seats[i]?.nickname ?? ''));
  const teamName = (team: number) => match.seats.flatMap((_, i) => (teamOf(i) === team ? [name(i)] : [])).join('·');
  const serving = side !== null && !live.flight && serverOf(live.score, doubles) === mine && !live.over;
  const partnerServes = doubles && side !== null && !live.flight && live.score.server === side && !serving && !live.over;
  return (
    <div className={s.game}>
      <Canvas flat shadows="basic" gl={PIXEL_GL} dpr={dpr} camera={{ fov: 40, position: side === null ? [12, 10, 0] : [0, 5.6, HALF_L + 7], near: 0.5, far: 160 }}>
        <PixelRows rows={280} onDpr={setDpr} />
        <Court fans={match.watchers ?? []} cheer={() => now() - live.pointAt < 1.6} />
        <Scoreboard names={[teamName(me), teamName(them)]} points={[hud.score.points[me], hud.score.points[them]]} />
        <group rotation={[0, side === 1 ? Math.PI : 0, 0]}>
          {match.seats.map((p, i) => (
            <Player key={p.id} look={p.look} seat={i} team={teamOf(i)} live={live} />
          ))}
          <Ball live={live} />
        </group>
        <Tick step={step} look={side === null} />
        <PixelPost />
      </Canvas>
      <div className={s.board} aria-live="polite">
        <span>{teamName(me)}</span>
        <b>
          {hud.score.points[me]} : {hud.score.points[them]}
        </b>
        <span>{teamName(them)}</span>
      </div>
      <p className={s.say}>{hud.msg || (serving ? '내 서브! 스윙 (Space)' : partnerServes ? '우리 팀 서브 — 내 쪽 절반을 지켜요' : side === null ? '👀 관전 중' : '')}</p>
      {side !== null && <Pad held={held} swing={swing} swingLabel={serving ? '서브' : '스윙'} />}
    </div>
  );
}

export function Pad({ held, swing, swingLabel }: { held: ReturnType<typeof useHeld>; swing: () => void; swingLabel: string }) {
  return (
    <div className={s.pad}>
      <button aria-label="왼쪽" onPointerDown={() => held.press(-1)} onPointerUp={() => held.press(0)} onPointerLeave={() => held.press(0)}>
        ◀
      </button>
      <button aria-label="오른쪽" onPointerDown={() => held.press(1)} onPointerUp={() => held.press(0)} onPointerLeave={() => held.press(0)}>
        ▶
      </button>
      <button className={s.big} onPointerDown={swing}>
        {swingLabel}
      </button>
    </div>
  );
}

function Tick({ step, look }: { step: (dt: number) => void; look: boolean }) {
  useFrame(({ camera }, dt) => {
    step(Math.min(dt, 0.25)); // real time (a slow screen runs as far), but no leap after a hidden tab
    camera.lookAt(0, 0, look ? 0 : -1.5);
  });
  return null;
}

// court colours: a blue hard court on a mint apron, in a park
const SURFACE = '#5b9de0';
const APRON = '#78c49b';
const FENCE = '#3f6b5a';

/** A see-through grid (the net, the fence's chain-link). */
const meshTexture = (line: string, repeat: [number, number]) =>
  canvasTexture(32, 32, (ctx) => {
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 32, 32);
  }, repeat);

function Court({ fans, cheer }: { fans: Seat[]; cheer: () => boolean }) {
  const net = useMemo(() => new THREE.MeshBasicMaterial({ map: meshTexture('#2f3a4a', [HALF_W * 5, 3]), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), []);
  const fence = useMemo(() => new THREE.MeshBasicMaterial({ map: meshTexture(FENCE, [16, 4]), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), []);
  const FW = HALF_W + 3.2, FB = HALF_L + 3.4; // the fence: sides and the far end (the near end is open, so nothing hides you)
  const lines: [number, number, number, number][] = [
    // x, z, width, depth
    [0, HALF_L, HALF_W * 2 + 0.1, 0.1],
    [0, -HALF_L, HALF_W * 2 + 0.1, 0.1],
    [HALF_W, 0, 0.1, HALF_L * 2],
    [-HALF_W, 0, 0.1, HALF_L * 2],
    [0, HALF_L / 2, HALF_W * 2, 0.08],
    [0, -HALF_L / 2, HALF_W * 2, 0.08],
    [0, 0, 0.08, HALF_L],
  ];
  return (
    <>
      <Sky colors={['#7cc3ff', '#9fd2ff', '#bfe0ff', '#dcedff', '#f4f7ff']} />
      <hemisphereLight args={['#fff4e2', '#8fcf9f', 1.45]} />
      <directionalLight position={[5, 14, 10]} intensity={2.3} color="#fff1dc" castShadow shadow-mapSize={[2048, 2048]} shadow-radius={4} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      {/* park grass, the apron, the court and its lines */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow material={toon('#a9db92')}>
        <planeGeometry args={[200, 200]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow material={toon(APRON)}>
        <planeGeometry args={[FW * 2, FB * 2]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={toon(SURFACE)}>
        <planeGeometry args={[HALF_W * 2 + 0.1, HALF_L * 2 + 0.1]} />
      </mesh>
      {lines.map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.01, z]} receiveShadow material={toon('#ffffff')}>
          <planeGeometry args={[w, d]} />
        </mesh>
      ))}
      {/* the net: posts, the mesh, a white band on top */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * (HALF_W + 0.4), 0.55, 0]} castShadow material={toon('#4b5368')}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, 0]} material={net} castShadow>
        <planeGeometry args={[HALF_W * 2 + 0.8, 0.9]} />
      </mesh>
      <mesh position={[0, 0.97, 0]} material={toon('#ffffff')} castShadow>
        <boxGeometry args={[HALF_W * 2 + 0.8, 0.08, 0.05]} />
      </mesh>
      {/* chain-link fence on posts */}
      {(
        [
          [0, -FB, FW * 2, 0],
          [-FW, 0, FB * 2, Math.PI / 2],
          [FW, 0, FB * 2, Math.PI / 2],
        ] as const
      ).map(([x, z, len, turn], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={turn}>
          <mesh position-y={1.1} material={fence}>
            <planeGeometry args={[len, 2.2]} />
          </mesh>
          {Array.from({ length: Math.round(len / 2.4) + 1 }, (_, k) => (
            <mesh key={k} position={[-len / 2 + (k * len) / Math.round(len / 2.4), 1.15, 0]} material={toon(FENCE)} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 2.3, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <Stands z={-FB - 1.6} fans={fans} cheer={cheer} />
      {/* a park all round */}
      {[[-FW - 3, -6], [-FW - 2.5, 2], [FW + 3, -4], [FW + 2.6, 4.5], [-7, -FB - 6], [7.5, -FB - 5.5], [-FW - 4, 9], [FW + 4, 10]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={1.2 + (i % 3) * 0.15}>
          {i % 3 === 2 ? <MODELS.pine.Model /> : <MODELS.tree.Model />}
        </group>
      ))}
    </>
  );
}

/** Tiered seats behind the far end, in the theme's colours. */
/** Three rows of seats behind the far baseline, spectators in them (front row first). */
function Stands({ z, fans, cheer }: { z: number; fans: Seat[]; cheer: () => boolean }) {
  const colors = ['#ff9db5', '#ffd27a', '#8fd0f5', '#b5e8c9', '#cbb8ff'];
  // first either side of the far player (not right behind them, from the near end), then out, then the middle
  const order = [3, 8, 2, 9, 4, 7, 1, 10, 0, 11, 5, 6];
  return (
    <group position={[0, 0, z]}>
      {fans.slice(0, 36).map((f, i) => {
        const row = Math.floor(i / 12), k = order[i % 12];
        // sitting on the cushion: hips up on it, feet hanging over the front of the step
        return <Fan key={f.id} look={f.look} at={[-5.5 + k, 0.29 + row * 0.9, 0.27 - row * 0.9]} excited={cheer} />;
      })}
      {[0, 1, 2].map((row) => (
        <group key={row} position={[0, 0, -row * 0.9]}>
          <mesh position={[0, 0.25 + row * 0.45, 0]} material={toon('#e9e2f2')} castShadow receiveShadow>
            <boxGeometry args={[12, 0.5 + row * 0.9, 0.9]} />
          </mesh>
          {Array.from({ length: 12 }, (_, k) => (
            <mesh key={k} position={[-5.5 + k, 0.62 + row * 0.9, 0.05]} material={toon(colors[(k + row) % colors.length])} castShadow>
              <boxGeometry args={[0.7, 0.24, 0.6]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** The big board over the stands: both names and points, redrawn when the score changes. */
function Scoreboard({ names, points }: { names: [string, string]; points: [number, number] }) {
  const tex = useMemo(() => canvasTexture(512, 224, () => {}), []);
  const key = `${names.join('|')}|${points.join(':')}`;
  useEffect(() => {
    const ctx = (tex.image as HTMLCanvasElement).getContext('2d')!;
    ctx.fillStyle = '#2f3550';
    ctx.fillRect(0, 0, 512, 224);
    ctx.fillStyle = '#ffd166';
    ctx.font = `28px ${PIXEL_FONT}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MOA OPEN', 256, 40);
    names.forEach((n, i) => {
      const y = 100 + i * 80;
      ctx.fillStyle = i ? '#ffffff' : '#ffb3c6';
      ctx.textAlign = 'left';
      ctx.font = `36px ${PIXEL_FONT}, sans-serif`;
      ctx.fillText(n.slice(0, 8), 36, y + 12);
      ctx.textAlign = 'right';
      ctx.font = `64px ${PIXEL_FONT}, sans-serif`;
      ctx.fillText(String(points[i]), 476, y + 22);
    });
    tex.needsUpdate = true;
  }, [key]); // names / points, by value
  return (
    // over the far left corner, turned to the court (the score's in the HUD too)
    <group position={[-7.4, 0, -HALF_L - 4.6]} rotation-y={0.5}>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.9, -0.1]} material={toon('#4b5368')}>
          <boxGeometry args={[0.18, 3.8, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 3.4, 0]} material={toon('#4b5368')}>
        <boxGeometry args={[5.6, 2.6, 0.2]} />
      </mesh>
      <mesh position={[0, 3.4, 0.11]}>
        <planeGeometry args={[5.3, 2.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Player({ look, seat, team, live }: { look: Match['seats'][number]['look']; seat: number; team: Side; live: Live }) {
  const joints = useJoints();
  const root = useRef<THREE.Group>(null);
  useAvatarPose(joints, look, () => (now() - live.swungAt[seat] < 0.55 ? 'swing' : 'ready'));
  useFrame(() => root.current?.position.set(live.x[seat], 0, (team === 0 ? 1 : -1) * (HALF_L + 0.5)));
  return (
    <group ref={root} rotation={[0, team === 0 ? Math.PI : 0, 0]}>
      <AvatarBody look={look} joints={joints} />
    </group>
  );
}

const TRAIL = 6;

/** The ball, a fading trail behind it, its shadow, and a ring where it's headed (the receiver's spot to reach). */
function Ball({ live }: { live: Live }) {
  const ball = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const aim = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Group>(null);
  const past = useRef<THREE.Vector3[]>([]);
  useFrame(({ clock }) => {
    const f = live.flight;
    for (const r of [ball, shadow, aim, trail]) if (r.current) r.current.visible = !!f;
    if (!f) return void (past.current = []);
    const p = ballAt(f, now() - live.t0);
    ball.current?.position.set(p.x, p.h, p.z);
    shadow.current?.position.set(p.x, 0.02, p.z);
    // it lands on the far baseline from whoever hit it
    aim.current?.position.set(f.to, 0.025, (f.by === 0 ? -1 : 1) * HALF_L);
    aim.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 10) * 0.12);
    past.current = [new THREE.Vector3(p.x, p.h, p.z), ...past.current].slice(0, TRAIL);
    trail.current?.children.forEach((c, i) => {
      const at = past.current[i + 1];
      c.visible = !!at;
      if (at) c.position.copy(at);
    });
  });
  return (
    <>
      <mesh ref={ball} castShadow material={toon('#e9f55c')}>
        <sphereGeometry args={[0.15, 16, 12]} />
      </mesh>
      <group ref={trail}>
        {Array.from({ length: TRAIL - 1 }, (_, i) => (
          <mesh key={i} scale={1 - (i + 1) / TRAIL}>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshBasicMaterial color="#fbffc2" transparent opacity={0.5 - i * 0.08} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
      <mesh ref={aim} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.32, 0.42, 28]} />
        <meshBasicMaterial color="#ffe14d" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </>
  );
}
