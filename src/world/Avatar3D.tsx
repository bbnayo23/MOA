import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { ANIMS, type Pose } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { canvasTexture, castShadows, glow, toon } from './toon';

/**
 * A chibi 3D character built from rounded primitives: big head, small round
 * body. Everything is driven by `look`; joints are animated by `useAvatarPose`.
 * Local space: feet at y = 0, facing +z.
 */

// ponytail: procedural placeholder body. Swap for a rigged GLB (same joint names) when the art lands.
const INK = '#3a2e3f';
const BLUSH = '#ffb3c1';
const MOUTH = '#d0607a';
const GLASSES = '#5b4a6b';
const STAR = '#ffd166';
const SCARF = '#ff8a8a';
const RIBBON = '#ff8fab';
const WHITE = '#fffdf8';

// proportions
const HIP_Y = 0.38;
const SHOULDER_Y = 0.7;
const NECK_Y = 0.76;
const HEAD_R = 0.36;
const HEAD_Y = 0.33; // head centre above the neck
type V3 = [number, number, number];
/** Head ellipsoid per face shape (hair, hats and features follow it). */
const FACE_SCALE: Record<CharacterLook['face'], V3> = {
  round: [1, 0.92, 0.95],
  oval: [0.92, 1.0, 0.93],
  wide: [1.08, 0.86, 0.96],
};
const HAIR_R = 0.385;

/** Bones the animation drives. */
export interface Joints {
  sink: RefObject<THREE.Group | null>;
  upper: RefObject<THREE.Group | null>;
  head: RefObject<THREE.Group | null>;
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
  eyesOpen: RefObject<THREE.Group | null>;
  eyesClosed: RefObject<THREE.Group | null>;
  eyesHappy: RefObject<THREE.Group | null>;
  mouthLook: RefObject<THREE.Group | null>;
  mouthOpen: RefObject<THREE.Group | null>;
}

export function useJoints(): Joints {
  return {
    sink: useRef(null), upper: useRef(null), head: useRef(null),
    armL: useRef(null), armR: useRef(null), legL: useRef(null), legR: useRef(null),
    eyesOpen: useRef(null), eyesClosed: useRef(null), eyesHappy: useRef(null),
    mouthLook: useRef(null), mouthOpen: useRef(null),
  };
}

const stripes = new Map<string, THREE.Texture>();
function stripeTexture(color: string) {
  let t = stripes.get(color);
  if (!t)
    stripes.set(
      color,
      (t = canvasTexture(4, 16, (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 4, 16);
        ctx.fillStyle = WHITE;
        ctx.fillRect(0, 4, 4, 3);
        ctx.fillRect(0, 11, 4, 3);
      })),
    );
  return t;
}

