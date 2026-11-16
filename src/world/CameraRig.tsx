import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fromGame, toGame } from '../bridge';
import { ZOOM, clampCenter, clampZoom, fitZoom, gesture, groundAt, place } from './camera';
import { walkRadius } from './path';
import type { Agent, Sim } from './sim';
import { T } from './space';

/** Camera distance at 100% (pulled back a bit more on portrait screens). */
const BASE = 16;
/** How far in from the map's edge the camera centre may go at 100%. */
const MARGIN = T * 1.5;

interface Cam {
  zoom: number;
  zoomTo: number;
  /** As far out as this screen goes: the whole space in view (at most 50%). */
  min: number;
  /** Where the camera follows me to (eased). */
  focus: THREE.Vector3 | null;
  /** How far the player has dragged the view away from me. */
  pan: THREE.Vector3;
  /** Keep this ground point under this screen point while zooming (cursor / fingers / centre). */
  anchor: { ndc: THREE.Vector2; world: THREE.Vector3 } | null;
  /** Gliding back to me at 100% ("기본 화면"). */
  homing: boolean;
  dragging: boolean;
}

/**
 * Quarter-view camera that follows me, plus zoom (wheel at the cursor, pinch
 * between the fingers, the +/− buttons at the centre) and pan (drag the
 * ground). Zooming out goes until the whole space fits the screen, the view
 * drifting to its middle on the way; zoomed in it never shows past the map,
 * and once I walk off it comes back to me.
 */
