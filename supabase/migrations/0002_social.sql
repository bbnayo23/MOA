-- MOA 0002: social — settings, personal spaces, group rooms, friends, blocks,
-- invites, whispers, and who may enter which place (checked by the server).
-- Run once in the Supabase SQL editor, after 0001.
--
-- Places: every world instance has a realtime topic.
--   'space:<owner id>'  someone's own space (one each, made with their profile)
--   'room:<room id>'    a group room made with 방 만들기
-- Movement and chat go on that place's private channel, so who can enter is
-- decided here, by can_enter() in the realtime policy — not by the app.

create extension if not exists pgcrypto with schema extensions;

-- ── settings ───────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists lang text not null default 'ko' check (lang in ('ko', 'en', 'ja')),
  add column if not exists auto_translate boolean not null default true,
  add column if not exists dm_policy text not null default 'all' check (dm_policy in ('all', 'friends', 'none'));

-- ── friends & blocks ───────────────────────────────────────────────────────
-- a request from → to; a friendship once accepted
create table public.friends (
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table public.blocks (
  blocker uuid not null default auth.uid() references public.profiles on delete cascade,
  blocked uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friends where accepted and ((from_id = a and to_id = b) or (from_id = b and to_id = a)))
$$;

-- has `who` blocked `whom`?
create function public.has_blocked(who uuid, whom uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where blocker = who and blocked = whom)
$$;

-- blocking someone ends the friendship
create function public.unfriend_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from friends where (from_id = new.blocker and to_id = new.blocked) or (from_id = new.blocked and to_id = new.blocker);
  return new;
end $$;
create trigger unfriend_blocked after insert on public.blocks for each row execute function public.unfriend_blocked();

-- ── places ─────────────────────────────────────────────────────────────────
create table public.spaces (
  owner_id uuid primary key references public.profiles on delete cascade,
  name text not null default '' check (char_length(name) <= 20), -- '' = "<nickname>의 공간"
  theme_id text not null default 'plaza',
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'invite', 'private')),
  updated_at timestamptz not null default now()
);

-- everyone has a space from their first save on
create function public.make_space() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into spaces (owner_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger make_space after insert on public.profiles for each row execute function public.make_space();
insert into public.spaces (owner_id) select id from public.profiles on conflict do nothing;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  description text not null default '' check (char_length(description) <= 60),
  theme_id text not null default 'plaza',
  max_members int not null default 10 check (max_members between 2 and 10),
  visibility text not null default 'public' check (visibility in ('public', 'private')), -- private: invite only, not listed
  password_hash text,
  locked boolean generated always as (password_hash is not null) stored,
  created_at timestamptz not null default now()
);

-- a way in that isn't open to everyone: from an accepted invite, or a room's password
create table public.passes (
  place text not null,
  user_id uuid not null references public.profiles on delete cascade,
  until timestamptz not null,
  primary key (place, user_id)
);

-- sent out by the owner: kept out for a while
create table public.bans (
  place text not null,
  user_id uuid not null references public.profiles on delete cascade,
  until timestamptz not null,
  primary key (place, user_id)
);

create function public.owner_of(p_place text) returns uuid
language sql stable security definer set search_path = public as $$
  select case split_part(p_place, ':', 1)
    when 'space' then (select owner_id from spaces where owner_id::text = split_part(p_place, ':', 2))
    when 'room' then (select owner_id from rooms where id::text = split_part(p_place, ':', 2))
  end
$$;

create function public.has_pass(p_place text, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from passes where place = p_place and user_id = p_user and until > now())
$$;

-- may this person be in this place (see its people, move and talk there)?
create function public.can_enter(p_place text, p_user uuid default auth.uid()) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  k text := split_part(p_place, ':', 2);
  s spaces;
  r rooms;
begin
  if p_user is null then return false; end if;
  if exists (select 1 from bans where place = p_place and user_id = p_user and until > now()) then return false; end if;
  case split_part(p_place, ':', 1)
    when 'space' then
      select * into s from spaces where owner_id::text = k;
      if not found then return false; end if;
      if s.owner_id = p_user then return true; end if;
      if has_blocked(s.owner_id, p_user) then return false; end if;
      return case s.visibility
        when 'public' then true
        when 'friends' then are_friends(s.owner_id, p_user) or has_pass(p_place, p_user)
        when 'invite' then has_pass(p_place, p_user)
        else false -- private: the owner only
      end;
    when 'room' then
      select * into r from rooms where id::text = k;
      if not found then return false; end if;
      if r.owner_id = p_user then return true; end if;
      if has_blocked(r.owner_id, p_user) then return false; end if;
      return (r.visibility = 'public' and r.password_hash is null) or has_pass(p_place, p_user);
    else
      return false;
  end case;
