/** Languages your speech bubbles can be translated into. */
export type Lang = 'en' | 'ja';

/** How each one is named in the picker. */
export const LANGS: Record<Lang, string> = { en: 'English', ja: '日本語' };

/**
 * What a chat line is written in, told by its letters (plenty for Korean /
 * Japanese / English chat). Null when it has nothing to translate (emoji, "!!").
 */
export function langOf(text: string): 'ko' | Lang | null {
  if (/\p{Script=Hangul}/u.test(text)) return 'ko';
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) return 'ja';
  return /\p{L}/u.test(text) ? 'en' : null;
}

const cache = new Map<string, Promise<string>>();
const decode = (s: string) => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? s;

/**
 * `text` said in `to` — unchanged when it's already in that language or has no
 * words. The same line asked twice (the preview while typing, then sending) is
 * fetched once.
 */
// ponytail: MyMemory's free API straight from the browser (no key, ~5,000 chars/day per IP).
// If friends outgrow it, put DeepL / Claude behind a Supabase Edge Function and call that here.
export function translate(text: string, to: Lang): Promise<string> {
  const from = langOf(text);
  if (!from || from === to) return Promise.resolve(text);
  const key = `${to}:${text}`;
  let job = cache.get(key);
  if (!job) {
    const q = new URLSearchParams({ q: text, langpair: `${from}|${to}` });
    job = fetch(`https://api.mymemory.translated.net/get?${q}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((j) => {
        const out = j.responseData?.translatedText;
        if (Number(j.responseStatus) !== 200 || !out) throw new Error(j.responseDetails || 'no translation');
        return decode(out);
      });
    job.catch(() => cache.delete(key)); // a failure is retried next time
    cache.set(key, job);
  }
  return job;
}
