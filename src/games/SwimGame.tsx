import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import s from '../styles/Minigame.module.scss';
import { AvatarBody, useAvatarPose, useJoints } from '../world/Avatar3D';
import { toon } from '../world/toon';
import { useTaps } from './controls';
import { ev, finish, onEvent, type Match } from './session';
import { BEAT, CUTOFF, cpuStrokes, LENGTH, newSwimmer, seeded, stroke, strokeQuality, swimFor, type Arm, type Swimmer } from './swim';

const LANE = 2.4;
type SwimEv = { k: 'p'; d: number; v: number } | { k: 'fin'; time: number };

/** Each lane: my own swimmer runs here; the others' arrive as reports (and coast between them). */
interface Lane {
  sw: Swimmer;
  /** For the others: when their last report came in (performance.now() s). */
  heard: number;
  strokes?: number[]; // a computer's stroke times
  next?: number;
  splashAt: number;
  /** Swum up to this race time (in fixed steps, so a slow screen swims as far as a fast one). */
  simT: number;
}

const now = () => performance.now() / 1000;
const STEP = 1 / 60;

/** Swim this lane on to race time t (a computer takes its strokes on the way). */
function advance(l: Lane, t: number) {
  while (l.simT + STEP <= t) {
    l.simT += STEP;
    if (l.strokes) while (l.next! < l.strokes.length && l.strokes[l.next!] <= l.simT) l.sw = stroke(l.sw, (l.next! % 2 ? 'R' : 'L') as Arm, l.strokes[l.next!++]);
    l.sw = swimFor(l.sw, STEP, l.simT);
  }
}

export function SwimGame({ match, meId }: { match: Match; meId: string }) {
  const mine = match.role === 'player' ? match.seats.findIndex((x) => x.id === meId) : -1;
  const lanes = useMemo<Lane[]>(() => {
    const rnd = seeded(match.seed);
    return match.seats.map((p, i) => ({ sw: newSwimmer(), heard: 0, splashAt: -9, simT: 0, ...(p.cpu ? { strokes: cpuStrokes(0.55 + 0.15 * i, rnd), next: 0 } : {}) }));
  }, [match.seats, match.seed]);
  const [hud, setHud] = useState({ order: [] as { name: string; d: number; time: number | null }[], q: 0, t: 0 });
  const done = useRef(false);
  const start = match.startAt / 1000;
  const raceTime = () => Math.max(0, now() - start);

  const tap = (arm: Arm) => {
    if (mine < 0 || now() < start) return;
    const l = lanes[mine];
    advance(l, raceTime());
    const q = strokeQuality(l.sw, arm, raceTime());
    l.sw = stroke(l.sw, arm, raceTime());
    l.splashAt = now();
    setHud((h) => ({ ...h, q }));
  };
  useTaps(mine >= 0, tap);

  useEffect(
    () =>
      onEvent((data, from) => {
        const i = match.seats.findIndex((x) => x.id === from);
        if (i < 0 || i === mine) return;
        const e = data as SwimEv;
        const l = lanes[i];
        if (e.k === 'p') Object.assign(l, { sw: { ...l.sw, d: e.d, v: e.v }, heard: now(), splashAt: e.v > 0.4 ? now() : l.splashAt });
        if (e.k === 'fin') l.sw = { ...l.sw, d: LENGTH, v: 0, time: e.time };
      }),
    [lanes, match.seats, mine],
  );

  const sent = useRef(0);
  const told = useRef(false); // my finish went out (it can happen in a stroke, not just a frame)
  const step = (dt: number) => {
    const t = raceTime();
    if (t <= 0) return;
    lanes.forEach((l, i) => {
      if (i === mine || l.strokes) {
        // swum here: me, or a computer
        advance(l, t);
        if (i === mine && l.sw.time !== null && !told.current) {
          told.current = true;
          ev({ k: 'fin', time: l.sw.time } satisfies SwimEv);
        }
      } else if (l.sw.time === null) l.sw = { ...l.sw, d: Math.min(LENGTH - 0.01, l.sw.d + l.sw.v * dt) }; // coast on their last speed
    });
    if (mine >= 0 && lanes[mine].sw.time === null && now() - sent.current > 0.12) {
      sent.current = now();
      ev({ k: 'p', d: +lanes[mine].sw.d.toFixed(2), v: +lanes[mine].sw.v.toFixed(2) } satisfies SwimEv);
    }
    // everyone in (or out: left, or past the cutoff) → results
    const out = (i: number) => lanes[i].sw.time !== null || match.left.includes(match.seats[i].id) || t > CUTOFF;
    if (!done.current && match.seats.every((_, i) => out(i))) {
      done.current = true;
      setTimeout(() => finish(Object.fromEntries(match.seats.map((p, i) => [p.id, match.left.includes(p.id) ? null : lanes[i].sw.time]))), 1000);
    }
  };

  // the leaderboard, a few times a second
  useEffect(() => {
    const id = setInterval(() => {
      const order = match.seats
        .map((p, i) => ({ name: i === mine ? '나' : p.nickname, d: lanes[i].sw.d, time: lanes[i].sw.time }))
        .sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9) || b.d - a.d);
      setHud((h) => ({ ...h, order, t: raceTime() }));
    }, 150);
    return () => clearInterval(id);
  });

  const width = match.seats.length * LANE;
  return (
    <div className={s.game}>
      <Canvas flat shadows="percentage" dpr={[1, 2]} camera={{ fov: 42, position: [width / 2 + 4, 7, 6], near: 0.5, far: 150 }}>
        <Pool lanes={match.seats.length} />
        {match.seats.map((p, i) => (
          <SwimmerFigure key={p.id} look={p.look} lane={lanes[i]} x={(i - (match.seats.length - 1) / 2) * LANE} />
        ))}
        <Follow lanes={lanes} mine={mine} step={step} />
      </Canvas>
      <ol className={s.ranks} aria-live="polite">
        {hud.order.map((r, i) => (
          <li key={r.name + i}>
            <b>{i + 1}</b> {r.name} <span>{r.time !== null ? `${r.time.toFixed(2)}초` : `${r.d.toFixed(1)}m`}</span>
          </li>
        ))}
      </ol>
      <p className={s.say}>{hud.t > 0 ? `${hud.t.toFixed(1)}초` : ''}</p>
      {mine >= 0 && (
        <div className={s.pad}>
          <button aria-label="왼팔" onPointerDown={() => tap('L')}>
            ◀ 왼팔
          </button>
          {/* how good the last stroke was: on the beat fills it */}
          <span className={s.beat} style={{ '--q': hud.q } as CSSProperties} aria-label={`박자 ${Math.round(hud.q * 100)}%`}>
            박자 {BEAT}s
          </span>
          <button aria-label="오른팔" onPointerDown={() => tap('R')}>
            오른팔 ▶
          </button>
        </div>
      )}
    </div>
  );
}

