import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import { sfx } from '../audio';
import s from '../styles/Minigame.module.scss';
import { AvatarBody, useAvatarPose, useJoints } from '../world/Avatar';
import { Fan } from './Fan';
import { MODELS } from '../world/models';
import { PIXEL_GL, PixelPost, PixelRows } from '../world/pixel';
import { Sky } from '../world/Stage';
import { canvasTexture, shimmer, toon } from '../world/toon';
import { useKeys, useTaps } from './controls';
import { ev, finish, onEvent, type Match, type Seat } from './session';
import { BEAT, CUTOFF, cpuDives, cpuStrokes, dive, ducks, LENGTH, newSwimmer, seeded, stroke, strokeQuality, swimFor, under, type Arm, type Swimmer } from './swim';

const LANE = 2.4;
/** My progress (`u`: under water, in the duck race), and my time at the wall. */
type SwimEv = { k: 'p'; d: number; v: number; u?: 1 } | { k: 'fin'; time: number };

/** Each lane: my own swimmer runs here; the others' arrive as reports (and coast between them). */
interface Lane {
  sw: Swimmer;
  /** For the others: when their last report came in (performance.now() s). */
  heard: number;
  strokes?: number[]; // a computer's stroke times
  next?: number;
  /** A computer's dives (duck race): under each duck or not. */
  plan?: boolean[];
  /** Someone else under water (duck race) until this race time, as they last said. */
  dip: number;
  splashAt: number;
  /** Swum up to this race time (in fixed steps, so a slow screen swims as far as a fast one). */
  simT: number;
}

const now = () => performance.now() / 1000;
const STEP = 1 / 60;

/** Swim this lane on to race time t (a computer takes its strokes on the way, and dives under its ducks). */
function advance(l: Lane, t: number, ds: number[]) {
  while (l.simT + STEP <= t) {
    l.simT += STEP;
    if (l.strokes) while (l.next! < l.strokes.length && l.strokes[l.next!] <= l.simT) l.sw = stroke(l.sw, (l.next! % 2 ? 'R' : 'L') as Arm, l.strokes[l.next!++]);
    if (l.plan) ds.forEach((x, k) => l.plan![k] && x > l.sw.d && x - l.sw.d < 0.6 && (l.sw = dive(l.sw, l.simT)));
    l.sw = swimFor(l.sw, STEP, l.simT, ds);
  }
}

