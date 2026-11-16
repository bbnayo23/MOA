import * as THREE from 'three';

const cache = new Map<string, THREE.Material>();

/**
 * Shared soft material per colour (and optional texture): smooth shading with a
 * gentle sheen, like painted vinyl toys. Never dispose these.
 */
export function toon(color: string, map?: THREE.Texture, key = '') {
  const id = `${color}|${key}`;
  let m = cache.get(id);
  if (!m) cache.set(id, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...(map && { map }) })));
  return m;
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

/** A small canvas texture, drawn once. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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

/** Turn on shadows for every mesh under `root`. */
export function castShadows(root: THREE.Object3D | null, receive = false) {
  root?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = receive;
    }
  });
}
