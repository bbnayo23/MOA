import type { FC } from 'react';
import { shade } from '../art/pix';
import { glow, leafy, toon } from './toon';

/**
 * Smaller things that fill a space between its big pieces: by the campfire, round the
 * court and the pool, in the gym and the church. Same local space as models.tsx:
 * standing on y = 0, front facing +z.
 */

type V3 = [number, number, number];
const Box = ({ s, p, c, r }: { s: V3; p?: V3; c: string; r?: V3 }) => (
  <mesh material={toon(c)} position={p} rotation={r}>
    <boxGeometry args={s} />
  </mesh>
);
const Cyl = ({ r, h, p, c, top, seg = 10, rot }: { r: number; h: number; p?: V3; c: string; top?: number; seg?: number; rot?: V3 }) => (
  <mesh material={toon(c)} position={p} rotation={rot}>
    <cylinderGeometry args={[top ?? r, r, h, seg]} />
  </mesh>
);
const Ball = ({ r, p, c, s }: { r: number; p?: V3; c: string; s?: V3 }) => (
  <mesh material={c === LEAF || c === LEAF_DARK ? leafy(c) : toon(c)} position={p} scale={s}>
    <sphereGeometry args={[r, 10, 8]} />
  </mesh>
);

const LEAF = '#8fd06e';
const LEAF_DARK = '#6cb85a';
const WOOD = '#c58f63';
const WOOD_DARK = '#a8734d';
const BARK = '#9a6a4c';
const IRON = '#5f5870';

/** A folding camp chair: a sagging fabric seat and back on crossed legs. */
export const CampChair: FC<{ color?: string }> = ({ color = '#7fb7e8' }) => (
  <group>
    {[-0.24, 0.24].map((x) => (
      <group key={x}>
        <Cyl r={0.025} h={0.56} p={[x, 0.25, 0]} rot={[0.6, 0, 0]} c={IRON} seg={6} />
        <Cyl r={0.025} h={0.56} p={[x, 0.25, 0]} rot={[-0.6, 0, 0]} c={IRON} seg={6} />
        <Box s={[0.05, 0.04, 0.42]} p={[x * 1.08, 0.58, 0.02]} c={IRON} />
      </group>
    ))}
    <Box s={[0.5, 0.06, 0.4]} p={[0, 0.42, 0.02]} c={color} r={[-0.12, 0, 0]} />
    <Box s={[0.5, 0.46, 0.05]} p={[0, 0.66, -0.2]} c={shade(color, -0.08)} r={[-0.2, 0, 0]} />
    <Cyl r={0.05} h={0.08} p={[0.3, 0.58, 0.16]} c={shade(color, -0.25)} seg={8} />
  </group>
);

/** A wooden picnic table with its two benches, a checked cloth and a basket. */
export const PicnicTable: FC<{ color?: string }> = ({ color = '#ff8f8f' }) => (
  <group>
    <Box s={[1.7, 0.07, 0.78]} p={[0, 0.74, 0]} c={WOOD} />
    <Box s={[0.7, 0.012, 0.8]} p={[0.2, 0.78, 0]} c={color} />
    <Box s={[0.7, 0.014, 0.12]} p={[0.2, 0.785, 0]} c="#fff8ee" />
    {[-0.62, 0.62].map((z) => (
      <Box key={z} s={[1.7, 0.06, 0.28]} p={[0, 0.42, z]} c={WOOD} />
    ))}
    {[-0.62, 0.62].map((x) => (
      <group key={x}>
        <Box s={[0.07, 0.78, 0.07]} p={[x, 0.37, 0.2]} c={WOOD_DARK} r={[0.5, 0, 0]} />
        <Box s={[0.07, 0.78, 0.07]} p={[x, 0.37, -0.2]} c={WOOD_DARK} r={[-0.5, 0, 0]} />
        <Box s={[0.07, 0.06, 1.5]} p={[x, 0.36, 0]} c={WOOD_DARK} />
      </group>
    ))}
    {/* the basket, its handle, a bottle */}
    <Box s={[0.34, 0.2, 0.24]} p={[-0.35, 0.88, 0]} c="#d9a868" />
    <mesh material={toon('#b8834a')} position={[-0.35, 0.98, 0]}>
      <torusGeometry args={[0.13, 0.018, 6, 12, Math.PI]} />
    </mesh>
    <Cyl r={0.05} h={0.26} p={[0.45, 0.91, 0.1]} c="#9fe3c4" seg={8} />
  </group>
);

