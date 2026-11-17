import type { AnimKey } from '../data/anims';
import type { CharacterLook } from '../data/character';
import { AvatarBody, useAvatarPose, useJoints } from '../world/Avatar3D';

/** Someone watching a game: seated at `at` (or standing), facing +z turned by `rotY`, all smiles while `excited()`. */
export function Fan({ look, at, rotY = 0, anim = 'sit', excited }: { look: CharacterLook; at: [number, number, number]; rotY?: number; anim?: AnimKey; excited: () => boolean }) {
  const joints = useJoints();
  useAvatarPose(joints, look, () => anim, () => (excited() ? 'laugh' : null));
  return (
    <group position={at} rotation-y={rotY}>
      <AvatarBody look={look} joints={joints} />
    </group>
  );
}
