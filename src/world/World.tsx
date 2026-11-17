import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { fromGame, toGame } from '../bridge';
import { ACTIONS } from '../data/actions';
import { ANIMS } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { THEME_CONFIGS, type InteractionObject, type ThemeConfig } from '../data/themes';
import { FRIENDS } from '../mock';
import type { Motion } from '../net/link';
import { supabase } from '../net/supabase';
import { roomOf, useMoa } from '../store';
import s from '../styles/World.module.scss';
import { hideSplash } from '../ui/splash';
import { AvatarBody, moodOf, NIGHT_TINT, SIT_BACK, SIT_UP, TAG_Y, useAvatarPose, useJoints, type Mood } from './Avatar';
import { gesture } from './camera';
import { CameraRig } from './CameraRig';
import { KINDS, type ArtKind } from './kinds';
import { Labels } from './labels';
import { Chair, MODELS } from './models';
import { PIXEL_GL, PixelPost } from './pixel';
import { ENTER_MS, Sim, type Agent } from './sim';
import { Stage } from './Stage';
import { FACE_CAMERA, T, headingOf, objectYaw, type Tile } from './space';
import { castShadows, glow } from './toon';

/**
 * The 3D world for one theme, filling its box. React → world commands and
 * world → React events go through bridge.ts; the rules live in Sim, this file
 * only draws it. Name tags, bubbles and signs are DOM labels over the canvas.
 */
/**
 * `paused`: a minigame covers the world — stop drawing it (and walking in it) meanwhile.
 * `raised`: a game card covers the bottom of it — keep me in view above it.
 */
