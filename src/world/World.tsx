import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { fromGame, toGame } from '../bridge';
import { ACTIONS } from '../data/actions';
import { ANIMS } from '../data/anims';
import type { CharacterLook } from '../data/character';
import type { InteractionObject, ThemeConfig } from '../data/themes';
import { FRIENDS } from '../mock';
import type { Motion } from '../net/link';
import { supabase } from '../net/supabase';
import { useMoa } from '../store';
import s from '../styles/World.module.scss';
import { AvatarBody, SIT_BACK, SIT_UP, useAvatarPose, useJoints } from './Avatar3D';
import { gesture } from './camera';
import { CameraRig } from './CameraRig';
import { KINDS, type ArtKind } from './kinds';
import { Labels } from './labels';
import { Chair, MODELS } from './models';
import { Sim, type Agent } from './sim';
import { Stage } from './Stage';
import { T, headingOf, objectYaw, type Tile } from './space';
import { castShadows, glow } from './toon';

/**
 * The 3D world for one theme, filling its box. React → world commands and
 * world → React events go through bridge.ts; the rules live in Sim, this file
 * only draws it. Name tags, bubbles and signs are DOM labels over the canvas.
 */
export function World({ theme, className }: { theme: ThemeConfig; className?: string }) {
  const meLook = useMoa((st) => st.me.look);
  const peers = useMoa((st) => st.peers);
  const sim = useMemo(() => {
    const sim = new Sim(theme);
    const { me, last } = useMoa.getState();
    // back where I left off, if that's here and still free
    const at = last?.themeId === theme.themeId && sim.free(last.pos) ? last.pos : theme.spawnPosition;
    sim.add(me, at, true);
    if (!supabase) {
      // no server: two mock friends keep you company
      const s = theme.spawnPosition;
      FRIENDS.forEach((f, i) => sim.add(f, { tx: s.tx - 0.8 + i * 1.6, ty: s.ty + 0.8 - i * 1.6 }, false));
      sim.startFriends();
    }
    return sim;
  }, [theme]);
  const me = sim.agents.get(useMoa.getState().me.id)!;
  // people come and go: re-render the cast when they do (or change clothes)
  const [, recast] = useState(0);
  const agents = [...sim.agents.values()];
  const labels = useMemo(() => new Labels(), []);
  const bubbles = useBubbles();
  const [hover, setHover] = useState<InteractionObject | null>(null);
  const [near, setNear] = useState<InteractionObject | null>(null);
  const indoor = !!theme.background.walls;

  useEffect(() => {
    const offs = [
      toGame.on('act', ({ actionId, objectId }) => sim.perform(me, actionId, objectId)),
      toGame.on('stop', () => sim.stop(me)),
      toGame.on('peer', ({ player, ...motion }) => {
        const before = sim.agents.get(player.id)?.player.look;
        if (sim.upsertRemote(player, motion) || before !== player.look) recast((n) => n + 1);
      }),
      toGame.on('peerLeave', (id) => sim.agents.delete(id) && recast((n) => n + 1)),
    ];
    sim.onNear = setNear;
    if (import.meta.env.DEV) (window as unknown as { __moaSim: Sim }).__moaSim = sim; // for the browser tests
    return () => {
      offs.forEach((off) => off());
      sim.onNear = undefined;
    };
  }, [sim, me]);

  const pick = (o: InteractionObject) => (o.enter ? sim.goThrough(me, o) : fromGame.emit('objectClick', o.id));
  const above = (o: InteractionObject) => (): [number, number, number] => [o.at.tx * T, MODELS[o.kind].h + 0.3, o.at.ty * T];
  // door signs hang on the front wall above the door, where they stay in view
  const onFront = (o: InteractionObject) => (): [number, number, number] => [(o.at.tx + 0.42) * T, 2.15, (o.at.ty + 0.42) * T];
  const head = (a: Agent, up = 0) => (): [number, number, number] => [a.pos.tx * T, 1.58 + sinkOf(a) + up, a.pos.ty * T];

  return (
    <div className={className}>
      <Canvas flat shadows="percentage" dpr={[1, 2]} camera={{ fov: 32, near: 0.5, far: 200 }}>
        <Driver sim={sim} me={me} />
        <Stage bg={theme.background} onTap={(t) => walkTo(sim, me, t)} />
        {theme.decorations.map((d, i) => (
          <Thing key={`d${i}`} kind={d.kind} at={d.at} indoor={indoor} />
        ))}
        {theme.interactionObjects.map((o) => (
          <Thing key={o.id} kind={o.kind} at={o.at} indoor={indoor} color={o.color} onPick={() => pick(o)} onHover={(on) => setHover(on ? o : null)} />
        ))}
        {theme.interactionObjects
          .filter((o) => MODELS[o.kind].seats)
          .flatMap((o) => o.spots.map((at, i) => <Seat key={`${o.id}${i}`} at={at} facing={o.at} />))}
        {agents.map((a) => (
          <Character key={a.player.id} agent={a} look={a.isMe ? meLook : a.player.look} />
        ))}
        <TapMarker sim={sim} />
        <CameraRig sim={sim} me={me} />
        <LabelSync labels={labels} />
      </Canvas>

      <div className={s.labels}>
        {theme.interactionObjects
          .filter((o) => o.enter)
          .map((o) => (
            <Sign key={o.id} anchor={labels.bind(`sign:${o.id}`, onFront(o))} o={o} inside={peers.filter((p) => p.themeId === o.enter)} onPick={() => pick(o)} />
          ))}
        {hover && !hover.enter && hover !== near && (
          <span ref={labels.bind('hover', above(hover))} className={s.label}>
            {hover.icon} {hover.label}
          </span>
        )}
        {near && (
          // walked up to something: its actions pop up right there
          <div key={near.id} ref={labels.bind('near', near.enter ? onFront(near) : above(near))} className={s.near}>
            <strong>
              {near.icon} {near.label}
            </strong>
            {near.enter ? (
              <button onClick={() => sim.goThrough(me, near)}>🚪 들어가기</button>
            ) : (
              near.actions.map((id) => (
                <button key={id} onClick={() => sim.perform(me, id, near.id)}>
                  {ACTIONS[id].icon} {ACTIONS[id].label}
                </button>
              ))
            )}
          </div>
        )}
        {agents.map((a) => (
          <span key={a.player.id} ref={labels.bind(`tag:${a.player.id}`, head(a))} className={a.isMe ? `${s.tag} ${s.me}` : s.tag}>
            {a.player.nickname}
          </span>
        ))}
        {agents.map((a) => {
          const text = bubbles[a.player.id];
          if (!text) return null;
          const emoji = /^[\p{Extended_Pictographic}️‍\s]+$/u.test(text);
          return (
            <p key={`${a.player.id}${text}`} ref={labels.bind(`bubble:${a.player.id}`, head(a, 0.32))} className={emoji ? `${s.bubble} ${s.emoji}` : s.bubble}>
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/** A door's sign, with a bubble of who's inside right now. */
function Sign({ o, inside, anchor, onPick }: { o: InteractionObject; inside: { nickname: string }[]; anchor: (el: HTMLElement | null) => void; onPick: () => void }) {
  const names = inside.map((p) => p.nickname);
  return (
    <div ref={anchor} className={s.door}>
      {names.length > 0 && (
        <p className={s.inside}>
          {names.slice(0, 3).join(', ')}
          {names.length > 3 && ` 외 ${names.length - 3}명`}
        </p>
      )}
      <button className={s.sign} onClick={onPick}>
        {o.icon} {o.label}
        {names.length > 0 && <b>{names.length}</b>}
      </button>
    </div>
  );
}

/** Swimmers sit low in the water, sitters a touch lower: keep tags on their heads. */
const sinkOf = (a: Agent) => {
  const legs = ANIMS[a.anim].frames[0].legs;
  return legs === 'swim' ? -0.62 : legs === 'sit' ? SIT_UP : 0;
};

function walkTo(sim: Sim, me: Agent, t: Tile) {
  if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); // drop the phone keyboard
  sim.walkTo(me, t);
}

/** What each player said last, for a few seconds. */
function useBubbles() {
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const off = toGame.on('chat', ({ playerId, text }) => {
      setBubbles((b) => ({ ...b, [playerId]: text }));
      clearTimeout(timers.get(playerId));
      timers.set(
        playerId,
        setTimeout(() => setBubbles(({ [playerId]: _, ...rest }) => rest), 3500 + text.length * 70),
      );
    });
    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  }, []);
  return bubbles;
}

// ── things ────────────────────────────────────────────────────

interface ThingProps {
  kind: ArtKind;
  at: Tile;
  indoor: boolean;
  color?: string;
  onPick?: () => void;
  onHover?: (on: boolean) => void;
}

/** One placed object: its model turned to face the camera (or away from its wall), and a light if it glows. */
function Thing({ kind, at, indoor, color, onPick, onHover }: ThingProps) {
  const { Model, h, yaw } = MODELS[kind];
  const light = KINDS[kind].light;
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => castShadows(group.current));
  const over = (on: boolean) => {
    setHover(on);
    onHover?.(on);
    document.body.style.cursor = on ? 'pointer' : '';
  };
  const handlers = onPick && {
    // on release, and only if it was a tap (not the end of a drag / pinch)
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (!gesture.dragged) onPick();
    },
    onPointerOver: () => over(true),
    onPointerOut: () => over(false),
  };
  return (
    <group position={[at.tx * T, 0, at.ty * T]}>
      <group ref={group} rotation={[0, yaw ?? objectYaw(at, indoor), 0]} scale={hover ? 1.04 : 1} {...handlers}>
        <Model color={color} />
      </group>
      {light && <Glow color={light} y={Math.min(h, 1.2)} />}
    </group>
  );
}

/** A chair at a seat of a table / desk, turned towards it, just behind where the sitter's feet are. */
function Seat({ at, facing }: { at: Tile; facing: Tile }) {
  const group = useRef<THREE.Group>(null);
  useLayoutEffect(() => castShadows(group.current));
  const yaw = headingOf(facing.tx - at.tx, facing.ty - at.ty);
  return (
    <group ref={group} position={[at.tx * T - Math.sin(yaw) * SIT_BACK, 0, at.ty * T - Math.cos(yaw) * SIT_BACK]} rotation={[0, yaw, 0]}>
      <Chair />
    </group>
  );
}

/** Warm flickering light around fires, candles, lamps. */
function Glow({ color, y }: { color: string; y: number }) {
  const light = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 3 + Math.sin(clock.elapsedTime * 7 + seed) * 0.4 + Math.sin(clock.elapsedTime * 13 + seed) * 0.25;
  });
  return <pointLight ref={light} color={color} position={[0, y, 0]} distance={7} decay={1.6} />;
}