/** Split logs stacked three, two, one — an axe stuck in a chopping block beside them. */
export const Woodpile: FC = () => (
  <group>
    {[
      [-0.36, 0], [0, 0], [0.36, 0],
      [-0.18, 1], [0.18, 1],
      [0, 2],
    ].map(([x, row], i) => (
      <group key={i} position={[x - 0.15, 0.16 + row * 0.29, 0]}>
        <Cyl r={0.16} h={0.9} rot={[Math.PI / 2, 0, 0]} c={i % 2 ? WOOD : WOOD_DARK} />
        <Cyl r={0.12} h={0.91} rot={[Math.PI / 2, 0, 0]} c="#ecc9a0" />
      </group>
    ))}
    <Cyl r={0.22} h={0.34} p={[0.65, 0.17, 0.25]} c={BARK} />
    <Cyl r={0.19} h={0.01} p={[0.65, 0.345, 0.25]} c="#ecc9a0" />
    <Cyl r={0.022} h={0.5} p={[0.62, 0.55, 0.25]} rot={[0, 0, 0.5]} c={WOOD} seg={6} />
    <Box s={[0.16, 0.12, 0.03]} p={[0.72, 0.38, 0.25]} c="#c9cbd6" r={[0, 0, 0.5]} />
  </group>
);

/** A canoe pulled up on the bank, a paddle across it. */
export const Canoe: FC<{ color?: string }> = ({ color = '#ff9a7a' }) => (
  <group rotation={[0, 0.5, 0]}>
    <mesh material={toon(color)} position={[0, 0.3, 0]} scale={[0.42, 0.3, 1.25]}>
      <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
    </mesh>
    <mesh material={toon(shade(color, -0.35))} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.36, 1.15, 1]}>
      <circleGeometry args={[1, 16]} />
    </mesh>
    {[-0.4, 0.4].map((z) => (
      <Box key={z} s={[0.72, 0.04, 0.14]} p={[0, 0.27, z]} c={WOOD} />
    ))}
    <group position={[0.1, 0.36, 0.1]} rotation={[0, 0.9, 0]}>
      <Cyl r={0.025} h={1.3} rot={[Math.PI / 2, 0, 0]} c={WOOD} seg={6} />
      <Box s={[0.16, 0.03, 0.4]} p={[0, 0, 0.75]} c={WOOD_DARK} />
    </group>
  </group>
);

/** Reeds and cattails at the water's edge. */
export const Reeds: FC = () => (
  <group>
    {[
      [0, 0, 1.1], [0.2, 0.1, 0.85], [-0.18, 0.08, 0.95], [0.08, -0.18, 0.75], [-0.1, 0.24, 0.7], [0.3, -0.1, 0.6], [-0.3, -0.12, 0.65],
    ].map(([x, z, h], i) => (
      <group key={i} position={[x, 0, z]} rotation={[(i % 3) * 0.06 - 0.06, 0, (i % 2 ? 1 : -1) * 0.08]}>
        <mesh material={leafy(i % 2 ? LEAF_DARK : LEAF)} position={[0, h / 2, 0]}>
          <coneGeometry args={[0.05, h, 5]} />
        </mesh>
        {i % 2 === 0 && <Cyl r={0.045} h={0.2} p={[0, h * 0.82, 0]} c="#8a5a3c" seg={6} />}
      </group>
    ))}
  </group>
);

