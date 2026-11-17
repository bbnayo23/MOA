-- MOA 0006: a second minigame in each space. Run once in the Supabase SQL editor, after 0005.
--
-- Five more scored games (src/games/timed.ts — keep ROUND there in step with timed_round here):
-- constellations, remembering orders, rhythm, finding books, outfit votes. The stained-glass
-- window in the church is made together, with no score: never recorded.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tennis', 'swim', 'fishing', 'barista', 'squat', 'memory', 'styling', 'stars', 'recall', 'rhythm', 'bookhunt', 'vote'));

create or replace function public.timed_round(p_game text, out secs int, out cap int)
language sql immutable as $$
  select r.secs, r.cap
  from (values
    ('fishing', 40, 75), ('barista', 45, 45), ('squat', 40, 140), ('memory', 60, 120), ('styling', 45, 45),
    ('stars', 45, 180), ('recall', 50, 75), ('rhythm', 40, 150), ('bookhunt', 45, 115), ('vote', 45, 3)
  ) as r(game, secs, cap)
  where r.game = p_game
$$;
