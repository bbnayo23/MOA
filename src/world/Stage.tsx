import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Background } from '../data/themes';
import { MODELS } from './models';
import { FACE_CAMERA, T, type Tile } from './space';
import { canvasTexture, castShadows, toon } from './toon';

/**
 * The space itself: light, the floor (with its rugs, paths and court lines
 * painted in), and either a room (walls with windows) or open land around the
 * map with trees and flowers. Tapping the ground reports a tile.
 */
export function Stage({ bg, onTap }: { bg: Background; onTap: (t: Tile) => void }) {
  const S = bg.size * T;
  const indoor = !!bg.walls;
  const tap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onTap({ tx: e.point.x / T, ty: e.point.z / T });
  };
  const floor = useMemo(() => toon('#ffffff', floorTexture(bg), `floor${JSON.stringify(bg)}`), [bg]);

  return (
    <>
      <color attach="background" args={[bg.sky[0]]} />
      <Lights bg={bg} S={S} />
      {indoor ? (
        <Room bg={bg} S={S} floor={floor} onTap={tap} />
      ) : (
        <>
          <mesh material={floor} rotation-x={-Math.PI / 2} position={[S / 2, 0.005, S / 2]} receiveShadow onPointerDown={tap}>
            <planeGeometry args={[S, S]} />
          </mesh>
          <Land bg={bg} S={S} onTap={tap} />
        </>
      )}
      {bg.water && <Water {...bg.water} />}
      {bg.motes !== undefined && <Motes color={bg.motes} S={S} />}
    </>
  );
}

