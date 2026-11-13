-- MOA: profiles (look, nickname, last place) + members-only realtime.
-- Run once in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null default '',
  look jsonb not null,
  theme_id text,
  pos jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- friends see each other; everyone writes only their own row
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);
create policy "users insert their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- realtime: the app uses one *private* channel ('moa:world') for presence + broadcast;
-- only signed-in members may join it
create policy "members receive world events" on realtime.messages
  for select to authenticated using (realtime.topic() = 'moa:world');
create policy "members send world events" on realtime.messages
  for insert to authenticated with check (realtime.topic() = 'moa:world');
