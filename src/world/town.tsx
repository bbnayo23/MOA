import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type FC } from 'react';
import * as THREE from 'three';
import { shade } from '../art/pix';
import { canvasTexture, glow, leafy, toon } from './toon';

/**
 * The village's pieces (the plaza): shop fronts, houses, the station and its
 * railway with a train that comes and goes, a level crossing, power poles with
 * wires, vending machines… Same local space as models.tsx: standing on y = 0,
 * front facing +z.
 */

type V3 = [number, number, number];
const Box = ({ s, p, c, m }: { s: V3; p?: V3; c: string; m?: THREE.Material }) => (
  <mesh material={m ?? toon(c)} position={p}>
    <boxGeometry args={s} />
  </mesh>
);
const Cyl = ({ r, h, p, c, top, seg = 12, rot }: { r: number; h: number; p?: V3; c: string; top?: number; seg?: number; rot?: V3 }) => (
  <mesh material={toon(c)} position={p} rotation={rot}>
    <cylinderGeometry args={[top ?? r, r, h, seg]} />
  </mesh>
);

const LEAF = '#8fd06e';
const LEAF_DARK = '#6cb85a';
const BARK = '#9a6a4c';
const CONCRETE = '#c9c4bd';
const ASPHALT = '#6e6878';
const IRON = '#4f4a5e';
const GLASS = '#bfe3ff';

/** A number from a string (a colour): the same shop always gets the same walls and roof. */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const WALLS = ['#f6e3c8', '#e9dcef', '#d8ecdf', '#f9ddd2', '#e1e6f5', '#f3eed6'];