/** The character's meshes, plus every prop it can hold (hidden until a pose shows one). */
export function AvatarBody({ look, joints }: { look: CharacterLook; joints: Joints }) {
  const root = useRef<THREE.Group>(null);
  const skin = toon(look.skin);
  const top = look.top === 'stripe' ? toon('#ffffff', stripeTexture(look.topColor), `stripe${look.topColor}`) : toon(look.topColor);
  const topDark = toon(new THREE.Color(look.topColor).multiplyScalar(0.85).getStyle());
  const bottom = toon(look.bottomColor);
  const hair = toon(look.hairColor);
  const shoes = toon(look.shoes);
  const longSleeves = look.top === 'hoodie' || look.top === 'jacket';
  const head = FACE_SCALE[look.face];

  useLayoutEffect(() => castShadows(root.current));

  const leg = (side: 1 | -1) => (
    <group ref={side === 1 ? joints.legL : joints.legR} position={[0.1 * side, HIP_Y, 0]}>
      {look.bottom === 'shorts' && (
        <mesh material={bottom} position={[0, -0.07, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.12, 12]} />
        </mesh>
      )}
      <mesh material={look.bottom === 'pants' ? bottom : skin} position={[0, -0.16, 0]}>
        <capsuleGeometry args={[0.07, 0.18, 4, 12]} />
      </mesh>
      <mesh material={shoes} position={[0, -0.31, 0.035]} scale={[0.1, 0.07, 0.14]}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
    </group>
  );

  const arm = (side: 1 | -1) => (
    <group ref={side === 1 ? joints.armL : joints.armR} position={[0.215 * side, SHOULDER_Y, 0]}>
      <mesh material={top} position={[0, -0.02, 0]}>
        <sphereGeometry args={[0.075, 12, 10]} />
      </mesh>
      <mesh material={longSleeves ? top : skin} position={[0, -0.12, 0]}>
        <capsuleGeometry args={[0.058, 0.12, 4, 10]} />
      </mesh>
      <mesh material={skin} position={[0, -0.24, 0]}>
        <sphereGeometry args={[0.065, 12, 10]} />
      </mesh>
      <group position={[0, -0.26, 0.02]}>{side === -1 ? <RightHandProps /> : <LeftHandProps />}</group>
    </group>
  );

  return (
    <group ref={root}>
      <group ref={joints.sink}>
        {leg(1)}
        {leg(-1)}
        <WaterProps />
        <group ref={joints.upper}>
          {/* hips */}
          {look.bottom === 'skirt' ? (
            <mesh material={bottom} position={[0, HIP_Y + 0.05, 0]}>
              <cylinderGeometry args={[0.17, 0.27, 0.22, 20]} />
            </mesh>
          ) : (
            <mesh material={bottom} position={[0, HIP_Y + 0.04, 0]} scale={[0.2, 0.12, 0.17]}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
          )}
          {/* torso */}
          <mesh material={top} position={[0, 0.56, 0]} scale={[1, 0.78, 0.85]}>
            <capsuleGeometry args={[0.18, 0.12, 6, 16]} />
          </mesh>
          <TopDetails look={look} topDark={topDark} />
          {look.accessory === 'scarf' && (
            <group position={[0, NECK_Y - 0.02, 0]}>
              <mesh material={toon(SCARF)} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.15, 0.055, 10, 24]} />
              </mesh>
              <mesh material={toon(SCARF)} position={[0.08, -0.12, 0.15]} rotation={[0.2, 0, 0.15]}>
                <boxGeometry args={[0.09, 0.2, 0.04]} />
              </mesh>
            </group>
          )}
          {arm(1)}
          {arm(-1)}
          <BodyProps />
          <group ref={joints.head} position={[0, NECK_Y, 0]}>
            <mesh material={skin} position={[0, HEAD_Y, 0]} scale={head}>
              <sphereGeometry args={[HEAD_R, 32, 24]} />
            </mesh>
            <Face look={look} joints={joints} head={head} />
            <group position={[0, HEAD_Y, 0]} scale={head}>
              <Hair look={look} material={hair} />
              <Hat look={look} />
            </group>
            {look.accessory === 'glasses' && <Glasses head={head} />}
            <HeadProps />
            {look.accessory === 'star' && (
              <mesh material={toon(STAR)} position={[0.25, HEAD_Y + 0.2, 0.18]} rotation={[0, 0.6, 0.3]} scale={[1, 1, 0.45]}>
                <octahedronGeometry args={[0.07]} />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

function TopDetails({ look, topDark }: { look: CharacterLook; topDark: THREE.Material }) {
  if (look.top === 'hoodie')
    return (
      <>
        {/* hood folded behind the neck, front pocket, drawstrings */}
        <mesh material={topDark} position={[0, 0.74, -0.1]} rotation={[1.2, 0, 0]}>
          <torusGeometry args={[0.14, 0.06, 10, 20]} />
        </mesh>
        <mesh material={topDark} position={[0, 0.5, 0.15]}>
          <boxGeometry args={[0.2, 0.08, 0.04]} />
        </mesh>
        {[-0.05, 0.05].map((x) => (
          <mesh key={x} material={toon(WHITE)} position={[x, 0.66, 0.16]}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
          </mesh>
        ))}
      </>
    );
  if (look.top === 'jacket')
    return (
      <>
        {/* open front showing a white shirt, and a collar */}
        <mesh material={toon(WHITE)} position={[0, 0.56, 0.155]}>
          <boxGeometry args={[0.07, 0.26, 0.03]} />
        </mesh>
        <mesh material={topDark} position={[0, 0.73, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.03, 8, 20]} />
        </mesh>
      </>
    );
  if (look.top === 'tee')
    return (
      <mesh material={topDark} position={[0, 0.735, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.02, 8, 20]} />
      </mesh>
    );
  return null;
}

// face features sit on the head ellipsoid; z = how far out the surface is there
const surfZ = (x: number, y: number, [sx, sy, sz]: V3) =>
  HEAD_R * sz * Math.sqrt(Math.max(0, 1 - (x / (HEAD_R * sx)) ** 2 - (y / (HEAD_R * sy)) ** 2));
const EYE_X = 0.12;
const EYE_Y = 0.01;

/** ∩ (or ∪ when flipped) arc. */
function Arc({ r, tube, color, flip, position }: { r: number; tube: number; color: string; flip?: boolean; position: [number, number, number] }) {
  return (
    <mesh material={toon(color)} position={position} rotation={[0, 0, flip ? Math.PI : 0]}>
      <torusGeometry args={[r, tube, 6, 14, Math.PI]} />
    </mesh>
  );
}

function Face({ look, joints, head }: { look: CharacterLook; joints: Joints; head: V3 }) {
  const y = HEAD_Y + EYE_Y;
  const ez = surfZ(EYE_X, EYE_Y, head);
  const my = HEAD_Y - 0.11;
  const mz = surfZ(0, -0.11, head) - 0.004;
  // which eyes / mouth show before any animation runs (thumbnails are a single still frame)
  const eyes = look.eyes === 'happy' ? 'happy' : look.eyes === 'sleepy' ? 'closed' : 'open';
  const big = look.eyes === 'round';
  return (
    <group>
      {/* open eyes in the look's style; closed / happy variants are swapped in by the animation */}
      <group ref={joints.eyesOpen} visible={eyes === 'open'}>
        {[-1, 1].map((s) => (
          <group key={s} position={[EYE_X * s, y, ez - 0.008]}>
            <mesh material={toon(INK)} scale={big ? [0.048, 0.066, 0.03] : [0.032, 0.045, 0.025]}>
              <sphereGeometry args={[1, 14, 12]} />
            </mesh>
            <mesh material={toon(WHITE)} position={[0.014, 0.022, 0.022]}>
              <sphereGeometry args={[big ? 0.016 : 0.01, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={joints.eyesClosed} visible={eyes === 'closed'}>
        {[-1, 1].map((s) => (
          <mesh key={s} material={toon(INK)} position={[EYE_X * s, y - 0.01, ez]}>
            <boxGeometry args={[0.075, 0.014, 0.012]} />
          </mesh>
        ))}
      </group>
      <group ref={joints.eyesHappy} visible={eyes === 'happy'}>
        {[-1, 1].map((s) => (
          <Arc key={s} r={0.038} tube={0.012} color={INK} position={[EYE_X * s, y - 0.015, ez]} />
        ))}
      </group>
      {/* cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={toon(BLUSH)} position={[0.205 * s, HEAD_Y - 0.075, surfZ(0.205, -0.075, head) - 0.012]} rotation={[0, 0.55 * s, 0]} scale={[0.055, 0.032, 0.01]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
      ))}
      {/* mouth: the look's, or open while talking / eating */}
      <group ref={joints.mouthLook} visible={look.mouth !== 'open'}>
        {look.mouth === 'smile' && <Arc r={0.04} tube={0.011} color={MOUTH} flip position={[0, my + 0.02, mz]} />}
        {look.mouth === 'cat' &&
          [-1, 1].map((s) => <Arc key={s} r={0.022} tube={0.009} color={MOUTH} flip position={[0.022 * s, my + 0.012, mz]} />)}
        {look.mouth === 'flat' && (
          <mesh material={toon(MOUTH)} position={[0, my, mz]}>
            <boxGeometry args={[0.07, 0.013, 0.01]} />
          </mesh>
        )}
      </group>
      {look.nose !== 'none' && (
        <mesh
          material={toon(look.nose === 'dot' ? new THREE.Color(look.skin).multiplyScalar(0.8).getStyle() : '#ffb0a0')}
          position={[0, HEAD_Y - 0.045, surfZ(0, -0.045, head) - 0.006]}
          scale={look.nose === 'dot' ? [0.02, 0.016, 0.014] : [0.04, 0.032, 0.026]}
        >
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      )}
      <group ref={joints.mouthOpen} visible={look.mouth === 'open'}>
        <mesh material={toon('#b8475f')} position={[0, my, mz - 0.004]} scale={[0.042, 0.038, 0.02]}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

function Hair({ look, material }: { look: CharacterLook; material: THREE.Material }) {
  const style = look.hair;
  const back = style === 'short' || style === 'spiky' || style === 'buns' ? 0.6 : style === 'bob' ? 0.76 : 0.78;
  const sideWrap = style === 'bob' || style === 'long' ? 0.35 : 0.12;
  return (
    <group>
      {/* crown + fringe */}
      <mesh material={material}>
        <sphereGeometry args={[HAIR_R, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
      </mesh>
      {/* back, wrapping a little round the sides */}
      <mesh material={material}>
        <sphereGeometry args={[HAIR_R, 32, 16, Math.PI - sideWrap, Math.PI + sideWrap * 2, 0, Math.PI * back]} />
      </mesh>
      {style === 'long' && (
        <mesh material={material} position={[0, -0.42, -0.14]} scale={[1.15, 1, 0.5]}>
          <capsuleGeometry args={[0.24, 0.42, 6, 16]} />
        </mesh>
      )}
      {style === 'spiky' &&
        [[0, 0.4, 0, 0], [0.15, 0.36, 0.05, -0.5], [-0.15, 0.36, 0.05, 0.5], [0.08, 0.34, -0.18, -0.3], [-0.08, 0.34, -0.18, 0.3]].map(
          ([x, y, z, tilt], i) => (
            <mesh key={i} material={material} position={[x, y, z]} rotation={[z ? -0.5 : 0.2, 0, tilt]}>
              <coneGeometry args={[0.08, 0.18, 10]} />
            </mesh>
          ),
        )}
      {style === 'buns' &&
        [-1, 1].map((s) => (
          <mesh key={s} material={material} position={[0.24 * s, 0.3, -0.06]}>
            <sphereGeometry args={[0.13, 16, 12]} />
          </mesh>
        ))}
    </group>
  );
}

function Hat({ look }: { look: CharacterLook }) {
  const color = toon(look.topColor);
  const band = toon(new THREE.Color(look.topColor).multiplyScalar(0.82).getStyle());
  if (look.hat === 'cap')
    return (
      <group>
        <mesh material={color}>
          <sphereGeometry args={[0.405, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
        </mesh>
        <mesh material={band} position={[0, 0.07, 0.36]} rotation={[0.18, 0, 0]} scale={[1, 1, 0.75]}>
          <cylinderGeometry args={[0.24, 0.24, 0.025, 24]} />
        </mesh>
      </group>
    );
  if (look.hat === 'beanie')
    return (
      <group>
        <mesh material={color} position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.41, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        </mesh>
        <mesh material={band} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.05, 10, 32]} />
        </mesh>
        <mesh material={toon(WHITE)} position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.08, 12, 10]} />
        </mesh>
      </group>
    );
  if (look.hat === 'ribbon')
    return (
      <group position={[0.2, 0.32, 0.05]} rotation={[0, 0, -0.5]}>
        {[-1, 1].map((s) => (
          <mesh key={s} material={toon(RIBBON)} position={[0.08 * s, 0, 0]} rotation={[0, 0, (Math.PI / 2) * -s]} scale={[1, 1, 0.5]}>
            <coneGeometry args={[0.07, 0.15, 12]} />
          </mesh>
        ))}
        <mesh material={toon(RIBBON)}>
          <sphereGeometry args={[0.04, 10, 8]} />
        </mesh>
      </group>
    );
  return null;
}

function Glasses({ head }: { head: V3 }) {
  const m = toon(GLASSES);
  const y = HEAD_Y + EYE_Y;
  const z = surfZ(EYE_X, EYE_Y, head) + 0.025;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m} position={[EYE_X * s, y, z]}>
          <torusGeometry args={[0.072, 0.012, 8, 24]} />
        </mesh>
      ))}
      <mesh material={m} position={[0, y + 0.01, z + 0.005]}>
        <boxGeometry args={[0.1, 0.014, 0.014]} />
      </mesh>
    </group>
  );
}

// ── props ─────────────────────────────────────────────────────
// Each prop is a hidden group named `prop:<name>`; the pose's `prop` decides which are shown.
// Hand props are in the arm's own space: −y runs down the arm, so with the arm held
// forward ("front") the direction (0, −0.8, 0.6) points ahead and a little up.

const Prop = ({ name, children }: { name: string; children: ReactNode }) => (
  <group name={`prop:${name}`} visible={false}>
    {children}
  </group>
);

const AHEAD = 2.5; // rotation.x that lays a stick along (0, −0.8, 0.6)
const UPRIGHT = 1.35; // rotation.x that stands a cup / candle upright while the arm is forward

const Stick = ({ len, r = 0.016, color }: { len: number; r?: number; color: string }) => (
  <mesh material={toon(color)} position={[0, -0.8 * (len / 2), 0.6 * (len / 2)]} rotation={[AHEAD, 0, 0]}>
    <cylinderGeometry args={[r, r, len, 6]} />
  </mesh>
);
const tip = (len: number): [number, number, number] => [0, -0.8 * len, 0.6 * len];

function RightHandProps() {
  return (
    <>
      <Prop name="stick">
        <Stick len={0.85} color="#8b5a3c" />
        <mesh material={toon('#fff4e6')} position={tip(0.85)}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </Prop>
      <Prop name="spatula">
        <Stick len={0.4} color="#9aa0a6" />
        <mesh material={toon('#d7dbe2')} position={tip(0.45)} rotation={[AHEAD, 0, 0]}>
          <boxGeometry args={[0.14, 0.12, 0.02]} />
        </mesh>
      </Prop>
      <Prop name="pen">
        <Stick len={0.2} r={0.012} color="#5b4a6b" />
      </Prop>
      <Prop name="fork">
        <Stick len={0.28} r={0.012} color="#c4c9cf" />
        <mesh material={toon('#f2cc8f')} position={tip(0.3)}>
          <sphereGeometry args={[0.045, 8, 6]} />
        </mesh>
      </Prop>
      <Prop name="candle">
        <group rotation={[UPRIGHT, 0, 0]}>
          <mesh material={toon('#fff4e6')} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.16, 8]} />
          </mesh>
          <mesh material={glow('#ffb347')} position={[0, 0.2, 0]}>
            <coneGeometry args={[0.04, 0.1, 8]} />
          </mesh>
        </group>
      </Prop>
      <Prop name="cup">
        <group rotation={[UPRIGHT, 0, 0]}>
          <mesh material={toon('#ffffff')} position={[0, 0.05, 0.04]}>
            <cylinderGeometry args={[0.065, 0.05, 0.14, 12]} />
          </mesh>
          <mesh material={toon('#c98f6a')} position={[0, 0.115, 0.04]}>
            <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
          </mesh>
        </group>
      </Prop>
      <Prop name="racket">
        <Stick len={0.22} r={0.02} color="#5c6185" />
        <group position={tip(0.42)} rotation={[AHEAD, 0, 0]}>
          <mesh material={toon('#5c6185')} scale={[1, 1.25, 1]}>
            <torusGeometry args={[0.13, 0.018, 6, 20]} />
          </mesh>
          <mesh material={glow('#eef2f6', 0.85)} scale={[1, 1.25, 1]}>
            <circleGeometry args={[0.12, 16]} />
          </mesh>
        </group>
      </Prop>
      <Prop name="dumbbellR">
        <Dumbbell />
      </Prop>
    </>
  );
}

function LeftHandProps() {
  return (
    <Prop name="dumbbellL">
      <Dumbbell />
    </Prop>
  );
}

const Dumbbell = () => (
  <group rotation={[0, 0, Math.PI / 2]}>
    <mesh material={toon('#c4c9cf')}>
      <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
    </mesh>
    {[-0.12, 0.12].map((y) => (
      <mesh key={y} material={toon('#5f5870')} position={[0, y, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 10]} />
      </mesh>
    ))}
  </group>
);

/** Held at the chest, or in the air in front. */
function BodyProps() {
  return (
    <>
      <Prop name="book">
        <group position={[0, 0.62, 0.26]} rotation={[-0.5, 0, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={toon('#fffaf0')} position={[0.085 * s, 0, 0]} rotation={[0, -0.35 * s, 0]}>
              <boxGeometry args={[0.17, 0.22, 0.015]} />
            </mesh>
          ))}
          <mesh material={toon('#e07a5f')} position={[0, 0, -0.02]}>
            <boxGeometry args={[0.36, 0.24, 0.015]} />
          </mesh>
        </group>
      </Prop>
      <Prop name="toss">
        <mesh material={toon('#e6f27a')} position={[0.32, 1.75, 0.15]}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </Prop>
      <Prop name="ball">
        <mesh material={toon('#e6f27a')} position={[-0.45, 0.85, 0.75]}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      </Prop>
    </>
  );
}

function HeadProps() {
  return (
    <>
      <Prop name="sweat">
        <mesh material={glow('#a9d8ff')} position={[0.3, HEAD_Y + 0.2, 0.18]} scale={[1, 1.5, 1]}>
          <sphereGeometry args={[0.04, 8, 6]} />
        </mesh>
      </Prop>
      <Prop name="sparkle">
        {([[0.45, HEAD_Y + 0.25, 0.1], [-0.42, HEAD_Y + 0.05, 0.15], [0.3, HEAD_Y + 0.55, -0.05]] as const).map((p, i) => (
          <mesh key={i} material={glow('#ffd166')} position={[...p]} scale={[1, 1, 0.4]}>
            <octahedronGeometry args={[0.06]} />
          </mesh>
        ))}
      </Prop>
    </>
  );
}

/** Things at the waterline: they stay level with the pool while the body sinks into it. */
function WaterProps() {
  return (
    <>
      <Prop name="tube">
        <mesh material={toon('#ff9fb2')} position={[0, 0.67, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.1, 10, 24]} />
        </mesh>
      </Prop>
      <Prop name="splash">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} material={glow('#cfeaff')} position={[Math.cos(a) * 0.45, 0.75 + (i % 2) * 0.15, Math.sin(a) * 0.45]}>
              <sphereGeometry args={[0.05, 8, 6]} />
            </mesh>
          );
        })}
      </Prop>
    </>
  );
}