end $$;

-- may this person invite others here? a space: its owner (unless it's private); a room: anyone in it
create function public.can_invite(p_place text, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case split_part(p_place, ':', 1)
    when 'space' then owner_of(p_place) = p_user
      and (select visibility from spaces where owner_id = p_user) <> 'private'
    when 'room' then can_enter(p_place, p_user)
    else false
  end
$$;

-- realtime: a place's channel only for those who may enter it ('moa:world' stays open to members, 0001)
create policy "people in a place receive its events" on realtime.messages
  for select to authenticated using (public.can_enter(realtime.topic()));
create policy "people in a place send its events" on realtime.messages
  for insert to authenticated with check (public.can_enter(realtime.topic()));
-- each person's own channel: their new whispers / invites / friend requests (postgres changes, RLS-checked)
create policy "my own channel" on realtime.messages
  for select to authenticated using (realtime.topic() = 'user:' || auth.uid()::text);

-- make a room (p_room null) or change mine. p_password: null keeps it, '' takes it off
create function public.save_room(p_room uuid, p_name text, p_description text, p_theme text, p_max int, p_visibility text, p_password text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  hash text := case when coalesce(p_password, '') = '' then null else crypt(p_password, gen_salt('bf')) end;
  id_ uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_room is null then
    insert into rooms (owner_id, name, description, theme_id, max_members, visibility, password_hash)
    values (auth.uid(), p_name, p_description, p_theme, p_max, p_visibility, hash)
    returning id into id_;
  else
    update rooms set name = p_name, description = p_description, theme_id = p_theme, max_members = p_max, visibility = p_visibility,
      password_hash = case when p_password is null then password_hash else hash end
    where id = p_room and owner_id = auth.uid()
    returning id into id_;
    if id_ is null then raise exception 'not your room'; end if;
  end if;
  return id_;
end $$;

-- knock on a room: true when I may go in (open, or the password is right — then I keep a pass)
create function public.enter_room(p_room uuid, p_password text default null) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  r rooms;
  place_ text := 'room:' || p_room;
begin
  if can_enter(place_, auth.uid()) then return true; end if;
  select * into r from rooms where id = p_room;
  if not found or r.visibility <> 'public' or r.password_hash is null or p_password is null
     or r.password_hash <> crypt(p_password, r.password_hash)
     or exists (select 1 from bans where place = place_ and user_id = auth.uid() and until > now())
     or has_blocked(r.owner_id, auth.uid()) then
    return false;
  end if;
  insert into passes values (place_, auth.uid(), now() + interval '1 day')
    on conflict (place, user_id) do update set until = excluded.until;
  return true;
end $$;

-- the owner sends someone out: their pass goes, and they're kept out for 30 minutes
create function public.kick(p_place text, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if owner_of(p_place) is distinct from auth.uid() or p_user = auth.uid() then raise exception 'not your place'; end if;
  delete from passes where place = p_place and user_id = p_user;
  insert into bans values (p_place, p_user, now() + interval '30 minutes')
    on conflict (place, user_id) do update set until = excluded.until;
end $$;

-- ── invites ────────────────────────────────────────────────────────────────
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  place text not null,
  place_name text not null check (char_length(place_name) <= 40),
  theme_id text not null, -- where the invitee lands
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id uuid references public.profiles on delete cascade, -- null: a link anyone signed in can use
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  check (expires_at <= created_at + interval '7 days')
);
create index invites_to on public.invites (to_id, created_at);

-- take up an invite: a pass into its place. Personal ones work once, links until they expire
create function public.accept_invite(p_invite uuid) returns table (place text, place_name text, theme_id text)
language plpgsql security definer set search_path = public as $$
declare
  i invites;
begin
  select * into i from invites where id = p_invite;
  if not found or i.expires_at < now() or (i.to_id is not null and (i.to_id <> auth.uid() or i.status <> 'pending')) then
    raise exception 'invite expired';
  end if;
  if not can_invite(i.place, i.from_id) then raise exception 'invite no longer valid'; end if;
  if exists (select 1 from bans b where b.place = i.place and b.user_id = auth.uid() and b.until > now()) then
    raise exception 'sent out of this place';
  end if;
  insert into passes values (i.place, auth.uid(), now() + interval '1 day')
    on conflict on constraint passes_pkey do update set until = excluded.until;
  if i.to_id is not null then update invites set status = 'accepted' where id = p_invite; end if;
  return query select i.place, i.place_name, i.theme_id;
end $$;

-- ── whispers ───────────────────────────────────────────────────────────────
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles on delete cascade,
  to_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  lang text, -- what it's written in (null: nothing to translate)
  translation text, -- the reader's language, filled in after it arrives
  translation_lang text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (from_id <> to_id)
);
create index direct_messages_to on public.direct_messages (to_id, created_at);
create index direct_messages_from on public.direct_messages (from_id, created_at);

-- may I whisper to this person? (not blocked by them, and their setting lets me)
create function public.can_dm(p_to uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not has_blocked(p_to, auth.uid()) and coalesce((
    select case dm_policy when 'all' then true when 'friends' then are_friends(p_to, auth.uid()) else false end
    from profiles where id = p_to), false)
$$;

-- ── row level security ─────────────────────────────────────────────────────
alter table public.friends enable row level security;
alter table public.blocks enable row level security;
alter table public.spaces enable row level security;
alter table public.rooms enable row level security;
alter table public.passes enable row level security;
alter table public.bans enable row level security;
alter table public.invites enable row level security;
alter table public.direct_messages enable row level security;

create policy "see my friendships and requests" on public.friends for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "ask to be friends" on public.friends for insert to authenticated
  with check (from_id = auth.uid() and not accepted and not public.has_blocked(to_id, auth.uid()));
create policy "accept a request to me" on public.friends for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());
create policy "unfriend / decline / cancel" on public.friends for delete to authenticated
  using (auth.uid() in (from_id, to_id));

create policy "my block list" on public.blocks for select to authenticated using (blocker = auth.uid());
create policy "block" on public.blocks for insert to authenticated with check (blocker = auth.uid());
create policy "unblock" on public.blocks for delete to authenticated using (blocker = auth.uid());

create policy "spaces are known to all" on public.spaces for select to authenticated using (true);
create policy "owners set up their space" on public.spaces for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "listed rooms, and ones I can get into" on public.rooms for select to authenticated
  using (visibility = 'public' or owner_id = auth.uid() or public.has_pass('room:' || id, auth.uid()));
create policy "owners close their rooms" on public.rooms for delete to authenticated using (owner_id = auth.uid());

create policy "my passes" on public.passes for select to authenticated using (user_id = auth.uid());

create policy "invites I sent or got" on public.invites for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "invite into a place I may invite to" on public.invites for insert to authenticated
  with check (from_id = auth.uid() and status = 'pending' and public.can_invite(place, auth.uid())
    and (to_id is null or not public.has_blocked(to_id, auth.uid())));
create policy "answer an invite to me" on public.invites for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

create policy "my whispers" on public.direct_messages for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "whisper to someone who takes them" on public.direct_messages for insert to authenticated
  with check (from_id = auth.uid() and public.can_dm(to_id));
create policy "translate / mark read my whispers" on public.direct_messages for update to authenticated
  using (auth.uid() in (from_id, to_id));

-- columns a client may change (the rest only through the functions above)
revoke update on public.friends, public.spaces, public.invites, public.direct_messages from authenticated, anon;
grant update (accepted) on public.friends to authenticated;
grant update (name, theme_id, visibility, updated_at) on public.spaces to authenticated;
grant update (status) on public.invites to authenticated;
grant update (translation, translation_lang, read_at) on public.direct_messages to authenticated;
-- rooms: read without the password hash; made and changed by save_room()
revoke all on public.rooms from authenticated, anon;
grant select (id, owner_id, name, description, theme_id, max_members, visibility, locked, created_at) on public.rooms to authenticated;
grant delete on public.rooms to authenticated;
revoke all on public.passes, public.bans from anon;
revoke insert, update, delete on public.passes, public.bans from authenticated;

-- live: new whispers, invites and friend requests reach the people they're for (RLS applies)
alter publication supabase_realtime add table public.direct_messages, public.invites, public.friends;
