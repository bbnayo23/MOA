import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Background } from '../data/themes';
import { gesture } from './camera';
import { MODELS } from './models';
import { walkRadius } from './path';
import { FACE_CAMERA, T, type Tile } from './space';
import { bake, canvasTexture, castShadows, shimmer, toon } from './toon';

/**
 * The space itself: light, the floor (with its rugs, paths and court lines
 * painted in), and either a room (walls with windows) or open land around the
 * map with trees and flowers. Tapping the ground reports a tile.
 */
export function Stage({ bg, onTap }: { bg: Background; onTap: (t: Tile) => void }) {
  const S = bg.size * T;
  const indoor = !!bg.walls;
  // a tap on the ground (released without dragging / pinching) walks there
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!gesture.dragged) onTap({ tx: e.point.x / T, ty: e.point.z / T });
  };
  const floor = useMemo(() => toon('#ffffff', floorTexture(bg), `floor${JSON.stringify(bg)}`), [bg]);

  return (
    <>
      <Sky colors={bg.sky} />
      <Lights bg={bg} S={S} />
      {indoor ? (
        <Room bg={bg} S={S} floor={floor} onTap={tap} />
      ) : (
        <>
          <mesh material={floor} rotation-x={-Math.PI / 2} position={[S / 2, 0.005, S / 2]} receiveShadow onClick={tap}>
            <planeGeometry args={[S, S]} />
          </mesh>
          <Land bg={bg} S={S} onTap={tap} />
        </>
      )}
      {bg.water && <Water {...bg.water} night={bg.night} />}
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
      {/* the ground's bounce, washed out (full grass green turns faces sickly) */}
      <hemisphereLight args={[tint, new THREE.Color(bg.grass ?? bg.ground[0]).lerp(new THREE.Color('#fff4ea'), 0.6), bg.night ? 1.0 : 1.05]} />
      <primitive object={target} />
      {/* a soft fill from the camera's side, so faces turned to us are never in the dark */}
      <directionalLight target={target} color="#fff8f0" intensity={bg.night ? 0.25 : 0.4} position={[S / 2 + 14, 9, S / 2 + 14]} />
      <directionalLight
        target={target}
        color={bg.night ? '#b9c3ff' : '#fff4e2'}
        intensity={bg.night ? 0.8 : 2.6}
        position={[S / 2 + 4, 20, S / 2 + 12]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-far={60}
      />
    </>
  );
}

/**
 * The sky: a dome of the theme's colours (top → horizon) that travels with the
 * camera, and haze that melts far-off land into the horizon, however far out you zoom.
 */
export function Sky({ colors }: { colors: string[] }) {
  const dome = useRef<THREE.Mesh>(null);
  const horizon = colors[colors.length - 1];
  const mat = useMemo(() => {
    const map = canvasTexture(1, 128, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      colors.forEach((c, i) => g.addColorStop((i / (colors.length - 1)) * 0.5, c)); // the top half: sky
      g.addColorStop(1, horizon); // below the horizon (seen only past the land's edge): haze
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1, 128);
    });
    return new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, fog: false, depthWrite: false });
  }, [colors, horizon]);
  const fog = useMemo(() => new THREE.Fog(horizon, 30, 90), [horizon]);
  const backdrop = useMemo(() => new THREE.Color(horizon), [horizon]);
  useFrame(({ camera, scene }) => {
    // the pixel world's straight-down-at-an-angle camera never sees the sky: a plain backdrop of the horizon
    const flat = (camera as THREE.OrthographicCamera).isOrthographicCamera;
    if (dome.current) dome.current.visible = !flat;
    scene.fog = flat ? null : fog;
    if (flat) {
      scene.background = backdrop;
      return;
    }
    const far = (camera as THREE.PerspectiveCamera).far;
    fog.near = far * 0.3;
    fog.far = far * 0.9;
    dome.current?.position.copy(camera.position);
    dome.current?.scale.setScalar(far * 0.95);
  });
  return (
    <mesh ref={dome} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
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

/** Lighter (k > 0) or darker (k < 0) by that fraction (#rrggbb in, #rrggbb out). */
const shade = (hex: string, k: number) =>
  '#' + rgb(hex).map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0')).join('');

/** A pixel-exact disc (no smoothing: every texel is in or out). */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const v = (y + 0.5 - cy) / ry;
    if (Math.abs(v) > 1) continue;
    const hw = Math.round(rx * Math.sqrt(1 - v * v));
    ctx.fillRect(Math.round(cx) - hw, y, hw * 2, 1);
  }
}

