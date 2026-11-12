import Phaser from 'phaser';
import { BG_H, BG_MARGIN, BG_W, paintBackground } from '../art/ground';
import { ART, renderArt, type ArtKind } from '../art/props';
import { fromGame, toGame } from '../bridge';
import { ACTIONS, type ActionId } from '../data/actions';
import type { Player } from '../data/character';
import type { InteractionObject, ThemeConfig } from '../data/themes';
import { FADE_IN_MS, LIGHT, MOTES, lockedTint, objectLabelStyle } from '../styles/game';
import { Avatar } from './Avatar';
import { ART_H, ART_W, S, isWalkable, tileToWorld, type Tile } from './iso';

export interface WorldData {
  theme: ThemeConfig;
  me: Player;
  friends: Player[];
}

/** One scene for every theme: everything theme-specific comes from ThemeConfig. */
export class WorldScene extends Phaser.Scene {
  private theme!: ThemeConfig;
  private me!: Avatar;
  private avatars = new Map<string, Avatar>();
  private objects = new Map<string, Phaser.GameObjects.Image>();
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('world');
  }

  create({ theme, me, friends }: WorldData) {
    this.theme = theme;

    const bg = this.textures.createCanvas('bg', BG_W, BG_H)!;
    paintBackground(bg.context, theme.background);
    bg.refresh();
    this.add.image(-BG_MARGIN.x * S, -BG_MARGIN.y * S, bg).setOrigin(0).setScale(S).setDepth(-1);
    // Scale.EXPAND grows the viewport past 960×600; keep the stage centred in it.
    const center = () => this.cameras.main.centerOn((ART_W * S) / 2, (ART_H * S) / 2);
    center();
    this.scale.on(Phaser.Scale.Events.RESIZE, center);
    this.cameras.main.fadeIn(FADE_IN_MS);

    theme.decorations.forEach((d) => this.addArt(d.kind, d.at));
    theme.interactionObjects.forEach((o) => this.addObject(o));
    if (theme.background.motes) this.addMotes(theme.background.motes);

    const spawn = theme.spawnPosition;
    this.me = this.addAvatar(me, spawn, true);
    friends.forEach((f, i) => {
      const av = this.addAvatar(f, { tx: spawn.tx - 0.8 + i * 1.6, ty: spawn.ty + 0.8 - i * 1.6 }, false);
      this.time.delayedCall(1500 + i * 1500, () => this.think(av));
    });

    const keyboard = this.input.keyboard!;
    this.keys = keyboard.createCursorKeys();
    keyboard.clearCaptures(); // let arrows/space reach the chat input

    const offs = [
      toGame.on('act', ({ actionId, objectId }) => this.perform(this.me, actionId, objectId)),
      toGame.on('stop', () => this.stop(this.me)),
      toGame.on('chat', ({ playerId, text }) => this.avatars.get(playerId)?.say(text)),
      toGame.on('look', ({ playerId, look }) => this.avatars.get(playerId)?.setLook(look)),
    ];
    const cleanup = () => {
      offs.forEach((off) => off());
      this.scale.off(Phaser.Scale.Events.RESIZE, center);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  update(_time: number, dt: number) {
    const typing = document.activeElement instanceof HTMLInputElement;
    const k = this.keys;
    const dx = typing ? 0 : +k.right.isDown - +k.left.isDown;
    const dy = typing ? 0 : +k.down.isDown - +k.up.isDown;
    if (dx || dy) {
      if (this.me.action || this.me.walking) this.stop(this.me);
      this.me.move(dx, dy, dt, (x, y) => isWalkable(x, y, this.theme.background.size));
    } else if (!this.me.action && !this.me.walking) {
      this.me.play('idle');
    }
    this.avatars.forEach((a) => a.update(dt));
  }

  // ── actions ──────────────────────────────────────────────

  private perform(av: Avatar, id: ActionId, objectId?: string) {
    const def = ACTIONS[id];
    const others = [...this.avatars.values()].filter((a) => a !== av);
    const freeSpot = (o: InteractionObject) => o.spots.find((s) => !others.some((a) => a.spot === s));
    const dist = (o: InteractionObject) => {
      const p = tileToWorld(o.at);
      return Math.hypot(p.x - av.x, p.y - av.y);
    };
    // the clicked object, else the nearest one offering this action that still has room
    const candidates = this.theme.interactionObjects
      .filter((o) => o.actions.includes(id) && (!objectId || o.id === objectId))
      .sort((a, b) => dist(a) - dist(b));
    const obj = candidates.find(freeSpot) ?? candidates[0];
    this.stop(av);
    const start = () => {
      if (obj) av.face(tileToWorld(obj.at).x);
      av.play(def.anim);
      av.action = id;
      if (av.isMe) fromGame.emit('actionChange', id);
      if (obj) this.poke(obj.id);
      if (def.durationMs) av.actionTimer = this.time.delayedCall(def.durationMs, () => this.stop(av));
    };
    if (!obj) return start();
    av.spot = freeSpot(obj) ?? obj.spots[0];
    const p = tileToWorld(av.spot);
    av.walkTo(p.x, p.y, start);
  }

  private stop(av: Avatar) {
    const had = av.action;
    av.actionTimer?.remove();
    av.action = null;
    av.spot = null;
    av.cancelWalk();
    av.play('idle');
    if (av.isMe && had) fromGame.emit('actionChange', null);
  }

  /** Mock friend brain: wander, use objects, repeat. */
  private think(av: Avatar) {
    const r = Math.random();
    if (r < 0.45) {
      this.stop(av);
      const n = this.theme.background.size;
      const p = tileToWorld({ tx: Phaser.Math.FloatBetween(0.8, n - 0.8), ty: Phaser.Math.FloatBetween(0.8, n - 0.8) });
      av.walkTo(p.x, p.y);
    } else if (r < 0.85 || !av.action) {
      this.perform(av, Phaser.Utils.Array.GetRandom(this.theme.availableActions));
    }
    this.time.delayedCall(Phaser.Math.Between(4000, 9000), () => this.think(av));
  }

  // ── world building ───────────────────────────────────────

  private addAvatar(player: Player, at: Tile, isMe: boolean) {
    const p = tileToWorld(at);
    const av = new Avatar(this, player, p.x, p.y, isMe);
    this.avatars.set(player.id, av);
    return av;
  }

  private addArt(kind: ArtKind, at: Tile, color?: string) {
    const key = `art-${kind}${color ?? ''}`;
    const art = ART[kind];
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, art.w, art.h)!;
      const paint = (f: number) => {
        tex.context.clearRect(0, 0, art.w, art.h);
        renderArt(kind, f, color).paint(tex.context);
        tex.refresh();
      };
      paint(0);
      let f = 0;
      if (art.frames) this.time.addEvent({ delay: 160, loop: true, callback: () => paint(++f % art.frames!) });
    }
    const { x, y } = tileToWorld(at);
    const img = this.add.image(x, y, key).setOrigin(0.5, 1 - (art.anchorY ?? 0) / art.h).setScale(S).setDepth(y);
    if (art.glow) {
      // floor-level light: brightens the ground and walls, never washes out characters
      const glow = this.add.image(x, y - 8 * S, this.glowTexture(art.glow)).setBlendMode(Phaser.BlendModes.ADD).setDepth(0);
      this.tweens.add({ targets: glow, alpha: LIGHT.alpha, scale: 1.08, duration: LIGHT.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    return img;
  }

  /** Soft radial light, one texture per colour. */
  private glowTexture(color: number) {
    const key = `glow-${color}`;
    if (this.textures.exists(key)) return key;
    const r = LIGHT.radius;
    const tex = this.textures.createCanvas(key, r * 2, r * 2)!;
    const { r: cr, g: cg, b: cb } = Phaser.Display.Color.IntegerToRGB(color);
    const grad = tex.context.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${LIGHT.core})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    tex.context.fillStyle = grad;
    tex.context.fillRect(0, 0, r * 2, r * 2);
    tex.refresh();
    return key;
  }

  private addObject(o: InteractionObject) {
    const img = this.addArt(o.kind, o.at, o.color).setInteractive({ useHandCursor: true });
    if (o.locked) img.setTint(lockedTint());
    const label = this.add
      .text(img.x, img.y - img.displayHeight - 4, `${o.icon} ${o.label}${o.locked ? ' 🔒' : ''}`, objectLabelStyle())
      .setOrigin(0.5, 1)
      .setDepth(9000);
    const click = () => (o.enter ? this.goThrough(o) : fromGame.emit('objectClick', o.id));
    img.on('pointerdown', click);
    if (o.enter) {
      // doors keep their sign up and it's clickable too
      label.setDepth(img.depth + 1).setInteractive({ useHandCursor: true }).on('pointerdown', click);
    } else {
      label.setVisible(false);
      img.on('pointerover', () => label.setVisible(true));
      img.on('pointerout', () => label.setVisible(false));
    }
    this.objects.set(o.id, img);
  }

  /** Walk up to a door, then let React decide (enter, or preview if locked). */
  private goThrough(o: InteractionObject) {
    this.stop(this.me);
    const p = tileToWorld(o.spots[0]);
    this.me.walkTo(p.x, p.y, () => fromGame.emit('portal', o.enter!));
  }

  private poke(id: string) {
    const img = this.objects.get(id);
    if (img) this.tweens.add({ targets: img, scaleX: S * 1.08, scaleY: S * 0.94, duration: 110, yoyo: true });
  }

  /** Drifting light specks: fireflies outdoors, dust in sunbeams indoors. */
  private addMotes(color: number) {
    for (let i = 0; i < MOTES.count; i++) {
      const dot = this.add
        .rectangle(Phaser.Math.Between(60, 900), Phaser.Math.Between(160, 520), S, S, color)
        .setDepth(6000)
        .setAlpha(0);
      this.tweens.add({
        targets: dot,
        x: `+=${Phaser.Math.Between(-60, 60)}`,
        y: `+=${Phaser.Math.Between(-40, 40)}`,
        alpha: { from: 0, to: MOTES.alpha },
        duration: Phaser.Math.Between(1800, 3200),
        delay: Phaser.Math.Between(0, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }
}