export function World({ theme, className, paused = false, raised = false }: { theme: ThemeConfig; className?: string; paused?: boolean; raised?: boolean }) {
  const meLook = useMoa((st) => st.me.look);
  const peers = useMoa((st) => st.peers);
  const roomId = useMoa((st) => roomOf(st).id);
  const sim = useMemo(() => {
    const sim = new Sim(theme);
    const { me, last } = useMoa.getState();
    // back where I left off, if that's here and still free; otherwise a step or so from the
    // entrance, so friends arriving together (joining a room) don't stand inside each other
    const s0 = theme.spawnPosition;
    const near = { tx: s0.tx + Math.random() * 1.6 - 0.8, ty: s0.ty + Math.random() * 1.6 - 0.8 };
    const at = last?.themeId === theme.themeId && sim.free(last.pos) ? last.pos : sim.free(near) ? near : s0;
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
  // zoomed well out the space is small on screen: signs shrink to their icon, other tags hide
  const [far, setFar] = useState(false);
  useEffect(() => fromGame.on('zoomLevel', (z) => setFar(z.pct < 50)), []);
  const bubbles = useBubbles();
  const moods = useMoods();
  const [hover, setHover] = useState<InteractionObject | null>(null);
  // the picture's resolution follows the zoom (see CameraRig)
  const [dpr, setDpr] = useState(0.4);
  const [near, setNear] = useState<InteractionObject | null>(null);
  const indoor = !!theme.background.walls;
  // a curtain over the world while a space opens (until its first frames are drawn), falling as you take a door
  const [ready, setReady] = useState<ThemeConfig | null>(null);
  const [going, setGoing] = useState<ThemeConfig | null>(null);
  useEffect(() => {
    if (ready) hideSplash(); // the very first time, the page's loading screen stands in for it
  }, [ready]);

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
    // a new space: nothing from the last one is near or hovered any more
    setNear(sim.near);
    setHover(null);
    setGoing(null);
    sim.onNear = setNear;
    if (import.meta.env.DEV) (window as unknown as { __moaSim: Sim }).__moaSim = sim; // for the browser tests
    return () => {
      offs.forEach((off) => off());
      sim.onNear = undefined;
    };
  }, [sim, me]);

  const enter = (o: InteractionObject) => {
    const to = THEME_CONFIGS[o.enter!]; // a space still being built only shows its preview: no curtain for that
    if (sim.goThrough(me, o) && to) setGoing(to);
  };
  const pick = (o: InteractionObject) => (o.enter ? enter(o) : fromGame.emit('objectClick', o.id));
  const curtain = going ?? theme;
  const above = (o: InteractionObject) => (): [number, number, number] => [o.at.tx * T, MODELS[o.kind].h + 0.3, o.at.ty * T];
  // door signs hang on the front wall above the door, where they stay in view (a shop's: on its sign band)
  const onFront = (o: InteractionObject) => (): [number, number, number] => {
    const yaw = o.yaw ?? FACE_CAMERA, out = o.kind === 'shop' ? 0.85 : 0.6;
    return [(o.at.tx + Math.sin(yaw) * out) * T, o.kind === 'shop' ? 3.0 : 2.15, (o.at.ty + Math.cos(yaw) * out) * T];
  };
  const head = (a: Agent) => (): [number, number, number] => [a.pos.tx * T, TAG_Y + sinkOf(a), a.pos.ty * T];

  return (
    <div className={className}>
      <Canvas flat orthographic shadows="basic" gl={PIXEL_GL} dpr={dpr} camera={{ near: 1, far: 300, position: [60, 60, 60] }} frameloop={paused ? 'never' : 'always'}>
        <Driver sim={sim} me={me} />
        <Ready theme={theme} onReady={setReady} />
        <Stage bg={theme.background} onTap={(t) => walkTo(sim, me, t)} />
        {theme.decorations.map((d, i) => (
          <Thing key={`d${i}`} kind={d.kind} at={d.at} yaw={d.yaw} indoor={indoor} night={theme.background.night} color={d.color} />
        ))}
        {theme.interactionObjects.map((o) => (
          <Thing key={o.id} kind={o.kind} at={o.at} yaw={o.yaw} indoor={indoor} night={theme.background.night} color={o.color} onPick={() => pick(o)} onHover={(on) => setHover(on ? o : null)} />
        ))}
        {theme.interactionObjects
          .filter((o) => MODELS[o.kind].seats)
          .flatMap((o) => o.spots.map((at, i) => <Seat key={`${o.id}${i}`} at={at} facing={o.at} />))}
        {agents.map((a) => (
          <Character key={a.player.id} agent={a} look={a.isMe ? meLook : a.player.look} mood={() => moods(a.player.id)} tint={theme.background.night ? NIGHT_TINT : undefined} />
        ))}
        <TapMarker sim={sim} />
        <CameraRig sim={sim} me={me} raised={raised} onDpr={setDpr} />
        <LabelSync labels={labels} />
        <PixelPost />
      </Canvas>

      <div className={far ? `${s.labels} ${s.far}` : s.labels}>
        {theme.interactionObjects
          .filter((o) => o.enter)
          .map((o) => (
            <Sign key={o.id} anchor={labels.bind(`sign:${o.id}`, onFront(o))} o={o} inside={peers.filter((p) => p.room.id === roomId && p.themeId === o.enter)} onPick={() => pick(o)} />
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
              <button onClick={() => enter(near)}>🚪 들어가기</button>
            ) : (
              near.actions.map((id) => (
                <button key={id} onClick={() => sim.perform(me, id, near.id)}>
                  {ACTIONS[id].icon} {ACTIONS[id].label}
                </button>
              ))
            )}
          </div>
        )}
        {agents.map((a) =>
          a.isMe ? (
            <span key={a.player.id} ref={labels.bind(`tag:${a.player.id}`, head(a))} className={`${s.tag} ${s.me}`}>
              {a.player.nickname}
            </span>
          ) : (
            // a name tag is the easy thing to tap on a phone: their card
            <button key={a.player.id} ref={labels.bind(`tag:${a.player.id}`, head(a))} className={s.tag} onClick={() => fromGame.emit('playerClick', a.player.id)}>
              {a.player.nickname}
            </button>
          ),
        )}
        {/* oldest first, so the latest line is drawn on top where bubbles overlap */}
        {Object.entries(bubbles).map(([id, text]) => {
          const a = sim.agents.get(id);
          if (!a) return null;
          const emoji = /^[\p{Extended_Pictographic}️‍\s]+$/u.test(text);
          return (
            <p key={`${id}${text}`} ref={labels.bind(`bubble:${id}`, head(a))} className={emoji ? `${s.bubble} ${s.emoji}` : s.bubble}>
              {text}
            </p>
          );
        })}
      </div>

      {/* keyed by the place: a new one starts covered (or, taking a door, falls over the old one first) */}
      <div
        key={curtain.themeId}
        className={`${s.curtain} ${going ? s.falling : ready === theme ? s.lifted : ''}`}
        style={{ background: curtain.background.sky[0], animationDuration: `${ENTER_MS}ms` }}
        role="status"
        aria-hidden={!going && ready === theme}
      >
        <p className={s.place}>
          <span>{curtain.emoji}</span>
          {curtain.name}
        </p>
        <i className={s.loading} aria-label="불러오는 중" />
      </div>
    </div>
  );
}

/**
 * If the world can't be drawn (no WebGL on this device or browser, or it broke): say so in its place,
 * instead of a blank page under a loading screen that never goes. Everything over it (chat, friends…) still works.
 */
export class WorldGuard extends Component<{ className?: string; children: ReactNode }, { broken: boolean }> {
  state = { broken: false };
  static getDerivedStateFromError() {
    return { broken: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    hideSplash();
  }
  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <div className={this.props.className}>
        <div className={s.broken} role="alert">
          <strong>화면을 그릴 수 없어요</strong>
          <p>이 기기나 브라우저에서 3D 그래픽(WebGL)을 쓸 수 없어요. 브라우저를 최신으로 바꾸거나 다른 브라우저로 열어 주세요. 채팅과 친구 기능은 그대로 쓸 수 있어요.</p>
          <button onClick={() => location.reload()}>다시 시도</button>
        </div>
      </div>
    );
  }
}

