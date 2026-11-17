import { useEffect, useRef } from 'react';
import { AV_FOOT, AV_H, AV_W, avatarCanvas } from '../art/avatar';
import { ANIMS, type AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { ART } from './Avatar';

// the four ways round: front-right, front-left, back-left, back-right
const VIEWS = [
  { back: false, flip: false },
  { back: false, flip: true },
  { back: true, flip: true },
  { back: true, flip: false },
];

// the little stage: the sprite plus room round it, in art pixels
const STAGE_W = 64;
const STAGE_H = 74;

/** The character, big, on a little patch of grass; tap or drag sideways to turn them round (they turn by themselves till then). */
export function AvatarPreview({ look, anim, className }: { look: CharacterLook; anim: AnimKey; className?: string }) {
  const box = useRef<HTMLCanvasElement>(null);
  const turn = useRef({ view: 0, auto: true, x: null as number | null, moved: false });
  // read live by the drawing loop (a new look object every render mustn't restart it)
  const now = useRef({ look, anim });
  now.current = { look, anim };

  useEffect(() => {
    const cv = box.current!;
    const art = document.createElement('canvas');
    art.width = STAGE_W;
    art.height = STAGE_H;
    const a = art.getContext('2d')!;
    const start = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const s = Math.max(0, t - start) / 1000; // a frame stamp can be a hair before `start`
      if (turn.current.auto) turn.current.view = Math.floor(s / 1.6) % VIEWS.length;
      const { look, anim } = now.current;
      const def = ANIMS[anim];
      const pose = def.frames[Math.floor(s * def.fps) % def.frames.length];
      const view = VIEWS[turn.current.view];
      const flip = view.flip !== !!pose.flip;

      a.clearRect(0, 0, STAGE_W, STAGE_H);
      // grass patch and a soft shadow under the feet
      const gx = STAGE_W / 2, gy = STAGE_H - 9;
      oval(a, gx, gy + 1, 26, 7, '#7fb069');
      oval(a, gx, gy, 25, 6, '#a7d488');
      oval(a, gx - 6, gy - 2, 8, 2, '#bfe39f');
      for (const [x, y] of [[gx - 18, gy - 1], [gx + 14, gy + 2], [gx + 20, gy - 2], [gx - 10, gy + 3]]) a.fillRect(x, y, 1, 2);
      oval(a, gx, gy, 9, 2.5, 'rgba(45,35,64,0.25)');
      if (pose.legs === 'sit') stool(a, gx, gy);
      const sprite = avatarCanvas(look, pose, { back: view.back });
      const lift = Math.round((pose.hop ?? 0) * ART) + (pose.legs === 'sit' ? 2 : 0);
      const x = Math.round(gx - AV_W / 2), y = Math.round(gy - AV_FOOT - lift);
      a.save();
      if (flip) {
        a.translate(x + AV_W, y);
        a.scale(-1, 1);
        a.drawImage(sprite, 0, 0);
      } else a.drawImage(sprite, x, y);
      a.restore();

      // up to the screen in whole-pixel steps
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (cv.width !== w || cv.height !== h) Object.assign(cv, { width: w, height: h });
      const k = Math.max(1, Math.floor(Math.min(w / STAGE_W, h / STAGE_H)));
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, w, h);
      c.drawImage(art, Math.round((w - STAGE_W * k) / 2), Math.round(h - STAGE_H * k), STAGE_W * k, STAGE_H * k);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // tap: the next way round; drag: turn with the finger
  const t = turn.current;
  return (
    <div className={className}>
      <canvas
        ref={box}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        aria-label="캐릭터 미리보기"
        onPointerDown={(e) => {
          t.x = e.clientX;
          t.moved = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (t.x === null || Math.abs(e.clientX - t.x) < 36) return;
          t.auto = false;
          t.moved = true;
          t.view = (t.view + (e.clientX > t.x ? 1 : VIEWS.length - 1)) % VIEWS.length;
          t.x = e.clientX;
        }}
        onPointerUp={() => {
          if (!t.moved) {
            t.auto = false;
            t.view = (t.view + 1) % VIEWS.length;
          }
          t.x = null;
        }}
      />
    </div>
  );
}

function oval(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  c.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const v = (y + 0.5 - cy) / ry;
    if (Math.abs(v) > 1) continue;
    const hw = Math.round(rx * Math.sqrt(1 - v * v));
    c.fillRect(Math.round(cx) - hw, y, hw * 2, 1);
  }
}

/** Something to sit on in the preview: a little wooden stool. */
function stool(c: CanvasRenderingContext2D, gx: number, gy: number) {
  c.fillStyle = '#7a4e33';
  c.fillRect(gx - 8, gy - 12, 16, 3);
  c.fillRect(gx - 7, gy - 9, 2, 9);
  c.fillRect(gx + 5, gy - 9, 2, 9);
  c.fillStyle = '#b07a4f';
  c.fillRect(gx - 8, gy - 13, 16, 2);
}

// ── thumbnails (icons everywhere else) ────────────────────────

export type ThumbMode = 'head' | 'full';

// art-pixel crops of the sprite, and how big each pixel gets in the picture
const CROP: Record<ThumbMode, { x: number; y: number; w: number; h: number; k: number }> = {
  head: { x: 4, y: 6, w: 40, h: 40, k: 4 },
  full: { x: 0, y: 0, w: AV_W, h: AV_H, k: 3 },
};
const cache = new Map<string, string>();

/** This look's picture (head-and-shoulders or full body) as an image URL, painted once. */
export function thumbOf(look: CharacterLook, mode: ThumbMode) {
  const key = `${mode}|${JSON.stringify(look)}`;
  let url = cache.get(key);
  if (!url) {
    const { x, y, w, h, k } = CROP[mode];
    const c = document.createElement('canvas');
    c.width = w * k;
    c.height = h * k;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(avatarCanvas(look), x, y, w, h, 0, 0, w * k, h * k);
    cache.set(key, (url = c.toDataURL('image/png')));
  }
  return url;
}

/** Hook form, for components (the picture is ready at once). */
export const useAvatarThumb = (look: CharacterLook, mode: ThumbMode) => thumbOf(look, mode);
