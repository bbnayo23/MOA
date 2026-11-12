import Phaser from 'phaser';
import { AVATAR_FOOT, AVATAR_H, AVATAR_W, renderAvatar } from '../art/avatar';
import type { ActionId } from '../data/actions';
import { ANIMS, type AnimKey } from '../data/anims';
import type { CharacterLook, Player } from '../data/character';
import { bubbleBox, bubbleTextStyle, nameTagStyle } from '../styles/game';
import { S, type Tile } from './iso';

const SPEED = 130; // screen px / s
const HEAD_Y = (AVATAR_FOOT - 2) * S; // feet → top of head
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
  /** Waypoints still to walk (world px), and what to do on arrival. */
  private route: { x: number; y: number }[] = [];
  private arrive?: () => void;

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
    this.name = scene.add.text(x, y, player.nickname, nameTagStyle(isMe)).setOrigin(0.5, 0);
    this.redraw();
    this.sync();
  }

  get walking() {
    return this.route.length > 0;
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

  /** Walk the waypoints in order, then call `then` (right away if there's nowhere to go). */
  walkPath(points: { x: number; y: number }[], then?: () => void) {
    this.route = [...points];
    this.arrive = then;
    if (!points.length) this.arrived();
  }

  cancelWalk() {
    this.route = [];
    this.arrive = undefined;
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
    const b = bubbleBox();
    const label = this.scene.add
      .text(0, -(b.tail + b.padY), text, bubbleTextStyle(isEmoji(text)))
      .setOrigin(0.5, 1)
      .setResolution(this.scene.cameras.main.zoom);
    const w = label.width + b.padX * 2;
    const h = label.height + b.padY * 2;
    const g = this.scene.add.graphics();
    g.fillStyle(b.fill).lineStyle(b.line, b.stroke);
    g.fillRoundedRect(-w / 2, -h - b.tail, w, h, b.radius).strokeRoundedRect(-w / 2, -h - b.tail, w, h, b.radius);
    g.fillTriangle(-5, -b.tail - 1, 5, -b.tail - 1, 0, 0).lineBetween(-5, -b.tail, 0, 0).lineBetween(5, -b.tail, 0, 0);
    this.bubble = this.scene.add.container(0, 0, [g, label]).setScale(b.popFrom);
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: b.popMs, ease: 'Back.out' });
    const bubble = this.bubble;
    this.bubbleTimer = this.scene.time.delayedCall(3500 + text.length * 70, () =>
      this.scene.tweens.add({ targets: bubble, alpha: 0, duration: b.fadeMs, onComplete: () => bubble.destroy() }),
    );
    this.sync();
  }

  update(dt: number) {
    if (this.route.length) {
      const { x, y } = this.route[0];
      const dist = Math.hypot(x - this.x, y - this.y);
      const step = (SPEED * dt) / 1000;
      if (dist <= step) {
        this.x = x;
        this.y = y;
        this.route.shift();
        if (!this.route.length) this.arrived();
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

  private arrived() {
    const then = this.arrive;
    this.arrive = undefined;
    this.play('idle');
    then?.();
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
