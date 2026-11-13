import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { AvatarBody, useAvatarPose, useJoints } from './Avatar3D';
import { toon } from './toon';

/** Soft studio light for a lone character (same look as the world's daylight). */
function StudioLights() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#e9dcf5', 1.8]} />
      <directionalLight color="#fff4e2" intensity={1.5} position={[3, 6, 5]} castShadow shadow-mapSize={[1024, 1024]} />
    </>
  );
}

// ── live preview (character creation) ─────────────────────────

/** The character on a little round stage; drag to turn them around, otherwise they slowly spin. */
export function AvatarPreview({ look, anim, className }: { look: CharacterLook; anim: AnimKey; className?: string }) {
  return (
    <div className={className}>
      <Canvas flat shadows="percentage" dpr={[1, 2]} camera={{ fov: 24, position: [0, 1.35, 5.2] }}>
        <StudioLights />
        <Turntable look={look} anim={anim} />
        <mesh rotation-x={-Math.PI / 2} receiveShadow material={toon('#c9ebc1')}>
          <circleGeometry args={[1.1, 48]} />
        </mesh>
        <OrbitControls
          target={[0, 0.72, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={1.15}
          maxPolarAngle={1.5}
          autoRotate
          autoRotateSpeed={1.2}
        />
      </Canvas>
    </div>
  );
}

function Turntable({ look, anim }: { look: CharacterLook; anim: AnimKey }) {
  const joints = useJoints();
  useAvatarPose(joints, look, () => anim);
  return (
    <group>
      <AvatarBody look={look} joints={joints} />
      {anim === 'sit' && (
        // something to sit on
        <mesh material={toon('#c58f63')} position={[0, 0.21, -0.22]} castShadow>
          <cylinderGeometry args={[0.24, 0.26, 0.42, 20]} />
        </mesh>
      )}
    </group>
  );
}

// ── thumbnails (icons everywhere else) ────────────────────────

export type ThumbMode = 'head' | 'full';

interface Job {
  key: string;
  look: CharacterLook;
  mode: ThumbMode;
}

// One hidden canvas paints each look once into an image; every icon is then a plain <img>.
const cache = new Map<string, string>();
const waiting = new Map<string, Set<(url: string) => void>>();
const queue: Job[] = [];
let wake: (() => void) | null = null;

/** Image URL of this look (head-and-shoulders or full body), once painted. */
export function useAvatarThumb(look: CharacterLook, mode: ThumbMode) {
  const key = `${mode}|${JSON.stringify(look)}`;
  const [url, setUrl] = useState(() => cache.get(key));
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) return setUrl(hit);
    let subs = waiting.get(key);
    if (!subs) {
      waiting.set(key, (subs = new Set()));
      queue.push({ key, look, mode });
      wake?.();
    }
    subs.add(setUrl);
    return () => void subs.delete(setUrl);
  }, [key, mode]); // `look` is captured through `key`
  return url;
}

const FRAMING: Record<ThumbMode, { eye: THREE.Vector3; at: THREE.Vector3 }> = {
  head: { eye: new THREE.Vector3(0.8, 1.35, 2.65), at: new THREE.Vector3(0, 1.1, 0) },
  full: { eye: new THREE.Vector3(1.3, 1.25, 4.3), at: new THREE.Vector3(0, 0.72, 0) },
};

/** Mount once: works through the queue, one look per render. */
export function ThumbStudio() {
  const [job, setJob] = useState<Job | null>(null);
  // the job being painted lives outside React state, so double-run effects / updaters (StrictMode) can't skip one
  const current = useRef<Job | null>(null);
  const next = () => {
    current.current = queue.shift() ?? null;
    setJob(current.current);
  };
  useEffect(() => {
    wake = () => current.current ?? next();
    wake();
    return () => void (wake = null);
  }, []);
  const done = (finished: Job, url: string) => {
    if (finished !== current.current) return; // already handled
    cache.set(finished.key, url);
    waiting.get(finished.key)?.forEach((f) => f(url));
    waiting.delete(finished.key);
    next();
  };
  return (
    <div style={{ position: 'fixed', left: -10000, top: 0, width: 160, height: 160, pointerEvents: 'none' }} aria-hidden>
      <Canvas frameloop="never" flat dpr={2} gl={{ preserveDrawingBuffer: true, alpha: true }} camera={{ fov: 24 }}>
        <StudioLights />
        {job && <Snap key={job.key} job={job} onDone={(url) => done(job, url)} />}
      </Canvas>
    </div>
  );
}

/** Paints its character once (after it's in the scene) and hands back the picture. */
function Snap({ job, onDone }: { job: Job; onDone: (url: string) => void }) {
  const { gl, scene, camera } = useThree();
  const joints = useJoints();
  useEffect(() => {
    const { eye, at } = FRAMING[job.mode];
    camera.position.copy(eye);
    camera.lookAt(at);
    gl.render(scene, camera);
    onDone(gl.domElement.toDataURL('image/png'));
  }, []); // one shot per job
  return (
    <group rotation={[0, 0.25, 0]}>
      <AvatarBody look={job.look} joints={joints} />
    </group>
  );
}