/** Cobblestones in `color` (pixels for a W × W floor): each stone lit on top, shaded below, dark mortar between. */
function cobbles(W: number, color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; // read back once: keep it on the CPU
  const rnd = seeded(13), S = 16;
  ctx.fillStyle = shade(color, -0.32);
  ctx.fillRect(0, 0, W, W);
  for (let row = 0; row * S < W; row++)
    for (let x = -(row % 2) * (S / 2) - Math.floor(rnd() * 4); x < W; ) {
      const w = S - 1 + Math.floor(rnd() * 6), y = row * S, base = shade(color, (rnd() - 0.5) * 0.12);
      ctx.fillStyle = base;
      ctx.fillRect(x + 2, y + 1, w - 4, S - 2);
      ctx.fillRect(x + 1, y + 2, w - 2, S - 4);
      ctx.fillStyle = shade(color, 0.3); // lit top edge
      ctx.fillRect(x + 2, y + 2, w - 5, 1);
      ctx.fillStyle = shade(color, -0.14); // shaded bottom
      ctx.fillRect(x + 2, y + S - 3, w - 4, 1);
      ctx.fillRect(x + w - 3, y + 3, 1, S - 6);
      x += w;
    }
  return ctx.getImageData(0, 0, W, W).data;
}

/** Asphalt: dark, speckled, a crack here and there. */
function asphalt(W: number, color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; // read back once: keep it on the CPU
  const rnd = seeded(17);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, W);
  for (let i = 0; i < W * W * 0.06; i++) {
    ctx.fillStyle = rnd() < 0.5 ? shade(color, -0.12) : shade(color, 0.12);
    ctx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * W), 1, 1);
  }
  ctx.fillStyle = shade(color, -0.22);
  for (let i = 0; i < W / 40; i++) {
    let x = Math.floor(rnd() * W), y = Math.floor(rnd() * W);
    for (let k = 0; k < 14; k++) ctx.fillRect((x += rnd() < 0.5 ? 1 : 0), (y += 1), 1, 1);
  }
  return ctx.getImageData(0, 0, W, W).data;
}

/** Paving slabs a quarter of a tile across: grout, a lit edge, the odd one a shade off. */
function pavers(W: number, color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; // read back once: keep it on the CPU
  const rnd = seeded(23), Q = PX / 4;
  ctx.fillStyle = shade(color, -0.25);
  ctx.fillRect(0, 0, W, W);
  for (let y = 0; y < W; y += Q)
    for (let x = 0; x < W; x += Q) {
      const base = shade(color, rnd() < 0.2 ? -0.06 : 0);
      ctx.fillStyle = base;
      ctx.fillRect(x + 1, y + 1, Q - 1, Q - 1);
      ctx.fillStyle = shade(color, 0.3);
      ctx.fillRect(x + 1, y + 1, Q - 2, 1);
      ctx.fillStyle = shade(color, -0.08);
      ctx.fillRect(x + 2, y + Q - 1, Q - 2, 1);
    }
  return ctx.getImageData(0, 0, W, W).data;
}

/** Tactile paving: yellow, studded with raised dots. */
function tactile(W: number, color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = W;
  const ctx = c.getContext('2d', { willReadFrequently: true })!; // read back once: keep it on the CPU
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, W);
  for (let y = 1; y < W; y += 4)
    for (let x = 1; x < W; x += 4) {
      ctx.fillStyle = shade(color, 0.35);
      ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = shade(color, -0.2);
      ctx.fillRect(x, y + 1, 2, 1);
    }
  return ctx.getImageData(0, 0, W, W).data;
}

