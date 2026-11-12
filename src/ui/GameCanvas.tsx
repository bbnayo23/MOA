import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import type { ThemeConfig } from '../data/themes';
import { WorldScene, type WorldData } from '../game/WorldScene';
import { FRIENDS } from '../mock';
import { useMoa } from '../store';
import { pixelFontReady } from '../styles/fonts';

/**
 * Mounts one Phaser game per theme, filling its box. The canvas renders at the
 * device pixel ratio (zoomed back down by CSS) so text stays sharp on phones;
 * the scene's camera decides how much of the world fits. All further talk goes through bridge.ts.
 */
export function GameCanvas({ theme, className }: { theme: ThemeConfig; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = () => [Math.max(1, el.clientWidth * dpr), Math.max(1, el.clientHeight * dpr)] as const;
    let game: Phaser.Game | undefined;
    let cancelled = false;
    const resize = new ResizeObserver(() => game?.scale.resize(...size()));
    pixelFontReady().finally(() => {
      if (cancelled) return;
      const [width, height] = size();
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el,
        width,
        height,
        pixelArt: true,
        transparent: true,
        banner: false,
        scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
      });
      const data: WorldData = { theme, me: useMoa.getState().me, friends: FRIENDS };
      game.scene.add('world', WorldScene, true, data);
      resize.observe(el);
    });
    return () => {
      cancelled = true;
      resize.disconnect();
      game?.destroy(true);
    };
  }, [theme]);

  return <div ref={host} className={className} />;
}
