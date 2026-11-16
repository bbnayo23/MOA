-- MOA 0004: minigame matches, and results the server checks before keeping them.
-- Run once in the Supabase SQL editor, after 0003.
--
-- The host opens a record when a match starts (who plays, where — server time).
-- At the end every player reports the scores; the server keeps them only if they
-- make sense (bounds, the time actually taken on the server's clock) and the
-- players agree. Computer players appear in scores as 'cpu1', 'cpu2', …

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('tennis', 'swim')),
  place text not null,
  host uuid not null default auth.uid() references public.profiles on delete cascade,
  players uuid[] not null,
  started_at timestamptz not null default now(),
  status text not null default 'playing' check (status in ('playing', 'done', 'disputed')),
  result jsonb
);

create table public.match_reports (
  match_id uuid not null references public.matches on delete cascade,
  reporter uuid not null references public.profiles on delete cascade,
  scores jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, reporter)
);

alter table public.matches enable row level security;
alter table public.match_reports enable row level security;
-- players and anyone who may be in that place see a match; nobody writes rows directly
create policy "matches where I play or may be" on public.matches for select to authenticated
  using (auth.uid() = any (players) or public.can_enter(place));
revoke insert, update, delete on public.matches, public.match_reports from authenticated, anon;
revoke select on public.match_reports from anon, authenticated;

-- Start a match: I'm one of the players, everyone may be in that place, the numbers fit the game.
create function public.start_match(p_game text, p_place text, p_players uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  n int := coalesce(array_length(p_players, 1), 0);
  id_ uuid;
begin
  if auth.uid() is null or not auth.uid() = any (p_players) then raise exception 'not a player'; end if;
  if n <> (select count(distinct p) from unnest(p_players) p) then raise exception 'a player twice'; end if;
  if n > (case p_game when 'tennis' then 2 when 'swim' then 4 else 0 end) then raise exception 'too many players'; end if;
  if exists (select 1 from unnest(p_players) p where not can_enter(p_place, p)) then raise exception 'not everyone may be here'; end if;
  insert into matches (game, place, host, players) values (p_game, p_place, auth.uid(), p_players) returning id into id_;
  return id_;
end $$;

-- Do these scores make sense for this match (whoever's in it, the rules, the time it took)?
create function public.scores_ok(m matches, s jsonb) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  k text;
  v jsonb;
  vals numeric[] := '{}';
  took numeric := extract(epoch from now() - m.started_at);
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
  elsif m.game = 'swim' then
    -- 25 m: nobody under 7.8 s (3.2 m/s), and nobody's time longer than the race has run (countdown 3 s)
    return not exists (select 1 from unnest(vals) x where x < 7.8 or x > 60 or x > took - 2.5);
  end if;
  return false;
end $$;

-- A player reports the result. Kept ('done') once every player's report agrees — or, when
-- some never report (dropped out), once those who did have agreed for 20 s. Otherwise 'disputed'.
create function public.report_match(p_match uuid, p_scores jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  m matches;
  n int;
  kinds int;
begin
  select * into m from matches where id = p_match for update;
  if not found or not auth.uid() = any (m.players) then raise exception 'not your match'; end if;
  if m.status <> 'playing' then return m.status; end if;
  if not scores_ok(m, p_scores) then
    update matches set status = 'disputed' where id = p_match;
    return 'disputed';
  end if;
  insert into match_reports (match_id, reporter, scores) values (p_match, auth.uid(), p_scores)
    on conflict (match_id, reporter) do update set scores = excluded.scores;
  select count(*), count(distinct scores) into n, kinds from match_reports where match_id = p_match;
  if kinds > 1 then
    update matches set status = 'disputed' where id = p_match;
    return 'disputed';
  end if;
  if n = array_length(m.players, 1)
     or (select min(created_at) from match_reports where match_id = p_match) < now() - interval '20 seconds' then
    update matches set status = 'done', result = p_scores where id = p_match;
    return 'done';
  end if;
  return 'pending';
end $$;

-- Records everyone in MOA can see: fastest swims; most tennis wins.
create function public.game_records(p_game text) returns table (nickname text, value numeric)
language sql stable security definer set search_path = public as $$
  with scored as (
    select r.key::uuid as who, (r.value #>> '{}')::numeric as v, m.result
    from matches m, jsonb_each(m.result) r
    where m.game = p_game and m.status = 'done' and r.key !~ '^cpu' and jsonb_typeof(r.value) = 'number'
  ), best as (
    select who, case when p_game = 'swim' then min(v) else count(*) filter (where v = 5) end as value
    from scored group by who
  )
  select p.nickname, b.value from best b join profiles p on p.id = b.who
  where b.value > 0
  order by case when p_game = 'swim' then b.value else -b.value end
  limit 5
$$;