/** Which prop groups each pose `prop` shows. */
const PROP_GROUPS: Record<NonNullable<Pose['prop']>, string[]> = {
  stick: ['stick'], spatula: ['spatula'], spatulaUp: ['spatula'], candle: ['candle'], pen: ['pen'],
  book: ['book'], bookFlip: ['book'], fork: ['fork'], forkUp: ['fork'], cup: ['cup'],
  dumbbells: ['dumbbellR', 'dumbbellL'], sweat: ['sweat'],
  tube: ['tube'], splash: ['splash'], splashB: ['splash'],
  racketUp: ['racket'], racketFwd: ['racket'], racketServe: ['racket', 'toss'], racketBall: ['racket', 'ball'],
  sparkle: ['sparkle'],
};

// ── animation ────────────────────────────────────────────────

interface Targets {
  legL: number;
  legR: number;
  armL: [number, number];
  armR: [number, number];
  bob: number;
  lean: number;
  sink: number;
  /** Shift back (−z): sitting puts the hips back onto the seat behind the spot. */
  back: number;
}

/** Pose data (shared with the 2D-era animation tables) → joint angles. Right arm is the −x one. */
function targets(p: Pose): Targets {
  const legs: Record<NonNullable<Pose['legs']>, [number, number]> = {
    stand: [0, 0],
    stepA: [-0.45, 0.45],
    stepB: [0.45, -0.45],
    sit: [-1.45, -1.45],
    swim: [0.25, -0.25],
  };
  // [forward (x), sideways (z)] per arm; positive z raises the left arm, negative the right
  const arms: Record<NonNullable<Pose['arms']>, { l: [number, number]; r: [number, number] }> = {
    down: { l: [0, 0.08], r: [0, -0.08] },
    waveA: { l: [0, 0.08], r: [0, -2.5] },
    waveB: { l: [0, 0.08], r: [-0.3, -2.0] },
    up: { l: [0, 2.6], r: [0, -2.6] },
    front: { l: [0, 0.08], r: [-1.35, -0.05] },
    pray: { l: [-1.1, -0.38], r: [-1.1, 0.38] },
  };
  let [legL, legR] = legs[p.legs ?? 'stand'];
  let { l, r } = arms[p.arms ?? 'down'];
  if (p.flip) {
    [legL, legR] = [legR, legL];
    [l, r] = [[r[0], -r[1]], [l[0], -l[1]]];
  }
  return {
    legL, legR, armL: l, armR: r,
    bob: -(p.bob ?? 0) * 0.04,
    lean: -(p.lean ?? 0) * 0.12,
    sink: p.legs === 'swim' ? -0.62 : p.legs === 'sit' ? SIT_UP : 0,
    back: p.legs === 'sit' ? -SIT_BACK : 0,
  };
}

