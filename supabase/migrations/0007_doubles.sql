-- MOA 0007: tennis doubles (2:2). Run once in the Supabase SQL editor, after 0006.
--
-- Up to four players (empty seats are computer players, 'cpu1'…'cpu3'); everyone reports
-- their team's points, so a finished match has two players on 5.

alter table public.matches drop constraint matches_game_check;
alter table public.matches add constraint matches_game_check
  check (game in ('tennis', 'doubles', 'swim', 'fishing', 'barista', 'squat', 'memory', 'styling', 'stars', 'recall', 'rhythm', 'bookhunt', 'vote'));

create or replace function public.start_match(p_game text, p_place text, p_players uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  n int := coalesce(array_length(p_players, 1), 0);
  id_ uuid;
begin
  if auth.uid() is null or not auth.uid() = any (p_players) then raise exception 'not a player'; end if;
  if n <> (select count(distinct p) from unnest(p_players) p) then raise exception 'a player twice'; end if;
  if n > (case when p_game = 'tennis' then 2 when p_game in ('doubles', 'swim') or (timed_round(p_game)).secs is not null then 4 else 0 end) then
    raise exception 'too many players';
  end if;
  if exists (select 1 from unnest(p_players) p where not can_enter(p_place, p)) then raise exception 'not everyone may be here'; end if;
  insert into matches (game, place, host, players) values (p_game, p_place, auth.uid(), p_players) returning id into id_;
  return id_;
end $$;

create or replace function public.scores_ok(m matches, s jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  k text;
  v jsonb;
  vals numeric[] := '{}';
  took numeric := extract(epoch from now() - m.started_at);
  r record;
begin
  if jsonb_typeof(s) <> 'object' then return false; end if;
  -- every player is there; the only others are computer players
  if exists (select 1 from unnest(m.players) as u(id) where not s ? u.id::text) then return false; end if;
  for k, v in select * from jsonb_each(s) loop
    if not (k = any (select u.id::text from unnest(m.players) as u(id)) or k ~ '^cpu[1-3]$') then return false; end if;
    if jsonb_typeof(v) = 'null' then continue; end if; -- dropped out / didn't finish
    if jsonb_typeof(v) <> 'number' then return false; end if;
    vals := vals || (v #>> '{}')::numeric;
  end loop;
  if m.game = 'tennis' then
    -- points 0–5, at most one winner, and a whole match can't take under 3 s a point
    return took >= 3 + 2 * (select coalesce(sum(x), 0) from unnest(vals) x)
      and not exists (select 1 from unnest(vals) x where x < 0 or x > 5 or x <> trunc(x))
      and (select count(*) from unnest(vals) x where x = 5) <= 1;
  elsif m.game = 'doubles' then
    -- everyone has their team's points (0–5): at most one winning team (two players on 5), ≥ 3 s a point
    -- (each point counts twice in the sum, once per player of the team that won it)
    return took >= 3 + (select coalesce(sum(x), 0) from unnest(vals) x)
      and not exists (select 1 from unnest(vals) x where x < 0 or x > 5 or x <> trunc(x))
      and (select count(*) from unnest(vals) x where x = 5) <= 2;
  elsif m.game = 'swim' then
    -- 25 m: nobody under 7.8 s (3.2 m/s), and nobody's time longer than the race has run (countdown 3 s)
    return not exists (select 1 from unnest(vals) x where x < 7.8 or x > 60 or x > took - 2.5);
  end if;
  r := timed_round(m.game);
  if r.secs is null then return false; end if;
  -- the round is over (a 3 s countdown, then its length), and whole points within what it can give
  return took >= r.secs + 2 and not exists (select 1 from unnest(vals) x where x < 0 or x > r.cap or x <> trunc(x));
end $$;

-- Records everyone in MOA can see: fastest swims, most tennis wins, best scores in the rest (doubles: wins, like tennis).
create or replace function public.game_records(p_game text) returns table (nickname text, value numeric)
language sql stable security definer set search_path = public as $$
  with scored as (
    select r.key::uuid as who, (r.value #>> '{}')::numeric as v
    from matches m, jsonb_each(m.result) r
    where m.game = p_game and m.status = 'done' and r.key !~ '^cpu' and jsonb_typeof(r.value) = 'number'
  ), best as (
    select who, case when p_game = 'swim' then min(v) when p_game in ('tennis', 'doubles') then count(*) filter (where v = 5) else max(v) end as value
    from scored group by who
  )
  select p.nickname, b.value from best b join profiles p on p.id = b.who
  where b.value > 0
  order by case when p_game = 'swim' then b.value else -b.value end
  limit 5
$$;
