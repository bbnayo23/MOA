import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type FC } from 'react';
import * as THREE from 'three';
import { shade } from '../art/pix';
import type { ArtKind } from './kinds';
import { canvasTexture, glow, leafy, toon } from './toon';
import { CampChair, Canoe, Flowers, IceBox, Mushrooms, PicnicTable, Reeds, Signpost, Stump, Woodpile } from './props';
import { Bicycle, BusStop, Crossing, Fence, Flowerbed, Hedge, House, Kiosk, Mailbox, PlanterTree, Pole, Railway, Shop, Station, Vending } from './town';

/**
 * 3D model per object kind. Local space: standing on y = 0, front facing +z
 * (World turns each one to face the camera, or away from the wall it stands by).
 *
 * Every kind here is procedural placeholder art (toon-shaded primitives in one
 * consistent style). Final art drops in as GLB models in the same local space.
 */
export interface ModelDef {
  /** Height (world units) — where its label floats. */
  h: number;
  Model: FC<{ color?: string }>;
  /** Fixed world yaw instead of facing the camera (the tennis net runs across the court). */
  yaw?: number;
  /** People use it seated behind it: World puts a chair at each spot. */
  seats?: true;
}

type V3 = [number, number, number];

// tiny builders: keep the models readable as "what goes where"
const Box = ({ s, p, c, r }: { s: V3; p?: V3; c: string; r?: V3 }) => (
  <mesh material={toon(c)} position={p} rotation={r}>
    <boxGeometry args={s} />
  </mesh>
);
const RBox = ({ s, p, c, rad = 0.05 }: { s: V3; p?: V3; c: string; rad?: number }) => (
  <RoundedBox args={s} radius={rad} position={p} material={toon(c)} />
);
const Cyl = ({ r, h, p, c, rot, top, seg = 16 }: { r: number; h: number; p?: V3; c: string; rot?: V3; top?: number; seg?: number }) => (
  <mesh material={toon(c)} position={p} rotation={rot}>
    <cylinderGeometry args={[top ?? r, r, h, seg]} />
  </mesh>
);
const Ball = ({ r, p, c, s, lit }: { r: number; p?: V3; c: string; s?: V3; lit?: boolean }) => (
  <mesh material={lit ? glow(c) : c === LEAF || c === LEAF_DARK ? leafy(c) : toon(c)} position={p} scale={s}>
    <sphereGeometry args={[r, 14, 10]} />
  </mesh>
);

const WOOD = '#c58f63';
const WOOD_DARK = '#a8734d';
const LEAF = '#8fd06e';
const LEAF_DARK = '#6cb85a';
const STONE = '#d6d0e2';
const CREAM = '#fff8ee';
const METAL = '#d7dbe2';
const IRON = '#5f5870';
const WAX = '#fff4e6';
const PASTELS = ['#ffb3c6', '#a9cdfc', '#ffd38a', '#b5e8c9', '#cbb8ff', '#ff9a7a'];
const WHITE_RIBBON = '#fffaf2';

/** A small flickering flame (unlit, so it glows). */
function Flame({ p = [0, 0, 0], size = 1 }: { p?: V3; size?: number }) {
  const ref = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 9 + seed;
    ref.current?.scale.set(size * (1 + Math.sin(t) * 0.08), size * (1 + Math.sin(t * 1.7) * 0.18), size * (1 + Math.cos(t) * 0.08));
  });
  return (
    <group ref={ref} position={p}>
      <mesh material={glow('#ff9a4a')} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.16, 0.42, 10]} />
      </mesh>
      <mesh material={glow('#ffd166')} position={[0, 0.12, 0.02]}>
        <coneGeometry args={[0.09, 0.26, 8]} />
      </mesh>
    </group>
  );
}

const Candle = ({ p, h = 0.22 }: { p: V3; h?: number }) => (
  <group position={p}>
    <Cyl r={0.045} h={h} p={[0, h / 2, 0]} c={WAX} seg={10} />
    <Flame p={[0, h, 0]} size={0.32} />
  </group>
);

// ── plaza & outdoors ──────────────────────────────────────────

const Building: FC<{ color?: string }> = ({ color = '#ff8fab' }) => (
  <group>
    <RBox s={[2.4, 1.8, 2]} p={[0, 0.9, 0]} c={CREAM} rad={0.08} />
    {/* gable roof: a flattened triangular prism, eaves overhanging */}
    <mesh material={toon(color)} position={[0, 2.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 1]}>
      <cylinderGeometry args={[1.45, 1.45, 2.7, 3]} />
    </mesh>
    <Box s={[0.58, 1, 0.06]} p={[0, 0.5, 1.01]} c="#7a5560" />
    <Ball r={0.04} p={[0.18, 0.5, 1.06]} c="#ffd166" />
    <Box s={[0.9, 0.08, 0.4]} p={[0, 0.04, 1.2]} c={STONE} />
    {[-0.75, 0.75].map((x) => (
      <group key={x} position={[x, 1.15, 1.01]}>
        <Box s={[0.52, 0.52, 0.05]} c="#ffffff" />
        <mesh material={glow('#cfe8ff')} position={[0, 0, 0.03]}>
          <planeGeometry args={[0.4, 0.4]} />
        </mesh>
        <Box s={[0.6, 0.05, 0.28]} p={[0, 0.36, 0.1]} r={[0.5, 0, 0]} c={color} />
      </group>
    ))}
  </group>
);

const Fountain: FC = () => {
  const drops = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    drops.current?.children.forEach((d, i) => {
      const t = (clock.elapsedTime * 0.9 + i / 6) % 1;
      const a = (i / 6) * Math.PI * 2;
      d.position.set(Math.cos(a) * t * 0.55, 1.35 + Math.sin(t * Math.PI) * 0.35 - t * 0.55, Math.sin(a) * t * 0.55);
    });
  });
  return (
    <group>
      <Cyl r={1.25} top={1.15} h={0.4} p={[0, 0.2, 0]} c={STONE} seg={32} />
      <mesh material={glow('#a6dcf7')} position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 32]} />
      </mesh>
      <Cyl r={0.2} top={0.14} h={0.8} p={[0, 0.75, 0]} c={STONE} />
      <Cyl r={0.3} top={0.5} h={0.16} p={[0, 1.15, 0]} c={STONE} seg={24} />
      <Ball r={0.12} p={[0, 1.3, 0]} c="#c8ecff" lit />
      <group ref={drops}>
        {Array.from({ length: 6 }, (_, i) => (
          <Ball key={i} r={0.05} c="#d8f2ff" lit />
        ))}
      </group>
    </group>
  );
};