const damp = (from: number, to: number, k: number) => from + (to - from) * k;

/** Seated hips sit this far up and back from where the feet stood (seat height ≈ 0.45). */
export const SIT_UP = 0.06;
export const SIT_BACK = 0.22;

/**
 * Drives the joints every frame from an animation key (frames from anims.ts,
 * eased between) — or a procedural cycle while walking.
 */
export function useAvatarPose(joints: Joints, look: CharacterLook, anim: () => string) {
  const state = useRef({ elapsed: 0, frame: 0, anim: '', phase: 0 });
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const st = state.current;
    const key = anim() as keyof typeof ANIMS;
    if (key !== st.anim) Object.assign(st, { anim: key, elapsed: 0, frame: 0 });
    const def = ANIMS[key];
    st.elapsed += dt;
    st.frame = Math.floor(st.elapsed * def.fps) % def.frames.length;
    const pose = def.frames[st.frame];
    let t = targets(pose);
    if (key === 'walk') {
      st.phase += dt * 9;
      const s = Math.sin(st.phase);
      t = { ...t, legL: -0.55 * s, legR: 0.55 * s, armL: [0.45 * s, 0.1], armR: [-0.45 * s, -0.1], bob: Math.abs(Math.cos(st.phase)) * 0.035 };
    }
    const k = 1 - Math.exp(-dt * 14);
    const j = joints;
    if (j.legL.current) j.legL.current.rotation.x = damp(j.legL.current.rotation.x, t.legL, k);
    if (j.legR.current) j.legR.current.rotation.x = damp(j.legR.current.rotation.x, t.legR, k);
    for (const [ref, [x, z]] of [[j.armL, t.armL], [j.armR, t.armR]] as const) {
      if (!ref.current) continue;
      ref.current.rotation.x = damp(ref.current.rotation.x, x, k);
      ref.current.rotation.z = damp(ref.current.rotation.z, z, k);
    }
    if (j.upper.current) {
      j.upper.current.position.y = damp(j.upper.current.position.y, t.bob, k);
      j.upper.current.rotation.z = damp(j.upper.current.rotation.z, t.lean, k);
    }
    if (j.sink.current) {
      j.sink.current.position.y = damp(j.sink.current.position.y, t.sink, k);
      j.sink.current.position.z = damp(j.sink.current.position.z, t.back, k);
    }
    // the pose can close / squint the eyes and open the mouth; otherwise the look decides
    const eyes = pose.eyes ?? (look.eyes === 'happy' ? 'happy' : look.eyes === 'sleepy' ? 'closed' : undefined);
    if (j.eyesOpen.current && j.eyesClosed.current && j.eyesHappy.current) {
      j.eyesClosed.current.visible = eyes === 'closed';
      j.eyesHappy.current.visible = eyes === 'happy';
      j.eyesOpen.current.visible = !eyes;
    }
    if (j.mouthOpen.current && j.mouthLook.current) {
      const open = pose.mouth === 'open' || look.mouth === 'open';
      j.mouthOpen.current.visible = open;
      j.mouthLook.current.visible = !open;
    }
    const shown = pose.prop ? PROP_GROUPS[pose.prop] : [];
    j.sink.current?.traverse((o) => {
      if (o.name.startsWith('prop:')) o.visible = shown.includes(o.name.slice(5));
    });
  });
}
