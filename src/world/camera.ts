import * as THREE from 'three';

/** Zoom: 1 = 100%. */
export const ZOOM = { min: 0.25, max: 2, step: 1.25 };
export const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));

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
 * Keep the camera's centre over the map: `margin` in from each edge at 100%,
 * proportionally less when zoomed in, more when zoomed out — and simply the
 * middle once the whole map fits.
 */
export function clampCenter(c: THREE.Vector3, mapSize: number, zoom: number, margin: number) {
  const edge = Math.min(mapSize / 2, margin / zoom);
  c.x = THREE.MathUtils.clamp(c.x, edge, mapSize - edge);
  c.z = THREE.MathUtils.clamp(c.z, edge, mapSize - edge);
  return c;
}

/** Shared between the camera's gestures and the world's click handlers. */
export const gesture = {
  /** The current press turned into a drag or a pinch, so its release is not a tap. */
  dragged: false,
};