// ── characters ────────────────────────────────────────────────

function Character({ agent, look }: { agent: Agent; look: CharacterLook }) {
  const joints = useJoints();
  const root = useRef<THREE.Group>(null);
  useAvatarPose(joints, look, () => agent.anim);
  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    g.position.set(agent.pos.tx * T, 0, agent.pos.ty * T);
    const turn = Math.atan2(Math.sin(agent.heading - g.rotation.y), Math.cos(agent.heading - g.rotation.y));
    g.rotation.y += turn * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
  });
  return (
    <group ref={root} position={[agent.pos.tx * T, 0, agent.pos.ty * T]} rotation={[0, agent.heading, 0]}>
      <AvatarBody look={look} joints={joints} />
    </group>
  );
}

/** Ring that ripples out where you tapped to walk. */
function TapMarker({ sim }: { sim: Sim }) {
  const ring = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => glow('#ffffff', 0.9).clone() as THREE.MeshBasicMaterial, []);
  useFrame(() => {
    const m = sim.marker, r = ring.current;
    if (!r) return;
    const t = m ? (sim.time - m.time) / 0.5 : 1;
    r.visible = t < 1;
    if (!m || t >= 1) return;
    r.position.set(m.at.tx * T, 0.03, m.at.ty * T);
    r.scale.setScalar(0.6 + t * 0.8);
    mat.opacity = 0.9 * (1 - t);
  });
  return (
    <mesh ref={ring} material={mat} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.32, 0.42, 32]} />
    </mesh>
  );
}