const Bench: FC = () => (
  <group>
    <RBox s={[2.1, 0.09, 0.48]} p={[0, 0.42, 0]} c={WOOD} rad={0.03} />
    <group position={[0, 0.72, -0.22]} rotation={[-0.12, 0, 0]}>
      <RBox s={[2.1, 0.36, 0.07]} c={WOOD} rad={0.03} />
    </group>
    {[-0.85, 0.85].map((x) => [-0.16, 0.16].map((z) => <Box key={`${x}${z}`} s={[0.08, 0.4, 0.08]} p={[x, 0.2, z]} c={WOOD_DARK} />))}
  </group>
);

const Bush: FC = () => (
  <group>
    {([[0, 0.32, 0, 0.42], [0.36, 0.25, 0.08, 0.32], [-0.34, 0.24, 0.05, 0.3], [0.05, 0.28, -0.25, 0.32]] as const).map(([x, y, z, r], i) => (
      <Ball key={i} r={r} p={[x, y, z]} c={i % 2 ? LEAF_DARK : LEAF} />
    ))}
    {([[0.18, 0.62, 0.22], [-0.25, 0.48, 0.24], [0.42, 0.42, 0.25]] as const).map(([x, y, z], i) => (
      <Ball key={i} r={0.05} p={[x, y, z]} c={['#ffb3c6', '#fff1a8', '#ffffff'][i]} />
    ))}
  </group>
);

const Plant: FC = () => (
  <group>
    <Cyl r={0.2} top={0.26} h={0.44} p={[0, 0.22, 0]} c="#e8a27c" />
    <Cyl r={0.29} h={0.07} p={[0, 0.45, 0]} c="#d48c66" />
    {([[0, 0.78, 0, 0.3], [0.18, 0.66, 0.08, 0.22], [-0.17, 0.68, -0.05, 0.22], [0.02, 1.0, 0.03, 0.2]] as const).map(([x, y, z, r], i) => (
      <Ball key={i} r={r} p={[x, y, z]} c={i % 2 ? LEAF_DARK : LEAF} />
    ))}
  </group>
);

const Rock: FC = () => (
  <group>
    <mesh material={toon('#c8c3d6')} position={[0, 0.18, 0]} scale={[1, 0.62, 0.8]}>
      <dodecahedronGeometry args={[0.4]} />
    </mesh>
    <mesh material={toon('#d9d4e6')} position={[0.32, 0.1, 0.15]} scale={[1, 0.6, 0.8]}>
      <dodecahedronGeometry args={[0.2]} />
    </mesh>
  </group>
);

const Pine: FC = () => (
  <group>
    <Cyl r={0.17} top={0.13} h={0.7} p={[0, 0.35, 0]} c="#a0705a" seg={10} />
    {([[0.65, 1.05, 0.95], [0.52, 1.6, 0.8], [0.38, 2.1, 0.65]] as const).map(([r, y, h], i) => (
      <mesh key={i} material={leafy(i % 2 ? LEAF_DARK : LEAF)} position={[0, y, 0]}>
        <coneGeometry args={[r * 1.35, h, 14]} />
      </mesh>
    ))}
  </group>
);

/** A round, leafy shade tree: puffs of leaves on a short trunk. */
const Tree: FC = () => (
  <group>
    <Cyl r={0.2} top={0.13} h={1.4} p={[0, 0.7, 0]} c="#a97b59" seg={10} />
    {([[0, 1.85, 0, 0.82], [0.58, 1.55, 0.18, 0.58], [-0.56, 1.6, 0.12, 0.6], [0.12, 1.55, 0.58, 0.56], [-0.1, 1.62, -0.55, 0.6], [0.22, 2.42, 0.08, 0.52]] as const).map(
      ([x, y, z, r], i) => (
        <Ball key={i} r={r} p={[x, y, z]} c={i % 2 ? LEAF_DARK : LEAF} />
      ),
    )}
  </group>
);

/** A street lamp with a warm globe. */
const Lamp: FC = () => (
  <group>
    <Cyl r={0.13} top={0.09} h={0.2} p={[0, 0.1, 0]} c={IRON} />
    <Cyl r={0.045} h={2.1} p={[0, 1.15, 0]} c={IRON} seg={8} />
    <Box s={[0.3, 0.06, 0.3]} p={[0, 2.22, 0]} c={IRON} />
    <Ball r={0.17} p={[0, 2.42, 0]} c="#fff1c4" lit />
    <mesh material={toon(IRON)} position={[0, 2.65, 0]}>
      <coneGeometry args={[0.24, 0.18, 8]} />
    </mesh>
  </group>
);

// ── camping ───────────────────────────────────────────────────

/** A seat log; it lies front-to-back so logs either side of the fire run round it. */
const Log: FC = () => (
  <group>
    <Cyl r={0.2} h={1.5} p={[0, 0.2, 0]} rot={[Math.PI / 2, 0, 0]} c={WOOD} />
    {[-0.751, 0.751].map((z) => (
      <Cyl key={z} r={0.16} h={0.01} p={[0, 0.2, z]} rot={[Math.PI / 2, 0, 0]} c="#ecc9a0" />
    ))}
  </group>
);

/** A little wooden jetty running out over a pond (toward +z), a bucket and a rod at its foot. */
const Dock: FC = () => (
  <group>
    {[-0.36, 0, 0.36].map((x) => (
      <RBox key={x} s={[0.34, 0.07, 2.4]} p={[x, 0.16, 0.85]} c={x ? WOOD : WOOD_DARK} rad={0.025} />
    ))}
    {[-0.55, 0.55].flatMap((x) =>
      [-0.25, 1.95].map((z) => <Cyl key={`${x}${z}`} r={0.07} h={0.55} p={[x, 0.1, z]} c={WOOD_DARK} />),
    )}
    <Cyl r={0.15} top={0.18} h={0.26} p={[-0.32, 0.33, -0.1]} c="#a9cdfc" />
    <Ball r={0.06} p={[-0.3, 0.45, -0.1]} c="#7fc8f2" s={[1.6, 0.4, 1.6]} />
    <Cyl r={0.014} h={1.7} p={[0.1, 0.85, 0.05]} rot={[0.45, 0, -0.4]} c={IRON} />
  </group>
);

// ── room furniture: lounges, shop, gym, library, church ───────

