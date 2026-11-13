import * as THREE from 'three';

type Anchor = () => [x: number, y: number, z: number] | null;

/**
 * Screen-space labels pinned to points in the world (name tags, bubbles,
 * signs). They are ordinary DOM elements in one overlay — crisp text, styled
 * by SCSS — moved every frame to where their anchor projects.
 */
export class Labels {
  private items = new Map<string, { el: HTMLElement; at: Anchor }>();
  private v = new THREE.Vector3();

  /** Ref callback for an element whose bottom-centre should sit on `at()`. */
  bind(key: string, at: Anchor) {
    return (el: HTMLElement | null) => {
      if (el) this.items.set(key, { el, at });
      else this.items.delete(key);
    };
  }

  sync(camera: THREE.Camera, width: number, height: number) {
    for (const { el, at } of this.items.values()) {
      const p = at();
      const v = p && this.v.set(...p).project(camera);
      if (!v || v.z > 1) {
        el.style.visibility = 'hidden';
        continue;
      }
      el.style.visibility = 'visible';
      let x = ((v.x + 1) / 2) * width;
      // on screen but hanging over the side (a long bubble by the edge): nudge it back in whole
      const half = el.offsetWidth / 2 + 6;
      if (x > 0 && x < width) x = Math.min(width - half, Math.max(half, x));
      el.style.transform = `translate(${x.toFixed(1)}px, ${(((1 - v.y) / 2) * height).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
}