export function SwimGame({ match, meId }: { match: Match; meId: string }) {
  const mine = match.role === 'player' ? match.seats.findIndex((x) => x.id === meId) : -1;
  // the duck race: the same ducks in every lane
  const ds = useMemo(() => (match.game === 'hurdles' ? ducks(match.seed) : []), [match.game, match.seed]);
  const lanes = useMemo<Lane[]>(() => {
    const rnd = seeded(match.seed);
    return match.seats.map((p, i) => ({
      sw: newSwimmer(),
      heard: 0,
      splashAt: -9,
      simT: 0,
      dip: -9,
      ...(p.cpu ? { strokes: cpuStrokes(0.55 + 0.15 * i, rnd), next: 0, plan: cpuDives(match.seed, i, ds, 0.55 + 0.15 * i) } : {}),
    }));
  }, [match.seats, match.seed, ds]);
  const [hud, setHud] = useState({ order: [] as { name: string; d: number; time: number | null }[], q: 0, t: 0 });
  const done = useRef(false);
  const start = match.startAt / 1000;
  const raceTime = () => Math.max(0, now() - start);

  const tap = (arm: Arm) => {
    if (mine < 0 || now() < start) return;
    const l = lanes[mine];
    advance(l, raceTime(), ds);
    const q = strokeQuality(l.sw, arm, raceTime());
    l.sw = stroke(l.sw, arm, raceTime());
    l.splashAt = now();
    sfx('splash');
    setHud((h) => ({ ...h, q }));
  };
  useTaps(mine >= 0, tap);
  /** Duck race: under water for a moment (Space · 잠수). */
  const diveMe = () => {
    if (mine < 0 || now() < start || !ds.length) return;
    const l = lanes[mine];
    advance(l, raceTime(), ds);
    l.sw = dive(l.sw, raceTime());
    sfx('dive');
  };
  useKeys(mine >= 0 && ds.length > 0, { Space: diveMe });

  useEffect(
    () =>
      onEvent((data, from) => {
        const i = match.seats.findIndex((x) => x.id === from);
        if (i < 0 || i === mine) return;
        const e = data as SwimEv;
        const l = lanes[i];
        if (e.k === 'p') Object.assign(l, { sw: { ...l.sw, d: e.d, v: e.v }, heard: now(), splashAt: e.v > 0.4 ? now() : l.splashAt, dip: e.u ? raceTime() + 0.25 : l.dip });
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
        advance(l, t, ds);
        if (i === mine && l.sw.time !== null && !told.current) {
          told.current = true;
          ev({ k: 'fin', time: l.sw.time } satisfies SwimEv);
        }
      } else if (l.sw.time === null) l.sw = { ...l.sw, d: Math.min(LENGTH - 0.01, l.sw.d + l.sw.v * dt) }; // coast on their last speed
    });
    if (mine >= 0 && lanes[mine].sw.time === null && now() - sent.current > 0.12) {
      sent.current = now();
      const u = under(lanes[mine].sw, t) ? { u: 1 as const } : {};
      ev({ k: 'p', d: +lanes[mine].sw.d.toFixed(2), v: +lanes[mine].sw.v.toFixed(2), ...u } satisfies SwimEv);
    }
    // everyone in (or out: left, or past the cutoff) → results
    const out = (i: number) => lanes[i].sw.time !== null || match.left.includes(match.seats[i].id) || t > CUTOFF;
    if (!done.current && match.seats.every((_, i) => out(i))) {
      done.current = true;
      setTimeout(() => finish(Object.fromEntries(match.seats.map((p, i) => [p.id, match.left.includes(p.id) ? null : lanes[i].sw.time]))), 1000);
    }
  };

  // the leaderboard, a few times a second (and a quack when I hit a duck)
  const bumped = useRef({ n: 0, at: -9 });
  useEffect(() => {
    const id = setInterval(() => {
      if (mine >= 0 && lanes[mine].sw.bumps > bumped.current.n) {
        bumped.current = { n: lanes[mine].sw.bumps, at: now() };
        sfx('quack');
      }
      const order = match.seats
        .map((p, i) => ({ name: i === mine ? '나' : p.nickname, d: lanes[i].sw.d, time: lanes[i].sw.time }))
        .sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9) || b.d - a.d);
      setHud((h) => ({ ...h, order, t: raceTime() }));
    }, 150);
    return () => clearInterval(id);
  });

  const [dpr, setDpr] = useState(0.3);
  const width = match.seats.length * LANE;
  return (
    <div className={s.game}>
      <Canvas flat shadows="basic" gl={PIXEL_GL} dpr={dpr} camera={{ fov: 42, position: [width / 2 + 4, 7, 6], near: 0.5, far: 150 }}>
        <PixelRows rows={280} onDpr={setDpr} />
        <Pool lanes={match.seats.length} fans={match.watchers ?? []} cheer={() => lanes.some((l) => l.sw.time !== null && raceTime() - l.sw.time < 2)} />
        {match.seats.map((p, i) => (
          <SwimmerFigure
            key={p.id}
            look={p.look}
            lane={lanes[i]}
            x={(i - (match.seats.length - 1) / 2) * LANE}
            dipped={() => (i === mine || lanes[i].strokes ? under(lanes[i].sw, raceTime()) : raceTime() < lanes[i].dip)}
          />
        ))}
        {ds.length > 0 && <Ducks ds={ds} lanes={match.seats.length} />}
        <Follow lanes={lanes} mine={mine} step={step} />
        <PixelPost />
      </Canvas>
      <ol className={s.ranks} aria-live="polite">
        {hud.order.map((r, i) => (
          <li key={r.name + i}>
            <b>{i + 1}</b> {r.name} <span>{r.time !== null ? `${r.time.toFixed(2)}초` : `${r.d.toFixed(1)}m`}</span>
          </li>
        ))}
      </ol>
      <p className={s.say}>{now() - bumped.current.at < 1 ? '🦆 꽥! 오리에 부딪혔어요' : hud.t > 0 ? `${hud.t.toFixed(1)}초` : ds.length ? '🦆 오리 앞에서 잠수! (Space)' : ''}</p>
      {mine >= 0 && (
        <div className={s.pad}>
          <button aria-label="왼팔" onPointerDown={() => tap('L')}>
            ◀ 왼팔
          </button>
          {/* how good the last stroke was: on the beat fills it */}
          <span className={s.beat} style={{ '--q': hud.q } as CSSProperties} aria-label={`박자 ${Math.round(hud.q * 100)}%`}>
            박자 {BEAT}s
          </span>
          {ds.length > 0 && (
            <button aria-label="잠수" onPointerDown={diveMe}>
              🤿 잠수
            </button>
          )}
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
    // from the side and a little behind: the strokes, and the water ahead
    camera.position.set(at.current.x + 5.2, 4.6, at.current.z + 5.5);
    camera.lookAt(at.current.x - 0.3, -0.4, at.current.z - 3.5);
  });
  return null;
}