/** The floor as pixel art: grass with tufts, glazed tiles, wooden planks — then rugs / paths / lines on top. */
function floorTexture(bg: Background) {
  const n = bg.size, W = n * PX;
  const draw = (ctx: CanvasRenderingContext2D) => {
    const rnd = seeded(7);
    const [a, b] = bg.ground;
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, W, W);
    if (bg.floor === 'wood') {
      // planks a quarter of a tile wide, joints staggered: dark seams, a lit edge, grain, nail heads
      const P = PX / 4;
      for (let row = 0; row * P < W; row++) {
        for (let x = -Math.floor(rnd() * PX * 2); x < W; ) {
          const len = Math.floor(PX * (1.2 + rnd() * 1.8));
          const c = shade(rnd() < 0.5 ? a : b, (rnd() - 0.5) * 0.08);
          const y = row * P;
          ctx.fillStyle = c;
          ctx.fillRect(x, y, len, P);
          ctx.fillStyle = shade(c, 0.18);
          ctx.fillRect(x + 1, y + 1, len - 2, 1);
          ctx.fillStyle = shade(c, -0.1);
          for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + Math.floor(rnd() * (len - 24)), y + 4 + Math.floor(rnd() * (P - 7)), 8 + Math.floor(rnd() * 14), 1);
          ctx.fillStyle = shade(a, -0.42);
          ctx.fillRect(x, y, 1, P); // butt joint
          ctx.fillRect(x + 3, y + 3, 1, 1); // nails
          ctx.fillRect(x + 3, y + P - 4, 1, 1);
          x += len;
        }
        ctx.fillStyle = shade(a, -0.36);
        ctx.fillRect(0, row * P, W, 1);
      }
    } else if (bg.floor !== 'grass') {
      // glazed tiles half a map tile across, a checker of the two colours: grout, a lit bevel, a few specks
      const Q = PX / 2;
      for (let y = 0; y < n * 2; y++)
        for (let x = 0; x < n * 2; x++) {
          const c = (x + y) % 2 ? b : a, px = x * Q, py = y * Q;
          ctx.fillStyle = c;
          ctx.fillRect(px, py, Q, Q);
          ctx.fillStyle = shade(c, 0.4);
          ctx.fillRect(px + 1, py + 1, Q - 2, 1);
          ctx.fillRect(px + 1, py + 1, 1, Q - 2);
          ctx.fillStyle = shade(c, -0.07);
          ctx.fillRect(px + 2, py + Q - 2, Q - 3, 1);
          ctx.fillRect(px + Q - 2, py + 2, 1, Q - 3);
          ctx.fillStyle = shade(c, -0.1);
          for (let k = 0; k < 3; k++) ctx.fillRect(px + 3 + Math.floor(rnd() * (Q - 6)), py + 3 + Math.floor(rnd() * (Q - 6)), 1, 1);
        }
      ctx.fillStyle = shade(a, -0.28);
      for (let i = 0; i <= n * 2; i++) {
        ctx.fillRect(i * Q, 0, 1, W);
        ctx.fillRect(0, i * Q, W, 1);
      }
    } else {
      // grass: soft patches of the second green, then tufts (a darker ^), lit blades, a few pebbles
      ctx.fillStyle = b;
      for (let i = 0; i < n * n * 0.7; i++) disc(ctx, rnd() * W, rnd() * W, 10 + rnd() * 26, 7 + rnd() * 16);
      const dark = shade(a, -0.2), light = shade(a, 0.28);
      for (let i = 0; i < n * n * 70; i++) {
        const x = Math.floor(rnd() * W), y = Math.floor(rnd() * W);
        ctx.fillStyle = dark;
        ctx.fillRect(x, y + 1, 1, 2);
        ctx.fillRect(x + 1, y, 1, 2);
        ctx.fillRect(x + 2, y + 1, 1, 2);
        if (rnd() < 0.5) {
          ctx.fillStyle = light;
          ctx.fillRect(x + 1, y - 1, 1, 1);
        }
      }
      ctx.fillStyle = light;
      for (let i = 0; i < n * n * 40; i++) ctx.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * W), 1, 2);
      for (let i = 0; i < n * n * 1.5; i++) {
        const x = Math.floor(rnd() * W), y = Math.floor(rnd() * W);
        ctx.fillStyle = '#d9d2c4';
        ctx.fillRect(x, y, 2, 1);
        ctx.fillStyle = '#a89f92';
        ctx.fillRect(x, y + 1, 2, 1);
      }
    }
    // rugs: every pixel within width/2 of the from→to segment, with a border band (and its pattern)
    const img = ctx.getImageData(0, 0, W, W), px8 = img.data;
    const put = (i: number, c: ArrayLike<number>, j = 0) => {
      px8[i] = c[j];
      px8[i + 1] = c[j + 1];
      px8[i + 2] = c[j + 2];
    };
    const surfaces = new Map<string, Uint8ClampedArray>();
    const surface = (pattern: string, color: string) => {
      const key = pattern + color;
      if (!surfaces.has(key)) surfaces.set(key, (pattern === 'stone' ? cobbles : pattern === 'road' ? asphalt : pattern === 'tactile' ? tactile : pavers)(W, color));
      return surfaces.get(key)!;
    };
    const LINE = rgb('#f4ead0');
    for (const rug of bg.rugs ?? []) {
      const fill = rgb(rug.color), edge = rgb(rug.border);
      const tex = rug.pattern && rug.pattern !== 'crosswalk' ? surface(rug.pattern, rug.color) : null;
      // (from = to: a round patch)
      const ax = rug.from.tx, ay = rug.from.ty, dx = rug.to.tx - ax, dy = rug.to.ty - ay, len2 = dx * dx + dy * dy || 1, len = Math.sqrt(len2);
      const half = rug.width / 2, band = Math.min(0.1, half * 0.4);
      // only the pixels it can reach
      const span = (a: number, b: number) => [Math.max(0, Math.floor((Math.min(a, b) - half) * PX)), Math.min(W, Math.ceil((Math.max(a, b) + half) * PX))];
      const [x0, x1] = span(ax, ax + dx), [y0, y1] = span(ay, ay + dy);
      for (let py = y0; py < y1; py++)
        for (let px = x0; px < x1; px++) {
          const tx = (px + 0.5) / PX, ty = (py + 0.5) / PX;
          const raw = ((tx - ax) * dx + (ty - ay) * dy) / len2, k = Math.max(0, Math.min(1, raw));
          const ex = tx - ax - dx * k, ey = ty - ay - dy * k, d = Math.sqrt(ex * ex + ey * ey);
          if (d > half) continue;
          const i = (py * W + px) * 4;
          // a zebra crossing: stripes as you walk across, the road showing between
          if (rug.pattern === 'crosswalk') {
            if (raw >= 0 && raw <= 1 && (k * len * 2.6) % 1 < 0.5) put(i, fill);
            continue;
          }
          // a road's dashed centre line
          if (rug.pattern === 'road' && d < 0.035 && (k * len * 1.1) % 1 < 0.55) put(i, LINE);
          else if (d > half - band) put(i, edge);
          else if (tex) put(i, tex, i);
          else put(i, fill);
        }
    }
    ctx.putImageData(img, 0, 0);
  };
  return canvasTexture(W, W, draw, undefined, true);
}

