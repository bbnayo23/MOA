import { useEffect } from 'react';
import { GAMES } from '../data/games';
import { HUB, THEME_CONFIGS, THEMES } from '../data/themes';
import { useAlerts, useInvitePanel, useProfileCard, useSettings, useWhispers } from '../hooks/useSocialPanels';
import { DM_POLICY, useSocial, VISIBILITY, type DmPolicy, type Visibility } from '../net/social';
import { LANGS, type Lang } from '../net/translate';
import { useMoa } from '../store';
import c from '../styles/common.module.scss';
import p from '../styles/Panels.module.scss';
import s from '../styles/Social.module.scss';
import { AvatarImage } from './AvatarImage';

/** Places a space can open into: the plaza and every theme that's built. */
const SPACE_THEMES = [THEME_CONFIGS[HUB]!, ...THEMES.filter((t) => t.themeId in THEME_CONFIGS)];

/** Someone's card (tap their character or name): whisper, friends, visit, invite, send out, block. */
export function ProfileCard() {
  const card = useProfileCard();
  if (!card) return null;
  const { p: who, friend } = card;
  return (
    <section className={`${c.card} ${s.profile}`} role="dialog" aria-label={`${who.nickname} 프로필`}>
      <header>
        <AvatarImage look={who.look} className={s.face} />
        <span>
          <b>{who.nickname}</b>
          <small className={who.online ? s.on : undefined}>{card.where}</small>
        </span>
        <button aria-label="닫기" onClick={card.close}>
          ×
        </button>
      </header>
      <div className={s.acts}>
        {card.server && !card.blocked && (
          <button className={c.primary} onClick={card.whisper}>
            💌 귓속말
          </button>
        )}
        {card.server &&
          !card.blocked &&
          (friend === 'friend' ? (
            <button className={c.btn} onClick={card.dropFriend}>
              👫 친구 끊기
            </button>
          ) : friend === 'asking' ? (
            <button className={c.btn} onClick={card.acceptFriend}>
              👫 친구 수락
            </button>
          ) : friend === 'asked' ? (
            <button className={c.btn} onClick={card.dropFriend}>
              요청 취소
            </button>
          ) : (
            <button className={c.btn} onClick={card.addFriend}>
              👫 친구 추가
            </button>
          ))}
        {card.server && !card.blocked && (
          <button className={c.btn} onClick={card.visit}>
            🏠 공간 방문
          </button>
        )}
        {card.canAsk &&
          Object.values(GAMES).map((g) => (
            <button key={g.id} className={c.btn} onClick={() => card.challenge(g.id)}>
              {g.icon} {g.name.split(' ')[0]} 신청
            </button>
          ))}
        {card.canInvite && !card.blocked && (
          <button className={c.btn} onClick={card.invite}>
            🚪 여기로 초대
          </button>
        )}
        {card.canKick && (
          <button className={c.btn} onClick={card.kick}>
            👢 내보내기
          </button>
        )}
        {card.server && (
          <button className={`${c.btn} ${s.quiet}`} onClick={card.toggleBlock}>
            {card.blocked ? '차단 해제' : '🚫 차단'}
          </button>
        )}
      </div>
    </section>
  );
}

/** The whisper window: floats over the world, folds down to a pill, keeps up while you walk. */
export function Whispers() {
  const w = useWhispers();
  if (!w.open)
    return null;
  if (w.min)
    return (
      <button className={s.pill} onClick={w.minimize} aria-label={`귓속말 펼치기${w.unread ? `, 안 읽은 ${w.unread}개` : ''}`}>
        💌 {w.with ? w.name(w.with) : '귓속말'}
        {w.unread > 0 && <b>{w.unread}</b>}
      </button>
    );
  return (
    <section className={`${c.card} ${s.whispers}`} aria-label="귓속말">
      <header>
        {w.with ? (
          <button aria-label="대화 목록" onClick={() => w.pick(null)}>
            ←
          </button>
        ) : null}
        <h2>💌 {w.with ? w.name(w.with) : '귓속말'}</h2>
        <button aria-label="접기" onClick={w.minimize}>
          _
        </button>
        <button aria-label="닫기" onClick={w.close}>
          ×
        </button>
      </header>
      {w.with ? (
        <>
          <ol className={s.thread} aria-live="polite">
            {w.lines.map((l) => (
              <li key={l.id} className={l.mine ? s.mine : undefined}>
                {l.text}
                {l.original && <small>{l.original}</small>}
              </li>
            ))}
            {!w.lines.length && <li className={s.empty}>둘만 보는 대화예요. 첫 귓속말을 보내 보세요.</li>}
          </ol>
          <form className={s.send} onSubmit={w.send}>
            <input value={w.text} maxLength={500} placeholder="귓속말 보내기" aria-label="귓속말" enterKeyHint="send" onChange={(e) => w.setText(e.target.value)} />
            <button className={c.primary} disabled={!w.text.trim()}>
              전송
            </button>
          </form>
        </>
      ) : (
        <ul className={s.convos}>
          {w.conversations.map((cv) => (
            <li key={cv.id}>
              <button onClick={() => w.pick(cv.id)}>
                {w.look(cv.id) && <AvatarImage look={w.look(cv.id)!} className={s.face} />}
                <span>
                  <b>{w.name(cv.id)}</b>
                  <small>{cv.preview}</small>
                </span>
                {cv.unread > 0 && <i>{cv.unread}</i>}
              </button>
            </li>
          ))}
          {!w.conversations.length && <li className={s.empty}>캐릭터나 친구 이름을 누르고 💌 귓속말을 보내 보세요.</li>}
        </ul>
      )}
    </section>
  );
}