/** A two-seat sofa with cushions (`color`: its fabric). Sat on: no footprint. */
const Sofa: FC<{ color?: string }> = ({ color = '#a9cdfc' }) => (
  <group>
    <RBox s={[1.9, 0.42, 0.85]} p={[0, 0.3, 0]} c={color} rad={0.12} />
    <RBox s={[1.9, 0.62, 0.26]} p={[0, 0.72, -0.31]} c={color} rad={0.12} />
    {[-1, 1].map((s) => (
      <RBox key={s} s={[0.24, 0.52, 0.85]} p={[0.86 * s, 0.5, 0]} c={color} rad={0.1} />
    ))}
    {[-0.4, 0.4].map((x) => (
      <RBox key={x} s={[0.72, 0.12, 0.6]} p={[x, 0.55, 0.05]} c={CREAM} rad={0.05} />
    ))}
    {[-0.5, 0.5].map((x, i) => (
      <Ball key={x} r={0.17} p={[x, 0.8, -0.14]} s={[1, 1, 0.5]} c={PASTELS[(i * 3 + 1) % PASTELS.length]} />
    ))}
    {[-0.8, 0.8].flatMap((x) => [-0.32, 0.32].map((z) => <Cyl key={`${x}${z}`} r={0.04} h={0.12} p={[x, 0.05, z]} c={WOOD_DARK} />))}
  </group>
);

const Armchair: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group>
    <RBox s={[0.95, 0.4, 0.8]} p={[0, 0.3, 0]} c={color} rad={0.1} />
    <RBox s={[0.95, 0.68, 0.24]} p={[0, 0.72, -0.29]} c={color} rad={0.1} />
    {[-1, 1].map((s) => (
      <RBox key={s} s={[0.2, 0.46, 0.8]} p={[0.43 * s, 0.52, 0]} c={color} rad={0.08} />
    ))}
    <RBox s={[0.62, 0.1, 0.56]} p={[0, 0.54, 0.06]} c={CREAM} rad={0.04} />
  </group>
);

/** A standing lamp with a fabric shade (World gives it a warm light). */
const FloorLamp: FC = () => (
  <group>
    <Cyl r={0.22} h={0.05} p={[0, 0.03, 0]} c={IRON} />
    <Cyl r={0.025} h={1.7} p={[0, 0.88, 0]} c={IRON} seg={8} />
    <Cyl r={0.3} top={0.18} h={0.38} p={[0, 1.82, 0]} c="#ffe9c7" seg={20} />
    <Ball r={0.1} p={[0, 1.66, 0]} c="#fff6d8" lit />
  </group>
);

/** A glass case of cakes and tarts by the café counter. */
const PastryCase: FC = () => (
  <group>
    <RBox s={[1.6, 0.8, 0.7]} p={[0, 0.4, 0]} c="#ffd0cc" />
    <RBox s={[1.65, 0.05, 0.75]} p={[0, 0.82, 0]} c={CREAM} />
    {['#fff4e6', '#8b5a3c', '#ffd6e0'].map((c, i) => (
      <group key={c} position={[-0.5 + i * 0.5, 0.85, 0.02]}>
        <Cyl r={0.17} h={0.16} p={[0, 0.08, 0]} c={c} />
        <Ball r={0.045} p={[0, 0.2, 0]} c="#ff5b7a" />
      </group>
    ))}
    <mesh material={glow('#e8f4ff', 0.3)} position={[0, 1.08, 0]}>
      <boxGeometry args={[1.6, 0.48, 0.7]} />
    </mesh>
    <RBox s={[1.65, 0.05, 0.75]} p={[0, 1.34, 0]} c={CREAM} />
  </group>
);

/** A little painting hung on the wall behind it (hills and a sun in `color`). */
const Frame: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group position={[0, 0, -0.26]}>
    <RBox s={[1.2, 0.9, 0.06]} p={[0, 2.0, 0]} c={WOOD} rad={0.02} />
    <Box s={[1.04, 0.74, 0.02]} p={[0, 2.0, 0.035]} c="#e3f2ff" />
    <Box s={[1.04, 0.26, 0.02]} p={[0, 1.76, 0.04]} c={LEAF} />
    <Ball r={0.2} p={[-0.18, 1.86, 0.045]} s={[1.6, 0.6, 0.05]} c={LEAF_DARK} />
    <Ball r={0.09} p={[0.28, 2.17, 0.045]} s={[1, 1, 0.1]} c={color} />
  </group>
);

/** Exercise bike, side on (front wheel toward +x). */
const Bike: FC = () => (
  <group>
    <RBox s={[1.25, 0.08, 0.42]} p={[0, 0.04, 0]} c={IRON} />
    <Cyl r={0.27} h={0.1} p={[0.38, 0.36, 0]} rot={[Math.PI / 2, 0, 0]} c={METAL} seg={20} />
    <Box s={[0.08, 0.78, 0.08]} p={[-0.24, 0.44, 0]} r={[0, 0, 0.25]} c={IRON} />
    <RBox s={[0.38, 0.09, 0.24]} p={[-0.34, 0.86, 0]} c="#3f3a4d" rad={0.04} />
    <Box s={[0.08, 1.0, 0.08]} p={[0.36, 0.62, 0]} r={[0, 0, -0.2]} c={IRON} />
    <Cyl r={0.03} h={0.5} p={[0.47, 1.12, 0]} rot={[Math.PI / 2, 0, 0]} c={METAL} seg={8} />
    <mesh material={glow('#9fe3c4')} position={[0.5, 1.2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.2, 0.12]} />
    </mesh>
  </group>
);

/** A bench under a barbell on its rack. */
const WeightBench: FC = () => (
  <group>
    <RBox s={[1.3, 0.12, 0.36]} p={[0.1, 0.45, 0]} c="#a99fd0" rad={0.04} />
    {[-0.4, 0.6].map((x) => (
      <Box key={x} s={[0.08, 0.42, 0.3]} p={[x, 0.2, 0]} c={IRON} />
    ))}
    {[-0.34, 0.34].map((z) => (
      <Box key={z} s={[0.06, 1.0, 0.06]} p={[-0.62, 0.5, z]} c={IRON} />
    ))}
    <Cyl r={0.025} h={1.5} p={[-0.62, 1.0, 0]} rot={[Math.PI / 2, 0, 0]} c={METAL} seg={8} />
    {[-0.62, 0.62].map((z) => (
      <Cyl key={z} r={0.2} h={0.06} p={[-0.62, 1.0, z]} rot={[Math.PI / 2, 0, 0]} c={IRON} />
    ))}
  </group>
);

const GymBalls: FC = () => (
  <group>
    <Ball r={0.42} p={[-0.3, 0.42, 0]} c="#a9cdfc" />
    <Ball r={0.36} p={[0.42, 0.36, 0.15]} c="#ffb3c6" />
    <Ball r={0.3} p={[0.1, 0.3, -0.48]} c="#b5e8c9" />
  </group>
);

