import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { shade } from '../art/pix';

const cache = new Map<string, THREE.Material>();

/** Light in three flat steps (shadow side, half-lit, lit): cel shading, so faces read as pixel-art planes. */
const RAMP = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

/** Shared flat-shaded material per colour (and optional texture). Never dispose these. */
export function toon(color: string, map?: THREE.Texture, key = '') {
  const id = `${color}|${key}`;
  let m = cache.get(id);
  if (!m) cache.set(id, (m = new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...(map && { map }) })));
  return m;
}

const leaves = new Map<string, THREE.Texture>();
/** Foliage: the colour with pixel leaves drawn in — darker clumps, lit tips (bushes, trees, pot plants). */
export function leafy(color: string) {
  let t = leaves.get(color);
  if (!t)
    leaves.set(
      color,
      (t = canvasTexture(
        32,
        32,
        (ctx) => {
          let seed = 9;
          const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 32, 32);
          for (let i = 0; i < 26; i++) {
            const x = Math.floor(rnd() * 32), y = Math.floor(rnd() * 32);
            ctx.fillStyle = shade(color, -0.22);
            ctx.fillRect(x, y + 1, 3, 1);
            ctx.fillRect(x + 1, y + 2, 2, 1);
            ctx.fillStyle = shade(color, 0.3);
            ctx.fillRect(x + 1, y, 2, 1);
          }
        },
        [3, 2],
      )),
    );
  return toon(color, t, 'leafy');
}

/** Unlit material: glass, flames, glowing bits. */
export function glow(color: string, opacity = 1) {
  const id = `glow|${color}|${opacity}`;
  let m = cache.get(id);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
    cache.set(id, m);
  }
  return m;
}

/** A small canvas texture, drawn once (`read`: the drawing reads its pixels back — keep that canvas on the CPU). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number], read = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d', { willReadFrequently: read })!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // pixel art: texels stay crisp squares up close; far off (perspective scenes), the mipmaps pick one
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  return tex;
}

/** Wavy bright lines, tiling: light dancing on a pool floor, glints on water. */
export const shimmer = (alpha: number, repeat: [number, number]) =>
  canvasTexture(128, 128, (ctx) => {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 6; k++)
      for (const across of [true, false]) {
        ctx.beginPath();
        for (let u = 0; u <= 128; u += 4) {
          const v = k * (128 / 6) + Math.sin((u / 128) * Math.PI * 4 + k * (across ? 1 : 2)) * 6;
          if (across) ctx.lineTo(u, v);
          else ctx.lineTo(v, u);
        }
        ctx.stroke();
      }
  }, repeat);

/**
 * A model that never moves, drawn as one mesh per material instead of one per part: its parts
 * (still there for React) are hidden, their shapes merged in place under `root`. A space has
 * thousands of parts and each is a draw call (twice, with the shadows), which is what made
 * phones slow. Returns the undo.
 */
export function bake(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const byMaterial = new Map<THREE.Material, { parts: THREE.Mesh[]; shapes: THREE.BufferGeometry[] }>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible || Array.isArray(m.material) || !m.geometry.attributes.uv) return;
    const shape = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(shape.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') shape.deleteAttribute(name);
    shape.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const entry = byMaterial.get(m.material) ?? { parts: [], shapes: [] };
    entry.parts.push(m);
    entry.shapes.push(shape);
    byMaterial.set(m.material, entry);
  });
  const baked: THREE.Mesh[] = [];
  for (const [material, { parts, shapes }] of byMaterial) {
    const merged = parts.length > 1 && mergeGeometries(shapes);
    shapes.forEach((s) => s.dispose());
    if (!merged) continue;
    parts.forEach((p) => (p.visible = false));
    const mesh = new THREE.Mesh(merged, material);
    root.add(mesh);
    baked.push(mesh);
  }
  return () => {
    for (const mesh of baked) {
      root.remove(mesh);
      mesh.geometry.dispose();
    }
    root.traverse((o) => (o as THREE.Mesh).isMesh && (o.visible = true));
  };
}

/** Turn on shadows for every mesh under `root`. */
export function castShadows(root: THREE.Object3D | null, receive = false) {
  root?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = receive;
    }
  });
}
