import { fromGame } from '../bridge';
import { ACTIONS, type ActionId } from '../data/actions';
import type { AnimKey } from '../data/anims';
import type { Player } from '../data/character';
import { footprintsOf, type InteractionObject, type ThemeConfig } from '../data/themes';
import { findPath, isClear, isFree, type Footprint } from './path';
import type { Motion } from '../net/link';
import { KINDS } from './kinds';
import { FACE_CAMERA, SPEED, headingOf, objectYaw, screenToTile, type Tile } from './space';

/** One character in the world. Plain data, mutated by the Sim and read by the renderer every frame. */
export interface Agent {
  player: Player;
  isMe: boolean;
  /** Another real person: driven by what they send, not by the mock brain. */
  remote?: boolean;
  pos: Tile;
  /** Facing in radians, 0 = +ty (see space.ts). */
  heading: number;
  anim: AnimKey;
  action: ActionId | null;
  /** The object spot it's using (so others pick another one). */
  spot: Tile | null;
  /** Waypoints still to walk, and what to do on arrival. */
  route: Tile[];
  arrive?: () => void;
  timer?: Timer;
  /** Dancing: where it started (it stays near), the move it's on, until when, and where that move takes it. */
  groove?: { home: Tile; move: number; until: number; to: Tile | null };
}

/** Dance moves: the steps, how fast they carry you (tiles/s), twirling (rad/s), facing where you go. */
const MOVES: { anim: AnimKey; speed: number; spin?: number; travel?: boolean }[] = [
  { anim: 'dance', speed: 0.5 },
  { anim: 'danceSlide', speed: 1.1 },
  { anim: 'danceSpin', speed: 0.35, spin: 8 },
  { anim: 'danceHop', speed: 0.9, travel: true },
  { anim: 'danceDisco', speed: 0 },
];

/** How long you walk toward a door before going through it (the curtain falls meanwhile, see World). */
export const ENTER_MS = 650;

interface Timer {
  at: number;
  run: () => void;
  done?: boolean;
}

/**
 * The world's rules, independent of how it's drawn: walking (keys, taps,
 * routes around furniture), doing actions at objects, doors, and the mock
 * friends' little brains. Time only moves through `step()`.
 */
export class Sim {
  readonly agents = new Map<string, Agent>();
  readonly blocks: Footprint[];
  /** The object I'm standing by (its action buttons pop up), and who to tell when it changes. */
  near: InteractionObject | null = null;
  onNear?: (o: InteractionObject | null) => void;
  /** Last walk-to point (for the tap marker), with the time it was set. */
  marker: { at: Tile; time: number } | null = null;
  time = 0;
  private timers: Timer[] = [];

  constructor(readonly theme: ThemeConfig) {
    this.blocks = footprintsOf(theme);
  }

  get size() {
    return this.theme.background.size;
  }

  add(player: Player, at: Tile, isMe: boolean) {
    const agent: Agent = { player, isMe, pos: { ...at }, heading: FACE_CAMERA, anim: 'idle', action: null, spot: null, route: [] };
    this.agents.set(player.id, agent);
    return agent;
  }

  /** Mock friends start wandering and using things. */
  startFriends() {
    let i = 0;
    for (const a of this.agents.values()) if (!a.isMe && !a.remote) this.after(1500 + i++ * 1500, () => this.think(a));
  }

  /**
   * Someone else's latest state: they walk over to where they say they are (or
   * pop there if far / new), then play what they're doing. Returns true if new.
   */
  upsertRemote(player: Player, m: Motion) {
    let a = this.agents.get(player.id);
    const isNew = !a;
    if (!a) (a = this.add(player, m.pos, false)).remote = true;
    a.player = player;
    a.action = m.action;
    if (Math.hypot(m.pos.tx - a.pos.tx, m.pos.ty - a.pos.ty) > 3) a.pos = { ...m.pos };
    const arrive = (agent: Agent) => {
      agent.anim = m.anim;
      agent.heading = m.heading;
    };
    if (m.action === 'dance') arrive(a); // dancing as they go, not walking
    if (Math.hypot(m.pos.tx - a.pos.tx, m.pos.ty - a.pos.ty) < 0.02) {
      a.route = [];
      arrive(a);
    } else {
      a.route = [{ ...m.pos }];
      a.arrive = () => arrive(a);
    }
    return isNew;
  }

