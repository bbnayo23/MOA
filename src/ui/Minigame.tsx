import { useEffect, useState } from 'react';
import { toGame } from '../bridge';
import { GAMES, type GameId } from '../data/games';
import { useShallow } from 'zustand/react/shallow';
import { ask, exit, join, ready, rematch, records, start, useGame, watch, type Match } from '../games/session';
import { ranking } from '../games/swim';
import { SwimGame } from '../games/SwimGame';
import { TennisGame } from '../games/TennisGame';
import { TimedGame } from '../games/TimedGame';
import { roomOf, useMoa } from '../store';
import c from '../styles/common.module.scss';
import p from '../styles/Panels.module.scss';
import s from '../styles/Minigame.module.scss';

/** Tennis and swimming have their own 3D scenes; every other game is a timed round on a card. */
const view = (game: GameId) => (game === 'tennis' || game === 'doubles' ? TennisGame : game === 'swim' ? SwimGame : TimedGame);

/** Leave the table and stop the action that opened it. */
const leave = () => {
  exit();
  toGame.emit('stop', null);
};

/** Games others have opened in this space: join a seat, or watch. */
export function GameTables() {
  const tables = useGame((g) => g.tables);
  const busy = useGame((g) => !!g.match);
  const myId = useMoa((st) => st.me.id);
  const list = Object.values(tables).filter((t) => t.host !== myId);
  if (busy || !list.length) return null;
  return (
    <ul className={s.tables}>
      {list.map((t) => {
        const def = GAMES[t.game];
        const full = t.seats.length >= def.max;
        return (
          <li key={t.mid}>
            <span>
              {def.icon} <b>{def.name}</b> · {t.seats[0]?.nickname} ({t.seats.length}/{def.max}){t.status === 'playing' && ' · 경기 중'}
            </span>
            {t.status === 'open' && !full && (
              <button className={c.primary} onClick={() => join(t)}>
                참가
              </button>
            )}
            <button className={c.btn} onClick={() => watch(t)}>
              관전
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The table before a game: who's in, ready checks, start (or solo against the computer), invite, records. */
export function GameLobby({ invite }: { invite: () => void }) {
  const m = useGame((g) => g.match)!;
  const myId = useMoa((st) => st.me.id);
  const def = GAMES[m.game];
  const best = useRecords(m.game);
  const host = m.host === myId;
  const mine = m.seats.find((x) => x.id === myId);
  const allReady = m.seats.length >= def.min && m.seats.every((x) => x.ready);
  // people here (this room, any space in it) who aren't at the table: ask them over
  const here = useMoa(useShallow((st) => st.peers.filter((x) => x.room.id === roomOf(st).id && x.id !== st.me.id)));
  const free = here.filter((x) => !m.seats.some((seat) => seat.id === x.id));
  const room = m.seats.length < def.max;
  return (
    <section className={`${c.card} ${p.panel} ${s.lobby}`} aria-label={`${def.name} 대기실`}>
      <header>
        <h2>
          {def.icon} {def.name}
        </h2>
        <button aria-label="나가기" onClick={leave}>
          ×
        </button>
      </header>
      <ul className={s.how}>
        {def.howTo.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <ol className={s.seats}>
        {Array.from({ length: def.max }, (_, i) => m.seats[i]).map((x, i) =>
          x ? (
            <li key={x.id}>
              {def.teams && (i % 2 ? '🔵 ' : '🔴 ')}
              {x.id === m.host && '👑 '}
              {x.nickname}
              {x.id === myId && ' (나)'}
              <em className={x.ready ? s.ok : undefined}>{x.ready ? '준비 완료' : '대기 중'}</em>
            </li>
          ) : (
            <li key={`empty${i}`} className={s.empty}>
              빈 자리
            </li>
          ),
        )}
      </ol>
      {!!m.watchers?.length && <p className={p.tagline}>👀 관전 {m.watchers.length}명 — 경기 중엔 관중석에 앉아 있어요</p>}
      {m.role === 'watch' ? (
        <p className={p.tagline}>👀 관전 중 — 경기가 시작되면 함께 봐요.</p>
      ) : (
        <div className={s.row}>
          {host ? (
            <>
              <button className={c.primary} disabled={!allReady} onClick={() => void start()}>
                {!allReady ? `친구 기다리는 중 (${def.min}명부터)` : def.fill && m.seats.length < def.max ? '시작! (빈자리는 컴퓨터)' : '시작!'}
              </button>
              <button className={c.btn} onClick={() => void start(true)}>
                {def.cpu ? '🤖 혼자 하기' : '혼자 하기'}
              </button>
            </>
          ) : (
            <button className={c.primary} onClick={() => ready(!mine?.ready)}>
              {mine?.ready ? '준비 취소' : '준비'}
            </button>
          )}
          <button className={c.btn} onClick={invite}>
            💌 친구 초대
          </button>
        </div>
      )}
      {host && m.phase === 'lobby' && room && free.length > 0 && (
        <>
          <p className={p.tagline}>여기 있는 사람에게 한 판 신청해 보세요</p>
          <ul className={s.seats}>
            {free.map((x) => {
              const asked = m.asked?.includes(x.id);
              return (
                <li key={x.id}>
                  {x.nickname}
                  <button className={asked ? c.btn : c.primary} disabled={asked} onClick={() => ask(m.game, x.id)}>
                    {asked ? '신청함 ✓' : `${def.icon} 신청`}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {best.length > 0 && (
        <p className={s.records}>
          🏅 {m.game === 'swim' ? '최고 기록' : m.game === 'tennis' || m.game === 'doubles' ? '최다 승리' : '최고 점수'}:{' '}
          {best.map((r, i) => (
            <span key={i}>
              {r.nickname} {m.game === 'swim' ? `${Number(r.value).toFixed(2)}초` : m.game === 'tennis' || m.game === 'doubles' ? `${r.value}승` : `${r.value}점`}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function useRecords(game: Match['game']) {
  const [list, setList] = useState<{ nickname: string; value: number }[]>([]);
  useEffect(() => {
    let live = true;
    void records(game).then((r) => live && setList(r));
    return () => {
      live = false;
    };
  }, [game]);
  return list;
}

/** The game itself over the world: countdown, play, results. */
export function GameStage() {
  const m = useGame((g) => g.match)!;
  const myId = useMoa((st) => st.me.id);
  const View = view(m.game);
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (m.phase !== 'countdown') return;
    const id = setInterval(() => setCount(Math.max(0, Math.ceil((m.startAt - performance.now()) / 1000))), 100);
    return () => clearInterval(id);
  }, [m.phase, m.startAt]);
  return (
    <section className={GAMES[m.game].scene ? s.stage : `${s.stage} ${s.overlay}`} aria-label={GAMES[m.game].name}>
      <View key={m.seed} match={m} meId={myId} />
      <button className={s.quit} onClick={leave} aria-label="게임 나가기">
        나가기
      </button>
      {m.phase === 'countdown' && <p className={s.count}>{count || '시작!'}</p>}
      {m.phase === 'result' && <Results m={m} me={myId} />}
    </section>
  );
}

function Results({ m, me }: { m: Match; me: string }) {
  const def = GAMES[m.game];
  const scores = m.scores ?? {};
  const name = (id: string) => (id === me ? '나' : m.seats.find((x) => x.id === id)?.nickname ?? id);
  const order = def.score === 'time' ? ranking(scores) : Object.entries(scores).sort(([, a], [, b]) => (b ?? -1) - (a ?? -1));
  // first (tied first, too) — a game with no winner just says thanks
  const best = order[0]?.[1];
  const won = best != null && scores[me] === best;
  const firsts = order.filter(([, v]) => v === best).length;
  const title = def.score === 'none' ? `${def.icon} 함께해서 좋았어요` : m.role === 'player' && won ? (firsts > 1 && !def.teams ? '🤝 공동 1위!' : '🏆 승리!') : '🏁 경기 종료';
  return (
    <div className={`${c.card} ${s.results}`} role="dialog" aria-label="결과">
      <h2>{title}</h2>
      {def.score === 'none' ? (
        <>
          {def.together && !!scores[me] && <p className={s.verdict}>{def.together.replace('{n}', String(scores[me]))}</p>}
          <p className={p.tagline}>{m.seats.map((x) => name(x.id)).join(' · ')}</p>
        </>
      ) : (
        <ol>
          {order.map(([id, v], i) => (
            <li key={id} className={id === me ? s.me : undefined}>
              <b>{i + 1}</b> {name(id)}
              <span>{v === null ? (m.left.includes(id) ? '나감' : '기권') : def.score === 'time' ? `${v.toFixed(2)}초` : `${v}점`}</span>
            </li>
          ))}
        </ol>
      )}
      <p className={s.verdict}>
        {m.verdict === 'done' && '✓ 서버가 확인하고 기록했어요'}
        {m.verdict === 'pending' && '서버 확인 중… (모두의 결과를 기다려요)'}
        {m.verdict === 'disputed' && '⚠ 결과가 서로 달라 기록하지 않았어요'}
        {m.verdict === 'local' && '로컬 모드 — 서버 기록 없음'}
      </p>
      <div className={s.row}>
        {m.host === me && (
          <button className={c.primary} onClick={rematch}>
            다시 하기
          </button>
        )}
        {m.host !== me && m.role === 'player' && <span className={p.tagline}>호스트가 다시 하기를 누르면 이어서 해요</span>}
        <button className={c.btn} onClick={leave}>
          나가기
        </button>
      </div>
    </div>
  );
}
