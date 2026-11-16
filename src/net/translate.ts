/** Languages people read MOA in (each sets theirs in ⚙️ 설정). */
export type Lang = 'ko' | 'en' | 'ja';

/** How each one is named in the picker. */
export const LANGS: Record<Lang, string> = { ko: '한국어', en: 'English', ja: '日本語' };

/**
 * What a chat line is written in, told by its letters (plenty for Korean /
 * Japanese / English chat). Null when it has nothing to translate (emoji, "!!").
 */
export function langOf(text: string): Lang | null {
  if (/\p{Script=Hangul}/u.test(text)) return 'ko';
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) return 'ja';
  return /\p{L}/u.test(text) ? 'en' : null;
}

const cache = new Map<string, Promise<string>>();

/** The signed-in member's access token (supabase.ts hands this over; none without a server). */
let token: () => Promise<string | undefined> = async () => undefined;
export const tokenFrom = (get: typeof token) => (token = get);

/**
 * `text` in `to`, through MOA's server (/api/translate: the API key stays
 * there) — unchanged when it's already in that language or has no words.
 * The same line asked twice is fetched once; a failure rejects (show the original).
 */
export function translate(text: string, to: Lang): Promise<string> {
  const from = langOf(text);
  if (!from || from === to) return Promise.resolve(text);
  const key = `${to}:${text}`;
  let job = cache.get(key);
  if (!job) {
    job = (async () => {
      const bearer = await token();
      const r = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(bearer && { authorization: `Bearer ${bearer}` }) },
        body: JSON.stringify({ text, from, to }),
        signal: AbortSignal.timeout(10_000),
      });
      const j = (await r.json()) as { text?: string; error?: string };
      if (!r.ok || !j.text) throw new Error(j.error ?? `translate ${r.status}`);
      return j.text;
    })();
    job.catch(() => cache.delete(key)); // a failure is retried next time
    cache.set(key, job);
  }
  return job;
}
