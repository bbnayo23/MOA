import type { CSSProperties } from 'react';
import { THEME_CONFIGS, THEMES, type ThemeId } from '../data/themes';
import { useCheerBoard } from '../hooks/useCheerBoard';
import { useFocusTimer } from '../hooks/useFocusTimer';
import { useLobby } from '../hooks/useLobby';
import { useMenu } from '../hooks/useMenu';
import { useRallyGame } from '../hooks/useRallyGame';
import { useWardrobe } from '../hooks/useWardrobe';
import { ROOM_MAX } from '../net/rooms';
import { useMoa } from '../store';
import c from '../styles/common.module.scss';
import s from '../styles/Panels.module.scss';
import { AvatarImage } from './AvatarImage';

/** The room list (🚪 in the top bar): join a room, make one, or go back to your own space. */
export function Lobby({ close }: { close: () => void }) {
  const l = useLobby(close);
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="방 목록">
      <header>
        <h2>🚪 방 목록</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <p className={s.here}>
        <span>
          지금 <b>{l.here.name}</b> · {l.here.members.length}/{ROOM_MAX}명
        </span>
        {!l.inOwnSpace && (
          <button className={c.btn} onClick={l.leave}>
            내 공간으로
          </button>
        )}
      </p>
      {l.rooms.length ? (
        <ol className={s.rooms}>
          {l.rooms.map((r, i) => {
            const space = THEME_CONFIGS[r.themeId];
            return (
              <li key={r.id} aria-current={r.mine || undefined}>
                <span className={s.no}>{String(i + 1).padStart(3, '0')}</span>
                <span className={s.title}>
                  <b>{r.name}</b>
                  <small>
                    {space?.emoji} {space?.name} · 방장 {r.members[0].nickname}
                  </small>
                </span>
                <span className={s.count}>
                  {r.members.length}/{ROOM_MAX}
                </span>
                {r.mine ? (
                  <em>참여 중</em>
                ) : (
                  <button className={c.primary} disabled={r.full} onClick={() => l.join(r)}>
                    {r.full ? '가득' : '입장'}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={s.tagline}>아직 열린 방이 없어요. 첫 방을 만들어 보세요!</p>
      )}
      <form onSubmit={l.create}>
        <input value={l.name} maxLength={20} placeholder={l.placeholder} aria-label="새 방 이름" onChange={(e) => l.setName(e.target.value)} />
        <button className={c.primary}>방 만들기</button>
      </form>
      <p className={s.tagline}>내 공간엔 ☰ 친구 목록에서 초대해서 모여요. 한 방에 {ROOM_MAX}명까지.</p>
    </section>
  );
}

/** Opens in the fitting room (action `opens: 'wardrobe'`). Each card previews the look on you. */
export function Wardrobe() {
  const w = useWardrobe();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="피팅룸">
      <header>
        <h2>👗 피팅룸</h2>
        <button aria-label="닫기" onClick={w.close}>
          ×
        </button>
      </header>
      <ul className={s.outfits}>
        {w.outfits.map((o) => (
          <li key={o.name}>
            <button aria-pressed={o.wearing} onClick={() => w.wear(o.look)}>
              <AvatarImage look={o.preview} mode="full" className={s.outfit} />
              <span>{o.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={s.row}>
        <button className={c.primary} onClick={w.share}>
          ✨ 코디 공유하기
        </button>
        <button className={c.btn} onClick={w.customize}>
          🎨 직접 꾸미기
        </button>
      </div>
    </section>
  );
}

/** Opens for the tennis mini-game (action `opens: 'rally'`). */
export function RallyGame() {
  const g = useRallyGame();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="랠리 미니게임">
      <header>
        <h2>🏆 랠리 미니게임</h2>
        <button aria-label="닫기" onClick={g.close}>
          ×
        </button>
      </header>
      <p className={s.tagline}>하루가 넘긴 공이 노란 구역에 들어오면 스윙!</p>
      <div className={s.court} style={{ '--pos': g.pos, '--zone': g.zone } as CSSProperties}>
        <span className={s.zone} />
        <span className={s.ball} />
        <em>하루</em>
        <em>나</em>
      </div>
      <p className={s.score}>
        랠리 <b>{g.hits}</b> · 최고 {g.best}
      </p>
      {g.state === 'playing' ? (
        <button className={c.primary} onClick={g.swing}>
          스윙! (Space)
        </button>
      ) : (
        <button className={c.primary} onClick={g.start}>
          {g.state === 'over' ? '다시 하기' : '시작'}
        </button>
      )}
    </section>
  );
}

/** Opens while I'm at the restaurant counter (action `opens: 'menu'`). */
export function MenuPanel() {
  const { menu, ordered, order, close } = useMenu();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="메뉴">
      <header>
        <h2>🧾 오늘의 메뉴</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <ul className={s.menu}>
        {menu.map((m) => (
          <li key={m.name}>
            <button onClick={() => order(m)} aria-pressed={ordered.includes(m.name)}>
              <span className={s.dish} aria-hidden>
                {m.emoji}
              </span>
              <strong>{m.name}</strong>
              <small>{ordered.includes(m.name) ? '주문 완료 ✓' : m.desc}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Opens while I'm studying at a desk (action `opens: 'timer'`). */
export function FocusTimer() {
  const t = useFocusTimer();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="집중 타이머">
      <header>
        <h2>⏰ 집중 타이머</h2>
        <button aria-label="닫기" onClick={t.close}>
          ×
        </button>
      </header>
      <p className={s.clock} style={{ '--progress': t.progress } as CSSProperties} aria-live="off">
        {t.clock}
      </p>
      <div className={s.row}>
        {t.presets.map((m) => (
          <button key={m} className={c.chip} aria-pressed={t.total === m * 60} onClick={() => t.pick(m)}>
            {m}분
          </button>
        ))}
      </div>
      <div className={s.row}>
        <button className={c.primary} onClick={t.toggle}>
          {t.running ? '일시정지' : '시작'}
        </button>
        <button className={c.btn} onClick={t.reset}>
          처음으로
        </button>
      </div>
    </section>
  );
}

/** A building that isn't open yet: what you'll be able to do there. */
export function ThemePreview({ id }: { id: ThemeId }) {
  const t = THEMES.find((x) => x.themeId === id)!;
  const showPreview = useMoa((st) => st.showPreview);
  return (
    <section className={`${c.card} ${s.panel}`} aria-label={`${t.name} 미리보기`}>
      <header>
        <h2>
          {t.emoji} {t.name}
        </h2>
        <button aria-label="닫기" onClick={() => showPreview(null)}>
          ×
        </button>
      </header>
      <p className={s.tagline}>{t.tagline}</p>
      <ul className={s.acts}>
        {t.activities.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p className={s.soon}>🔒 아직 공사 중이에요. 곧 열려요!</p>
    </section>
  );
}

/** Opens while I'm at the board (action `opens: 'board'`); moving away closes it. */
export function CheerBoard() {
  const { cheers, text, setText, listRef, submit, close, blurOnEscape } = useCheerBoard();
  return (
    <section className={`${c.card} ${s.panel}`} aria-label="응원 보드">
      <header>
        <h2>💌 응원 보드</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <ul ref={listRef} className={s.notes}>
        {cheers.map((n) => (
          <li key={n.id}>
            <p>{n.text}</p>
            <span>— {n.nickname}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit}>
        <input
          autoFocus
          value={text}
          maxLength={40}
          placeholder="친구에게 응원 한마디"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={blurOnEscape}
        />
        <button type="submit" className={c.primary}>
          붙이기
        </button>
      </form>
    </section>
  );
}
