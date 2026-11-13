import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type FC } from 'react';
import type * as THREE from 'three';
import type { ArtKind } from './kinds';
import { glow, toon } from './toon';

/**
 * 3D model per object kind. Local space: standing on y = 0, front facing +z
 * (the world turns every model to face the camera).
 *
 * Two grades of art, kept apart on purpose:
 * - `temp: true` — a rounded block standing in for a kind with no model yet;
 * - the rest — procedural stylised models (primitives, toon-shaded). They are
 *   the current art, to be replaced by GLB models in the same local space.
 */
export interface ModelDef {
  /** Height (world units) — where its label floats. */
  h: number;
  Model: FC<{ color?: string }>;
  temp?: true;
}

const WOOD = '#c58f63';
const WOOD_DARK = '#a8734d';
const LEAF = '#9edbb8';
const LEAF_DARK = '#7cc3a0';
const STONE = '#d6d0e2';
const CREAM = '#fff8ee';

const Building: FC<{ color?: string }> = ({ color = '#ff8fab' }) => (
  <group>
    {/* walls */}
    <RoundedBox args={[2.4, 1.8, 2]} radius={0.08} position={[0, 0.9, 0]} material={toon(CREAM)} />
    {/* gable roof: a flattened triangular prism, eaves overhanging */}
    <mesh material={toon(color)} position={[0, 2.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 1]}>
      <cylinderGeometry args={[1.45, 1.45, 2.7, 3]} />
    </mesh>
    {/* door, knob and step */}
    <mesh material={toon('#7a5560')} position={[0, 0.5, 1.01]}>
      <boxGeometry args={[0.58, 1, 0.06]} />
    </mesh>
    <mesh material={toon('#ffd166')} position={[0.18, 0.5, 1.06]}>
      <sphereGeometry args={[0.04, 8, 6]} />
    </mesh>
    <mesh material={toon(STONE)} position={[0, 0.04, 1.2]}>
      <boxGeometry args={[0.9, 0.08, 0.4]} />
    </mesh>
    {/* windows with awnings in the theme colour */}
    {[-0.75, 0.75].map((x) => (
      <group key={x} position={[x, 1.15, 1.01]}>
        <mesh material={toon('#ffffff')}>
          <boxGeometry args={[0.52, 0.52, 0.05]} />
        </mesh>
        <mesh material={glow('#cfe8ff')} position={[0, 0, 0.03]}>
          <planeGeometry args={[0.4, 0.4]} />
        </mesh>
        <mesh material={toon(color)} position={[0, 0.36, 0.1]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.6, 0.05, 0.28]} />
        </mesh>
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
      <mesh material={toon(STONE)} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.15, 1.25, 0.4, 32]} />
      </mesh>
      <mesh material={glow('#a6dcf7')} position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 32]} />
      </mesh>
      <mesh material={toon(STONE)} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.8, 16]} />
      </mesh>
      <mesh material={toon(STONE)} position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.5, 0.3, 0.16, 24]} />
      </mesh>
      <mesh material={glow('#c8ecff')} position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
      </mesh>
      <group ref={drops}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} material={glow('#d8f2ff')}>
            <sphereGeometry args={[0.05, 8, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Bench: FC = () => (
  <group>
    <RoundedBox args={[2.1, 0.09, 0.48]} radius={0.03} position={[0, 0.42, 0]} material={toon(WOOD)} />
    <RoundedBox args={[2.1, 0.36, 0.07]} radius={0.03} position={[0, 0.72, -0.22]} rotation={[-0.12, 0, 0]} material={toon(WOOD)} />
    {[-0.85, 0.85].map((x) =>
      [-0.16, 0.16].map((z) => (
        <mesh key={`${x}${z}`} material={toon(WOOD_DARK)} position={[x, 0.2, z]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
        </mesh>
      )),
    )}
  </group>
);

const Bush: FC = () => (
  <group>
    {[[0, 0.32, 0, 0.42], [0.36, 0.25, 0.08, 0.32], [-0.34, 0.24, 0.05, 0.3], [0.05, 0.28, -0.25, 0.32]].map(([x, y, z, r], i) => (
      <mesh key={i} material={toon(i % 2 ? LEAF_DARK : LEAF)} position={[x, y, z]}>
        <sphereGeometry args={[r, 16, 12]} />
      </mesh>
    ))}
    {[[0.18, 0.62, 0.22], [-0.25, 0.48, 0.24], [0.42, 0.42, 0.25]].map(([x, y, z], i) => (
      <mesh key={i} material={toon(['#ffb3c6', '#fff1a8', '#ffffff'][i])} position={[x, y, z]}>
        <sphereGeometry args={[0.05, 8, 6]} />
      </mesh>
    ))}
  </group>
);

const Plant: FC = () => (
  <group>
    <mesh material={toon('#e8a27c')} position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.26, 0.2, 0.44, 16]} />
    </mesh>
    <mesh material={toon('#d48c66')} position={[0, 0.45, 0]}>
      <cylinderGeometry args={[0.29, 0.29, 0.07, 16]} />
    </mesh>
    {[[0, 0.78, 0, 0.3], [0.18, 0.66, 0.08, 0.22], [-0.17, 0.68, -0.05, 0.22], [0.02, 1.0, 0.03, 0.2]].map(([x, y, z, r], i) => (
      <mesh key={i} material={toon(i % 2 ? LEAF_DARK : LEAF)} position={[x, y, z]}>
        <sphereGeometry args={[r, 14, 10]} />
      </mesh>
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
    <mesh material={toon('#a0705a')} position={[0, 0.35, 0]}>
      <cylinderGeometry args={[0.13, 0.17, 0.7, 10]} />
    </mesh>
    {[[0.65, 1.05, 0.95], [0.52, 1.6, 0.8], [0.38, 2.1, 0.65]].map(([r, y, h], i) => (
      <mesh key={i} material={toon(i % 2 ? LEAF_DARK : LEAF)} position={[0, y, 0]}>
        <coneGeometry args={[r * 1.35, h, 14]} />
      </mesh>
    ))}
  </group>
);

/** Rounded block standing in for a kind that has no model yet. */
const block = (w: number, h: number, d: number, color: string): FC => () => (
  <RoundedBox args={[w, h, d]} radius={0.08} position={[0, h / 2, 0]} material={toon(color)} />
);

const temp = (w: number, h: number, d: number, color: string): ModelDef => ({ h, Model: block(w, h, d, color), temp: true });

export const MODELS: Record<ArtKind, ModelDef> = {
  building: { h: 3.1, Model: Building },
  fountain: { h: 1.6, Model: Fountain },
  pew: { h: 0.9, Model: Bench },
  bush: { h: 0.8, Model: Bush },
  plant: { h: 1.2, Model: Plant },
  rock: { h: 0.5, Model: Rock },
  pine: { h: 2.5, Model: Pine },
  // ponytail: stand-ins until each theme's furniture is modelled
  log: temp(1.2, 0.35, 0.4, WOOD),
  tent: temp(2.4, 1.6, 2.2, '#ff9a8a'),
  campfire: temp(0.9, 0.4, 0.9, '#ffb347'),
  grill: temp(0.9, 0.9, 0.6, '#5f5870'),
  lantern: temp(0.25, 1.3, 0.25, '#ffe7a0'),
  altar: temp(2.2, 1.1, 1, '#fff4e6'),
  candles: temp(1, 0.8, 0.5, '#fff4e6'),
  board: temp(1.4, 1.5, 0.15, '#c58f63'),
  bookshelf: temp(1.6, 2.2, 0.5, '#b07a52'),
  table: temp(1.8, 0.75, 1, WOOD),
  desk: temp(1.4, 0.75, 0.7, WOOD),
  diningTable: temp(1.5, 0.75, 1, '#ffffff'),
  counter: temp(2.2, 1.05, 0.8, '#f2a7a7'),
  menuboard: temp(0.8, 1.6, 0.2, '#3f5a4c'),
  treadmill: temp(0.9, 1.2, 1.8, '#5f5870'),
  rack: temp(1.6, 1, 0.5, '#5f5870'),
  mat: temp(0.9, 0.05, 1.8, '#c9b6ff'),
  ladder: temp(0.6, 1.2, 0.2, '#d7dbe2'),
  lounger: temp(0.8, 0.4, 1.9, '#ffffff'),
  parasol: temp(0.3, 2.2, 0.3, '#ff9fb2'),
  ring: temp(0.9, 0.2, 0.9, '#ff9fb2'),
  net: temp(4, 1, 0.1, '#ffffff'),
  balls: temp(0.6, 0.3, 0.6, '#e6f27a'),
  clothesRack: temp(1.6, 1.6, 0.5, '#d7dbe2'),
  fittingRoom: temp(1.4, 2.3, 1.2, '#ff9fc0'),
  mirror: temp(0.8, 1.9, 0.15, '#e6c35c'),
};