const DEPTH = 1.4;
/** The basin's inside: from the start wall (z = 0.3) to the finish wall. */
const START_Z = 0.3;
const END_Z = -LENGTH - 0.3;

/** Square tiles with grout, `n` per world unit across a `w` × `h` face. */
const tiles = (fill: string, grout: string, w: number, h: number, n = 2) =>
  canvasTexture(32, 32, (ctx) => {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = fill;
    ctx.fillRect(1, 1, 30, 30);
  }, [w * n, h * n]);


function Pool({ lanes, fans, cheer }: { lanes: number; fans: Seat[]; cheer: () => boolean }) {
  const w = lanes * LANE;
  const L = START_Z - END_Z;
  const look = useMemo(() => {
    // the basin: a box seen from inside (walls + floor), tiled; the deck: tiles round a hole for it
    // seen from inside (BackSide), so the near wall and the open top drop out by themselves
    const wall = (a: number, b: number) => new THREE.MeshStandardMaterial({ map: tiles('#a9e2f6', '#8fd2ef', a, b), roughness: 0.6, side: THREE.BackSide });
    const basin = [wall(L, DEPTH), wall(L, DEPTH), wall(1, 1), wall(w, L), wall(w, DEPTH), wall(w, DEPTH)];
    // flat rings: the deck round the pool's hole, grass round the deck
    const rect = (x0: number, y0: number, x1: number, y1: number) => [new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)];
    const ring = (outer: THREE.Vector2[], hole: THREE.Vector2[]) => {
      const shape = new THREE.Shape(outer);
      shape.holes.push(new THREE.Path(hole));
      return new THREE.ShapeGeometry(shape);
    };
    const deckEdge = rect(-w / 2 - 14, -24, w / 2 + 14, L + 10);
    const deckTex = tiles('#fbf4e8', '#e8dcc8', 1, 1, 1);
    const floorLight = shimmer(0.5, [w / 3, L / 3]);
    floorLight.offset.set(0.3, 0.1);
    const water = new THREE.MeshStandardMaterial({ color: '#36b3ea', transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0.05, depthWrite: false });
    const glints = new THREE.MeshBasicMaterial({ map: shimmer(0.4, [w / 3, L / 3]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return {
      basin,
      deck: ring(deckEdge, rect(-w / 2, 0, w / 2, L)),
      grass: ring(rect(-150, -150, 150, 150), deckEdge),
      deckMat: toon('#ffffff', deckTex, 'deck'),
      caustics: [floorLight, shimmer(0.35, [w / 3, L / 3])].map((map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
      water,
      glints,
    };
  }, [w, L]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    look.caustics[0].map!.offset.set(t * 0.04, t * 0.03);
    look.caustics[1].map!.offset.set(-t * 0.03, t * 0.05);
    look.glints.map!.offset.set(t * 0.02, -t * 0.04);
  });
  const ropes = useRef<THREE.InstancedMesh>(null);
  const beads = Math.round(L / 0.32);
  useLayoutEffect(() => {
    const mesh = ropes.current;
    if (!mesh) return;
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let r = 0; r <= lanes; r++)
      for (let b = 0; b < beads; b++) {
        const i = r * beads + b, z = START_Z - (b + 0.5) * (L / beads);
        m.makeRotationX(Math.PI / 2).setPosition((r - lanes / 2) * LANE, 0.04, z);
        mesh.setMatrixAt(i, m);
        // red near the walls, then blue and white
        const nearWall = z > -5 || z < -LENGTH + 5;
        mesh.setColorAt(i, c.set(nearWall ? '#ff6b7a' : b % 2 ? '#ffffff' : '#3f8fe0'));
      }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lanes, beads, L]);
  return (
    <>
      <Sky colors={['#6fc2ff', '#93d2ff', '#b6e2ff', '#d7f0ff', '#f2faff']} />
      <hemisphereLight args={['#fff8ec', '#9fdcf5', 1.5]} />
      <directionalLight position={[9, 16, 6]} intensity={2.2} color="#fff3df" castShadow shadow-mapSize={[2048, 2048]} shadow-radius={4} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      {/* deck round the pool, grass beyond */}
      <mesh geometry={look.deck} material={look.deckMat} rotation-x={-Math.PI / 2} position={[0, 0, START_Z]} receiveShadow />
      <mesh geometry={look.grass} rotation-x={-Math.PI / 2} position={[0, -0.01, START_Z]} material={toon('#a9db92')} />
      {/* the basin, with lane stripes and dancing light on its floor */}
      <mesh material={look.basin} position={[0, -DEPTH / 2, (START_Z + END_Z) / 2]}>
        <boxGeometry args={[w, DEPTH, L]} />
      </mesh>
      {Array.from({ length: lanes }, (_, i) => (
        <group key={i} position={[(i - (lanes - 1) / 2) * LANE, -DEPTH + 0.01, 0]}>
          <mesh rotation-x={-Math.PI / 2} position-z={-LENGTH / 2} material={toon('#2f6fb5')}>
            <planeGeometry args={[0.28, LENGTH - 3.6]} />
          </mesh>
          {[-1.8, -LENGTH + 1.8].map((z) => (
            <mesh key={z} rotation-x={-Math.PI / 2} position-z={z} material={toon('#2f6fb5')}>
              <planeGeometry args={[1.0, 0.28]} />
            </mesh>
          ))}
        </group>
      ))}
      {look.caustics.map((m, i) => (
        <mesh key={i} material={m} rotation-x={-Math.PI / 2} position={[0, -DEPTH + 0.02 + i * 0.005, (START_Z + END_Z) / 2]}>
          <planeGeometry args={[w, L]} />
        </mesh>
      ))}
      {/* the water: see-through, glinting */}
      <mesh material={look.water} rotation-x={-Math.PI / 2} position={[0, -0.06, (START_Z + END_Z) / 2]}>
        <planeGeometry args={[w, L]} />
      </mesh>
      <mesh material={look.glints} rotation-x={-Math.PI / 2} position={[0, -0.05, (START_Z + END_Z) / 2]}>
        <planeGeometry args={[w, L]} />
      </mesh>
      {/* coping round the edge, touch pads at the finish */}
      {(
        [
          [0, START_Z + 0.2, w + 0.8, 0.4],
          [0, END_Z - 0.2, w + 0.8, 0.4],
          [-w / 2 - 0.2, (START_Z + END_Z) / 2, 0.4, L],
          [w / 2 + 0.2, (START_Z + END_Z) / 2, 0.4, L],
        ] as const
      ).map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, 0.04, z]} material={toon('#ffffff')} receiveShadow castShadow>
          <boxGeometry args={[sx, 0.12, sz]} />
        </mesh>
      ))}
      <instancedMesh ref={ropes} args={[undefined, undefined, (lanes + 1) * beads]} material={toon('#ffffff', undefined, 'bead')}>
        <cylinderGeometry args={[0.07, 0.07, 0.26, 8]} />
      </instancedMesh>
      {/* starting blocks, numbered by colour; flags across, 5 m from each end */}
      {Array.from({ length: lanes }, (_, i) => (
        <group key={i} position={[(i - (lanes - 1) / 2) * LANE, 0, START_Z + 0.75]}>
          <mesh position-y={0.3} material={toon('#ffffff')} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.7]} />
          </mesh>
          <mesh position={[0, 0.62, -0.05]} rotation-x={-0.15} material={toon(['#ff8fab', '#ffd166', '#7cc4f0', '#9fe0b8'][i % 4])} castShadow>
            <boxGeometry args={[0.78, 0.06, 0.66]} />
          </mesh>
        </group>
      ))}
      {[-5, -LENGTH + 5].map((z) => (
        <Bunting key={z} z={z} width={w + 2} />
      ))}
      {/* spectators: on the loungers, then standing along the deck */}
      {fans.slice(0, 12).map((f, i) =>
        i < 3 ? (
          <group key={f.id} position={[w / 2 + 2.6, 0, [-14, -8, -2][i]]} rotation-y={-Math.PI / 2}>
            <Fan look={f.look} at={[0, 0, 0.47]} excited={cheer} />
          </group>
        ) : (
          <Fan key={f.id} look={f.look} at={[w / 2 + 1.3, 0, -17 + (i - 3) * 2]} rotY={-Math.PI / 2} anim="idle" excited={cheer} />
        ),
      )}
      {/* poolside: loungers under parasols, trees */}
      {[-14, -8, -2].map((z) => (
        <group key={z} position={[w / 2 + 2.6, 0, z]} rotation-y={-Math.PI / 2}>
          <MODELS.lounger.Model />
        </group>
      ))}
      {[-11, -5].map((z) => (
        <group key={z} position={[w / 2 + 3.6, 0, z]}>
          <MODELS.parasol.Model />
        </group>
      ))}
      {[[-w / 2 - 6, -20], [-w / 2 - 6.5, -9], [-w / 2 - 6, 2], [w / 2 + 6, -22], [w / 2 + 6.5, 4]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={1.3}>
          <MODELS.tree.Model />
        </group>
      ))}
    </>
  );
}