const Cooler: FC = () => (
  <group>
    <RBox s={[0.46, 1.0, 0.44]} p={[0, 0.5, 0]} c={CREAM} />
    <mesh material={glow('#a9dcff', 0.75)} position={[0, 1.26, 0]}>
      <cylinderGeometry args={[0.17, 0.19, 0.5, 16]} />
    </mesh>
    {['#7fc8f2', '#ff9a8a'].map((c, i) => (
      <Box key={c} s={[0.08, 0.08, 0.06]} p={[-0.1 + i * 0.2, 0.78, 0.23]} c={c} />
    ))}
  </group>
);

const Globe: FC = () => (
  <group>
    <Cyl r={0.24} h={0.05} p={[0, 0.03, 0]} c={WOOD_DARK} />
    <Cyl r={0.04} h={0.7} p={[0, 0.4, 0]} c={WOOD_DARK} seg={8} />
    <group position={[0, 1.02, 0]} rotation={[0, 0, 0.4]}>
      <Ball r={0.3} c="#7fc8f2" />
      {([[0.12, 0.1, 0.22], [-0.2, 0.15, 0.12], [0.05, -0.2, 0.18]] as const).map((p, i) => (
        <Ball key={i} r={0.1} p={[p[0], p[1], p[2]]} s={[1.4, 1, 0.6]} c={i % 2 ? LEAF_DARK : LEAF} />
      ))}
      <mesh material={toon('#e6c35c')}>
        <torusGeometry args={[0.37, 0.02, 6, 24, Math.PI]} />
      </mesh>
    </group>
  </group>
);

/** A library trolley of books to shelve. */
const BookCart: FC = () => (
  <group>
    {[0.3, 0.74].map((y) => (
      <RBox key={y} s={[1.0, 0.06, 0.5]} p={[0, y, 0]} c={WOOD} rad={0.02} />
    ))}
    {[-0.46, 0.46].flatMap((x) => [-0.21, 0.21].map((z) => <Box key={`${x}${z}`} s={[0.05, 0.8, 0.05]} p={[x, 0.42, z]} c={WOOD_DARK} />))}
    {[-0.42, 0.42].flatMap((x) => [-0.2, 0.2].map((z) => <Ball key={`w${x}${z}`} r={0.06} p={[x, 0.06, z]} c={IRON} />))}
    {Array.from({ length: 6 }, (_, i) => (
      <Box key={i} s={[0.1, 0.3, 0.26]} p={[-0.36 + i * 0.13, 0.92, 0]} r={[0, 0, i === 5 ? 0.35 : 0]} c={PASTELS[i]} />
    ))}
    {Array.from({ length: 5 }, (_, i) => (
      <Box key={`b${i}`} s={[0.1, 0.27, 0.26]} p={[-0.3 + i * 0.14, 0.47, 0]} c={PASTELS[(i + 3) % PASTELS.length]} />
    ))}
  </group>
);

/** A shop's dress form: a dress in `color` on a stand. */
const DressForm: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group>
    <Cyl r={0.3} h={0.06} p={[0, 0.03, 0]} c={WOOD_DARK} />
    <Cyl r={0.03} h={0.85} p={[0, 0.45, 0]} c={WOOD_DARK} seg={8} />
    <Cyl r={0.4} top={0.2} h={0.55} p={[0, 1.05, 0]} c={color} seg={20} />
    <Ball r={0.25} p={[0, 1.45, 0]} s={[1, 1.2, 0.78]} c={color} />
    <mesh material={toon(WHITE_RIBBON)} position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.215, 0.025, 6, 20]} />
    </mesh>
    <Cyl r={0.06} h={0.14} p={[0, 1.77, 0]} c="#f4e7da" />
    <Ball r={0.08} p={[0, 1.88, 0]} c={WOOD_DARK} />
  </group>
);

/** A shop table of folded clothes and a bag. */
const DisplayTable: FC = () => (
  <group>
    <RBox s={[1.5, 0.08, 0.8]} p={[0, 0.72, 0]} c={CREAM} rad={0.03} />
    {[-0.66, 0.66].map((x) => (
      <Box key={x} s={[0.08, 0.7, 0.72]} p={[x, 0.35, 0]} c="#f3d6e3" />
    ))}
    {[-0.45, 0, 0.45].flatMap((x, i) =>
      [0, 1, 2].map((k) => <RBox key={`${x}${k}`} s={[0.36, 0.07, 0.3]} p={[x, 0.8 + k * 0.075, -0.12]} c={PASTELS[(i * 2 + k) % PASTELS.length]} rad={0.02} />),
    )}
    <RBox s={[0.3, 0.22, 0.14]} p={[0.25, 0.88, 0.2]} c="#ff9fc0" rad={0.05} />
    <mesh material={toon('#ff9fc0')} position={[0.25, 1.0, 0.2]}>
      <torusGeometry args={[0.09, 0.015, 6, 16, Math.PI]} />
    </mesh>
  </group>
);

/** A plain stone column. */
const Pillar: FC = () => (
  <group>
    <RBox s={[0.72, 0.26, 0.72]} p={[0, 0.13, 0]} c="#efe4d4" rad={0.04} />
    <Cyl r={0.25} h={2.9} p={[0, 1.7, 0]} c="#f8f1e6" seg={20} />
    <RBox s={[0.68, 0.22, 0.68]} p={[0, 3.2, 0]} c="#efe4d4" rad={0.04} />
  </group>
);

/** Flowers in a vase on a tall stand (`color`: the blooms). */
const Bouquet: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group>
    <Cyl r={0.13} top={0.18} h={0.7} p={[0, 0.35, 0]} c={CREAM} />
    <Cyl r={0.16} top={0.12} h={0.3} p={[0, 0.85, 0]} c="#a9cdfc" />
    {Array.from({ length: 4 }, (_, i) => (
      <Ball key={`l${i}`} r={0.08} p={[Math.cos(i * 1.6) * 0.2, 1.02, Math.sin(i * 1.6) * 0.2]} s={[1.5, 0.6, 1]} c={LEAF} />
    ))}
    {Array.from({ length: 7 }, (_, i) => (
      <Ball key={i} r={0.09} p={[Math.cos(i * 2.4) * 0.14, 1.1 + (i % 3) * 0.06, Math.sin(i * 2.4) * 0.14]} c={i % 3 ? color : '#fff1a8'} />
    ))}
  </group>
);

