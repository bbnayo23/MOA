import { createClient } from '@supabase/supabase-js';
import type { CharacterLook } from '../data/character';
import type { ThemeId } from '../data/themes';
import type { Tile } from '../world/space';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Supabase project, when one is configured (VITE_SUPABASE_URL / _ANON_KEY).
 * Without it MOA runs on its own: localStorage, mock friends, tab-to-tab realtime.
 */
export const supabase = url && key ? createClient(url, key) : null;

/** One row of `profiles` (see supabase/migrations). */
export interface Profile {
  id: string;
  nickname: string;
  look: CharacterLook;
  /** Where they were last: restored on the next visit. */
  theme_id: ThemeId | null;
  pos: Tile | null;
}

export async function loadProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase!.from('profiles').select('id, nickname, look, theme_id, pos').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(profile: Profile) {
  const { error } = await supabase!.from('profiles').upsert({ ...profile, updated_at: new Date().toISOString() });
  if (error) console.warn('[moa] profile not saved:', error.message);
}