/** A line of little triangle flags across the pool. */
function Bunting({ z, width }: { z: number; width: number }) {
  const n = Math.round(width / 0.5);
  const flag = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.18, 0, 0), new THREE.Vector3(0.18, 0, 0), new THREE.Vector3(0, -0.4, 0)]);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={[0, 2.6, z]}>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[(k * width) / 2, -1.3, 0]} material={toon('#d7dbe2')}>
          <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
        </mesh>
      ))}
      <mesh rotation-z={Math.PI / 2} material={toon('#ffffff')}>
        <cylinderGeometry args={[0.01, 0.01, width, 4]} />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} geometry={flag} position={[-width / 2 + (i + 0.5) * (width / n), 0, 0]}>
          <meshBasicMaterial color={['#ff8fab', '#ffd166', '#7cc4f0', '#9fe0b8'][i % 4]} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

const DROPS = 7;

/**
 * A swimmer: face down doing the crawl while they swim (arms wheeling with their
 * speed, a flutter kick), sitting up in a ring before the start and after the finish.
 * Each stroke throws up a splash.
 */
/** Rubber ducks bobbing in every lane, at the same distances (the duck race). */
function Ducks({ ds, lanes }: { ds: number[]; lanes: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => group.current?.children.forEach((d, i) => (d.position.y = 0.04 + Math.sin(clock.elapsedTime * 2.4 + i) * 0.05)));
  return (
    <group ref={group}>
      {Array.from({ length: lanes }, (_, lane) =>
        ds.map((d) => (
          <group key={`${lane}-${d}`} position={[(lane - (lanes - 1) / 2) * LANE, 0, -d]} rotation-y={Math.PI / 2}>
            <mesh material={toon('#ffd23f')} scale={[1.25, 0.8, 1]} castShadow>
              <sphereGeometry args={[0.26, 16, 12]} />
            </mesh>
            <mesh material={toon('#ffd23f')} position={[0.22, 0.27, 0]} castShadow>
              <sphereGeometry args={[0.15, 14, 10]} />
            </mesh>
            <mesh material={toon('#ff8a3d')} position={[0.39, 0.25, 0]} rotation-z={-Math.PI / 2}>
              <coneGeometry args={[0.06, 0.14, 10]} />
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} material={toon('#3b3150')} position={[0.3, 0.32, sd * 0.08]}>
                <sphereGeometry args={[0.022, 6, 6]} />
              </mesh>
            ))}
          </group>
        )),
      )}
    </group>
  );
}