const Tent: FC<{ color?: string }> = ({ color = '#ff9a8a' }) => (
  <group>
    {/* A-frame: a triangular prism with its ridge running front to back */}
    <mesh material={toon(color)} position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.2, 1.2, 2.2, 3]} />
    </mesh>
    {/* doorway, flap, ridge pole, pegs */}
    <mesh material={toon('#7a4a52')} position={[0, 0.42, 1.11]}>
      <circleGeometry args={[0.55, 3, Math.PI / 2]} />
    </mesh>
    <mesh material={toon(shade(color, 0.3))} position={[0.38, 0.42, 1.13]} rotation={[0, 0, -0.35]}>
      <circleGeometry args={[0.42, 3, Math.PI / 2]} />
    </mesh>
    <Cyl r={0.035} h={2.5} p={[0, 1.2, 0]} rot={[Math.PI / 2, 0, 0]} c={WOOD_DARK} seg={8} />
    {[-1.15, 1.15].map((x) => (
      <Box key={x} s={[0.06, 0.12, 0.06]} p={[x * 1.05, 0.06, 1.0]} c={WOOD_DARK} />
    ))}
  </group>
);

const Campfire: FC = () => (
  <group>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return (
        <mesh key={i} material={toon(i % 2 ? '#bdb6cc' : '#cfc9dc')} position={[Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.55]} scale={[1, 0.7, 1]}>
          <dodecahedronGeometry args={[0.15]} />
        </mesh>
      );
    })}
    {[0.6, -0.6].map((r) => (
      <Cyl key={r} r={0.07} h={0.8} p={[0, 0.12, 0]} rot={[Math.PI / 2, r, 0]} c={WOOD_DARK} seg={8} />
    ))}
    <Flame p={[0, 0.15, 0]} size={1.4} />
  </group>
);

const Grill: FC = () => (
  <group>
    {[-0.35, 0.35].map((x) => [-0.18, 0.18].map((z) => <Cyl key={`${x}${z}`} r={0.03} h={0.75} p={[x, 0.37, z]} c={IRON} seg={6} />))}
    <RBox s={[0.95, 0.25, 0.55]} p={[0, 0.82, 0]} c={IRON} />
    <Box s={[0.9, 0.02, 0.5]} p={[0, 0.96, 0]} c="#9a93ad" />
    {[-0.22, 0, 0.22].map((x, i) => (
      <mesh key={x} material={toon(i === 1 ? '#f2cc8f' : '#c7684e')} position={[x, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.05, 0.25, 4, 8]} />
      </mesh>
    ))}
    <mesh material={glow('#ff9a4a', 0.6)} position={[0, 0.955, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.8, 0.4]} />
    </mesh>
  </group>
);

const Lantern: FC = () => (
  <group>
    <Cyl r={0.05} h={1.2} p={[0, 0.6, 0]} c={WOOD_DARK} seg={8} />
    <Box s={[0.26, 0.3, 0.26]} p={[0, 1.33, 0]} c="#fff1b0" />
    <Ball r={0.1} p={[0, 1.33, 0]} c="#ffe7a0" lit />
    <mesh material={toon(IRON)} position={[0, 1.55, 0]}>
      <coneGeometry args={[0.22, 0.16, 4]} />
    </mesh>
  </group>
);

// ── church ────────────────────────────────────────────────────

const Altar: FC = () => (
  <group>
    <RBox s={[2.0, 0.9, 0.85]} p={[0, 0.45, 0]} c="#fffaf2" />
    <Box s={[2.05, 0.06, 0.9]} p={[0, 0.92, 0]} c="#e2c47d" />
    {/* runner hanging over the front */}
    <Box s={[0.5, 0.75, 0.02]} p={[0, 0.58, 0.44]} c="#e98aa2" />
    <Box s={[0.5, 0.05, 0.03]} p={[0, 0.22, 0.45]} c="#f6c76b" />
    <Cyl r={0.12} top={0.2} h={0.12} p={[0, 1.01, 0]} c="#e2c47d" />
    <Candle p={[-0.7, 0.95, 0]} h={0.3} />
    <Candle p={[0.7, 0.95, 0]} h={0.3} />
    {[-0.4, 0.4].map((x) => (
      <group key={x} position={[x, 0.95, -0.15]}>
        <Cyl r={0.06} top={0.08} h={0.2} p={[0, 0.1, 0]} c="#cfe8ff" />
        <Ball r={0.07} p={[0, 0.25, 0]} c={x < 0 ? '#ffb3c6' : '#fff1a8'} />
      </group>
    ))}
  </group>
);

const Candles: FC = () => (
  <group>
    <RBox s={[1.1, 0.6, 0.5]} p={[0, 0.3, 0]} c={WOOD} />
    <RBox s={[0.8, 0.18, 0.32]} p={[0, 0.69, -0.06]} c={WOOD_DARK} />
    {[-0.42, -0.21, 0, 0.21, 0.42].map((x, i) => (
      <Candle key={x} p={[x, 0.6, 0.12]} h={0.12 + (i % 2) * 0.06} />
    ))}
    {[-0.25, 0, 0.25].map((x) => (
      <Candle key={x} p={[x, 0.78, -0.06]} h={0.18} />
    ))}
  </group>
);

const Board: FC = () => (
  <group>
    {[-0.6, 0.6].map((x) => (
      <Box key={x} s={[0.07, 1.5, 0.07]} p={[x, 0.75, 0]} c={WOOD_DARK} />
    ))}
    <RBox s={[1.45, 1.0, 0.08]} p={[0, 1.05, 0.02]} c={WOOD} rad={0.03} />
    <Box s={[1.3, 0.85, 0.02]} p={[0, 1.05, 0.065]} c="#e3c296" />
    {[[-0.4, 1.25], [0.05, 1.3], [0.42, 1.2], [-0.3, 0.88], [0.15, 0.85], [0.45, 0.9]].map(([x, y], i) => (
      <Box key={i} s={[0.24, 0.22, 0.01]} p={[x, y, 0.08]} r={[0, 0, (i % 3) * 0.08 - 0.08]} c={PASTELS[i % PASTELS.length]} />
    ))}
  </group>
);

// ── library ───────────────────────────────────────────────────

const Bookshelf: FC = () => (
  <group>
    <RBox s={[1.6, 2.2, 0.5]} p={[0, 1.1, -0.05]} c="#b07a52" rad={0.04} />
    <Box s={[1.45, 2.0, 0.05]} p={[0, 1.1, 0.18]} c="#7d5236" />
    {[0.45, 1.05, 1.65].map((y, row) => (
      <group key={y}>
        <Box s={[1.5, 0.05, 0.42]} p={[0, y - 0.25, 0.02]} c="#b07a52" />
        {Array.from({ length: 9 }, (_, i) => {
          const h = 0.36 + ((i * 7 + row * 3) % 4) * 0.04;
          return <Box key={i} s={[0.12, h, 0.3]} p={[-0.62 + i * 0.155, y - 0.22 + h / 2, 0.05]} c={PASTELS[(i + row * 2) % PASTELS.length]} />;
        })}
      </group>
    ))}
  </group>
);