/** A signpost with arrows pointing every which way. */
export const Signpost: FC<{ color?: string }> = ({ color = '#ffd38a' }) => (
  <group>
    <Cyl r={0.05} h={1.6} p={[0, 0.8, 0]} c={WOOD_DARK} seg={8} />
    {[
      [1.32, 0.35, color],
      [1.08, -0.5, '#b5e8c9'],
      [0.84, 0.9, '#ffb3c6'],
    ].map(([y, yaw, c], i) => (
      <group key={i} position={[0, y as number, 0]} rotation={[0, yaw as number, 0]}>
        <Box s={[0.62, 0.17, 0.05]} p={[0.28, 0, 0.06]} c={c as string} />
        <mesh material={toon(c as string)} position={[0.64, 0, 0.06]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0, 0.12, 0.14, 3]} />
        </mesh>
      </group>
    ))}
    <mesh material={toon(IRON)} position={[0, 1.66, 0]}>
      <coneGeometry args={[0.08, 0.12, 6]} />
    </mesh>
  </group>
);

/** A tree stump, with a little shelf fungus. */
export const Stump: FC = () => (
  <group>
    <Cyl r={0.26} top={0.22} h={0.36} p={[0, 0.18, 0]} c={BARK} />
    <Cyl r={0.21} h={0.01} p={[0, 0.365, 0]} c="#ecc9a0" />
    <Cyl r={0.12} h={0.012} p={[0, 0.37, 0]} c="#d9ae80" />
    {[0, 1.9, 3.8].map((a) => (
      <Cyl key={a} r={0.07} top={0.04} h={0.12} p={[Math.cos(a) * 0.27, 0.05, Math.sin(a) * 0.27]} rot={[0, 0, Math.cos(a) * 0.9]} c={BARK} />
    ))}
    <Ball r={0.09} p={[0.2, 0.22, 0.14]} c="#ffd38a" s={[1, 0.35, 1]} />
  </group>
);

/** Three toadstools: red caps with white spots. */
export const Mushrooms: FC<{ color?: string }> = ({ color = '#ff6f6f' }) => (
  <group scale={1.8}>
    {[
      [0, 0, 1],
      [0.2, 0.12, 0.7],
      [-0.16, 0.14, 0.55],
    ].map(([x, z, k], i) => (
      <group key={i} position={[x, 0, z]} scale={k}>
        <Cyl r={0.06} top={0.05} h={0.22} p={[0, 0.11, 0]} c="#fff8ee" seg={8} />
        <mesh material={toon(color)} position={[0, 0.2, 0]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {[0.6, 2.6, 4.4].map((a) => (
          <Ball key={a} r={0.025} p={[Math.cos(a) * 0.09, 0.28, Math.sin(a) * 0.09]} c="#ffffff" />
        ))}
      </group>
    ))}
  </group>
);

/** A clump of wildflowers. */
export const Flowers: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group>
    {[0.4, 1.9, 3.3, 4.8].map((a) => (
      <Ball key={a} r={0.16} p={[Math.cos(a) * 0.2, 0.06, Math.sin(a) * 0.2]} c={LEAF} s={[1.4, 0.55, 0.9]} />
    ))}
    {Array.from({ length: 10 }, (_, i) => {
      const a = i * 2.4, d = i ? 0.14 + (i % 3) * 0.1 : 0, h = 0.3 + ((i * 7) % 5) * 0.05;
      return (
        <group key={i} position={[Math.cos(a) * d, 0, Math.sin(a) * d]}>
          <Cyl r={0.018} h={h} p={[0, h / 2, 0]} c={LEAF_DARK} seg={4} />
          <Ball r={0.085} p={[0, h, 0]} c={i % 4 === 3 ? '#fff1a8' : i % 4 === 1 ? '#ffffff' : color} />
        </group>
      );
    })}
  </group>
);

/** A camping ice box: coloured body, white lid, a handle. */
export const IceBox: FC<{ color?: string }> = ({ color = '#ff8f8f' }) => (
  <group>
    <Box s={[0.62, 0.36, 0.4]} p={[0, 0.18, 0]} c={color} />
    <Box s={[0.66, 0.08, 0.44]} p={[0, 0.4, 0]} c="#fff8ee" />
    <Box s={[0.36, 0.04, 0.05]} p={[0, 0.47, 0]} c={IRON} />
    <Box s={[0.14, 0.08, 0.02]} p={[0, 0.26, 0.205]} c="#fff8ee" />
  </group>
);

// ── courts and pools ─────────────────────────────────────────

