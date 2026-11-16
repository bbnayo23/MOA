import { createClient } from '@supabase/supabase-js';
import type { CharacterLook } from '../data/character';
import type { ThemeId } from '../data/themes';
import type { Tile } from '../world/space';
import { tokenFrom, type Lang } from './translate';

const env = import.meta.env ?? {}; // (node scripts have none)
const url = env.VITE_SUPABASE_URL as string | undefined;
// either name: Supabase's own snippets now call it the publishable key
const key = (env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

/**
 * The Supabase project, when one is configured (VITE_SUPABASE_URL / _ANON_KEY).
 * Without it MOA runs on its own: localStorage, mock friends, tab-to-tab realtime.
 */
export const supabase = url && key ? createClient(url, key) : null;
// translations go through MOA's server, which only serves members
if (supabase) tokenFrom(async () => (await supabase.auth.getSession()).data.session?.access_token);

/** One row of `profiles` (see supabase/migrations). */
export interface Profile {
  id: string;
  nickname: string;
  look: CharacterLook;
  /** Where they were last: restored on the next visit. */
  theme_id: ThemeId | null;
  pos: Tile | null;
}

/** Settings kept on the profile too (0002), loaded with it. */
export interface Settings {
  lang: Lang;
  auto_translate: boolean;
  dm_policy: 'all' | 'friends' | 'none';
}

export async function loadProfile(id: string): Promise<(Profile & Settings) | null> {
  const { data, error } = await supabase!
    .from('profiles')
    .select('id, nickname, look, theme_id, pos, lang, auto_translate, dm_policy')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as (Profile & Settings) | null;
}

export async function saveProfile(profile: Profile) {
  const { error } = await supabase!.from('profiles').upsert({ ...profile, updated_at: new Date().toISOString() });
  if (error) console.warn('[moa] profile not saved:', error.message);
}