/** Clapboard siding: the wall colour with a darker line every few texels. */
const siding = (color: string) =>
  toon(
    color,
    canvasTexture(
      16,
      16,
      (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = shade(color, -0.1);
        for (let y = 3; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
        ctx.fillStyle = shade(color, 0.25);
        for (let y = 0; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
      },
      [4, 6],
    ),
    'siding',
  );

/** Awning canvas: stripes of the colour and white. */
const stripes = (color: string) =>
  toon(
    '#ffffff',
    canvasTexture(16, 4, (ctx) => {
      for (let x = 0; x < 16; x += 4) {
        ctx.fillStyle = (x / 4) % 2 ? '#fffaf2' : color;
        ctx.fillRect(x, 0, 4, 4);
      }
    }, [3, 1]),
    `awning${color}`,
  );

/** A window: frame, glass with a glint (and, upstairs, curtains), a sill. */
function Window({ p, w = 0.8, h = 0.9, frame = '#fffaf2', curtain }: { p: V3; w?: number; h?: number; frame?: string; curtain?: string }) {
  return (
    <group position={p}>
      <Box s={[w + 0.14, h + 0.14, 0.06]} c={frame} />
      <Box s={[w, h, 0.02]} p={[0, 0, 0.035]} c={GLASS} m={glow(GLASS)} />
      <Box s={[w * 0.18, h * 0.8, 0.01]} p={[-w * 0.22, 0, 0.05]} c="#ffffff" m={glow('#eaf6ff')} />
      {curtain && <Box s={[w * 0.3, h, 0.01]} p={[w * 0.35, 0, 0.05]} c={curtain} />}
      <Box s={[0.04, h, 0.02]} p={[0, 0, 0.05]} c={frame} />
      <Box s={[w + 0.26, 0.07, 0.16]} p={[0, -h / 2 - 0.07, 0.05]} c={frame} />
    </group>
  );
}

/** A box of flowers under a window. */
const FlowerBox = ({ p }: { p: V3 }) => (
  <group position={p}>
    <Box s={[0.9, 0.18, 0.22]} c="#b5724e" />
    {[-0.3, -0.1, 0.1, 0.3].map((x) => (
      <mesh key={x} material={leafy(LEAF)} position={[x, 0.16, 0]}>
        <sphereGeometry args={[0.12, 8, 6]} />
      </mesh>
    ))}
    {[-0.25, 0.05, 0.3].map((x, i) => (
      <mesh key={x} material={toon(['#ff8fab', '#fff1a8', '#ffffff'][i])} position={[x, 0.27, 0.06]}>
        <sphereGeometry args={[0.05, 6, 5]} />
      </mesh>
    ))}
  </group>
);

/** An outdoor AC unit (a fan grille in front). */
const AirCon = ({ p, r }: { p: V3; r?: V3 }) => (
  <group position={p} rotation={r}>
    <Box s={[0.7, 0.5, 0.3]} c="#e9e7e2" />
    <mesh material={toon('#8f8a96')} position={[-0.1, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.18, 0.18, 0.02, 14]} />
    </mesh>
    <Box s={[0.12, 0.3, 0.02]} p={[0.24, 0, 0.16]} c="#c9c6cf" />
  </group>
);

// ── shops and houses ──────────────────────────────────────────

/**
 * A two-storey shop on the high street (one per theme, in its colour): a shop
 * window and a glass door under a striped awning, a sign band, flats upstairs
 * with flower boxes, and on the roof a parapet with an AC unit — or a pitched roof.
 */
export const Shop: FC<{ color?: string }> = ({ color = '#ff8fab' }) => {
  const h = hash(color);
  const wall = WALLS[h % WALLS.length];
  const pitched = h % 2 === 0;
  const W = 4.2, D = 3.4, F1 = 2.5, F2 = 2.1;
  const front = D / 2;
  return (
    <group>
      {/* the block: ground floor a shade darker, upstairs in siding */}
      <Box s={[W, F1, D]} p={[0, F1 / 2, 0]} c={shade(wall, -0.06)} />
      <mesh material={siding(wall)} position={[0, F1 + F2 / 2, 0]}>
        <boxGeometry args={[W, F2, D]} />
      </mesh>
      <Box s={[W + 0.1, 0.12, D + 0.1]} p={[0, F1, 0]} c={shade(color, -0.15)} />
      {/* shop window, door, step */}
      <Window p={[-0.95, 1.25, front]} w={1.7} h={1.3} frame={shade(color, -0.25)} />
      <Box s={[0.95, 1.95, 0.08]} p={[1.2, 0.98, front + 0.02]} c={shade(color, -0.3)} />
      <Box s={[0.6, 1.0, 0.02]} p={[1.2, 1.25, front + 0.07]} c={GLASS} m={glow('#d6eeff')} />
      <mesh material={toon('#ffd166')} position={[0.85, 0.95, front + 0.09]}>
        <sphereGeometry args={[0.05, 6, 5]} />
      </mesh>
      <Box s={[1.3, 0.12, 0.5]} p={[1.2, 0.06, front + 0.25]} c={CONCRETE} />
      {/* awning and sign band */}
      <mesh material={stripes(color)} position={[0, F1 - 0.42, front + 0.42]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[W - 0.2, 0.06, 1.0]} />
      </mesh>
      <Box s={[W - 0.2, 0.14, 0.06]} p={[0, F1 - 0.7, front + 0.86]} c={color} />
      <Box s={[W - 0.5, 0.42, 0.1]} p={[0, F1 - 0.05, front + 0.05]} c={color} />
      <Box s={[W - 0.8, 0.22, 0.02]} p={[0, F1 - 0.05, front + 0.11]} c="#fffaf2" />
      {/* upstairs */}
      <Window p={[-1.1, F1 + 1.1, front]} curtain="#ffd6e0" />
      <Window p={[1.1, F1 + 1.1, front]} curtain="#d6ecff" />
      <FlowerBox p={[-1.1, F1 + 0.5, front + 0.14]} />
      {/* a drainpipe down the corner, an AC unit on the side wall */}
      <Cyl r={0.05} h={F1 + F2} p={[W / 2 - 0.08, (F1 + F2) / 2, front - 0.08]} c="#d7d2cc" seg={6} />
      <AirCon p={[W / 2 + 0.16, 1.2, 0.4]} r={[0, Math.PI / 2, 0]} />
      {pitched ? (
        // a pitched roof, ridge along the street
        <mesh material={toon(shade(color, -0.12))} position={[0, F1 + F2 + 0.55, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} scale={[0.5, 1, 1.2]}>
          <cylinderGeometry args={[1.75, 1.75, W + 0.4, 3]} />
        </mesh>
      ) : (
        <>
          <Box s={[W + 0.1, 0.3, D + 0.1]} p={[0, F1 + F2 + 0.15, 0]} c={shade(wall, -0.15)} />
          <Box s={[W - 0.3, 0.06, D - 0.3]} p={[0, F1 + F2 + 0.31, 0]} c="#b9b3c4" />
          <AirCon p={[-0.9, F1 + F2 + 0.55, -0.6]} />
          <Cyl r={0.42} h={0.8} p={[1.1, F1 + F2 + 0.75, -0.5]} c="#dfe7f0" seg={12} />
        </>
      )}
    </group>
  );
};

/** A house in the streets behind (scenery): two storeys, a pitched roof in its colour. */
export const House: FC<{ color?: string }> = ({ color = '#e98a7a' }) => {
  const h = hash(color);
  const wall = WALLS[(h >>> 3) % WALLS.length];
  return (
    <group>
      <mesh material={siding(wall)} position={[0, 2.0, 0]}>
        <boxGeometry args={[3.6, 4.0, 3.2]} />
      </mesh>
      <mesh material={toon(color)} position={[0, 4.55, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} scale={[0.55, 1, 1.15]}>
        <cylinderGeometry args={[1.7, 1.7, 4.0, 3]} />
      </mesh>
      <Window p={[-0.9, 2.9, 1.6]} curtain={h % 2 ? '#ffd6e0' : undefined} />
      <Window p={[0.9, 2.9, 1.6]} />
      <Window p={[-0.9, 1.1, 1.6]} curtain={h % 3 ? '#fff1c4' : undefined} />
      <Box s={[0.8, 1.6, 0.06]} p={[0.9, 0.8, 1.62]} c={shade(color, -0.25)} />
      <AirCon p={[1.95, 0.6, 0.6]} r={[0, Math.PI / 2, 0]} />
    </group>
  );
};

// ── the railway ───────────────────────────────────────────────

/** Seconds per round trip of the train: it pulls in, waits at the station, pulls out, then a quiet spell. */
const ROUND = 44;
const CAR = 5.6;
const CARS = 2;
/** Where the train is (its middle, along the track, 0 = stopped at the platform), or null when it's away. Real time, so everyone sees one train. */
function trainX(now = Date.now() / 1000) {
  const t = now % ROUND;
  if (t < 8) return -64 * (1 - t / 8) ** 2; // slowing in
  if (t < 15) return 0; // at the platform
  if (t < 23) return 64 * ((t - 15) / 8) ** 2; // speeding off
  return null;
}
/** Shared with the crossings: where the train is in the world right now (x of its ends), if anywhere. */
export const railway = { from: NaN, to: NaN };

/** Train livery: cream, a pink band, a green skirt (and a blossom on the side). */
function Car({ x, front, back }: { x: number; front?: boolean; back?: boolean }) {
  const len = CAR - 0.15;
  return (
    <group position={[x, 0, 0]}>
      <Box s={[len, 0.25, 1.3]} p={[0, 0.45, 0]} c="#9ad36a" />
      <Box s={[len, 0.95, 1.36]} p={[0, 1.05, 0]} c="#fbe9d0" />
      <Box s={[len, 0.22, 1.38]} p={[0, 0.72, 0]} c="#ff9fbf" />
      <Box s={[len - 0.2, 0.22, 1.2]} p={[0, 1.62, 0]} c="#e8e2da" />
      {/* windows along both sides, and the doors */}
      {[-1.8, -0.6, 0.6, 1.8].map((wx) => (
        <group key={wx}>
          <Box s={[0.85, 0.45, 1.4]} p={[wx, 1.15, 0]} c="#3c4a6b" m={glow('#46587c')} />
          <Box s={[0.18, 0.35, 1.41]} p={[wx - 0.25, 1.15, 0]} c="#cfe8ff" m={glow('#a9d4f5')} />
        </group>
      ))}
      <mesh material={toon('#ffb7cf')} position={[0, 1.02, 0.69]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 5]} />
      </mesh>
      {/* the cab ends: a rounded nose with a big window */}
      {[front && 1, back && -1].filter(Boolean).map((s) => (
        <group key={s as number} position={[(s as number) * (len / 2), 0, 0]}>
          <mesh material={toon('#fbe9d0')} position={[(s as number) * 0.1, 1.05, 0]} scale={[0.35, 1, 1]}>
            <sphereGeometry args={[0.68, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <Box s={[0.12, 0.5, 0.9]} p={[(s as number) * 0.2, 1.2, 0]} c="#46587c" m={glow('#5a6e98')} />
          <mesh material={glow('#fff4c4')} position={[(s as number) * 0.24, 0.6, 0.4]}>
            <sphereGeometry args={[0.07, 6, 5]} />
          </mesh>
          <mesh material={glow('#fff4c4')} position={[(s as number) * 0.24, 0.6, -0.4]}>
            <sphereGeometry args={[0.07, 6, 5]} />
          </mesh>
        </group>
      ))}
      {[-1.8, 1.8].map((bx) => (
        <Box key={bx} s={[1.2, 0.3, 1.0]} p={[bx, 0.3, 0]} c="#4a4458" />
      ))}
    </group>
  );
}

/** Gravel for the track bed. */
const ballast = () =>
  toon(
    '#a39a92',
    canvasTexture(16, 16, (ctx) => {
      let seed = 3;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      ctx.fillStyle = '#a39a92';
      ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ['#8c837c', '#bdb5ad', '#948a80'][i % 3];
        ctx.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 2, 1);
      }
    }, [40, 1]),
    'ballast',
  );

/**
 * The railway along the station (its length runs along x): a gravel bed, sleepers, two rails,
 * and a little two-car train that pulls in from the left, waits, and pulls out to the right.
 */
export const Railway: FC = () => {
  const L = 100;
  const train = useRef<THREE.Group>(null);
  const sleepers = useMemo(() => {
    const g = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.1, 1.9), toon('#7a5a46'), Math.floor(L / 0.8));
    const m = new THREE.Matrix4();
    for (let i = 0; i < g.count; i++) g.setMatrixAt(i, m.makeTranslation(-L / 2 + i * 0.8, 0.2, 0));
    return g;
  }, []);
  useFrame(() => {
    const x = trainX();
    const t = train.current;
    if (!t) return;
    t.visible = x !== null;
    if (x === null) {
      railway.from = railway.to = NaN;
      return;
    }
    t.position.x = x;
    t.updateMatrixWorld();
    const half = (CAR * CARS) / 2, w = new THREE.Vector3();
    t.localToWorld(w.set(-half, 0, 0));
    railway.from = w.x;
    t.localToWorld(w.set(half, 0, 0));
    railway.to = w.x;
  });
  return (
    <group>
      <mesh material={ballast()} position={[0, 0.07, 0]}>
        <boxGeometry args={[L, 0.14, 2.6]} />
      </mesh>
      <primitive object={sleepers} />
      {[-0.55, 0.55].map((z) => (
        <Box key={z} s={[L, 0.1, 0.1]} p={[0, 0.3, z]} c="#c8ccd6" />
      ))}
      <group ref={train} position={[0, 0.3, 0]}>
        {Array.from({ length: CARS }, (_, i) => (
          <Car key={i} x={(i - (CARS - 1) / 2) * CAR} front={i === CARS - 1} back={i === 0} />
        ))}
      </group>
    </group>
  );
};

/** Is the train on (or nearly on) this stretch of track (world x)? (Stopped at the platform, it's clear of the crossing.) */
const trainNear = (x: number, margin = 6) => railway.from - margin < x && railway.to + margin > x;

/**
 * A level crossing where a road meets the railway (the track runs along x through here):
 * the road's own stretch over the tracks, and on each side a post with a crossbuck,
 * two red lamps that flash and a striped arm that comes down while the train passes.
 */
export const Crossing: FC = () => {
  const root = useRef<THREE.Group>(null);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const lamps = useRef<(THREE.Mesh | null)[]>([]);
  const st = useRef({ down: 0 }).current;
  const off = useMemo(() => glow('#5a2a33'), []);
  const on = useMemo(() => glow('#ff4d5e'), []);
  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const closed = trainNear(g.getWorldPosition(new THREE.Vector3()).x);
    st.down += ((closed ? 1 : 0) - st.down) * (1 - Math.exp(-Math.min(dt, 0.1) * 3));
    // (each post is turned to face its road, so both arms swing up the same way)
    arms.current.forEach((a) => a && (a.rotation.z = -(1 - st.down) * 1.35));
    const blink = Math.floor(clock.elapsedTime * 3) % 2;
    lamps.current.forEach((l, i) => l && (l.material = closed && (i % 2) === blink ? on : off));
  });
  const post = (side: 1 | -1, i: number) => (
    <group key={side} position={[side * 2.3, 0, side * 1.75]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <Cyl r={0.08} h={3.0} p={[0, 1.5, 0]} c="#f4f1ea" seg={8} />
      {[0.4, 0.9, 1.4].map((y) => (
        <Box key={y} s={[0.17, 0.22, 0.17]} p={[0, y, 0]} c="#2e2a36" />
      ))}
      {/* the crossbuck: a yellow-and-black X */}
      <group position={[0, 2.65, 0.1]} rotation={[0, 0, 0.62]}>
        <Box s={[1.2, 0.2, 0.05]} c="#ffd34d" />
      </group>
      <group position={[0, 2.65, 0.12]} rotation={[0, 0, -0.62]}>
        <Box s={[1.2, 0.2, 0.05]} c="#ffd34d" />
      </group>
      <Box s={[0.18, 0.18, 0.06]} p={[0, 2.65, 0.15]} c="#2e2a36" />
      {/* two red lamps on a black bar, with hoods */}
      <Box s={[0.95, 0.14, 0.12]} p={[0, 1.95, 0.08]} c="#2e2a36" />
      {[-0.36, 0.36].map((x, k) => (
        <group key={x} position={[x, 1.95, 0.18]}>
          <mesh ref={(m) => void (lamps.current[i * 2 + k] = m)} material={off}>
            <sphereGeometry args={[0.17, 10, 8]} />
          </mesh>
          <Box s={[0.42, 0.06, 0.2]} p={[0, 0.2, 0.02]} c="#2e2a36" />
        </group>
      ))}
      {/* the arm: up, or across the road */}
      <group ref={(a) => void (arms.current[i] = a)} position={[-0.15, 1.05, 0.25]}>
        <Box s={[0.3, 0.3, 0.3]} p={[0.1, 0, 0]} c="#2e2a36" />
        {Array.from({ length: 6 }, (_, k) => (
          <Box key={k} s={[0.4, 0.12, 0.07]} p={[-(0.25 + k * 0.4), 0, 0]} c={k % 2 ? '#2e2a36' : '#ffd34d'} />
        ))}
      </group>
    </group>
  );
  return (
    <group ref={root}>
      {/* the road over the tracks, and panels between the rails */}
      <Box s={[3.6, 0.02, 7]} p={[0, 0.01, 0]} c={ASPHALT} />
      <Box s={[3.6, 0.1, 2.2]} p={[0, 0.26, 0]} c="#b9b4ac" />
      {post(1, 0)}
      {post(-1, 1)}
    </group>
  );
};