/** A tall chair to watch from: the umpire's by the net, the lifeguard's by the pool (its colour). */
export const HighChair: FC<{ color?: string }> = ({ color = '#5fae7e' }) => (
  <group>
    {[-0.3, 0.3].map((x) =>
      [-0.25, 0.25].map((z) => <Box key={`${x}${z}`} s={[0.07, 1.5, 0.07]} p={[x * (1 - z * 0.3), 0.75, z]} c="#fffaf2" r={[z * 0.12, 0, -x * 0.12]} />),
    )}
    {[0.45, 0.9].map((y) => (
      <Box key={y} s={[0.6, 0.05, 0.08]} p={[0, y, 0.24]} c="#fffaf2" />
    ))}
    <Box s={[0.66, 0.08, 0.56]} p={[0, 1.52, 0]} c={color} />
    <Box s={[0.66, 0.5, 0.07]} p={[0, 1.8, -0.26]} c={color} />
    {[-0.31, 0.31].map((x) => (
      <Box key={x} s={[0.05, 0.05, 0.5]} p={[x, 1.75, 0]} c="#fffaf2" />
    ))}
    <Cyl r={0.02} h={0.8} p={[0.28, 2.2, -0.2]} c={IRON} seg={6} />
    <mesh material={toon(shade(color, 0.25))} position={[0.28, 2.62, -0.2]}>
      <coneGeometry args={[0.45, 0.22, 8]} />
    </mesh>
  </group>
);

/** A score board on two legs: a title strip and two rows of numbers. */
export const Scoreboard: FC = () => (
  <group>
    {[-0.75, 0.75].map((x) => (
      <Cyl key={x} r={0.05} h={1.9} p={[x, 0.95, -0.05]} c={IRON} seg={8} />
    ))}
    <Box s={[1.8, 1.0, 0.1]} p={[0, 1.55, 0]} c="#2f5a49" />
    <Box s={[1.8, 0.2, 0.12]} p={[0, 2.12, 0]} c="#f2a37e" />
    {[1.72, 1.36].map((y, row) =>
      [-0.55, -0.15, 0.3, 0.6].map((x, i) => <Box key={`${row}${i}`} s={[i < 2 ? 0.3 : 0.2, 0.22, 0.02]} p={[x, y, 0.06]} c={i < 2 ? '#fffaf2' : '#ffd166'} />),
    )}
  </group>
);

/** One tile of a court's green windscreen: posts and a top rail. */
export const Windscreen: FC = () => (
  <group>
    <Box s={[2.4, 1.25, 0.04]} p={[0, 0.72, 0]} c="#3f7a5c" />
    <Box s={[2.4, 0.05, 0.06]} p={[0, 1.36, 0]} c={IRON} />
    {[-1.2, 1.2].map((x) => (
      <Cyl key={x} r={0.04} h={1.4} p={[x, 0.7, 0]} c={IRON} seg={6} />
    ))}
    <Box s={[0.9, 0.22, 0.02]} p={[0, 0.95, 0.03]} c="#fffaf2" />
  </group>
);

/** A ball machine: a box on wheels, a hopper full of balls. */
export const BallMachine: FC = () => (
  <group>
    <Box s={[0.6, 0.42, 0.5]} p={[0, 0.33, 0]} c="#5b9de0" />
    {[-0.32, 0.32].map((x) => (
      <Cyl key={x} r={0.12} h={0.06} p={[x, 0.12, -0.12]} rot={[0, 0, Math.PI / 2]} c={IRON} />
    ))}
    <Cyl r={0.34} top={0.42} h={0.32} p={[0, 0.7, 0]} c="#e7edf5" seg={12} />
    {Array.from({ length: 7 }, (_, i) => (
      <Ball key={i} r={0.08} p={[Math.cos(i * 2.4) * (i ? 0.2 : 0), 0.88, Math.sin(i * 2.4) * (i ? 0.2 : 0)]} c="#e5f27a" />
    ))}
    <Cyl r={0.07} h={0.3} p={[0, 0.4, 0.32]} rot={[Math.PI / 2, 0, 0]} c={IRON} seg={8} />
  </group>
);