function SwimmerFigure({ look, lane, x, dipped }: { look: Match['seats'][number]['look']; lane: Lane; x: number; dipped: () => boolean }) {
  const joints = useJoints();
  const root = useRef<THREE.Group>(null);
  const drops = useRef<THREE.Group>(null);
  const st = useRef({ dip: 0 }).current;
  const swimming = () => lane.sw.time === null && lane.sw.v >= 0.15;
  useAvatarPose(joints, look, () => (swimming() ? 'swim' : 'tube'));
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    // under water (the duck race): down below the surface, back up after
    st.dip += ((dipped() ? 1 : 0) - st.dip) * (1 - Math.exp(-dt * 10));
    root.current?.position.set(x, -0.62 * st.dip, -lane.sw.d);
    // a splash: drops thrown up and out, falling back
    const t = (now() - lane.splashAt) / 0.55;
    drops.current?.children.forEach((d, i) => {
      d.visible = t < 1;
      if (t >= 1) return;
      const a = (i / DROPS) * Math.PI * 2;
      d.position.set(Math.cos(a) * 0.55 * t, 0.15 + 1.3 * t - 1.6 * t * t, 0.7 + Math.sin(a) * 0.45 * t);
      d.scale.setScalar(1 - t * 0.6);
    });
  });
  return (
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <AvatarBody look={look} joints={joints} />
      <group ref={drops}>
        {Array.from({ length: DROPS }, (_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
