import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ART, type Mood } from "./Avatar";
import type { Agent, Sim } from "./sim";
import { T } from "./space";

/**
 * Little pixel icons coming off people as they do things: dust as they walk outdoors,
 * notes as they dance, hearts as they wave (or say ❤️), drops in the water, sweat at the
 * gym, sparkles as they pray, Zzz in the tent. Everyone's, so you see what friends are up to.
 */

type Icon = "puff" | "heart" | "note" | "star" | "drop" | "sweat" | "z";
const ART_OF: Record<Icon, { c: string; rows: string[]; outline?: false }> = {
  puff: {
    c: "#efe2c8",
    rows: [".##.", "####", "####", ".##."],
    outline: false,
  },
  heart: { c: "#ff6f91", rows: [".#.#.", "#####", "#####", ".###.", "..#.."] },
  note: { c: "#8d7bff", rows: ["..##", "..#.", "..#.", "###.", "##.."] },
  star: { c: "#ffd166", rows: ["..#..", ".###.", "#####", ".###.", "..#.."] },
  drop: { c: "#8fd3ff", rows: [".#.", "###", "###", ".#."] },
  sweat: { c: "#bfe9ff", rows: [".#.", "###", ".#."] },
  z: { c: "#cbb8ff", rows: ["####", "..#.", ".#..", "####"] },
};
const INK = "#3b3150";

/** An icon as a crisp texture, with the same dark outline the characters have. */
function iconMaterial({ c, rows, outline }: (typeof ART_OF)[Icon]) {
  const w = rows[0].length + 2,
    h = rows.length + 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;
  const on = (x: number, y: number) => rows[y - 1]?.[x - 1] === "#";
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const near = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1);
      g.fillStyle = on(x, y) ? c : INK;
      if (on(x, y) || (outline !== false && near)) g.fillRect(x, y, 1, 1);
    }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.colorSpace = THREE.SRGBColorSpace;
  // over-the-head ones stay in sight, like name tags; dust and splashes sit in the scene
  const onTop = c !== ART_OF.puff.c && c !== ART_OF.drop.c;
  return {
    mat: new THREE.SpriteMaterial({
      map,
      transparent: true,
      depthWrite: false,
      depthTest: !onTop,
    }),
    size: w / ART,
  };
}

interface Bit {
  icon: Icon;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Pull down (drops) or none (things that float up). */
  fall: number;
  age: number;
  life: number;
  scale: number;
}

const MAX = 90;
const rnd = (a: number) => (Math.random() * 2 - 1) * a;

/** Standing in the pool's water (a stretch like a rug: within half its width of the line). */
function wet(
  p: { tx: number; ty: number },
  w?: {
    from: { tx: number; ty: number };
    to: { tx: number; ty: number };
    width: number;
  },
) {
  if (!w) return false;
  const dx = w.to.tx - w.from.tx,
    dy = w.to.ty - w.from.ty;
  const k = Math.max(
    0,
    Math.min(
      1,
      ((p.tx - w.from.tx) * dx + (p.ty - w.from.ty) * dy) /
        (dx * dx + dy * dy || 1),
    ),
  );
  return (
    Math.hypot(p.tx - w.from.tx - k * dx, p.ty - w.from.ty - k * dy) <=
    w.width / 2
  );
}

/** Every so often while they keep at it: what comes off them, how often (s), and from where. */
const BY_ANIM: Partial<
  Record<string, { icon: Icon; every: number; at: "feet" | "head" | "body" }>
> = {
  dance: { icon: "note", every: 0.35, at: "head" },
  wave: { icon: "heart", every: 0.55, at: "head" },
  swim: { icon: "drop", every: 0.18, at: "body" },
  splash: { icon: "drop", every: 0.1, at: "body" },
  tube: { icon: "drop", every: 0.4, at: "body" },
  workout: { icon: "sweat", every: 0.7, at: "head" },
  run: { icon: "sweat", every: 0.6, at: "head" },
  squat: { icon: "sweat", every: 0.7, at: "head" },
  pray: { icon: "star", every: 0.7, at: "head" },
  candle: { icon: "star", every: 0.5, at: "head" },
  eat: { icon: "heart", every: 1.4, at: "head" },
  drink: { icon: "heart", every: 1.6, at: "head" },
};

/**
 * `top`: how high someone's head is (they sink when sitting or swimming);
 * `mood`: what they just said, as a face (❤️ → hearts).
 */