/** A palm tree: a leaning, ringed trunk and drooping fronds, coconuts under them. */
export const Palm: FC = () => (
  <group>
    {Array.from({ length: 6 }, (_, i) => (
      <Cyl key={i} r={0.17 - i * 0.012} top={0.15 - i * 0.012} h={0.48} p={[i * i * 0.012, 0.24 + i * 0.46, 0]} rot={[0, 0, -0.06 - i * 0.02]} c={i % 2 ? '#c7a07a' : '#b48a62'} />
    ))}
    <group position={[0.42, 2.85, 0]}>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
          <mesh material={leafy(i % 2 ? LEAF_DARK : LEAF)} position={[0.62, -0.18, 0]} rotation={[0, 0, -0.45]} scale={[1, 0.12, 0.32]}>
            <sphereGeometry args={[0.72, 10, 6]} />
          </mesh>
        </group>
      ))}
      {[0, 2.1, 4.2].map((a) => (
        <Ball key={a} r={0.1} p={[Math.cos(a) * 0.14, -0.14, Math.sin(a) * 0.14]} c="#8a5a3c" />
      ))}
    </group>
  </group>
);

/** A beach towel laid out flat: stripes across. */
export const Towel: FC<{ color?: string }> = ({ color = '#ffb3c6' }) => (
  <group>
    <Box s={[0.7, 0.02, 1.25]} p={[0, 0.012, 0]} c={color} />
    {[-0.4, 0, 0.4].map((z) => (
      <Box key={z} s={[0.7, 0.022, 0.12]} p={[0, 0.014, z]} c="#fffaf2" />
    ))}
  </group>
);

/** A beach ball: six coloured panels. */
export const BeachBall: FC = () => (
  <group position={[0, 0.24, 0]} rotation={[0.4, 0.3, 0.2]}>
    {['#ff8f8f', '#fffaf2', '#ffd166', '#fffaf2', '#7fb7e8', '#fffaf2'].map((c, i) => (
      <mesh key={i} material={toon(c)}>
        <sphereGeometry args={[0.24, 4, 10, (i / 6) * Math.PI * 2, Math.PI / 3]} />
      </mesh>
    ))}
  </group>
);

/** A rubber duck bobbing on the water. */
export const RubberDuck: FC = () => (
  <group position={[0, 0.02, 0]}>
    <Ball r={0.26} p={[0, 0.12, 0]} c="#ffd84d" s={[1.25, 0.8, 1]} />
    <Ball r={0.15} p={[0.2, 0.36, 0]} c="#ffd84d" />
    <Ball r={0.07} p={[0.36, 0.33, 0]} c="#ff9a4a" s={[1.4, 0.6, 1]} />
    {[-0.07, 0.07].map((z) => (
      <Ball key={z} r={0.025} p={[0.31, 0.41, z]} c="#3b3150" />
    ))}
  </group>
);

/** An outdoor shower: a bent pipe, a big head, a tap, a drain plate. */
export const Shower: FC = () => (
  <group>
    <Box s={[0.6, 0.03, 0.6]} p={[0, 0.015, 0]} c="#c9d6e2" />
    <Cyl r={0.04} h={2.1} p={[0, 1.05, -0.2]} c="#d7dbe2" seg={8} />
    <Cyl r={0.035} h={0.32} p={[0, 2.08, -0.05]} rot={[Math.PI / 2, 0, 0]} c="#d7dbe2" seg={8} />
    <Cyl r={0.15} top={0.06} h={0.1} p={[0, 2.0, 0.1]} c="#d7dbe2" seg={12} />
    <Box s={[0.12, 0.05, 0.08]} p={[0, 1.1, -0.14]} c="#ff8f8f" />
  </group>
);

// ── gym ──────────────────────────────────────────────────────

