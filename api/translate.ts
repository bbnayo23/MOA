// POST /api/translate {text, from, to} → {text}. A Vercel Function (and, in `pnpm dev`, served by vite.config.ts).
// The translation API key stays here on the server; only signed-in MOA members may call it.
//   DEEPL_API_KEY set → DeepL (free plan: 500,000 chars/month, stops at the limit, never bills)
//   otherwise         → MyMemory (no key, small shared daily limit)

/** Environment variables (Vercel's, or .env under `pnpm dev`). */
const env = () => (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

const LANGS = ['ko', 'en', 'ja'];
const MAX = 500; // characters per line
const PER_MINUTE = 40; // lines per person

const cache = new Map<string, string>();
const members = new Map<string, { id: string; until: number }>();
const recent = new Map<string, number[]>();

/** The Supabase user behind this bearer token (cached for 5 min), or null. */
async function member(auth: string | null): Promise<string | null> {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY } = env();
  const key = VITE_SUPABASE_ANON_KEY ?? VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return 'dev'; // no Supabase (local mode): nobody to check against
  if (!auth?.startsWith('Bearer ')) return null;
  const hit = members.get(auth);
  if (hit && hit.until > Date.now()) return hit.id;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: auth } });
  if (!r.ok) return null;
  const { id } = (await r.json()) as { id: string };
  members.set(auth, { id, until: Date.now() + 5 * 60_000 });
  return id;
}

/** True while this person is under the per-minute limit (counts this call). */
function allowed(id: string) {
  const now = Date.now();
  const calls = (recent.get(id) ?? []).filter((t) => now - t < 60_000);
  recent.set(id, [...calls, now]);
  return calls.length < PER_MINUTE;
}

const entities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

async function deepl(key: string, text: string, from: string, to: string) {
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const r = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: { authorization: `DeepL-Auth-Key ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ text: [text], source_lang: from.toUpperCase(), target_lang: to === 'en' ? 'EN-US' : to.toUpperCase() }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}`);
  return ((await r.json()) as { translations: { text: string }[] }).translations[0].text;
}

async function mymemory(text: string, from: string, to: string) {
  const q = new URLSearchParams({ q: text, langpair: `${from}|${to}` });
  const r = await fetch(`https://api.mymemory.translated.net/get?${q}`, { signal: AbortSignal.timeout(8000) });
  const j = (await r.json()) as { responseStatus: number | string; responseData?: { translatedText?: string }; responseDetails?: string };
  const out = j.responseData?.translatedText;
  if (Number(j.responseStatus) !== 200 || !out) throw new Error(j.responseDetails || 'no translation');
  return entities(out);
}

export async function POST(request: Request): Promise<Response> {
  const id = await member(request.headers.get('authorization'));
  if (!id) return Response.json({ error: 'sign in first' }, { status: 401 });
  const { text, from, to } = (await request.json().catch(() => ({}))) as { text?: unknown; from?: unknown; to?: unknown };
  if (typeof text !== 'string' || !text.trim() || text.length > MAX || !LANGS.includes(from as string) || !LANGS.includes(to as string) || from === to)
    return Response.json({ error: 'bad request' }, { status: 400 });
  const key = `${from}|${to}|${text}`;
  const known = cache.get(key);
  if (known) return Response.json({ text: known });
  if (!allowed(id)) return Response.json({ error: 'too many' }, { status: 429 });
  try {
    const deeplKey = env().DEEPL_API_KEY;
    const out = deeplKey ? await deepl(deeplKey, text, from as string, to as string) : await mymemory(text, from as string, to as string);
    if (cache.size > 5000) cache.clear(); // ponytail: per-instance memory cache; a DB table if it ever matters
    cache.set(key, out);
    return Response.json({ text: out });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
