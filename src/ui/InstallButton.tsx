import { useInstall } from '../hooks/useInstall';
import c from '../styles/common.module.scss';

/** Install-as-app entry: nothing when already installed or the browser can't install. */
export function InstallButton() {
  const { canInstall, install, showIosHint } = useInstall();
  if (canInstall)
    return (
      <button className={c.btn} onClick={install}>
        📲 앱으로 설치
      </button>
    );
  if (showIosHint) return <p className={c.note}>📲 공유 버튼 → ‘홈 화면에 추가’로 앱처럼 쓸 수 있어요</p>;
  return null;
}