// ── input, camera, labels ─────────────────────────────────────

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

/** Runs the simulation every frame with the held arrow / WASD keys, and reports where I am. */
function Driver({ sim, me }: { sim: Sim; me: Agent }) {
  const held = useRef(new Set<string>());
  const sent = useRef({ at: -Infinity, key: '' });
  useEffect(() => {
    const typing = () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    const down = (e: KeyboardEvent) => {
      if (!KEYS[e.code] || typing()) return;
      held.current.add(e.code);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    const clear = () => held.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);
  useFrame((_, dt) => {
    let dx = 0, dy = 0;
    held.current.forEach((k) => ((dx += KEYS[k][0]), (dy += KEYS[k][1])));
    sim.step(Math.min(dt, 0.1), me, { dx, dy });
    // tell the room (≤ 10×/s, and only when something changed — or every 3 s as a keep-alive)
    const motion: Motion = { pos: { tx: +me.pos.tx.toFixed(2), ty: +me.pos.ty.toFixed(2) }, heading: +me.heading.toFixed(2), anim: me.anim, action: me.action };
    const key = JSON.stringify(motion);
    const since = sim.time - sent.current.at;
    if (since > 0.1 && (key !== sent.current.key || since > 3)) {
      sent.current = { at: sim.time, key };
      fromGame.emit('moved', motion);
    }
  });
  return null;
}

/** Moves the DOM labels after the camera has moved (mounted last, so it runs last). */
function LabelSync({ labels }: { labels: Labels }) {
  const { camera, size } = useThree();
  useFrame(() => labels.sync(camera, size.width, size.height));
  // dev-only seam for the browser tests: where a tile (at some height) is on screen
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __moa: object }).__moa = {
      toScreen: (tx: number, ty: number, y = 0) => {
        const v = new THREE.Vector3(tx * T, y, ty * T).project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
  }, [camera, size]);
  return null;
}