function Lights({ bg, S }: { bg: Background; S: number }) {
  // the sun aims at the middle of the map
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(S / 2, 0, S / 2);
  const tint = new THREE.Color('#ffffff').lerp(new THREE.Color(bg.sky[1] ?? bg.sky[0]), bg.night ? 0.7 : 0.3);
  const half = S * 0.85;
  return (
    <>
      {/* diffuse ≈ colour × (sky + sun) / π, so the two add up to about π for true colours in full light */}
      <hemisphereLight args={[tint, bg.grass ?? bg.ground[0], bg.night ? 1.1 : 1.8]} />
      <primitive object={target} />
      <directionalLight
        target={target}
        color={bg.night ? '#b9c3ff' : '#fff4e2'}
        intensity={bg.night ? 0.7 : 1.5}
        position={[S / 2 - 7, 20, S / 2 + 11]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-far={60}
      />
    </>
  );
}

// ── floor ─────────────────────────────────────────────────────

const PX = 64; // floor texture pixels per tile

function seeded(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** '#rrggbb' → [r, g, b] as written to a canvas (sRGB, unlike THREE.Color's linear values). */
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Checker tiles, or soft patches on grass, then rugs / paths / lines on top. */
function floorTexture(bg: Background) {
  const n = bg.size, W = n * PX;
  return canvasTexture(W, W, (ctx) => {
    const rnd = seeded(7);
    ctx.fillStyle = bg.ground[0];
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = bg.ground[1];
    if (bg.floor !== 'grass') {
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + y) % 2) ctx.fillRect(x * PX, y * PX, PX, PX);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let i = 0; i <= n; i++) {
        ctx.fillRect(i * PX - 1, 0, 2, W);
        ctx.fillRect(0, i * PX - 1, W, 2);
      }
    } else {
      for (let i = 0; i < n * n * 1.5; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * W, rnd() * W, 10 + rnd() * 26, 8 + rnd() * 18, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // rugs: every pixel within width/2 of the from→to segment, with a border band
    const img = ctx.getImageData(0, 0, W, W);
    for (const rug of bg.rugs ?? []) {
      const fill = rgb(rug.color), edge = rgb(rug.border);
      const ax = rug.from.tx, ay = rug.from.ty, dx = rug.to.tx - ax, dy = rug.to.ty - ay, len2 = dx * dx + dy * dy;
      const half = rug.width / 2, band = Math.min(0.1, half * 0.4);
      for (let py = 0; py < W; py++)
        for (let px = 0; px < W; px++) {
          const tx = (px + 0.5) / PX, ty = (py + 0.5) / PX;
          const k = Math.max(0, Math.min(1, ((tx - ax) * dx + (ty - ay) * dy) / len2));
          const d = Math.hypot(tx - ax - dx * k, ty - ay - dy * k);
          if (d > half) continue;
          img.data.set(d > half - band ? edge : fill, (py * W + px) * 4);
        }
    }
    ctx.putImageData(img, 0, 0);
  });
}

// ── indoors ───────────────────────────────────────────────────

const WALL_H = 3.6;

function Room({ bg, S, floor, onTap }: { bg: Background; S: number; floor: THREE.Material; onTap: (e: ThreeEvent<PointerEvent>) => void }) {
  const { left, right, trim, glass } = bg.walls!;
  const sides = [toon(bg.side[1]), toon(bg.side[0]), floor, floor, toon(bg.side[0]), toon(bg.side[1])];
  // an arch in the trim colour as the frame, the stained glass just inside it
  const frame = useMemo(() => arched(archTexture([trim])), [trim]);
  const pane = useMemo(() => arched(archTexture(glass, true)), [glass]);
  const room = useRef<THREE.Group>(null);
  useLayoutEffect(() => castShadows(room.current, true));
  return (
    <group ref={room}>
      {/* the floor slab: textured top, coloured sides */}
      <mesh material={sides} position={[S / 2, -0.25, S / 2]} onPointerDown={onTap}>
        <boxGeometry args={[S, 0.5, S]} />
      </mesh>
      {/* back walls along tx = 0 (left) and ty = 0 (right) */}
      {(
        [
          [left, [-0.15, WALL_H / 2, S / 2], [0.3, WALL_H, S + 0.3], [0.001, 0, 0], Math.PI / 2],
          [right, [S / 2, WALL_H / 2, -0.15], [S + 0.3, WALL_H, 0.3], [0, 0, 0.001], 0],
        ] as const
      ).map(([color, pos, size, out, turn], w) => (
        <group key={w}>
          <mesh material={toon(color)} position={pos}>
            <boxGeometry args={size} />
          </mesh>
          <mesh material={toon(trim)} position={[pos[0], WALL_H, pos[2]]}>
            <boxGeometry args={[size[0] + 0.1, 0.22, size[2] + 0.1]} />
          </mesh>
          <mesh material={toon(trim)} position={[pos[0], 0.1, pos[2]]}>
            <boxGeometry args={[size[0] + 0.04, 0.2, size[2] + 0.04]} />
          </mesh>
          {[1 / 6, 3 / 6, 5 / 6].map((f) => {
            const along = f * S;
            const at: [number, number, number] = w === 0 ? [out[0], 2.0, along] : [along, 2.0, out[2]];
            return (
              <group key={f} position={at} rotation={[0, turn, 0]}>
                <mesh material={frame} position={[0, 0, 0.005]}>
                  <planeGeometry args={[1.36, 2.12]} />
                </mesh>
                <mesh material={pane} position={[0, 0, 0.02]}>
                  <planeGeometry args={[1.2, 1.95]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

/** Unlit, cut out along the arch's edge. */
const arched = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5 });

/** Arched window: a leaded grid of the theme's glass colours (or one solid colour for the frame). */
function archTexture(glass: string[], leaded = false) {
  return canvasTexture(48, 78, (ctx) => {
    const r = 24;
    ctx.beginPath();
    ctx.arc(24, r, r, Math.PI, 0);
    ctx.lineTo(48, 78);
    ctx.lineTo(0, 78);
    ctx.closePath();
    ctx.clip();
    for (let y = 0; y < 78; y += 13)
      for (let x = 0; x < 48; x += 12) {
        ctx.fillStyle = glass[(x / 12 + y / 13) % glass.length];
        ctx.fillRect(x, y, 12, 13);
      }
    if (!leaded) return;
    ctx.strokeStyle = '#6b5a7a';
    ctx.lineWidth = 2;
    for (let x = 12; x < 48; x += 12) ctx.strokeRect(x, 0, 0.01, 78);
    for (let y = 13; y < 78; y += 13) ctx.strokeRect(0, y, 48, 0.01);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(24, r, r - 1, Math.PI, 0);
    ctx.lineTo(47, 77);
    ctx.lineTo(1, 77);
    ctx.closePath();
    ctx.stroke();
  });
}

// ── outdoors ──────────────────────────────────────────────────

/** Open land past the map's edge: grass to the horizon, trees, bushes, flowers. */
function Land({ bg, S, onTap }: { bg: Background; S: number; onTap: (e: ThreeEvent<PointerEvent>) => void }) {
  const props = useMemo(() => {
    const rnd = seeded(11);
    const out: { kind: 'pine' | 'bush' | 'rock'; x: number; z: number; s: number }[] = [];
    while (out.length < 90) {
      const x = -16 + rnd() * (S + 32), z = -16 + rnd() * (S + 32);
      if (x > -1.5 && x < S + 1.5 && z > -1.5 && z < S + 1.5) continue; // keep the map's edge clear
      const r = rnd();
      out.push({ kind: r < 0.6 ? 'pine' : r < 0.9 ? 'bush' : 'rock', x, z, s: 0.8 + rnd() * 0.6 });
    }
    return out;
  }, [S]);
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => castShadows(group.current));
  return (
    <>
      <mesh material={toon(bg.grass ?? bg.ground[0])} rotation-x={-Math.PI / 2} position={[S / 2, 0, S / 2]} receiveShadow onPointerDown={onTap}>
        <planeGeometry args={[160, 160]} />
      </mesh>
      <group ref={group}>
        {props.map(({ kind, x, z, s }, i) => {
          const { Model } = MODELS[kind];
          return (
            <group key={i} position={[x, 0, z]} rotation={[0, FACE_CAMERA, 0]} scale={s}>
              <Model />
            </group>
          );
        })}
      </group>
      {bg.flowers && <Flowers colors={bg.flowers} S={S} rugs={bg.rugs ?? []} onMap={bg.floor === 'grass'} />}
    </>
  );
}

/** Little flowers on the grass (one instanced draw); on the map too when its floor is grass. */
function Flowers({ colors, S, rugs, onMap }: { colors: string[]; S: number; rugs: NonNullable<Background['rugs']>; onMap: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 260;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = seeded(5);
    const m = new THREE.Matrix4();
    const onRug = (x: number, z: number) =>
      rugs.some((r) => {
        const tx = x / T, ty = z / T, ax = r.from.tx, ay = r.from.ty, dx = r.to.tx - ax, dy = r.to.ty - ay;
        const k = Math.max(0, Math.min(1, ((tx - ax) * dx + (ty - ay) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(tx - ax - dx * k, ty - ay - dy * k) < r.width / 2 + 0.1;
      });
    for (let i = 0; i < COUNT; i++) {
      let x = 0, z = 0;
      do {
        x = -10 + rnd() * (S + 20);
        z = -10 + rnd() * (S + 20);
      } while (onRug(x, z) || (!onMap && x > -0.3 && x < S + 0.3 && z > -0.3 && z < S + 0.3));
      m.makeScale(1, 0.6, 1).setPosition(x, 0.06, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors, S, rugs, onMap]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} material={toon('#ffffff', undefined, 'flower')}>
      <sphereGeometry args={[0.08, 8, 6]} />
    </instancedMesh>
  );
}

// ── water ─────────────────────────────────────────────────────

/**
 * A pool's surface: a stadium shape (the rug's footprint, a little inside the coping)
 * with ripples drifting across. Swimmers sink below the floor, so only their heads
 * and shoulders come up through it.
 */
function Water({ from, to, width }: NonNullable<Background['water']>) {
  const geo = useMemo(() => {
    const ax = from.tx * T, az = from.ty * T, bx = to.tx * T, bz = to.ty * T;
    const len = Math.hypot(bx - ax, bz - az), r = (width / 2) * T - 0.18;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
    shape.absarc(len, 0, r, -Math.PI / 2, Math.PI / 2, false);
    const g = new THREE.ShapeGeometry(shape, 24);
    g.rotateX(Math.PI / 2); // shape's y → world z
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate(ax, 0, az);
    return g;
  }, [from, to, width]);
  const mat = useMemo(() => {
    const ripples = canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#7fc8f2';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const y = 6 + i * 11;
        ctx.moveTo(4 + (i % 2) * 20, y);
        ctx.quadraticCurveTo(14 + (i % 2) * 20, y - 4, 26 + (i % 2) * 20, y);
        ctx.stroke();
      }
    }, [3, 3]);
    return new THREE.MeshBasicMaterial({ map: ripples, transparent: true, opacity: 0.78, depthWrite: false });
  }, []);
  useFrame(({ clock }) => {
    mat.map!.offset.set(clock.elapsedTime * 0.02, Math.sin(clock.elapsedTime * 0.5) * 0.03);
  });
  return <mesh geometry={geo} material={mat} position={[0, 0.06, 0]} />;
}

// ── particles ─────────────────────────────────────────────────

/** Drifting light specks: fireflies outdoors at night, dust in sunbeams indoors. */
function Motes({ color, S }: { color: number; S: number }) {
  const COUNT = 36;
  const ref = useRef<THREE.Points>(null);
  const seeds = useMemo(() => {
    const rnd = seeded(3);
    return Array.from({ length: COUNT }, () => [rnd() * S, 0.4 + rnd() * 2.6, rnd() * S, rnd() * 10]);
  }, [S]);
  const geo = useMemo(() => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(COUNT * 3, 3)), []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.14,
        map: canvasTexture(32, 32, (ctx) => {
          const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 32, 32);
        }),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color],
  );
  useFrame(({ clock }) => {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const t = clock.elapsedTime * 0.35;
    seeds.forEach(([x, y, z, p], i) => pos.setXYZ(i, x + Math.sin(t + p) * 0.6, y + Math.sin(t * 1.3 + p * 2) * 0.3, z + Math.cos(t + p) * 0.6));
    pos.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.2;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}
