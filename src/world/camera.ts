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
 * above them, or the edge of the open land round it) fit on screen, looking at
 * `mid` (`base`: the world height the view shows at 100%, `aspect`: width / height).
 */
export function fitZoom(points: THREE.Vector3[], mid: THREE.Vector3, aspect: number, base: number) {
  const probe = new THREE.OrthographicCamera();
  place(probe, mid, 50);
  const right = new THREE.Vector3().setFromMatrixColumn(probe.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(probe.matrixWorld, 1);
  const d = new THREE.Vector3();
  let need = 0; // the view height it takes
  for (const p of points) {
    d.subVectors(p, mid);
    need = Math.max(need, (Math.abs(d.dot(up)) * 2) / 0.88, (Math.abs(d.dot(right)) * 2) / 0.94 / aspect);
  }
  return base / need;
}

const r = new THREE.Vector3();
const u = new THREE.Vector3();
/**
 * Move the camera (sideways and up, in its own plane) onto the pixel grid, so
 * still things land on the same pixels as it glides along (no shimmer).
 */
export function snap(cam: THREE.Camera, unit: number) {
  r.setFromMatrixColumn(cam.matrixWorld, 0);
  u.setFromMatrixColumn(cam.matrixWorld, 1);
  const a = cam.position.dot(r), b = cam.position.dot(u);
  cam.position.addScaledVector(r, Math.round(a / unit) * unit - a).addScaledVector(u, Math.round(b / unit) * unit - b);
  cam.updateMatrixWorld();
}

/** Shared between the camera's gestures and the world's click handlers. */
export const gesture = {
  /** The current press turned into a drag or a pinch, so its release is not a tap. */
  dragged: false,
};