/** The station: a platform along the track with a canopy on posts, the station's name board, and a clock. */
export const Station: FC = () => {
  const L = 19;
  const name = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: canvasTexture(96, 24, (ctx) => {
        ctx.fillStyle = '#fffaf2';
        ctx.fillRect(0, 0, 96, 24);
        ctx.fillStyle = '#3a6fb0';
        ctx.fillRect(0, 18, 96, 6);
        ctx.fillStyle = '#2e2a36';
        ctx.font = '12px Galmuri11, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('모아역 MOA', 48, 9);
      }) }),
    [],
  );
  return (
    <group>
      {/* platform: concrete, a yellow edge, the drop to the track */}
      <Box s={[L, 0.18, 2.4]} p={[0, 0.09, 0]} c="#d8d5cf" />
      <Box s={[L, 0.02, 0.22]} p={[0, 0.19, -1.0]} c="#f2c94c" />
      <Box s={[L, 0.03, 0.1]} p={[0, 0.19, -1.18]} c="#fffaf2" />
      {/* canopy: over the town side of the platform only, so the train shows beside it */}
      {[-4.5, 0, 4.5].map((x) => (
        <Cyl key={x} r={0.1} h={3.0} p={[x, 1.5, 0.9]} c="#7d8aa8" seg={8} />
      ))}
      <Box s={[11, 0.16, 2.0]} p={[0, 3.05, 1.0]} c="#7d8aa8" />
      <Box s={[10.8, 0.1, 1.8]} p={[0, 3.18, 1.0]} c="#a9b6d0" />
      {[-3, 3].map((x) => (
        <Box key={x} s={[1.0, 0.06, 0.18]} p={[x, 2.9, 1.0]} c="#fff8e0" m={glow('#fff4cf')} />
      ))}
      {/* the name board, hanging from the canopy, and a clock */}
      <group position={[-1.5, 2.45, 1.6]}>
        <Cyl r={0.02} h={0.6} p={[-0.8, 0.35, 0]} c={IRON} seg={4} />
        <Cyl r={0.02} h={0.6} p={[0.8, 0.35, 0]} c={IRON} seg={4} />
        <mesh material={name}>
          <planeGeometry args={[2.0, 0.5]} />
        </mesh>
      </group>
      <group position={[3.5, 2.5, 1.62]}>
        <Cyl r={0.3} h={0.08} rot={[Math.PI / 2, 0, 0]} c="#fffaf2" seg={16} />
        <Box s={[0.03, 0.2, 0.01]} p={[0, 0.07, 0.05]} c="#2e2a36" />
        <Box s={[0.14, 0.03, 0.01]} p={[0.06, 0, 0.05]} c="#2e2a36" />
      </group>
    </group>
  );
};