/** A punching bag hanging from its stand. */
export const PunchBag: FC<{ color?: string }> = ({ color = '#ff7a7a' }) => (
  <group>
    <Box s={[0.7, 0.06, 0.7]} p={[0, 0.03, 0]} c={IRON} />
    <Box s={[0.08, 2.3, 0.08]} p={[0, 1.15, -0.3]} c={IRON} />
    <Box s={[0.08, 0.08, 0.5]} p={[0, 2.28, -0.08]} c={IRON} />
    <Cyl r={0.01} h={0.3} p={[0, 2.1, 0.12]} c={IRON} seg={4} />
    <mesh material={toon(color)} position={[0, 1.35, 0.12]}>
      <capsuleGeometry args={[0.22, 0.75, 4, 12]} />
    </mesh>
    <Cyl r={0.225} h={0.08} p={[0, 1.55, 0.12]} c={shade(color, -0.3)} seg={12} />
  </group>
);

/** Kettlebells in a row on a little rubber mat. */
export const Kettlebells: FC = () => (
  <group>
    <Box s={[1.5, 0.03, 0.45]} p={[0, 0.015, 0]} c="#4a4458" />
    {['#ffb3c6', '#a9cdfc', '#ffd38a', '#b5e8c9'].map((c, i) => {
      const k = 0.8 + i * 0.12;
      return (
        <group key={c} position={[-0.5 + i * 0.34, 0, 0]} scale={k}>
          <Ball r={0.15} p={[0, 0.15, 0]} c={c} s={[1, 0.9, 1]} />
          <mesh material={toon(IRON)} position={[0, 0.3, 0]}>
            <torusGeometry args={[0.09, 0.025, 6, 12, Math.PI]} />
          </mesh>
        </group>
      );
    })}
  </group>
);

/** A row of three lockers: vents, handles, a bench in front. */
export const Lockers: FC<{ color?: string }> = ({ color = '#a9cdfc' }) => (
  <group>
    {[-0.55, 0, 0.55].map((x, i) => (
      <group key={x} position={[x, 0, 0]}>
        <Box s={[0.52, 1.9, 0.5]} p={[0, 0.95, 0]} c={i === 1 ? shade(color, -0.08) : color} />
        {[1.6, 1.68, 1.76].map((y) => (
          <Box key={y} s={[0.3, 0.025, 0.02]} p={[0, y, 0.255]} c={shade(color, -0.3)} />
        ))}
        <Box s={[0.04, 0.16, 0.03]} p={[0.18, 1.05, 0.26]} c="#fffaf2" />
        <Box s={[0.2, 0.12, 0.02]} p={[0, 1.4, 0.255]} c="#fffaf2" />
      </group>
    ))}
    <Box s={[1.5, 0.06, 0.32]} p={[0, 0.42, 0.55]} c="#c58f63" />
    {[-0.6, 0.6].map((x) => (
      <Box key={x} s={[0.06, 0.4, 0.26]} p={[x, 0.2, 0.55]} c={IRON} />
    ))}
  </group>
);

/** Stacked plyo boxes: big, middle, small. */
export const PlyoBoxes: FC = () => (
  <group>
    <Box s={[0.75, 0.6, 0.6]} p={[0, 0.3, 0]} c="#ffb3c6" />
    <Box s={[0.6, 0.45, 0.5]} p={[0.05, 0.825, -0.02]} c="#a9cdfc" />
    <Box s={[0.45, 0.3, 0.4]} p={[0.55, 0.15, 0.3]} c="#ffd38a" />
    {[0.3, 0.825].map((y) => (
      <Box key={y} s={[0.25, 0.06, 0.02]} p={[0, y, y < 0.5 ? 0.305 : 0.235]} c="#fffaf2" />
    ))}
  </group>
);