const Table: FC = () => (
  <group>
    <RBox s={[1.9, 0.1, 1.1]} p={[0, 0.72, 0]} c={WOOD} rad={0.04} />
    {[-0.8, 0.8].map((x) => [-0.42, 0.42].map((z) => <Box key={`${x}${z}`} s={[0.08, 0.7, 0.08]} p={[x, 0.35, z]} c={WOOD_DARK} />))}
    <Box s={[0.32, 0.06, 0.24]} p={[-0.45, 0.8, 0.1]} r={[0, 0.3, 0]} c="#e07a5f" />
    <Box s={[0.3, 0.05, 0.22]} p={[-0.43, 0.85, 0.08]} r={[0, 0.2, 0]} c="#a9cdfc" />
    <Box s={[0.42, 0.02, 0.3]} p={[0.4, 0.78, 0.05]} r={[0, -0.2, 0]} c="#fffaf0" />
  </group>
);

const Desk: FC = () => (
  <group>
    <RBox s={[1.35, 0.08, 0.7]} p={[0, 0.72, 0]} c={WOOD} rad={0.03} />
    {[-0.6, 0.6].map((x) => (
      <Box key={x} s={[0.1, 0.7, 0.62]} p={[x, 0.35, 0]} c={WOOD_DARK} />
    ))}
    {/* lamp */}
    <Cyl r={0.1} h={0.04} p={[0.45, 0.78, 0.1]} c="#ffd38a" />
    <Cyl r={0.02} h={0.35} p={[0.45, 0.95, 0.1]} c="#ffd38a" seg={6} />
    <mesh material={toon('#ffd38a')} position={[0.45, 1.15, 0.05]} rotation={[0.4, 0, 0]}>
      <coneGeometry args={[0.13, 0.16, 12, 1, true]} />
    </mesh>
    <Ball r={0.05} p={[0.45, 1.09, 0.08]} c="#fff1b0" lit />
    <Box s={[0.3, 0.12, 0.22]} p={[-0.35, 0.82, 0.05]} c="#cbb8ff" />
  </group>
);

/** Chair behind a table or desk (World places one at each seat). */
export const Chair: FC<{ color?: string }> = ({ color = WOOD }) => (
  <group>
    <RBox s={[0.5, 0.07, 0.48]} p={[0, 0.42, 0]} c={color} rad={0.025} />
    <RBox s={[0.5, 0.48, 0.06]} p={[0, 0.7, -0.22]} c={color} rad={0.025} />
    {[-0.2, 0.2].map((x) => [-0.19, 0.19].map((z) => <Box key={`${x}${z}`} s={[0.05, 0.42, 0.05]} p={[x, 0.21, z]} c={WOOD_DARK} />))}
  </group>
);

// ── restaurant ────────────────────────────────────────────────

const gingham = () =>
  canvasTexture(16, 16, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(255, 128, 150, 0.55)';
    ctx.fillRect(0, 0, 8, 16);
    ctx.fillRect(0, 0, 16, 8);
  }, [4, 3]);

const DiningTable: FC = () => {
  const cloth = useMemo(() => toon('#ffffff', gingham(), 'gingham'), []);
  return (
    <group>
      <RoundedBox args={[1.5, 0.12, 1.05]} radius={0.04} position={[0, 0.74, 0]} material={cloth} />
      <Cyl r={0.08} h={0.7} p={[0, 0.35, 0]} c={WOOD_DARK} />
      <Cyl r={0.3} h={0.05} p={[0, 0.025, 0]} c={WOOD_DARK} />
      {[-0.4, 0.4].map((x) => (
        <Cyl key={x} r={0.17} h={0.02} p={[x, 0.81, 0.15]} c="#ffffff" />
      ))}
      <Cyl r={0.05} top={0.035} h={0.18} p={[0, 0.89, -0.2]} c="#a9cdfc" />
      <Ball r={0.06} p={[0, 1.0, -0.2]} c="#ff8fab" />
    </group>
  );
};

const Counter: FC = () => (
  <group>
    <RBox s={[2.2, 1.0, 0.8]} p={[0, 0.5, 0]} c="#f2a7a7" />
    <RBox s={[2.3, 0.06, 0.9]} p={[0, 1.03, 0]} c="#fffaf5" />
    {[-0.66, 0, 0.66].map((x) => (
      <Box key={x} s={[0.5, 0.7, 0.02]} p={[x, 0.48, 0.41]} c="#ffd0cc" />
    ))}
    {/* till and a cake under a glass dome */}
    <RBox s={[0.4, 0.28, 0.32]} p={[-0.6, 1.2, 0]} c={IRON} />
    <Box s={[0.3, 0.12, 0.02]} p={[-0.6, 1.27, 0.165]} c="#9fe3c4" />
    <Cyl r={0.2} h={0.12} p={[0.55, 1.12, 0]} c="#fff4e6" />
    <Ball r={0.06} p={[0.55, 1.22, 0]} c="#ff5b7a" />
    <mesh material={glow('#e8f4ff', 0.35)} position={[0.55, 1.12, 0]}>
      <sphereGeometry args={[0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  </group>
);

const Menuboard: FC = () => {
  const chalk = useMemo(
    () =>
      toon(
        '#ffffff',
        canvasTexture(64, 96, (ctx) => {
          ctx.fillStyle = '#3f5a4c';
          ctx.fillRect(0, 0, 64, 96);
          ['#ffffff', '#ffb3c6', '#fff1a8', '#a9cdfc', '#ffffff'].forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(10, 14 + i * 16, 30 + ((i * 13) % 14), 4);
          });
        }),
        'chalk',
      ),
    [],
  );
  return (
    <group>
      {[-0.32, 0.32].map((x) => (
        <Box key={x} s={[0.06, 1.5, 0.06]} p={[x, 0.75, 0]} r={[-0.12, 0, 0]} c={WOOD} />
      ))}
      <mesh material={chalk} position={[0, 1.0, 0.07]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.72, 1.0, 0.05]} />
      </mesh>
    </group>
  );
};

// ── gym ───────────────────────────────────────────────────────

/** Belt runs along local x; the console stands at the −x end. */
const Treadmill: FC = () => (
  <group>
    <RBox s={[1.8, 0.14, 0.8]} p={[0, 0.07, 0]} c={IRON} />
    <Box s={[1.6, 0.02, 0.6]} p={[0, 0.15, 0]} c="#3f3a4d" />
    {[-0.36, 0.36].map((z) => (
      <Box key={z} s={[0.06, 1.0, 0.06]} p={[-0.8, 0.6, z]} r={[0, 0, -0.15]} c={METAL} />
    ))}
    <RBox s={[0.25, 0.3, 0.8]} p={[-0.88, 1.15, 0]} c={IRON} />
    <mesh material={glow('#9fe3c4')} position={[-0.75, 1.17, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.5, 0.16]} />
    </mesh>
  </group>
);

