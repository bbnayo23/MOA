import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AV_FOOT, AV_H, AV_W, avatarCanvas, type Mood } from '../art/avatar';
import { ANIMS } from '../data/anims';
import type { CharacterLook } from '../data/character';

export { moodOf, type Mood } from '../art/avatar';

/**
 * A character in a 3D scene: their pixel-art sprite on a card that always
 * turns to the camera — front or back, left or right, picked from which way
 * they face. Local space: feet at y = 0, facing +z (the parent turns them).
 */

/** Art pixels per world unit: one sprite pixel is one screen pixel in the pixel-art world. */
export const ART = 30;

/** Seated hips sit this far up and back from where the feet stood (seat height ≈ 0.45). */
export const SIT_UP = 0.06;
export const SIT_BACK = 0.22;

/** Moonlit scenes dim the sprites (they're unlit) to match. */
export const NIGHT_TINT = '#a9acd8';

/** What `useAvatarPose` hands the body: which animation, and any passing mood. */
export interface Joints {
  anim: () => string;
  mood: () => Mood | null;
}

export function useJoints(): Joints {
  return useRef<Joints>({ anim: () => 'idle', mood: () => null }).current;
}

/** Drive this body with an animation key (frames from anims.ts) and, optionally, a mood. */
export function useAvatarPose(joints: Joints, _look: CharacterLook, anim: () => string, mood: () => Mood | null = () => null) {
  joints.anim = anim;
  joints.mood = mood;
}

// the card: AV_W × AV_H art pixels, its foot row at y = 0
const CARD = new THREE.PlaneGeometry(AV_W / ART, AV_H / ART).translate(0, (AV_FOOT - AV_H / 2) / ART, 0);
const BLOB = new THREE.CircleGeometry(0.3, 16);
const blobMat = new THREE.MeshBasicMaterial({ color: '#2d2340', transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
// what a tap on someone hits: about their size, not the whole card
const HIT = new THREE.BoxGeometry(0.8, 1.5, 0.8).translate(0, 0.75, 0);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

const fwd = new THREE.Vector3();
const toCam = new THREE.Vector3();
const right = new THREE.Vector3();
const wp = new THREE.Vector3();
const pq = new THREE.Quaternion();
const yawQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** The sprite card (plus a soft shadow under it, and a hit box for taps). */
export function AvatarBody({ look, joints, tint = '#ffffff' }: { look: CharacterLook; joints: Joints; tint?: string }) {
  const lift = useRef<THREE.Group>(null);
  const card = useRef<THREE.Mesh>(null);
  const blob = useRef<THREE.Mesh>(null);
  const st = useRef({ elapsed: 0, anim: '', shown: null as HTMLCanvasElement | null, y: 0 }).current;
  const { tex, mat } = useMemo(() => {
    // every frame of every sprite is the same size: the texture's storage is made for that size once
    const blank = Object.assign(document.createElement('canvas'), { width: AV_W, height: AV_H });
    const tex = new THREE.CanvasTexture(blank);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    // opacity < 1 marks sprite pixels for the outline pass (they bring their own outline); alpha-tested, not blended
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, opacity: 0.9, side: THREE.DoubleSide, color: tint });
    return { tex, mat };
  }, [tint]);

  useFrame(({ camera }, dtRaw) => {
    const g = lift.current, c = card.current;
    if (!g || !c || !g.parent) return;
    const dt = Math.min(dtRaw, 0.1);
    const key = joints.anim() as keyof typeof ANIMS;
    if (key !== st.anim) Object.assign(st, { anim: key, elapsed: 0 });
    st.elapsed += dt;
    const def = ANIMS[key] ?? ANIMS.idle;
    const pose = def.frames[Math.floor(st.elapsed * def.fps) % def.frames.length];

    // which way they face, seen from the camera: towards it or away, to its right or left
    g.parent.getWorldQuaternion(pq);
    g.parent.getWorldPosition(wp);
    fwd.set(0, 0, 1).applyQuaternion(pq).setY(0);
    camera.getWorldDirection(toCam).negate();
    const flat = Math.hypot(toCam.x, toCam.z) || 1;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) toCam.subVectors(camera.position, wp);
    toCam.setY(0).normalize();
    right.crossVectors(UP, toCam); // the camera's right, on the ground
    const back = fwd.dot(toCam) < -0.15;
    const flip = (fwd.dot(right) < 0) !== !!pose.flip;

    // turned square to the camera (undoing the parent's turn), stretched up for the camera's tilt
    yawQ.setFromAxisAngle(UP, Math.atan2(toCam.x, toCam.z));
    g.quaternion.copy(pq.invert().multiply(yawQ));
    c.scale.set(flip ? -1 : 1, 1 / flat, 1);

    // sitting, swimming (down in the water), hopping
    const goal = (pose.legs === 'swim' ? -0.62 : pose.legs === 'sit' ? SIT_UP : 0) + (pose.hop ?? 0);
    st.y += (goal - st.y) * (1 - Math.exp(-dt * 14));
    c.position.y = st.y;
    if (blob.current) {
      blob.current.visible = pose.legs !== 'swim';
      blob.current.scale.setScalar(1 - Math.min(0.5, Math.max(0, st.y)));
    }

    const img = avatarCanvas(look, pose, { back, mood: joints.mood() });
    if (img !== st.shown) {
      st.shown = img;
      tex.image = img;
      tex.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={lift}>
        <mesh ref={card} geometry={CARD} material={mat} raycast={() => null} />
      </group>
      <mesh ref={blob} geometry={BLOB} material={blobMat} rotation-x={-Math.PI / 2} position-y={0.02} raycast={() => null} />
      <mesh geometry={HIT} material={hitMat} />
    </>
  );
}