// ── street furniture ──────────────────────────────────────────

/** A power pole: a crossarm with insulators, a transformer drum, and wires sagging to the next pole (10 m along −z). */
export const Pole: FC = () => {
  const wires = useMemo(() => {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: '#3a3446' });
    for (const x of [-0.6, 0, 0.6]) {
      const pts = Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        return new THREE.Vector3(x, 4.75 - Math.sin(t * Math.PI) * 0.55, -t * 9.6);
      });
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    return g;
  }, []);
  return (
    <group>
      <Cyl r={0.1} top={0.08} h={5.2} p={[0, 2.6, 0]} c="#b9b2a8" seg={8} />
      <Box s={[1.5, 0.12, 0.12]} p={[0, 4.6, 0]} c="#8f877c" />
      {[-0.6, 0, 0.6].map((x) => (
        <Cyl key={x} r={0.05} h={0.14} p={[x, 4.72, 0]} c="#f4f1ea" seg={6} />
      ))}
      <Cyl r={0.22} h={0.6} p={[0, 3.7, 0.25]} c="#9aa0a8" seg={10} />
      {[1.0, 1.6, 2.2].map((y) => (
        <Box key={y} s={[0.04, 0.04, 0.3]} p={[0, y, 0.05]} c="#6f6a64" />
      ))}
      <primitive object={wires} />
    </group>
  );
};

