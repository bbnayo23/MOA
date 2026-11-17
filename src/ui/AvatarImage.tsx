import type { CharacterLook } from '../data/character';
import { useAvatarThumb, type ThumbMode } from '../world/Preview';

/** A character's pixel portrait as a plain image. */
export function AvatarImage({ look, mode = 'head', className }: { look: CharacterLook; mode?: ThumbMode; className?: string }) {
  return <img src={useAvatarThumb(look, mode)} alt="" className={className} draggable={false} style={{ imageRendering: 'pixelated' }} />;
}
