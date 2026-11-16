-- MOA 0003: your own space is always yours to enter — even in the moment before
-- its row exists (a brand-new account walks in before its first profile save makes it).
-- Run once in the Supabase SQL editor, after 0002.

-- may this person be in this place (see its people, move and talk there)?
create or replace function public.can_enter(p_place text, p_user uuid default auth.uid()) returns boolean
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
      if k = p_user::text then return true; end if; -- my own, even before its row exists
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