export function Fx({
  sim,
  top,
  mood,
  dust,
}: {
  sim: Sim;
  top: (a: Agent) => number;
  mood: (id: string) => Mood | null;
  dust: boolean;
}) {
  const { group, sprites, mats } = useMemo(() => {
    const group = new THREE.Group();
    const mats = Object.fromEntries(
      (Object.keys(ART_OF) as Icon[]).map((k) => [k, iconMaterial(ART_OF[k])]),
    ) as Record<Icon, ReturnType<typeof iconMaterial>>;
    const sprites = Array.from({ length: MAX }, () => {
      const s = new THREE.Sprite(mats.puff.mat);
      s.visible = false;
      s.renderOrder = 5;
      group.add(s);
      return s;
    });
    return { group, sprites, mats };
  }, []);
  useEffect(
    () => () =>
      Object.values(mats).forEach(
        ({ mat }) => (mat.map!.dispose(), mat.dispose()),
      ),
    [mats],
  );
  // a new space starts its clock at 0: start these over with it
  const state = useMemo(
    () => ({
      bits: [] as Bit[],
      next: new Map<string, number>(),
      was: new Map<string, string>(),
    }),
    [sim],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = sim.time;
    const { bits, next, was } = state;
    const add = (
      a: Agent,
      icon: Icon,
      at: "feet" | "head" | "body",
      extra: Partial<Bit> = {},
    ) => {
      if (bits.length >= MAX) return;
      const y =
        at === "feet"
          ? 0.08
          : at === "body"
            ? 0.35 + top(a) * 0.2
            : top(a) + 0.15;
      const drop = icon === "drop" || icon === "sweat";
      // round them, not over their face
      const turn = Math.random() * Math.PI * 2,
        r =
          at === "body"
            ? 0.45 + Math.random() * 0.2
            : at === "head"
              ? Math.random() * 0.25
              : Math.random() * 0.3;
      bits.push({
        icon,
        x: a.pos.tx * T + Math.cos(turn) * r,
        y,
        z: a.pos.ty * T + Math.sin(turn) * r,
        vx: rnd(0.35),
        vy: drop ? 1.3 + Math.random() * 0.8 : 0.55 + Math.random() * 0.3,
        vz: rnd(0.2),
        fall: drop ? 4.5 : 0,
        age: 0,
        life: icon === "puff" ? 0.45 : drop ? 0.6 : 1.3,
        scale: 1,
        ...extra,
      });
    };

    for (const a of sim.agents.values()) {
      const id = a.player.id;
      const anim = a.anim;
      const prev = was.get(id);
      // starting a jump: a puff of dust on take-off
      if (anim === "jump" && prev !== "jump")
        for (let i = 0; i < 5; i++)
          add(a, "puff", "feet", {
            vx: rnd(0.9),
            vz: rnd(0.9),
            vy: 0.15,
            life: 0.5,
          });
      const m = mood(id);
      if (m === "love" && was.get(`${id}:mood`) !== "love")
        for (let i = 0; i < 4; i++)
          add(a, "heart", "head", { vy: 0.6 + i * 0.15 });
      was.set(id, anim);
      was.set(`${id}:mood`, m ?? "");

      const walking =
        anim === "walk" &&
        (wet(a.pos, sim.theme.background.water)
          ? ({ icon: "drop", every: 0.2, at: "feet" } as const)
          : dust && ({ icon: "puff", every: 0.22, at: "feet" } as const));
      const rule =
        a.action === "rest"
          ? ({ icon: "z", every: 0.9, at: "head" } as const)
          : anim === "walk"
            ? walking || undefined
            : BY_ANIM[anim];
      if (!rule) continue;
      if ((next.get(id) ?? 0) > now) continue;
      next.set(id, now + rule.every * (0.8 + Math.random() * 0.4));
      if (rule.icon === "z")
        add(a, "z", "head", { vx: 0.25, vy: 0.35, life: 1.6 });
      else if (rule.icon === "puff")
        add(a, "puff", "feet", { vx: rnd(0.15), vy: 0.35, vz: rnd(0.15) });
      else add(a, rule.icon, rule.at);
    }

    // move them on; the gone ones drop out
    let n = 0;
    for (const b of bits) {
      b.age += dt;
      if (b.age >= b.life) continue;
      b.vy -= b.fall * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      if (b.y < 0.02 && b.fall) continue; // a drop back in the water / on the floor
      bits[n++] = b;
    }
    bits.length = n;

    sprites.forEach((s, i) => {
      const b = bits[i];
      s.visible = !!b;
      if (!b) return;
      const k = b.age / b.life;
      // pop in, hold, shrink away (no fading: it's pixel art); dust swells as it goes
      const pop = Math.min(1, b.age / 0.08);
      const shrink = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      const swell = b.icon === "puff" ? 1 + k * 0.6 : 1;
      const { mat, size } = mats[b.icon];
      s.material = mat;
      s.position.set(b.x, b.y, b.z);
      s.scale.setScalar(
        size * 1.7 * b.scale * Math.max(0.01, pop * shrink * swell),
      );
    });
  });

  return <primitive object={group} />;
}
