import * as THREE from 'three';

/** Zoom: 1 = 100%. How far out you can go depends on the screen (see `fitZoom`); `min` is the floor. */
export const ZOOM = { min: 0.05, max: 2, step: 1.25 };
export const clampZoom = (z: number, min = ZOOM.min) => Math.min(ZOOM.max, Math.max(min, z));

const PITCH = (40 * Math.PI) / 180;

/** Quarter view: look at `look` from the +x +z side, `dist` away, tilted down by PITCH. */
export function place(cam: THREE.Camera, look: THREE.Vector3, dist: number) {
  const flat = Math.cos(PITCH) * dist * Math.SQRT1_2;
  cam.position.set(look.x + flat, look.y + Math.sin(PITCH) * dist, look.z + flat);
  cam.lookAt(look);
  cam.updateMatrixWorld();
}

const ray = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** The point on the ground under a screen position (normalised device coords, −1…1). */
export function groundAt(cam: THREE.Camera, ndc: THREE.Vector2, out = new THREE.Vector3()) {
  ray.setFromCamera(ndc, cam);
  return ray.ray.intersectPlane(ground, out);
}

/**
 * Keep the camera's centre over the ground (the square `lo`…`hi` on both axes):
 * `margin` in from each edge at 100%, proportionally less when zoomed in, more
 * when zoomed out — and simply the middle once all of it fits.
 */
export function clampCenter(c: THREE.Vector3, lo: number, hi: number, zoom: number, margin: number) {
  const edge = Math.min((hi - lo) / 2, margin / zoom);
  c.x = THREE.MathUtils.clamp(c.x, lo + edge, hi - edge);
  c.z = THREE.MathUtils.clamp(c.z, lo + edge, hi - edge);
  return c;
}

/**
 * The zoom at which all these points (the map's corners and a building's height
 * above them, or the edge of the open land round it) fit on this camera's
 * screen, looking at `mid` (`base` is the camera distance at 100%).
 */
export function fitZoom(cam: THREE.PerspectiveCamera, points: THREE.Vector3[], mid: THREE.Vector3, base: number) {
  const probe = cam.clone();
  const v = new THREE.Vector3();
  const fits = (dist: number) => {
    place(probe, mid, dist);
    return points.every((p) => {
      v.copy(p).project(probe);
      return Math.abs(v.x) < 0.94 && Math.abs(v.y) < 0.88;
    });
  };
  let lo = 1, hi = 1000; // camera distance
  for (let i = 0; i < 32; i++) {
    const d = (lo + hi) / 2;
    if (fits(d)) hi = d;
    else lo = d;
  }
  return base / hi;
}

/** Shared between the camera's gestures and the world's click handlers. */
export const gesture = {
  /** The current press turned into a drag or a pinch, so its release is not a tap. */
  dragged: false,
};
