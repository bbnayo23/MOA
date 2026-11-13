import { useSyncExternalStore } from 'react';

/** Chrome / Edge / Android's install prompt (not in lib.dom yet). */
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
}

// The browser fires this once, often before any UI that wants it has mounted, so catch it at load.
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const set = (e: InstallPrompt | null) => {
  deferred = e;
  listeners.forEach((f) => f());
};
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we show our own button instead of the browser's banner
  set(e as InstallPrompt);
});
window.addEventListener('appinstalled', () => set(null));

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const ios = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** "Use MOA as an app": a real install button where the browser offers one, a how-to on iOS Safari. */
export function useInstall() {
  const prompt = useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    () => deferred,
  );
  return {
    canInstall: prompt !== null,
    install: async () => {
      await prompt?.prompt();
      set(null); // a prompt can only be shown once
    },
    /** iOS has no prompt: Share → Add to Home Screen. */
    showIosHint: !standalone() && ios(),
  };
}
