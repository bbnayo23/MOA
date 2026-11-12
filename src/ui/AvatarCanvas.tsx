import { useEffect, useRef } from 'react';
import { AVATAR_H, AVATAR_W, renderAvatar } from '../art/avatar';
import { ANIMS, type AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';

interface Props {
  look: CharacterLook;
  anim?: AnimKey;
  scale?: number;
  animate?: boolean;
  /** Crop to the top N rows (e.g. 18 ≈ head only). */
  rows?: number;
  className?: string;
}

/** The same renderer the game uses, painted into a plain <canvas>. */
export function AvatarCanvas({ look, anim = 'idle', scale = 4, animate = false, rows = AVATAR_H, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const { fps, frames } = ANIMS[anim];
    let f = 0;
    const draw = () => {
      const pose = frames[f % frames.length];
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      renderAvatar(look, pose).paint(ctx, scale, !!pose.flip);
    };
    draw();
    if (!animate) return;
    const id = setInterval(() => (f++, draw()), 1000 / fps);
    return () => clearInterval(id);
  }, [look, anim, scale, animate]);

  return <canvas ref={ref} width={AVATAR_W * scale} height={rows * scale} className={className} aria-hidden />;
}
