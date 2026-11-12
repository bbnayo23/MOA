import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import type { ThemeConfig } from '../data/themes';
import { ART_H, ART_W, S } from '../game/iso';
import { WorldScene, type WorldData } from '../game/WorldScene';
import { FRIENDS } from '../mock';
import { useMoa } from '../store';
import { pixelFontReady } from '../styles/fonts';

/** Mounts one Phaser game per theme. All further talk goes through bridge.ts. */
export function GameCanvas({ theme, className }: { theme: ThemeConfig; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | undefined;
    let cancelled = false;
    pixelFontReady().finally(() => {
      if (cancelled || !host.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        width: ART_W * S,
        height: ART_H * S,
        pixelArt: true,
        transparent: true,
        banner: false,
        scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
      const data: WorldData = { theme, me: useMoa.getState().me, friends: FRIENDS };
      game.scene.add('world', WorldScene, true, data);
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [theme]);

  return <div ref={host} className={className} />;
}