/** A drinks vending machine: a lit panel of cans, buttons, the slot. */
export const Vending: FC<{ color?: string }> = ({ color = '#ffffff' }) => {
  const cans = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: canvasTexture(20, 24, (ctx) => {
        ctx.fillStyle = '#eef6ff';
        ctx.fillRect(0, 0, 20, 24);
        const colors = ['#ff8fab', '#7cc4f0', '#ffd166', '#9fe0b8', '#ff9a7a', '#cbb8ff'];
        for (let row = 0; row < 4; row++)
          for (let k = 0; k < 6; k++) {
            ctx.fillStyle = colors[(k + row * 2) % colors.length];
            ctx.fillRect(1 + k * 3, 1 + row * 6, 2, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(1 + k * 3, 1 + row * 6, 1, 1);
          }
      }) }),
    [],
  );
  return (
    <group>
      <Box s={[1.0, 1.85, 0.75]} p={[0, 0.925, 0]} c={color} />
      <Box s={[1.02, 0.25, 0.77]} p={[0, 1.8, 0]} c="#3a6fb0" />
      <mesh material={cans} position={[-0.08, 1.15, 0.38]}>
        <planeGeometry args={[0.72, 0.85]} />
      </mesh>
      {Array.from({ length: 6 }, (_, k) => (
        <Box key={k} s={[0.07, 0.04, 0.02]} p={[-0.4 + k * 0.13, 0.67, 0.39]} c={k % 2 ? '#ff6b6b' : '#4cc38a'} m={glow(k % 2 ? '#ff6b6b' : '#4cc38a')} />
      ))}
      <Box s={[0.14, 0.4, 0.04]} p={[0.38, 1.0, 0.38]} c="#c9c6cf" />
      <Box s={[0.6, 0.18, 0.04]} p={[-0.1, 0.32, 0.38]} c="#2e2a36" />
    </group>
  );
};