export function CameraRig({ sim, me }: { sim: Sim; me: Agent }) {
  const { camera, gl } = useThree();
  const c = useRef<Cam>({ zoom: 1, zoomTo: 1, min: 0.5, focus: null, pan: new THREE.Vector3(), anchor: null, homing: false, dragging: false }).current;
  const reported = useRef('');
  const fitted = useRef('');
  // the ground the camera may show: the map, or outdoors the round land around it (`fit`: its edge)
  const ground = useMemo(() => {
    const S = sim.size * T, mid = new THREE.Vector3(S / 2, 0, S / 2);
    if (!sim.wild) {
      const fit = [0, S].flatMap((x) => [0, S].flatMap((z) => [new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 3, z)]));
      return { lo: 0, hi: S, mid, fit };
    }
    const R = walkRadius(sim.size, sim.wild) * T;
    const fit = Array.from({ length: 24 }, (_, i) => new THREE.Vector3(mid.x + Math.cos((i / 24) * Math.PI * 2) * R, 0, mid.z + Math.sin((i / 24) * Math.PI * 2) * R));
    return { lo: mid.x - R, hi: mid.x + R, mid, fit };
  }, [sim]);

  // where the camera looks, given the current pan (pan is trimmed so it can't build up past the edge)
  const look = (aspect: number) => {
    const centre = clampCenter(c.focus!.clone().add(c.pan), ground.lo, ground.hi, c.zoom, MARGIN);
    c.pan.subVectors(centre, c.focus!);
    // zooming out drifts the view to the middle: all the way out, the whole space is in view
    const out = THREE.MathUtils.clamp((1 / c.zoom - 1) / (1 / c.min - 1), 0, 1);
    centre.lerp(ground.mid, out);
    // a little past me so I stand slightly below the middle; on phones a bit higher, clear of the chat dock
    const ahead = aspect < 1 ? 0.45 : -0.5;
    return centre.add(new THREE.Vector3(ahead, 0.6, ahead));
  };

  useFrame(({ size }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const goal = new THREE.Vector3(me.pos.tx * T, 0, me.pos.ty * T);
    c.focus ??= goal.clone();
    c.focus.lerp(goal, 1 - Math.exp(-dt * 4));
    // walking off (or "기본 화면") brings the view back to me
    const moving = me.route.length > 0 || me.anim === 'walk';
    if (c.homing || (moving && !c.dragging)) {
      c.pan.lerp(new THREE.Vector3(), 1 - Math.exp(-dt * (c.homing ? 6 : 2.5)));
      if (c.homing && c.pan.lengthSq() < 1e-4 && Math.abs(c.zoom - 1) < 1e-3) c.homing = false;
    }
    c.zoom += (c.zoomTo - c.zoom) * (1 - Math.exp(-dt * 10));
    if (Math.abs(c.zoomTo - c.zoom) < 1e-3) c.zoom = c.zoomTo;

    const aspect = size.width / size.height;
    const base = BASE * (aspect < 1 ? 1 + (1 - aspect) * 0.8 : 1);
    const screen = `${size.width}x${size.height}:${ground.hi - ground.lo}`;
    if (screen !== fitted.current) {
      fitted.current = screen;
      c.min = Math.min(0.5, Math.max(ZOOM.min, fitZoom(camera as THREE.PerspectiveCamera, ground.fit, ground.mid, base)));
      c.zoomTo = clampZoom(c.zoomTo, c.min);
    }
    const dist = base / c.zoom;
    // what's drawn reaches past the far side of the map, however far out we are (and depth stays precise up close)
    const cam = camera as THREE.PerspectiveCamera;
    const far = dist * 2.5 + (ground.hi - ground.lo) * 1.5;
    if (Math.abs(cam.far - far) > far * 0.05) {
      cam.near = Math.max(0.5, dist / 40);
      cam.far = far;
      cam.updateProjectionMatrix();
    }
    place(camera, look(aspect), dist);
    if (c.anchor) {
      const now = groundAt(camera, c.anchor.ndc);
      if (now) {
        c.pan.x += c.anchor.world.x - now.x;
        c.pan.z += c.anchor.world.z - now.z;
        place(camera, look(aspect), dist);
      }
      if (c.zoom === c.zoomTo) c.anchor = null;
    }

    const level = { pct: Math.round(c.zoomTo * 100), min: Math.round(c.min * 100) };
    const key = `${level.pct}/${level.min}`;
    if (key !== reported.current) fromGame.emit('zoomLevel', ((reported.current = key), level));
  });

  useEffect(() => {
    const el = gl.domElement;
    const ndc = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    };
    const zoomAt = (factor: number, at: THREE.Vector2) => {
      const world = groundAt(camera, at);
      c.zoomTo = clampZoom(c.zoomTo * factor, c.min);
      c.homing = false;
      c.anchor = world && { ndc: at, world };
    };

    // pointers: one drags the ground along, two pinch (and drag) — and either way it isn't a tap
    const pts = new Map<number, { x: number; y: number }>();
    let start = { x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      if (!pts.size) {
        gesture.dragged = false;
        start = { x: e.clientX, y: e.clientY };
      } else gesture.dragged = true;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      if (pts.size === 1) {
        const far = Math.hypot(cur.x - start.x, cur.y - start.y) > (e.pointerType === 'touch' ? 10 : 6);
        if (!gesture.dragged && !far) return; // still a tap
        gesture.dragged = c.dragging = true;
        c.homing = false;
        c.anchor = null;
        el.style.cursor = 'grabbing';
        const a = groundAt(camera, ndc(prev.x, prev.y)), b = groundAt(camera, ndc(cur.x, cur.y));
        if (a && b) c.pan.add(a.sub(b).setY(0));
      } else if (pts.size === 2) {
        const other = [...pts].find(([id]) => id !== e.pointerId)![1];
        const before = Math.hypot(prev.x - other.x, prev.y - other.y);
        const after = Math.hypot(cur.x - other.x, cur.y - other.y);
        // the ground under the old midpoint follows the fingers to the new one
        const world = groundAt(camera, ndc((prev.x + other.x) / 2, (prev.y + other.y) / 2));
        c.zoom = c.zoomTo = clampZoom(c.zoomTo * (after / Math.max(before, 1)), c.min);
        c.anchor = world && { ndc: ndc((cur.x + other.x) / 2, (cur.y + other.y) / 2), world };
        c.dragging = true;
        c.homing = false;
      }
      pts.set(e.pointerId, cur);
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!pts.size) {
        c.dragging = false;
        el.style.cursor = '';
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); // the page itself never zooms or scrolls here
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), ndc(e.clientX, e.clientY));
    };
    // iOS Safari's own pinch-zoom
    const noPageZoom = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('gesturestart', noPageZoom);
    const off = toGame.on('zoom', (cmd) => {
      if (cmd === 'reset') {
        c.zoomTo = 1;
        c.anchor = null;
        c.homing = true;
      } else zoomAt(cmd === 'in' ? ZOOM.step : 1 / ZOOM.step, new THREE.Vector2(0, 0));
    });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      document.removeEventListener('gesturestart', noPageZoom);
      off();
    };
  }, [gl, camera, c]);

  return null;
}
