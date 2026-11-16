import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** `pnpm dev` serves the Vercel Functions in api/ too (Vercel runs them in production). */
const api = (env: Record<string, string>): Plugin => ({
  name: 'moa-api',
  configureServer(server) {
    // the functions read their keys from process.env, as on Vercel (.env holds them locally)
    Object.assign((globalThis as unknown as { process: { env: object } }).process.env, env);
    server.middlewares.use('/api/translate', async (req, res) => {
      const body = req as unknown as AsyncIterable<Uint8Array<ArrayBuffer>> & { headers: Record<string, string> };
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      for await (const c of body) chunks.push(c);
      const { POST } = await server.ssrLoadModule('/api/translate.ts');
      const out: Response = await POST(new Request('http://localhost/api/translate', { method: 'POST', headers: body.headers, body: new Blob(chunks) }));
      res.statusCode = out.status;
      res.setHeader('content-type', 'application/json');
      res.end(await out.text());
    });
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [react(), api(loadEnv(mode, '.', ''))],
  // Phaser alone is ~1.5MB; splitting it buys nothing for a single-page game.
  build: { chunkSizeWarningLimit: 2500 },
}));