/** 🔔: invites and friend requests. */
export function Alerts({ close }: { close: () => void }) {
  const a = useAlerts();
  return (
    <section className={`${c.card} ${p.panel}`} aria-label="알림">
      <header>
        <h2>🔔 알림</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <ul className={s.list}>
        {a.invites.map((i) => (
          <li key={i.id}>
            <span>
              💌 <b>{i.from}</b>님이 <b>{i.place_name}</b>에 초대했어요
            </span>
            <button className={c.primary} onClick={() => a.accept(i.id)}>
              수락
            </button>
            <button className={c.btn} onClick={() => a.decline(i.id)}>
              거절
            </button>
          </li>
        ))}
        {a.requests.map((r) => (
          <li key={r.id}>
            <span>
              👫 <b>{r.nickname}</b>님이 친구가 되고 싶어 해요
            </span>
            <button className={c.primary} onClick={() => a.befriend(r.id)}>
              수락
            </button>
            <button className={c.btn} onClick={() => a.refuse(r.id)}>
              거절
            </button>
          </li>
        ))}
        {!a.count && <li className={s.empty}>새 알림이 없어요.</li>}
      </ul>
    </section>
  );
}

/** 💌 친구 초대: into the place I'm in — friends, people online, anyone by name, or a link. */
export function InvitePanel({ close }: { close: () => void }) {
  const v = useInvitePanel();
  return (
    <section className={`${c.card} ${p.panel}`} aria-label="친구 초대">
      <header>
        <h2>💌 {v.here.name}에 초대</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      {!v.allowed ? (
        <p className={p.tagline}>비공개 공간이라 아무도 초대할 수 없어요. ⚙️ 설정에서 공개 범위를 바꿔 보세요.</p>
      ) : (
        <>
          {v.server && <input className={s.search} value={v.q} placeholder="닉네임으로 찾기" aria-label="닉네임으로 찾기" onChange={(e) => v.setQ(e.target.value)} />}
          <ul className={s.list}>
            {v.people.map((x) => (
              <li key={x.id}>
                <span>
                  <b>{x.nickname}</b> {x.note && <small>{x.note}</small>}
                </span>
                <button className={c.primary} disabled={x.sent} onClick={() => v.invite(x)}>
                  {x.sent ? '보냄' : '초대'}
                </button>
              </li>
            ))}
            {!v.people.length && <li className={s.empty}>{v.q ? '찾는 사람이 없어요.' : '초대할 친구가 아직 없어요. 닉네임으로 찾아보세요.'}</li>}
          </ul>
          {v.server && (
            <div className={s.link}>
              <button className={c.btn} onClick={() => void v.makeLink()}>
                🔗 초대 링크 만들기 (24시간)
              </button>
              {v.link && (
                <input readOnly value={v.link} aria-label="초대 링크 (복사됨)" onFocus={(e) => e.currentTarget.select()} />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** ⚙️ 설정. */
export function SettingsPanel({ close }: { close: () => void }) {
  const t = useSettings();
  return (
    <section className={`${c.card} ${p.panel} ${s.settings}`} aria-label="설정">
      <header>
        <h2>⚙️ 설정</h2>
        <button aria-label="닫기" onClick={close}>
          ×
        </button>
      </header>
      <fieldset>
        <legend>언어 · 번역</legend>
        <label>
          내 언어
          <select value={t.lang} onChange={(e) => t.setLang(e.target.value as Lang)}>
            {(Object.keys(LANGS) as Lang[]).map((l) => (
              <option key={l} value={l}>
                {LANGS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.check}>
          <input type="checkbox" checked={t.autoTranslate} onChange={(e) => t.setAutoTranslate(e.target.checked)} />
          다른 언어 채팅을 내 언어로 자동 번역
        </label>
      </fieldset>

      {t.server && (
        <fieldset>
          <legend>귓속말</legend>
          <label>
            귓속말
            <select value={t.dmPolicy} onChange={(e) => t.setDmPolicy(e.target.value as DmPolicy)}>
              {(Object.keys(DM_POLICY) as DmPolicy[]).map((k) => (
                <option key={k} value={k}>
                  {DM_POLICY[k]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      {t.server && t.space && (
        <form onSubmit={t.saveSpace}>
          <fieldset>
            <legend>내 공간</legend>
            <label>
              이름
              <input value={t.space.name} maxLength={20} placeholder={t.placeholder} onChange={(e) => t.editSpace({ name: e.target.value })} />
            </label>
            <label>
              테마
              <select value={t.space.theme} onChange={(e) => t.editSpace({ theme: e.target.value as typeof t.space.theme })}>
                {SPACE_THEMES.map((th) => (
                  <option key={th.themeId} value={th.themeId}>
                    {th.emoji} {th.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              공개 범위
              <select value={t.space.visibility} onChange={(e) => t.editSpace({ visibility: e.target.value as Visibility })}>
                {(Object.keys(VISIBILITY) as Visibility[]).map((k) => (
                  <option key={k} value={k}>
                    {VISIBILITY[k]}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.row}>
              <button className={c.primary}>{t.saved ? '저장했어요' : '저장'}</button>
              <button type="button" className={c.btn} onClick={t.goHome}>
                🏠 내 공간으로
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {t.server && t.blocked.length > 0 && (
        <fieldset>
          <legend>차단한 사람</legend>
          <ul className={s.list}>
            {t.blocked.map((b) => (
              <li key={b.id}>
                <span>{b.nickname}</span>
                <button className={c.btn} onClick={() => t.unblock(b.id)}>
                  해제
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {t.server && t.account !== undefined && (
        <fieldset>
          <legend>계정</legend>
          {t.account ? (
            <div className={s.row}>
              <span>
                아이디 <b>{t.account}</b>
              </span>
              <button className={c.btn} onClick={t.logOut}>
                로그아웃
              </button>
            </div>
          ) : (
            <form onSubmit={t.makeAccount} className={s.claim}>
              <p className={p.tagline}>아이디를 만들면 로그아웃하거나 다른 기기에서도 이 캐릭터·공간·귓속말로 돌아올 수 있어요.</p>
              <input value={t.claim.id} autoComplete="username" placeholder="아이디 (영문·숫자 3~20자)" aria-label="새 아이디" onChange={(e) => t.setClaim({ id: e.target.value })} />
              <input value={t.claim.password} type="password" autoComplete="new-password" placeholder="비밀번호 (6자 이상)" aria-label="새 비밀번호" onChange={(e) => t.setClaim({ password: e.target.value })} />
              {t.claim.error && <p className={s.error}>{t.claim.error}</p>}
              <button className={c.primary} disabled={!t.claim.id || t.claim.password.length < 6}>
                아이디 만들기
              </button>
            </form>
          )}
        </fieldset>
      )}
    </section>
  );
}

/** A short message from the social side (a refused whisper, an expired invite…), fading after a few seconds. */
export function Notice() {
  const notice = useSocial((x) => x.notice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => useSocial.setState({ notice: '' }), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  return notice ? (
    <p className={s.notice} role="status">
      {notice}
    </p>
  ) : null;
}

/** This account went on in another window: this one steps aside (and can take it back). */
export function TakenScreen() {
  return (
    <main className={s.taken}>
      <section className={c.card}>
        <h1 className={c.logo}>MOA</h1>
        <p>다른 창에서 MOA를 열었어요. 한 계정은 한 곳에서만 움직일 수 있어요.</p>
        <button className={c.primary} onClick={() => useMoa.getState().setTaken(false)}>
          여기서 계속하기
        </button>
      </section>
    </main>
  );
}