  after(ms: number, run: () => void): Timer {
    const t = { at: this.time + ms / 1000, run };
    this.timers.push(t);
    return t;
  }

  /** Outdoors: how far past the map the land goes (0 indoors). */
  get wild() {
    return this.theme.background.wild ?? 0;
  }

  free(t: Tile) {
    return isFree(t, this.size, this.blocks, this.wild);
  }

  /** Advance the world by `dt` seconds. `input` is the held arrow keys as a screen direction. */
  step(dt: number, me: Agent, input: { dx: number; dy: number }) {
    this.time += dt;
    const due = this.timers.filter((t) => !t.done && t.at <= this.time);
    this.timers = this.timers.filter((t) => !t.done && t.at > this.time);
    due.forEach((t) => ((t.done = true), t.run()));

    if (input.dx || input.dy) {
      if (me.action || me.route.length) this.stop(me);
      this.move(me, screenToTile(input.dx, input.dy), dt);
    } else if (!me.action && !me.route.length) me.anim = 'idle';

    for (const a of this.agents.values()) {
      if (a.action === 'dance' && !a.remote) this.groove(a, dt);
      this.walk(a, dt);
    }
    this.updateNear(me);
  }

  /** Nearest object within reach while I'm free to use it (not busy, not on my way somewhere). */
  private updateNear(me: Agent) {
    let near: InteractionObject | null = null;
    if (!me.route.length && !me.action) {
      let best = Infinity;
      for (const o of this.theme.interactionObjects) {
        const d = Math.hypot(o.at.tx - me.pos.tx, o.at.ty - me.pos.ty);
        if (d < (KINDS[o.kind].foot ?? 0.3) + 0.9 && d < best) [near, best] = [o, d];
      }
    }
    if (near !== this.near) {
      this.near = near;
      this.onNear?.(near);
    }
  }

  // ── walking ──────────────────────────────────────────────

  /** Direct control: slide along whatever blocks the way. */
  private move(a: Agent, dir: Tile, dt: number) {
    const len = Math.hypot(dir.tx, dir.ty);
    const step = (SPEED * dt) / len;
    const stuck = !this.free(a.pos); // never trap someone who's already inside a footprint
    const nx = { tx: a.pos.tx + dir.tx * step, ty: a.pos.ty };
    if (stuck || this.free(nx)) a.pos.tx = nx.tx;
    const ny = { tx: a.pos.tx, ty: a.pos.ty + dir.ty * step };
    if (stuck || this.free(ny)) a.pos.ty = ny.ty;
    a.heading = headingOf(dir.tx, dir.ty);
    a.anim = 'walk';
  }

  private walk(a: Agent, dt: number) {
    if (!a.route.length) return;
    const dancing = a.action === 'dance'; // (someone else's, catching up with where they've danced to)
    const to = a.route[0];
    const dx = to.tx - a.pos.tx, dy = to.ty - a.pos.ty;
    const dist = Math.hypot(dx, dy);
    const step = SPEED * dt;
    if (dist <= step) {
      a.pos = { ...to };
      a.route.shift();
      if (!a.route.length) {
        const then = a.arrive;
        a.arrive = undefined;
        if (!dancing) a.anim = 'idle';
        then?.();
      }
    } else {
      a.pos.tx += (dx / dist) * step;
      a.pos.ty += (dy / dist) * step;
      if (dancing) return;
      a.heading = headingOf(dx, dy);
      a.anim = 'walk';
    }
  }

  /** Dancing: a different move every couple of seconds, each one off somewhere near where it began. */
  private groove(a: Agent, dt: number) {
    const g = (a.groove ??= { home: { ...a.pos }, move: -1, until: 0, to: null });
    if (this.time >= g.until) {
      let m = Math.floor(Math.random() * (MOVES.length - (g.move < 0 ? 0 : 1)));
      if (g.move >= 0 && m >= g.move) m++; // never the same one twice running
      g.move = m;
      g.until = this.time + 1.6 + Math.random() * 1.2;
      g.to = null;
      for (let i = 0; i < 6 && !g.to; i++) {
        const turn = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.9;
        const t = { tx: g.home.tx + Math.cos(turn) * r, ty: g.home.ty + Math.sin(turn) * r };
        if (isClear(a.pos, t, this.size, this.blocks, this.wild)) g.to = t;
      }
      a.anim = MOVES[m].anim;
      if (!MOVES[m].spin) a.heading = FACE_CAMERA; // to the audience
    }
    const move = MOVES[g.move];
    if (move.spin) a.heading = (a.heading + move.spin * dt) % (Math.PI * 2);
    if (!g.to || !move.speed) return;
    const dx = g.to.tx - a.pos.tx, dy = g.to.ty - a.pos.ty;
    const dist = Math.hypot(dx, dy), step = move.speed * dt;
    if (move.travel) a.heading = headingOf(dx, dy);
    if (dist <= step) {
      a.pos = { ...g.to };
      g.to = null;
    } else {
      a.pos.tx += (dx / dist) * step;
      a.pos.ty += (dy / dist) * step;
    }
  }