/** A red post box. */
export const Mailbox: FC = () => (
  <group>
    <Box s={[0.5, 1.0, 0.42]} p={[0, 0.5, 0]} c="#e2483f" />
    <mesh material={toon('#e2483f')} position={[0, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.84]}>
      <cylinderGeometry args={[0.25, 0.25, 0.5, 12, 1, false, 0, Math.PI]} />
    </mesh>
    <Box s={[0.32, 0.05, 0.02]} p={[0, 0.8, 0.22]} c="#2e2a36" />
    <Box s={[0.22, 0.12, 0.02]} p={[0, 0.55, 0.22]} c="#fffaf2" />
  </group>
);

/** A bus stop: a post with a round sign and a timetable. */
export const BusStop: FC = () => (
  <group>
    <Cyl r={0.05} h={2.3} p={[0, 1.15, 0]} c="#c9c6cf" seg={6} />
    <mesh material={toon('#3a8fd6')} position={[0, 2.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.32, 0.32, 0.06, 14]} />
    </mesh>
    <mesh material={toon('#fffaf2')} position={[0, 2.25, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.2, 0.2, 0.02, 14]} />
    </mesh>
    <Box s={[0.4, 0.55, 0.04]} p={[0, 1.4, 0.05]} c="#fffaf2" />
    {[1.55, 1.45, 1.35, 1.25].map((y) => (
      <Box key={y} s={[0.28, 0.03, 0.01]} p={[0, y, 0.08]} c="#8a80a0" />
    ))}
  </group>
);