// ── indoors ───────────────────────────────────────────────────

const WALL_H = 3.6;

function Room({ bg, S, floor, onTap }: { bg: Background; S: number; floor: THREE.Material; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
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
      <mesh material={sides} position={[S / 2, -0.25, S / 2]} onClick={onTap}>
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
          <mesh material={wallpaper(color, S)} position={pos}>
            <boxGeometry args={size} />
          </mesh>
          <mesh material={toon(trim)} position={[pos[0], WALL_H, pos[2]]}>
            <boxGeometry args={[size[0] + 0.1, 0.22, size[2] + 0.1]} />
          </mesh>
          <mesh material={toon(trim)} position={[pos[0], 0.1, pos[2]]}>
            <boxGeometry args={[size[0] + 0.04, 0.2, size[2] + 0.04]} />
          </mesh>
          {/* wainscoting: the lower wall a shade toward the trim, a rail along its top */}
          <mesh material={wainscot(`#${new THREE.Color(color).lerp(new THREE.Color(trim), 0.22).getHexString()}`, S)} position={[pos[0], 0.45, pos[2]]}>
            <boxGeometry args={[size[0] + 0.03, 0.9, size[2] + 0.03]} />
          </mesh>
          <mesh material={toon(trim)} position={[pos[0], 0.92, pos[2]]}>
            <boxGeometry args={[size[0] + 0.07, 0.07, size[2] + 0.07]} />
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

/** Striped wallpaper with a little diamond between the stripes (64 texels a tile, like the floor). */
const wallpaper = (color: string, S: number) =>
  toon(
    color,
    canvasTexture(
      PX,
      PX,
      (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, PX, PX);
        ctx.fillStyle = shade(color, -0.06);
        for (let x = 0; x < PX; x += 16) ctx.fillRect(x, 0, 3, PX);
        ctx.fillStyle = shade(color, -0.14);
        for (let x = 8; x < PX; x += 16)
          for (let y = 8; y < PX; y += 16) {
            ctx.fillRect(x + 1, y, 1, 3);
            ctx.fillRect(x, y + 1, 3, 1);
          }
      },
      [S / T, WALL_H / T],
    ),
    `wall${S}`,
  );

/** The lower wall: tongue-and-groove boards. */
const wainscot = (color: string, S: number) =>
  toon(
    color,
    canvasTexture(
      PX,
      24,
      (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, PX, 24);
        for (let x = 0; x < PX; x += 8) {
          ctx.fillStyle = shade(color, -0.2);
          ctx.fillRect(x, 0, 1, 24);
          ctx.fillStyle = shade(color, 0.25);
          ctx.fillRect(x + 1, 0, 1, 24);
        }
      },
      [S / T, 1],
    ),
    `wainscot${S}`,
  );

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
function Land({ bg, S, onTap }: { bg: Background; S: number; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const props = useMemo(() => {
    const rnd = seeded(11);
    const out: { kind: 'pine' | 'tree' | 'bush' | 'rock'; x: number; z: number; s: number }[] = [];
    // a forest ring just past where you can walk (low things only on the camera's side)
    const mid = S / 2, inner = walkRadius(bg.size, bg.wild ?? 0) * T + 1.2, outer = inner + 26;
    while (out.length < 220) {
      const a = rnd() * Math.PI * 2, d = inner + rnd() ** 2 * (outer - inner); // thickest at the edge: a tree line
      const x = mid + Math.cos(a) * d, z = mid + Math.sin(a) * d;
      const front = x + z > S + inner;
      const r = rnd();
      out.push({ kind: front ? (r < 0.75 ? 'bush' : 'rock') : r < 0.4 ? 'tree' : r < 0.6 ? 'pine' : r < 0.9 ? 'bush' : 'rock', x, z, s: 0.8 + rnd() * 0.6 });
    }
    return out;
  }, [S, bg.size, bg.wild]);
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const undo = bake(group.current!); // the whole ring: a few draws, not a thousand
    castShadows(group.current);
    return undo;
  }, [props]);
  return (
    <>
      <mesh material={toon(bg.grass ?? bg.ground[0])} rotation-x={-Math.PI / 2} position={[S / 2, 0, S / 2]} receiveShadow onClick={onTap}>
        {/* reaches the horizon even zoomed all the way out */}
        <planeGeometry args={[800, 800]} />
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
      {bg.flowers && <Flowers colors={bg.flowers} S={S} reach={walkRadius(bg.size, bg.wild ?? 0) * T + 3} rugs={bg.rugs ?? []} onMap={bg.floor === 'grass'} />}
    </>
  );
}