  /** Walk around furniture to `to` (or as close as it gets), then `then`. Returns where it ends. */
  route(a: Agent, to: Tile, then?: () => void) {
    a.route = findPath(a.pos, to, this.size, this.blocks, this.wild);
    a.arrive = then;
    if (!a.route.length) {
      a.arrive = undefined;
      then?.();
    }
    return a.route.at(-1);
  }

  /** Clicked / tapped floor. */
  walkTo(a: Agent, to: Tile) {
    this.stop(a);
    const end = this.route(a, to);
    if (end) this.marker = { at: end, time: this.time };
  }

  // ── actions ──────────────────────────────────────────────

  perform(a: Agent, id: ActionId, objectId?: string) {
    const def = ACTIONS[id];
    const others = [...this.agents.values()].filter((o) => o !== a);
    const freeSpot = (o: InteractionObject) => o.spots.find((s) => !others.some((x) => x.spot === s));
    const dist = (o: InteractionObject) => Math.hypot(o.at.tx - a.pos.tx, o.at.ty - a.pos.ty);
    // the chosen object, else the nearest one offering this action that still has room
    const candidates = this.theme.interactionObjects
      .filter((o) => o.actions.includes(id) && (!objectId || o.id === objectId))
      .sort((x, y) => dist(x) - dist(y));
    const obj = candidates.find(freeSpot) ?? candidates[0];
    this.stop(a);
    const start = () => {
      if (obj) a.heading = this.faceFor(a.pos, obj);
      a.anim = def.anim;
      a.action = id;
      if (a.isMe) fromGame.emit('actionChange', id);
      if (def.durationMs) a.timer = this.after(def.durationMs, () => this.stop(a));
    };
    if (!obj) return start();
    a.spot = freeSpot(obj) ?? obj.spots[0];
    this.route(a, a.spot, start);
  }

  /**
   * Face the object — unless it's something you sit or stand on (no footprint:
   * benches, mats, loungers, treadmills), then face the way it faces.
   */
  private faceFor(at: Tile, o: InteractionObject) {
    const { foot, face = 0 } = KINDS[o.kind];
    return foot ? headingOf(o.at.tx - at.tx, o.at.ty - at.ty) : (o.yaw ?? objectYaw(o.at, !!this.theme.background.walls)) + face;
  }

  stop(a: Agent) {
    const had = a.action;
    if (a.timer) a.timer.done = true;
    a.groove = undefined;
    a.action = null;
    a.spot = null;
    a.route = [];
    a.arrive = undefined;
    a.anim = 'idle';
    if (a.isMe && had) fromGame.emit('actionChange', null);
  }

  /** On my way through a door (once is enough: a second tap doesn't go twice). */
  leaving = false;

  /**
   * Head for a door and, a few steps in, go through (no walking all the way across the
   * map first); React decides what's behind it. Returns false if already on the way.
   */
  goThrough(a: Agent, o: InteractionObject) {
    if (this.leaving) return false;
    this.leaving = true;
    this.stop(a);
    this.route(a, o.spots[0]);
    this.after(ENTER_MS, () => {
      this.leaving = false; // (a space still being built only shows its preview: you stay here)
      fromGame.emit('portal', o.enter!);
    });
    return true;
  }

  /** Mock friend brain: wander, use objects, repeat. */
  private think(a: Agent) {
    const r = Math.random();
    const n = this.size;
    if (r < 0.45) {
      this.stop(a);
      this.route(a, { tx: 0.8 + Math.random() * (n - 1.6), ty: 0.8 + Math.random() * (n - 1.6) });
    } else if (r < 0.85 || !a.action) {
      const ids = this.theme.availableActions;
      this.perform(a, ids[Math.floor(Math.random() * ids.length)]);
    }
    this.after(4000 + Math.random() * 5000, () => this.think(a));
  }
}