/** A tree in a square stone planter (the square, the pavement). */
export const PlanterTree: FC = () => (
  <group>
    <Box s={[1.5, 0.45, 1.5]} p={[0, 0.225, 0]} c="#d9cfc1" />
    <Box s={[1.3, 0.04, 1.3]} p={[0, 0.46, 0]} c="#8a6a52" />
    <Cyl r={0.16} top={0.11} h={1.4} p={[0, 1.15, 0]} c={BARK} seg={8} />
    {([[0, 2.25, 0, 0.75], [0.5, 1.95, 0.2, 0.5], [-0.5, 2.0, 0.1, 0.52], [0.1, 1.95, 0.5, 0.5], [-0.1, 2.0, -0.5, 0.52], [0.18, 2.75, 0.05, 0.45]] as const).map(([x, y, z, r], i) => (
      <mesh key={i} material={leafy(i % 2 ? LEAF_DARK : LEAF)} position={[x, y, z]}>
        <sphereGeometry args={[r, 12, 9]} />
      </mesh>
    ))}
  </group>
);

/** A low brick bed of flowers. */
export const Flowerbed: FC<{ color?: string }> = ({ color = '#ff8fab' }) => {
  const dots = useMemo(() => {
    let seed = hash(color) || 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 16 }, (_, i) => ({ x: (rnd() - 0.5) * 1.7, z: (rnd() - 0.5) * 0.65, c: [color, '#fff1a8', '#ffffff', shade(color, -0.15)][i % 4] }));
  }, [color]);
  return (
    <group>
      <Box s={[2.1, 0.32, 1.0]} p={[0, 0.16, 0]} c="#c47a5a" />
      <Box s={[1.9, 0.04, 0.8]} p={[0, 0.33, 0]} c="#6f5140" />
      {[-0.7, -0.25, 0.2, 0.65].map((x) => (
        <mesh key={x} material={leafy(LEAF_DARK)} position={[x, 0.42, 0]} scale={[1, 0.7, 1]}>
          <sphereGeometry args={[0.28, 8, 6]} />
        </mesh>
      ))}
      {dots.map((d, i) => (
        <mesh key={i} material={toon(d.c)} position={[d.x, 0.58, d.z]}>
          <sphereGeometry args={[0.07, 6, 5]} />
        </mesh>
      ))}
    </group>
  );
};

