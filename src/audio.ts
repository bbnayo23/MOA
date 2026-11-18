import { fromGame, toGame } from './bridge';
import { ACTIONS, type ActionId } from './data/actions';
import { THEME_CONFIGS, type ThemeId } from './data/themes';
import { useMoa } from './store';

/**
 * Sound, made on the spot with Web Audio (no files): small effects for what happens,
 * and a soft tune for each space. Browsers play nothing before a tap or key, so it
 * wakes on the first one; 설정 turns effects and music off separately.
 */

let ctx: AudioContext | null = null;
let fxBus: GainNode;
let musicBus: GainNode;
let white: AudioBuffer;

/** A MIDI note's pitch (60: middle C). */
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface Voice {
  /** Seconds from now. */
  at?: number;
  vol?: number;
  type?: OscillatorType;
  /** Slide to this pitch (tone) / filter frequency (noise) by the end. */
  to?: number;
  attack?: number;
  bus?: GainNode;
}

/** A note that rises in `attack` and dies away over `dur`. */
function envelope(c: AudioContext, t: number, dur: number, v: Voice) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v.vol ?? 0.1, t + (v.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(v.bus ?? fxBus);
  return g;
}

function tone(f: number, dur: number, v: Voice = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + (v.at ?? 0);
  const o = ctx.createOscillator();
  o.type = v.type ?? 'triangle';
  o.frequency.setValueAtTime(f, t);
  if (v.to) o.frequency.exponentialRampToValueAtTime(v.to, t + dur);
  o.connect(envelope(ctx, t, dur, v));
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Filtered hiss: steps, splashes, the ball off the strings, a crowd. */
function noise(dur: number, freq: number, v: Voice & { q?: number; filter?: BiquadFilterType } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + (v.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = white;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = v.filter ?? 'bandpass';
  f.Q.value = v.q ?? 1;
  f.frequency.setValueAtTime(freq, t);
  if (v.to) f.frequency.exponentialRampToValueAtTime(v.to, t + dur);
  src.connect(f).connect(envelope(ctx, t, dur, v));
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

const indoors = () => !!THEME_CONFIGS[useMoa.getState().themeId!]?.background.walls;
const arp = (notes: number[], gap: number, dur: number, v: Voice = {}) => notes.forEach((m, i) => tone(hz(m), dur, { ...v, at: (v.at ?? 0) + i * gap }));

const SFX = {
  /** A button pressed. */
  tap: () => tone(hz(84), 0.05, { vol: 0.05 }),
  step: () => (indoors() ? noise(0.04, 2200, { vol: 0.05, q: 2 }) : noise(0.06, 650, { vol: 0.06, q: 0.7 })),
  /** Through a door into another space. */
  door: () => {
    arp([72, 76, 79, 84], 0.06, 0.3, { vol: 0.07 });
    noise(0.4, 500, { vol: 0.03, to: 2600, q: 0.6, attack: 0.15 });
  },
  /** Someone's speech bubble. */
  pop: () => tone(hz(79), 0.08, { type: 'sine', to: hz(86), vol: 0.07 }),
  /** My line, sent. */
  send: () => arp([76, 83], 0.06, 0.1, { type: 'sine', vol: 0.06 }),
  jump: () => tone(hz(60), 0.22, { type: 'square', to: hz(74), vol: 0.035 }),
  sit: () => tone(hz(52), 0.12, { type: 'sine', to: hz(43), vol: 0.12 }),
  /** Waving, dancing, posing: a little twinkle. */
  sparkle: () => arp([88, 91, 96], 0.05, 0.2, { type: 'sine', vol: 0.04 }),
  hit: () => {
    noise(0.05, 2400, { vol: 0.22, q: 1.4 });
    tone(hz(57), 0.07, { type: 'sine', to: hz(48), vol: 0.14 });
  },
  good: () => arp([79, 86], 0.08, 0.22, { vol: 0.08 }),
  bad: () => tone(hz(64), 0.3, { to: hz(55), vol: 0.07 }),
  /** The stands, after a point. */
  cheer: () => noise(1.1, 1300, { vol: 0.05, q: 0.35, attack: 0.12 }),
  count: () => tone(hz(81), 0.12, { type: 'square', vol: 0.03 }),
  go: () => tone(hz(93), 0.4, { type: 'square', vol: 0.035 }),
  win: () => {
    arp([72, 76, 79], 0.11, 0.16, { type: 'square', vol: 0.035 });
    [72, 76, 79, 84].forEach((m) => tone(hz(m), 1.0, { at: 0.36, vol: 0.05 }));
  },
  /** Over, and not first. */
  end: () => arp([79, 76, 72], 0.14, 0.3, { vol: 0.06 }),
  splash: () => noise(0.18, 1400, { vol: 0.1, to: 450, q: 0.7 }),
  quack: () => tone(hz(70), 0.13, { type: 'sawtooth', to: hz(63), vol: 0.035 }),
  dive: () => tone(hz(67), 0.28, { type: 'sine', to: hz(46), vol: 0.1 }),
};
export type Sfx = keyof typeof SFX;

/** Play an effect (if sound is on and the page has been tapped). */
export function sfx(name: Sfx) {
  if (ctx?.state === 'running' && useMoa.getState().sound) SFX[name]();
}

/** What my action sounds like when it starts. */
function actionSound(id: ActionId): Sfx {
  const anim = ACTIONS[id].anim;
  if (anim === 'jump') return 'jump';
  if (anim === 'sit') return 'sit';
  if (anim === 'wave' || anim === 'dance' || anim === 'pose') return 'sparkle';
  if (anim === 'swim' || anim === 'splash' || anim === 'tube') return 'splash';
  if (anim === 'serve' || anim === 'swing' || anim === 'rally') return 'hit';
  return 'pop';
}

// ── music ────────────────────────────────────────────────────────────────────

interface Tune {
  bpm: number;
  /** The tonic (MIDI). */
  key: number;
  /** A bar each, round and round: chord tones in semitones above the key. */
  chords: number[][];
  lead: OscillatorType;
  /** How often an eighth gets a melody note (0–1). */
  notes: number;
  /** A soft hi-hat on the off-beats. */
  beat?: boolean;
  /** Crickets now and then (outdoors at night). */
  crickets?: boolean;
}

const I = [0, 4, 7], ii = [2, 5, 9], iii = [4, 7, 11], IV = [5, 9, 12], V = [7, 11, 14], vi = [-3, 0, 4];
const TUNES: Record<ThemeId, Tune> = {
  plaza: { bpm: 92, key: 60, chords: [I, vi, IV, V], lead: 'triangle', notes: 0.45 },
  camping: { bpm: 66, key: 57, chords: [I, IV, I, V], lead: 'sine', notes: 0.3, crickets: true },
  tennis: { bpm: 112, key: 67, chords: [I, V, vi, IV], lead: 'square', notes: 0.4, beat: true },
  pool: { bpm: 104, key: 65, chords: [I, ii, IV, V], lead: 'sine', notes: 0.55, beat: true },
  gym: { bpm: 122, key: 64, chords: [vi, IV, I, V], lead: 'square', notes: 0.35, beat: true },
  church: { bpm: 58, key: 62, chords: [I, IV, vi, V], lead: 'sine', notes: 0.2 },
  restaurant: { bpm: 86, key: 62, chords: [[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [-3, 0, 4, 7]], lead: 'sine', notes: 0.4 },
  library: { bpm: 70, key: 64, chords: [I, iii, IV, I], lead: 'sine', notes: 0.22 },
  mall: { bpm: 116, key: 58, chords: [I, vi, ii, V], lead: 'triangle', notes: 0.5, beat: true },
};
/** Major pentatonic, two octaves: the melody walks up and down it. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

let tune: Tune | null = null;
let next = 0;
let eighth = 0;
let walk = 4;

/** One eighth of the tune, at audio time t. */
function play(n: number, t: number) {
  const at = t - ctx!.currentTime;
  const len = 60 / tune!.bpm / 2;
  const chord = tune!.chords[Math.floor(n / 8) % tune!.chords.length];
  const bus = musicBus;
  if (n % 8 === 0) for (const c of chord) tone(hz(tune!.key + c), len * 8, { at, type: 'sine', vol: 0.022, attack: 0.25, bus });
  if (n % 4 === 0) tone(hz(tune!.key - 24 + chord[0]), len * 3, { at, type: 'triangle', vol: 0.06, attack: 0.02, bus });
  if (tune!.beat && n % 2 === 1) noise(0.03, 8000, { at, vol: 0.012, filter: 'highpass', bus });
  if (Math.random() < tune!.notes) {
    walk = Math.max(0, Math.min(SCALE.length - 1, walk + Math.floor(Math.random() * 5) - 2));
    tone(hz(tune!.key + 12 + SCALE[walk]), len * 1.8, { at, type: tune!.lead, vol: tune!.lead === 'square' ? 0.014 : 0.03, bus });
  }
  if (tune!.crickets && Math.random() < 0.05) [0, 0.07, 0.14].forEach((d) => tone(4300, 0.04, { at: at + d, type: 'sine', vol: 0.006, bus }));
}

/** Keep about a fifth of a second of the tune scheduled ahead. */
function schedule() {
  if (!ctx || ctx.state !== 'running' || !tune) return;
  const len = 60 / tune.bpm / 2;
  if (next < ctx.currentTime) next = ctx.currentTime + 0.05; // after a stall (a space loading), pick up from now
  while (next < ctx.currentTime + 0.2) {
    play(eighth++, next);
    next += len;
  }
}

/** Music for the space I'm in (none out of the world, or with music off). */
function setTune() {
  const s = useMoa.getState();
  const want = s.music && s.themeId && s.screen === 'world' ? TUNES[s.themeId] : null;
  if (want === tune) return;
  tune = want;
  eighth = 0;
  walk = 4;
  if (ctx) {
    // fade in: no notes left hanging from the last tune
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
    next = ctx.currentTime + 0.3;
  }
}

// ── waking up, and listening ─────────────────────────────────────────────────

function wake() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    fxBus = ctx.createGain();
    fxBus.gain.value = 2.2; // effects stand out over the music
    fxBus.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(ctx.destination);
    white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = white.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    tune = null;
    setTune();
    setInterval(schedule, 50);
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
}

/** Start listening: for the first tap (to wake), and for what happens (to sound it). */
export function startSound() {
  const heard = new Set<string>();
  addEventListener('keydown', wake, true);
  addEventListener(
    'pointerdown',
    (e) => {
      wake();
      if ((e.target as Element).closest?.('button:not(:disabled)')) sfx('tap');
    },
    true,
  );
  // in the background: quiet (and no battery spent on it)
  document.addEventListener('visibilitychange', () => (document.hidden ? void ctx?.suspend() : ctx && wake()));
  useMoa.subscribe((s, prev) => {
    if (s.themeId && prev.themeId && s.themeId !== prev.themeId) sfx('door'); // by a door, or the list
    if (s.themeId !== prev.themeId || s.music !== prev.music || s.screen !== prev.screen) setTune();
  });
  fromGame.on('actionChange', (id) => id && sfx(actionSound(id)));
  toGame.on('chat', ({ playerId, mid }) => {
    if (mid && heard.has(mid)) return; // its translation, coming in under the same line
    if (mid) heard.add(mid);
    sfx(playerId === useMoa.getState().me.id ? 'send' : 'pop');
  });
}