const Rack: FC = () => (
  <group>
    {[-0.75, 0.75].map((x) => (
      <Box key={x} s={[0.07, 0.9, 0.42]} p={[x, 0.45, 0]} c={IRON} />
    ))}
    {[0.3, 0.65].map((y, row) => (
      <group key={y}>
        <Box s={[1.5, 0.05, 0.4]} p={[0, y, 0]} c={METAL} />
        {[-0.5, -0.17, 0.17, 0.5].map((x, i) => (
          <group key={x} position={[x, y + 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Cyl r={0.025} h={0.3} c={METAL} seg={6} />
            {[-0.12, 0.12].map((o) => (
              <Cyl key={o} r={0.08} h={0.06} p={[0, o, 0]} c={PASTELS[(i + row) % PASTELS.length]} />
            ))}
          </group>
        ))}
      </group>
    ))}
  </group>
);

const Mat: FC = () => (
  <group>
    <RBox s={[0.95, 0.04, 1.9]} p={[0, 0.02, 0]} c="#c9b6ff" rad={0.015} />
    <Cyl r={0.1} h={0.95} p={[0, 0.1, -0.95]} rot={[0, 0, Math.PI / 2]} c="#b3a2ef" />
  </group>
);

// ── pool ──────────────────────────────────────────────────────

const Ladder: FC = () => (
  <group>
    {[-0.28, 0.28].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <mesh material={toon(METAL)} position={[0, 0.9, -0.25]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.25, 0.035, 8, 16, Math.PI]} />
        </mesh>
        <Cyl r={0.035} h={0.9} p={[0, 0.45, 0]} c={METAL} seg={8} />
        <Cyl r={0.035} h={0.9} p={[0, 0.45, -0.5]} c={METAL} seg={8} />
      </group>
    ))}
    {[0.15, 0.4].map((y) => (
      <Box key={y} s={[0.56, 0.04, 0.12]} p={[0, y, 0.02]} c={METAL} />
    ))}
  </group>
);

const Lounger: FC = () => (
  <group>
    {[-0.32, 0.32].map((x) => [-0.7, 0.6].map((z) => <Box key={`${x}${z}`} s={[0.05, 0.25, 0.05]} p={[x, 0.12, z]} c={METAL} />))}
    <RBox s={[0.75, 0.08, 1.3]} p={[0, 0.28, 0.25]} c="#ffffff" rad={0.03} />
    <RBox s={[0.68, 0.06, 1.2]} p={[0, 0.34, 0.25]} c="#a9cdfc" rad={0.03} />
    <group position={[0, 0.5, -0.55]} rotation={[-0.9, 0, 0]}>
      <RBox s={[0.75, 0.08, 0.7]} c="#ffffff" rad={0.03} />
      <RBox s={[0.68, 0.06, 0.62]} p={[0, 0.05, 0]} c="#a9cdfc" rad={0.03} />
    </group>
  </group>
);

const Parasol: FC = () => (
  <group>
    <Cyl r={0.25} h={0.08} p={[0, 0.04, 0]} c={METAL} />
    <Cyl r={0.035} h={2.2} p={[0, 1.1, 0]} c="#ffffff" seg={8} />
    {Array.from({ length: 8 }, (_, i) => (
      <mesh key={i} material={toon(i % 2 ? '#ffffff' : '#ff9fb2')} position={[0, 2.15, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
        <coneGeometry args={[1.25, 0.45, 8, 1, true, 0, Math.PI / 4]} />
      </mesh>
    ))}
    <Ball r={0.06} p={[0, 2.4, 0]} c="#ff9fb2" />
  </group>
);

const Ring: FC = () => (
  <group>
    <mesh material={toon('#ff9fb2')} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.4, 0.15, 12, 24]} />
    </mesh>
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
      <mesh key={a} material={toon('#ffffff')} position={[Math.cos(a) * 0.4, 0.14, Math.sin(a) * 0.4]} rotation={[0, -a, 0]}>
        <cylinderGeometry args={[0.155, 0.155, 0.1, 12]} />
      </mesh>
    ))}
  </group>
);

// ── tennis ────────────────────────────────────────────────────

/** Runs along local z, across the court (fixed world yaw, see MODELS.net). */
const Net: FC = () => {
  const mesh = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: canvasTexture(16, 16, (ctx) => {
          ctx.strokeStyle = 'rgba(70, 60, 90, 0.75)';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, 16, 16);
        }, [40, 4]),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const L = 8.2;
  return (
    <group>
      {[-L / 2, L / 2].map((z) => (
        <Cyl key={z} r={0.06} h={1.1} p={[0, 0.55, z]} c={METAL} seg={8} />
      ))}
      <mesh material={mesh} position={[0, 0.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[L, 0.9]} />
      </mesh>
      <Box s={[0.04, 0.08, L]} p={[0, 0.96, 0]} c="#ffffff" />
    </group>
  );
};

const Balls: FC = () => (
  <group>
    <Cyl r={0.28} top={0.32} h={0.32} p={[0, 0.16, 0]} c={METAL} />
    {([[-0.1, 0.36, 0.05], [0.1, 0.38, -0.05], [0, 0.4, 0.12], [0.12, 0.36, 0.13], [-0.12, 0.38, -0.1]] as const).map((p, i) => (
      <Ball key={i} r={0.07} p={[...p]} c="#e6f27a" />
    ))}
  </group>
);

// ── mall ──────────────────────────────────────────────────────

const ClothesRack: FC = () => (
  <group>
    {[-0.75, 0.75].map((x) => (
      <group key={x}>
        <Cyl r={0.03} h={1.6} p={[x, 0.8, 0]} c={METAL} seg={8} />
        <Box s={[0.08, 0.04, 0.5]} p={[x, 0.02, 0]} c={METAL} />
      </group>
    ))}
    <Cyl r={0.025} h={1.55} p={[0, 1.58, 0]} rot={[0, 0, Math.PI / 2]} c={METAL} seg={8} />
    {[-0.55, -0.28, 0, 0.28, 0.55].map((x, i) => (
      <group key={x} position={[x, 1.52, 0]}>
        <mesh material={toon(METAL)} position={[0, 0.02, 0]}>
          <torusGeometry args={[0.04, 0.008, 4, 8, Math.PI]} />
        </mesh>
        <RBox s={[0.3, 0.55, 0.1]} p={[0, -0.32, 0]} c={PASTELS[i % PASTELS.length]} rad={0.03} />
      </group>
    ))}
  </group>
);