/** A white picket fence, one tile long. */
export const Fence: FC = () => (
  <group>
    {[0.35, 0.75].map((y) => (
      <Box key={y} s={[2.4, 0.08, 0.06]} p={[0, y, 0]} c="#efe9e0" />
    ))}
    {Array.from({ length: 6 }, (_, k) => (
      <group key={k} position={[-1.0 + k * 0.4, 0, 0.05]}>
        <Box s={[0.16, 0.9, 0.05]} p={[0, 0.45, 0]} c="#fffaf2" />
        <mesh material={toon('#fffaf2')} position={[0, 0.95, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.11, 0.11, 0.05]} />
        </mesh>
      </group>
    ))}
  </group>
);

/** A clipped box hedge, a bit rounded on top. */
export const Hedge: FC = () => (
  <group>
    <mesh material={leafy('#7cc462')} position={[0, 0.3, 0]}>
      <boxGeometry args={[2.3, 0.6, 0.75]} />
    </mesh>
    <mesh material={leafy(LEAF)} position={[0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.5, 1, 1]}>
      <cylinderGeometry args={[0.37, 0.37, 2.2, 10]} />
    </mesh>
  </group>
);

/** An ice-cream cart under a striped parasol. */
export const Kiosk: FC<{ color?: string }> = ({ color = '#ff8fab' }) => (
  <group>
    <Box s={[1.6, 0.9, 0.9]} p={[0, 0.65, 0]} c="#fffaf2" />
    <Box s={[1.62, 0.18, 0.92]} p={[0, 0.25, 0]} c={color} />
    <Box s={[1.4, 0.28, 0.02]} p={[0, 0.85, 0.46]} c={color} />
    {[-0.55, 0.55].map((x) => (
      <mesh key={x} material={toon('#5f5870')} position={[x, 0.18, 0.47]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 12]} />
      </mesh>
    ))}
    {/* tubs of ice cream on top */}
    {['#ffd6e0', '#fff1c4', '#c9f0d8', '#d9ccff'].map((c, i) => (
      <mesh key={c} material={toon(c)} position={[-0.5 + i * 0.33, 1.15, 0.1]}>
        <sphereGeometry args={[0.13, 8, 6]} />
      </mesh>
    ))}
    <Cyl r={0.04} h={1.6} p={[0.6, 1.5, -0.2]} c="#c9c6cf" seg={6} />
    <mesh material={stripes(color)} position={[0.6, 2.3, -0.2]}>
      <coneGeometry args={[1.0, 0.45, 8, 1, true]} />
    </mesh>
  </group>
);

/** A bicycle at a stand. */
export const Bicycle: FC<{ color?: string }> = ({ color = '#7cc4f0' }) => (
  <group>
    {[-0.5, 0.5].map((x) => (
      <mesh key={x} material={toon('#2e2a36')} position={[x, 0.36, 0]}>
        <torusGeometry args={[0.32, 0.04, 6, 16]} />
      </mesh>
    ))}
    <Box s={[1.0, 0.06, 0.06]} p={[0, 0.55, 0]} c={color} />
    <Box s={[0.06, 0.45, 0.06]} p={[-0.15, 0.6, 0]} c={color} />
    <Box s={[0.3, 0.06, 0.12]} p={[-0.15, 0.85, 0]} c="#2e2a36" />
    <Box s={[0.06, 0.06, 0.5]} p={[0.45, 0.95, 0]} c="#c9c6cf" />
    <Box s={[0.35, 0.18, 0.3]} p={[0.55, 0.75, 0]} c="#c9c6cf" />
  </group>
);
