import * as THREE from 'three';

/** Cel-shading ramp: three soft bands (shade / mid / lit) instead of smooth falloff. */
const RAMP = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter;
RAMP.needsUpdate = true;

const cache = new Map<string, THREE.Material>();

/** Shared cartoon material per colour (and optional texture). Never dispose these. */
export function toon(color: string, map?: THREE.Texture, key = '') {
  const id = `${color}|${key}`;
  let m = cache.get(id);
  if (!m) cache.set(id, (m = new THREE.MeshToonMaterial({ color, gradientMap: RAMP, ...(map && { map }) })));
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

/** Turn on shadows for every mesh under `root`. */
export function castShadows(root: THREE.Object3D | null, receive = false) {
  root?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = receive;
    }
  });
}