/** Little flowers on the grass (one instanced draw); on the map too when its floor is grass. */
/** Flowers over the land, out to `reach` from the middle (and on a grassy map itself when `onMap`). */
function Flowers({ colors, S, reach, rugs, onMap }: { colors: string[]; S: number; reach: number; rugs: NonNullable<Background['rugs']>; onMap: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 700;
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
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * reach;
        x = S / 2 + Math.cos(a) * d;
        z = S / 2 + Math.sin(a) * d;
      } while (onRug(x, z) || (!onMap && x > -0.3 && x < S + 0.3 && z > -0.3 && z < S + 0.3));
      m.makeScale(1, 0.6, 1).setPosition(x, 0.06, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors, S, reach, rugs, onMap]);
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
function Water({ from, to, width, night }: NonNullable<Background['water']> & { night?: boolean }) {
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
  // clear blue (a deep pond blue at night), and two layers of light rippling across it (the shape's
  // UVs are world units: a pattern every 3). Two-sided: turning the shape flat leaves it facing down.
  const mats = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: night ? '#2c5f8f' : '#45b8ec', transparent: true, opacity: night ? 0.88 : 0.8, depthWrite: false, side: THREE.DoubleSide }),
      ...(night ? [0.2, 0.12] : [0.5, 0.3]).map(
        (a) => new THREE.MeshBasicMaterial({ map: shimmer(a, [1 / 3, 1 / 3]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      ),
    ],
    [night],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats[1].map!.offset.set(t * 0.04, t * 0.03);
    mats[2].map!.offset.set(-t * 0.03, t * 0.05);
  });
  return (
    <>
      {mats.map((m, i) => (
        <mesh key={i} geometry={geo} material={m} position={[0, 0.06 + i * 0.004, 0]} />
      ))}
    </>
  );
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
  useFrame(({ clock, camera }) => {
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const t = clock.elapsedTime * 0.35;
    seeds.forEach(([x, y, z, p], i) => pos.setXYZ(i, x + Math.sin(t + p) * 0.6, y + Math.sin(t * 1.3 + p * 2) * 0.3, z + Math.cos(t + p) * 0.6));
    pos.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 2) * 0.2;
    mat.size = (camera as THREE.OrthographicCamera).isOrthographicCamera ? 3 : 0.14;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}