/** A squat rack: four posts, a barbell on the hooks, plates on it and on a peg. */
export const PowerRack: FC = () => (
  <group>
    {[-0.6, 0.6].map((x) =>
      [-0.4, 0.4].map((z) => <Box key={`${x}${z}`} s={[0.08, 2.1, 0.08]} p={[x, 1.05, z]} c={IRON} />),
    )}
    {[-0.4, 0.4].map((z) => (
      <Box key={z} s={[1.28, 0.08, 0.08]} p={[0, 2.08, z]} c={IRON} />
    ))}
    <Box s={[1.4, 0.04, 0.9]} p={[0, 0.02, 0]} c="#4a4458" />
    <Cyl r={0.025} h={2.0} p={[0, 1.3, 0.4]} rot={[0, 0, Math.PI / 2]} c="#c9cbd6" seg={6} />
    {[-0.82, 0.82].map((x) => (
      <Cyl key={x} r={0.24} h={0.08} p={[x, 1.3, 0.4]} rot={[0, 0, Math.PI / 2]} c={x < 0 ? '#ff7a7a' : '#ff7a7a'} seg={14} />
    ))}
    {[0.1, 0.2].map((y, i) => (
      <Cyl key={y} r={0.22 - i * 0.05} h={0.07} p={[0.95, y + 0.15, -0.3]} rot={[0, 0, Math.PI / 2]} c={i ? '#7fb7e8' : '#ffd166'} seg={14} />
    ))}
  </group>
);

// ── church ───────────────────────────────────────────────────

/** An upright piano with its stool and a hymn book open on the stand. */
export const Piano: FC<{ color?: string }> = ({ color = '#6b4a3c' }) => (
  <group>
    <Box s={[1.5, 1.25, 0.55]} p={[0, 0.625, -0.1]} c={color} />
    <Box s={[1.5, 0.1, 0.36]} p={[0, 0.78, 0.33]} c={color} />
    <Box s={[1.36, 0.04, 0.2]} p={[0, 0.84, 0.36]} c="#fffaf2" />
    {Array.from({ length: 9 }, (_, i) => (
      <Box key={i} s={[0.05, 0.03, 0.11]} p={[-0.56 + i * 0.14, 0.87, 0.31]} c="#3b3150" />
    ))}
    <Box s={[0.5, 0.32, 0.04]} p={[0, 1.08, 0.2]} c="#fffaf2" r={[-0.25, 0, 0]} />
    {[-0.62, 0.62].map((x) => (
      <Box key={x} s={[0.08, 0.7, 0.08]} p={[x, 0.35, 0.42]} c={shade(color, -0.2)} />
    ))}
    <Box s={[0.6, 0.08, 0.34]} p={[0, 0.48, 0.85]} c={shade(color, -0.1)} />
    {[-0.24, 0.24].map((x) => (
      <Box key={x} s={[0.06, 0.44, 0.26]} p={[x, 0.22, 0.85]} c={shade(color, -0.2)} />
    ))}
  </group>
);

/** A reading stand: a slanted top with an open book, on a column. */
export const Lectern: FC = () => (
  <group>
    <Box s={[0.6, 0.06, 0.5]} p={[0, 0.03, 0]} c="#a8734d" />
    <Box s={[0.3, 1.0, 0.3]} p={[0, 0.55, 0]} c="#c58f63" />
    <Box s={[0.66, 0.06, 0.5]} p={[0, 1.1, 0.04]} c="#a8734d" r={[0.4, 0, 0]} />
    <Box s={[0.48, 0.03, 0.34]} p={[0, 1.15, 0.06]} c="#fffaf2" r={[0.4, 0, 0]} />
    <Box s={[0.02, 0.035, 0.34]} p={[0, 1.16, 0.06]} c="#e98aa2" r={[0.4, 0, 0]} />
  </group>
);

/** A tall brass candle stand with three candles burning. */
export const Candelabra: FC = () => (
  <group>
    <Cyl r={0.22} top={0.12} h={0.12} p={[0, 0.06, 0]} c="#e2c47d" seg={12} />
    <Cyl r={0.035} h={1.3} p={[0, 0.75, 0]} c="#e2c47d" seg={8} />
    <Box s={[0.7, 0.05, 0.05]} p={[0, 1.38, 0]} c="#e2c47d" />
    {[-0.32, 0, 0.32].map((x) => (
      <group key={x} position={[x, x ? 1.4 : 1.5, 0]}>
        <Cyl r={0.06} h={0.05} c="#e2c47d" seg={8} />
        <Cyl r={0.035} h={0.2} p={[0, 0.12, 0]} c="#fff4e6" seg={8} />
        <mesh material={glow('#ffc870')} position={[0, 0.28, 0]}>
          <coneGeometry args={[0.04, 0.12, 6]} />
        </mesh>
      </group>
    ))}
  </group>
);
