import type { FC } from 'react';
import { shade } from '../art/pix';
import { leafy, toon } from './toon';

/**
 * Small outdoor things that fill a space between its big pieces: camp chairs, a picnic
 * table, firewood, a canoe, reeds by the water, a signpost, stumps, mushrooms, flowers,
 * an ice box. Same local space as models.tsx: standing on y = 0, front facing +z.
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
