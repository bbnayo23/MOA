import Phaser from 'phaser';
import { AVATAR_FOOT, AVATAR_H, AVATAR_W, renderAvatar } from '../art/avatar';
import type { ActionId } from '../data/actions';
import { ANIMS, type AnimKey } from '../data/anims';
import type { CharacterLook, Player } from '../data/character';
import { S, type Tile } from './iso';

const SPEED = 130; // screen px / s
const FONT = 'Galmuri11';
const HEAD_Y = (AVATAR_FOOT - 2) * S; // feet → top of head
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const isEmoji = (t: string) => /^[\p{Extended_Pictographic}️‍]+$/u.test(t);

/**
 * One character in the world: sprite + nickname + speech bubble, driven by
 * the shared animation data. Knows nothing about themes or React.
 */
export class Avatar {
  action: ActionId | null = null;
  actionTimer?: Phaser.Time.TimerEvent;
  spot: Tile | null = null;

  private tex: Phaser.Textures.CanvasTexture;
  private img: Phaser.GameObjects.Image;
  private name: Phaser.GameObjects.Text;
  private bubble?: Phaser.GameObjects.Container;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private look: CharacterLook;
  private anim: AnimKey = 'idle';
  private frame = 0;
  private elapsed = 0;
  private facingLeft = false;
  private target: { x: number; y: number; then?: () => void } | null = null;

  constructor(
    private scene: Phaser.Scene,
    player: Player,
    public x: number,
    public y: number,
    readonly isMe: boolean,
  ) {
    this.look = player.look;
    this.tex = scene.textures.createCanvas(`avatar-${player.id}`, AVATAR_W, AVATAR_H)!;
    this.img = scene.add.image(x, y, this.tex).setOrigin(0.5, AVATAR_FOOT / AVATAR_H).setScale(S);
    this.name = scene.add
      .text(x, y, player.nickname, {
        fontFamily: FONT,
        fontSize: '12px',
        color: isMe ? '#ffffff' : css('--c-ink'),
        backgroundColor: isMe ? css('--c-primary-deep') : 'rgba(255,255,255,0.88)',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 0);
    this.redraw();
    this.sync();
  }

  get walking() {
    return this.target !== null;
  }

  setLook(look: CharacterLook) {
    this.look = look;
    this.redraw();
  }

  play(anim: AnimKey) {
    if (anim === this.anim) return;
    this.anim = anim;
    this.frame = 0;
    this.elapsed = 0;
    this.redraw();
  }

  face(x: number) {
    this.setFacing(x < this.x);
  }

  walkTo(x: number, y: number, then?: () => void) {
    this.target = { x, y, then };
  }

  cancelWalk() {
    this.target = null;
  }

  /** Direct control (arrow keys). Slides along the edge when blocked. */
  move(dx: number, dy: number, dt: number, canWalk: (x: number, y: number) => boolean) {
    const step = (SPEED * dt) / 1000 / Math.hypot(dx, dy);
    const nx = this.x + dx * step;
    const ny = this.y + dy * step;
    if (canWalk(nx, this.y)) this.x = nx;
    if (canWalk(this.x, ny)) this.y = ny;
    if (dx) this.setFacing(dx < 0);
    this.play('walk');
  }

  say(text: string) {
    this.bubble?.destroy();
    this.bubbleTimer?.remove();
    const emoji = isEmoji(text);
    const label = this.scene.add
      .text(0, -12, text, {
        fontFamily: emoji ? 'sans-serif' : FONT,
        fontSize: emoji ? '26px' : '12px',
        color: css('--c-ink'),
        align: 'center',
        wordWrap: { width: 150, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 1);
    const w = label.width + 18;
    const h = label.height + 10;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff).lineStyle(2, Phaser.Display.Color.HexStringToColor(css('--c-lavender')).color);
    g.fillRoundedRect(-w / 2, -h - 7, w, h, 8).strokeRoundedRect(-w / 2, -h - 7, w, h, 8);
    g.fillTriangle(-5, -8, 5, -8, 0, 0).lineBetween(-5, -7, 0, 0).lineBetween(5, -7, 0, 0);
    this.bubble = this.scene.add.container(0, 0, [g, label]).setScale(0.6);
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 180, ease: 'Back.out' });
    const bubble = this.bubble;
    this.bubbleTimer = this.scene.time.delayedCall(3500 + text.length * 70, () =>
      this.scene.tweens.add({ targets: bubble, alpha: 0, duration: 300, onComplete: () => bubble.destroy() }),
    );
    this.sync();
  }

  update(dt: number) {
    if (this.target) {
      const { x, y, then } = this.target;
      const dist = Math.hypot(x - this.x, y - this.y);
      const step = (SPEED * dt) / 1000;
      if (dist <= step) {
        this.x = x;
        this.y = y;
        this.target = null;
        this.play('idle');
        then?.();
      } else {
        this.x += ((x - this.x) / dist) * step;
        this.y += ((y - this.y) / dist) * step;
        if (Math.abs(x - this.x) > 2) this.setFacing(x < this.x);
        this.play('walk');
      }
    }

    const { fps, frames } = ANIMS[this.anim];
    this.elapsed += dt;
    if (this.elapsed >= 1000 / fps) {
      this.elapsed %= 1000 / fps;
      this.frame = (this.frame + 1) % frames.length;
      this.redraw();
    }
    this.sync();
  }

  private setFacing(left: boolean) {
    if (left === this.facingLeft) return;
    this.facingLeft = left;
    this.redraw();
  }

  private redraw() {
    const pose = ANIMS[this.anim].frames[this.frame];
    this.tex.context.clearRect(0, 0, AVATAR_W, AVATAR_H);
    renderAvatar(this.look, pose).paint(this.tex.context, 1, this.facingLeft !== !!pose.flip);
    this.tex.refresh();
  }

  private sync() {
    this.img.setPosition(this.x, this.y).setDepth(this.y);
    this.name.setPosition(this.x, this.y + 2).setDepth(this.y);
    this.bubble?.setPosition(this.x, this.y - HEAD_Y).setDepth(10000 + this.y);
  }
}