const FittingRoom: FC = () => {
  const curtain = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    curtain.current?.children.forEach((c, i) => (c.position.z = 0.55 + Math.sin(clock.elapsedTime * 2 + i) * 0.015));
  });
  return (
    <group>
      <RBox s={[1.4, 2.3, 0.1]} p={[0, 1.15, -0.55]} c="#fff0f6" />
      {[-0.68, 0.68].map((x) => (
        <RBox key={x} s={[0.08, 2.3, 1.2]} p={[x, 1.15, 0]} c="#fff0f6" />
      ))}
      <RBox s={[1.5, 0.25, 1.25]} p={[0, 2.35, 0]} c="#ff9fc0" />
      <Cyl r={0.02} h={1.3} p={[0, 2.12, 0.55]} rot={[0, 0, Math.PI / 2]} c={METAL} seg={6} />
      <group ref={curtain}>
        {Array.from({ length: 8 }, (_, i) => (
          <Cyl key={i} r={0.085} h={1.85} p={[-0.56 + i * 0.16, 1.15, 0.55]} c={i % 2 ? '#ff9fc0' : '#ffb7d0'} seg={10} />
        ))}
      </group>
    </group>
  );
};

const Mirror: FC = () => (
  <group>
    {[-0.25, 0.25].map((x) => (
      <Box key={x} s={[0.05, 0.5, 0.35]} p={[x, 0.2, -0.1]} r={[0.3, 0, 0]} c="#e6c35c" />
    ))}
    <group position={[0, 1.1, 0]} rotation={[-0.08, 0, 0]} scale={[0.75, 1.15, 1]}>
      <mesh material={toon('#e6c35c')}>
        <torusGeometry args={[0.62, 0.06, 10, 32]} />
      </mesh>
      <mesh material={glow('#e3f2ff')} position={[0, 0, -0.01]}>
        <circleGeometry args={[0.6, 32]} />
      </mesh>
      <mesh material={glow('#ffffff', 0.7)} position={[-0.2, 0.2, 0]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[0.08, 0.5]} />
      </mesh>
    </group>
  </group>
);

export const MODELS: Record<ArtKind, ModelDef> = {
  building: { h: 3.1, Model: Building },
  fountain: { h: 1.6, Model: Fountain },
  pew: { h: 0.9, Model: Bench },
  bush: { h: 0.8, Model: Bush },
  plant: { h: 1.2, Model: Plant },
  rock: { h: 0.5, Model: Rock },
  pine: { h: 2.5, Model: Pine },
  tree: { h: 2.9, Model: Tree },
  lamp: { h: 2.7, Model: Lamp },
  log: { h: 0.4, Model: Log },
  dock: { h: 0.6, Model: Dock },
  tent: { h: 2.0, Model: Tent },
  campfire: { h: 0.9, Model: Campfire },
  grill: { h: 1.1, Model: Grill },
  lantern: { h: 1.6, Model: Lantern },
  altar: { h: 1.4, Model: Altar },
  candles: { h: 1.1, Model: Candles },
  board: { h: 1.6, Model: Board },
  bookshelf: { h: 2.2, Model: Bookshelf },
  table: { h: 0.9, Model: Table, seats: true },
  desk: { h: 1.25, Model: Desk, seats: true },
  diningTable: { h: 1.0, Model: DiningTable, seats: true },
  counter: { h: 1.5, Model: Counter },
  menuboard: { h: 1.5, Model: Menuboard },
  treadmill: { h: 1.3, Model: Treadmill },
  rack: { h: 1.0, Model: Rack },
  mat: { h: 0.2, Model: Mat },
  ladder: { h: 1.2, Model: Ladder },
  lounger: { h: 0.8, Model: Lounger },
  parasol: { h: 2.4, Model: Parasol },
  ring: { h: 0.3, Model: Ring },
  net: { h: 1.1, Model: Net, yaw: 0 },
  balls: { h: 0.5, Model: Balls },
  clothesRack: { h: 1.7, Model: ClothesRack },
  fittingRoom: { h: 2.5, Model: FittingRoom },
  mirror: { h: 2.0, Model: Mirror },
  sofa: { h: 1.0, Model: Sofa },
  armchair: { h: 1.0, Model: Armchair },
  floorLamp: { h: 2.0, Model: FloorLamp },
  pastryCase: { h: 1.4, Model: PastryCase },
  frame: { h: 2.5, Model: Frame },
  bike: { h: 1.3, Model: Bike },
  weightBench: { h: 1.2, Model: WeightBench },
  gymBalls: { h: 0.9, Model: GymBalls },
  cooler: { h: 1.5, Model: Cooler },
  globe: { h: 1.4, Model: Globe },
  bookCart: { h: 1.1, Model: BookCart },
  dressForm: { h: 1.9, Model: DressForm },
  displayTable: { h: 1.1, Model: DisplayTable },
  pillar: { h: 3.3, Model: Pillar },
  bouquet: { h: 1.3, Model: Bouquet },
  shop: { h: 4.6, Model: Shop },
  house: { h: 4.9, Model: House },
  station: { h: 3.2, Model: Station, yaw: 0 },
  railway: { h: 2, Model: Railway, yaw: 0 },
  crossing: { h: 2.6, Model: Crossing, yaw: 0 },
  pole: { h: 5.2, Model: Pole, yaw: 0 },
  vending: { h: 1.9, Model: Vending },
  mailbox: { h: 1.2, Model: Mailbox },
  busStop: { h: 2.5, Model: BusStop },
  planterTree: { h: 3.0, Model: PlanterTree },
  flowerbed: { h: 0.6, Model: Flowerbed },
  hedge: { h: 0.8, Model: Hedge },
  bicycle: { h: 1.0, Model: Bicycle },
  kiosk: { h: 2.5, Model: Kiosk },
  fence: { h: 1.0, Model: Fence },
  campChair: { h: 0.9, Model: CampChair },
  picnicTable: { h: 1.0, Model: PicnicTable },
  woodpile: { h: 0.9, Model: Woodpile },
  canoe: { h: 0.5, Model: Canoe },
  reeds: { h: 1.1, Model: Reeds },
  signpost: { h: 1.7, Model: Signpost },
  stump: { h: 0.4, Model: Stump },
  mushrooms: { h: 0.3, Model: Mushrooms },
  flowers: { h: 0.4, Model: Flowers },
  iceBox: { h: 0.5, Model: IceBox },
};