/** Says when a space's first frames are drawn (its models built, their shaders compiled): the curtain can lift. */
function Ready({ theme, onReady }: { theme: ThemeConfig; onReady: (t: ThemeConfig) => void }) {
  const frames = useRef(0);
  useLayoutEffect(() => void (frames.current = 0), [theme]);
  useFrame(() => {
    if (++frames.current === 3) onReady(theme);
  });
  return null;
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
      <button className={s.sign} onClick={onPick} aria-label={names.length ? `${o.label} ${names.length}명` : o.label}>
        {o.icon}
        <span> {o.label}</span>
        {names.length > 0 && <b>{names.length}</b>}
      </button>
    </div>
  );
}

/** Swimmers sit low in the water, sitters a touch lower: keep tags on their heads. */
const sinkOf = (a: Agent) => {
  const legs = ANIMS[a.anim].frames[0].legs;
  return legs === 'swim' ? -0.62 : legs === 'sit' ? SIT_UP : a.anim === 'jump' ? 0.55 : 0; // a jump: the tag goes up with them
};

function walkTo(sim: Sim, me: Agent, t: Tile) {
  if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); // drop the phone keyboard
  sim.walkTo(me, t);
}

/** A face to go with what someone just said (❤️ → heart eyes, 😮 → wide eyes …), for a few seconds. */
function useMoods() {
  const moods = useMemo(() => new Map<string, { mood: Mood; until: number }>(), []);
  useEffect(
    () =>
      toGame.on('chat', ({ playerId, text }) => {
        const mood = moodOf(text);
        if (mood) moods.set(playerId, { mood, until: performance.now() + 3200 });
      }),
    [moods],
  );
  return (id: string) => {
    const m = moods.get(id);
    return m && m.until > performance.now() ? m.mood : null;
  };
}

/** What each player said last, for a few seconds. */
function useBubbles() {
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const off = toGame.on('chat', ({ playerId, text }) => {
      // re-added at the end: newest last
      setBubbles(({ [playerId]: _, ...b }) => ({ ...b, [playerId]: text }));
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
  yaw?: number;
  indoor: boolean;
  night?: boolean;
  color?: string;
  onPick?: () => void;
  onHover?: (on: boolean) => void;
}

/** One placed object: its model turned to face the camera (or away from its wall), and a light if it glows. */
function Thing({ kind, at, yaw: turned, indoor, night, color, onPick, onHover }: ThingProps) {
  const { Model, h } = MODELS[kind];
  const yaw = turned ?? MODELS[kind].yaw;
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
      {/* light pools only by night (by day a cel-shaded pool reads as a yellow disc on the floor) */}
      {light && night && <Glow color={light} y={Math.min(h, 1.2)} />}
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
    if (light.current) light.current.intensity = 1.8 + Math.sin(clock.elapsedTime * 7 + seed) * 0.25 + Math.sin(clock.elapsedTime * 13 + seed) * 0.15;
  });
  return <pointLight ref={light} color={color} position={[0, y, 0]} distance={5.5} decay={1.6} />;
}

// ── characters ────────────────────────────────────────────────

function Character({ agent, look, mood, tint }: { agent: Agent; look: CharacterLook; mood: () => Mood | null; tint?: string }) {
  const joints = useJoints();
  const root = useRef<THREE.Group>(null);
  useAvatarPose(joints, look, () => agent.anim, mood);
  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    g.position.set(agent.pos.tx * T, 0, agent.pos.ty * T);
    const turn = Math.atan2(Math.sin(agent.heading - g.rotation.y), Math.cos(agent.heading - g.rotation.y));
    g.rotation.y += turn * (1 - Math.exp(-Math.min(dt, 0.1) * 12));
  });
  // someone else: tap them for their card (on release, and only a tap — not a drag / pinch)
  const handlers = !agent.isMe && {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (!gesture.dragged) fromGame.emit('playerClick', agent.player.id);
    },
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => (document.body.style.cursor = ''),
  };
  return (
    <group ref={root} position={[agent.pos.tx * T, 0, agent.pos.ty * T]} rotation={[0, agent.heading, 0]} {...handlers}>
      <AvatarBody look={look} joints={joints} tint={tint} />
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
  const { camera, size, scene } = useThree();
  useFrame(() => labels.sync(camera, size.width, size.height));
  // dev-only seam for the browser tests: where a tile (at some height) is on screen
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __moa: object }).__moa = {
      scene,
      toScreen: (tx: number, ty: number, y = 0) => {
        const v = new THREE.Vector3(tx * T, y, ty * T).project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
  }, [camera, size, scene]);
  return null;
}
