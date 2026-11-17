/** Lift the loading screen index.html shows from the first moment (once there's something to see). */
export function hideSplash() {
  const el = document.getElementById('splash');
  if (!el || el.classList.contains('gone')) return;
  el.classList.add('gone');
  setTimeout(() => el.remove(), 600);
}
