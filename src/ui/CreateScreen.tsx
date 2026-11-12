import { useState } from 'react';
import { AVATAR_H } from '../art/avatar';
import type { AnimKey } from '../data/anims';
import { LABELS, LOOK_OPTIONS, PRESETS, randomLook, type CharacterLook } from '../data/character';
import { useMoa } from '../store';
import { AvatarCanvas } from './AvatarCanvas';
import c from './common.module.scss';
import s from './CreateScreen.module.scss';

const TABS = ['얼굴', '헤어', '옷', '소품'] as const;
const PREVIEW: [AnimKey, string][] = [
  ['idle', '기본'],
  ['walk', '걷기'],
  ['wave', '인사'],
  ['dance', '춤'],
  ['sit', '앉기'],
];

export function CreateScreen() {
  const me = useMoa((st) => st.me);
  const returning = useMoa((st) => st.themeId !== null);
  const { setLook, setNickname, go } = useMoa.getState();
  const [tab, setTab] = useState<(typeof TABS)[number]>('얼굴');
  const [anim, setAnim] = useState<AnimKey>('idle');
  const ready = me.nickname.trim().length > 0;

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={c.logo}>
          MOA <small>우리의 순간이 모이는 곳</small>
        </h1>
        <span className={s.step}>STEP 1 · 나만의 미니미</span>
      </header>

      <main className={s.body}>
        <section className={`${c.card} ${s.stageCard}`}>
          <div className={s.stage}>
            <AvatarCanvas look={me.look} anim={anim} scale={8} animate />
          </div>
          <div className={s.row}>
            {PREVIEW.map(([key, label]) => (
              <button key={key} className={c.chip} aria-pressed={anim === key} onClick={() => setAnim(key)}>
                {label}
              </button>
            ))}
          </div>
          <label className={s.field}>
            <span>닉네임</span>
            <input
              value={me.nickname}
              maxLength={10}
              placeholder="친구들에게 보일 이름"
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ready && go(returning ? 'world' : 'themes')}
            />
          </label>
          <button className={c.primary} disabled={!ready} onClick={() => go(returning ? 'world' : 'themes')}>
            {returning ? '월드로 돌아가기' : '다음 · 공간 고르기'} →
          </button>
        </section>

        <section className={`${c.card} ${s.editor}`}>
          <h2 className={s.title}>캐릭터 선택</h2>
          <div className={s.presets}>
            {PRESETS.map((p) => (
              <button key={p.name} className={s.preset} onClick={() => setLook(p.look)}>
                <AvatarCanvas look={p.look} scale={3} />
                <span>{p.name}</span>
              </button>
            ))}
            <button className={s.preset} onClick={() => setLook(randomLook())}>
              <span className={s.dice}>🎲</span>
              <span>랜덤</span>
            </button>
          </div>

          <div role="tablist" className={s.tabs}>
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={s.tab} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className={s.groups}>
            {LOOK_OPTIONS.filter((o) => o.tab === tab).map((o) => (
              <div key={o.key} className={s.group}>
                <h3>{o.label}</h3>
                <div className={o.color ? s.swatches : s.options}>
                  {o.values.map((v) => {
                    const patch = { [o.key]: v } as Partial<CharacterLook>;
                    const pressed = me.look[o.key] === v;
                    return o.color ? (
                      <button
                        key={v}
                        className={s.swatch}
                        style={{ background: v }}
                        aria-pressed={pressed}
                        aria-label={`${o.label} ${v}`}
                        onClick={() => setLook(patch)}
                      />
                    ) : (
                      <button key={v} className={s.option} aria-pressed={pressed} onClick={() => setLook(patch)}>
                        <AvatarCanvas look={{ ...me.look, ...patch }} scale={2} rows={o.tab === '옷' ? AVATAR_H : 19} />
                        <span>{LABELS[v]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
