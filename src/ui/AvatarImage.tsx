import type { CharacterLook } from '../data/character';
import { useAvatarThumb, type ThumbMode } from '../world/Preview';

/** A character's 3D portrait as a plain image (an empty box until it's painted). */
export function AvatarImage({ look, mode = 'head', className }: { look: CharacterLook; mode?: ThumbMode; className?: string }) {
  const url = useAvatarThumb(look, mode);
  return url ? <img src={url} alt="" className={className} draggable={false} /> : <span className={className} aria-hidden />;
}