/** The camera follows my swimmer (watching: the leader). */
function Follow({ lanes, mine, step }: { lanes: Lane[]; mine: number; step: (dt: number) => void }) {
  const at = useRef(new THREE.Vector3());
  useFrame(({ camera }, dt) => {
    step(Math.min(dt, 0.25));
    const who = mine >= 0 ? mine : lanes.reduce((b, l, i) => (l.sw.d > lanes[b].sw.d ? i : b), 0);
    const z = -lanes[who].sw.d;
    const x = (who - (lanes.length - 1) / 2) * LANE;
    at.current.lerp(new THREE.Vector3(x, 0, z), 1 - Math.exp(-dt * 4));
    camera.position.set(at.current.x + 4.5, 6.5, at.current.z + 7.5);
    camera.lookAt(at.current.x, 0, at.current.z - 4);
  });
  return null;
}

function Pool({ lanes }: { lanes: number }) {
  const w = lanes * LANE;
  return (
    <>
      <hemisphereLight args={['#fffaf0', '#8fd0f5', 1.4]} />
      <directionalLight position={[8, 14, 6]} intensity={1.5} />
      <color attach="background" args={['#a6dcff']} />
      {/* deck, water, start and finish walls, lane ropes */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -LENGTH / 2]} material={toon('#fdf8ef')}>
        <planeGeometry args={[w + 14, LENGTH + 20]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -LENGTH / 2]}>
        <planeGeometry args={[w, LENGTH + 1]} />
        <meshBasicMaterial color="#7cc8f2" transparent opacity={0.85} />
      </mesh>
      {[0.5, -LENGTH - 0.5].map((z) => (
        <mesh key={z} position={[0, 0.15, z]} material={toon('#ffffff')}>
          <boxGeometry args={[w + 0.4, 0.3, 0.4]} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, -LENGTH]} material={toon('#ff8fab')}>
        <planeGeometry args={[w, 0.25]} />
      </mesh>
      {Array.from({ length: lanes + 1 }, (_, i) => (
        <mesh key={i} rotation-x={Math.PI / 2} position={[(i - lanes / 2) * LANE, 0.06, -LENGTH / 2]} material={toon(i % 2 ? '#ff8fab' : '#ffffff')}>
          <cylinderGeometry args={[0.06, 0.06, LENGTH + 1, 6]} />
        </mesh>
      ))}
    </>
  );
}

function SwimmerFigure({ look, lane, x }: { look: Match['seats'][number]['look']; lane: Lane; x: number }) {
  const joints = useJoints();
  const root = useRef<THREE.Group>(null);
  const splash = useRef<THREE.Mesh>(null);
  useAvatarPose(joints, look, () => (lane.sw.time !== null || lane.sw.v < 0.15 ? 'tube' : 'swim'));
  useFrame(() => {
    root.current?.position.set(x, 0, -lane.sw.d);
    const k = Math.max(0, 1 - (now() - lane.splashAt) / 0.4);
    if (splash.current) {
      splash.current.visible = k > 0;
      splash.current.scale.setScalar(0.4 + (1 - k) * 0.9);
      (splash.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * k;
    }
  });
  return (
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <AvatarBody look={look} joints={joints} />
      <mesh ref={splash} rotation-x={-Math.PI / 2} position={[0, 0.1, 0.2]}>
        <ringGeometry args={[0.35, 0.6, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
    </group>
  );
}
