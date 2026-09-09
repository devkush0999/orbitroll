-- All ranked writes go through replay validation. No client can write a score or role.
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique default ('pilot_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default 'Space pilot' check (char_length(display_name) between 1 and 32),
  is_public boolean not null default false,
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
create table private.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
create table private.moderation (user_id uuid primary key references auth.users(id) on delete cascade, excluded boolean not null default false);
create table public.ranked_levels (
  id integer primary key, revision integer not null default 1,
  name text not null, definition jsonb not null,
  published boolean not null default true,
  check (jsonb_typeof(definition->'path') = 'array')
);
create table public.runs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id integer not null references public.ranked_levels(id),
  revision integer not null, directions text[] not null,
  moves integer not null check (moves between 1 and 512),
  crystals integer not null check (crystals between 0 and 3),
  stars integer not null check (stars between 1 and 3),
  points integer not null check (points >= 0),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index runs_personal on public.runs(user_id, level_id, points desc) where not hidden;
create index runs_recent on public.runs(created_at desc, id);
create index runs_rate on public.runs(user_id, created_at);
create table public.connections (
  user_a uuid references public.profiles(id) on delete cascade,
  user_b uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_a, user_b), check(user_a < user_b)
);
create table private.admin_audit (
  id bigint generated always as identity primary key,
  actor uuid not null references auth.users(id), action text not null,
  target text not null, reason text not null check(char_length(reason) between 5 and 500),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.ranked_levels enable row level security;
alter table public.runs enable row level security;
alter table public.connections enable row level security;
alter table private.admin_users enable row level security;
alter table private.moderation enable row level security;
alter table private.admin_audit enable row level security;
revoke all on public.profiles, public.ranked_levels, public.runs, public.connections from anon, authenticated;
grant select on public.profiles, public.ranked_levels, public.runs, public.connections to authenticated;
grant update(username, display_name, is_public) on public.profiles to authenticated;
create policy profile_owner on public.profiles for select to authenticated using(id = (select auth.uid()));
create policy profile_edit on public.profiles for update to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()));
create policy published_levels on public.ranked_levels for select to authenticated using(published);
create policy own_runs on public.runs for select to authenticated using(user_id = (select auth.uid()));
create policy own_connections on public.connections for select to authenticated using((select auth.uid()) in (user_a, user_b));

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
create trigger create_player after insert on auth.users for each row execute function private.create_profile();
-- Covers users who existed before this migration.
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from private.admin_users where user_id = auth.uid());
$$;

create function public.submit_run(p_id uuid, p_level integer, p_revision integer, p_directions text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); lvl public.ranked_levels; existing public.runs;
 path jsonb; lifts jsonb; gems jsonb; pos jsonb; dest jsonb;
 idx integer := 0; target integer; dx integer; dz integer; step text;
 seen integer[] := '{}'; steps integer := 0; gem_count integer; stars integer; points integer;
begin
 if uid is null then raise exception 'Sign in to submit a run'; end if;
 if exists(select 1 from private.moderation where user_id=uid and excluded) then raise exception 'Ranked play is unavailable for this account'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
 select * into existing from public.runs where id=p_id;
 if found then
   if existing.user_id <> uid then raise exception 'Request ID already used'; end if;
   if existing.level_id <> p_level or existing.revision <> p_revision or existing.directions <> p_directions then raise exception 'Retry payload changed'; end if;
   return jsonb_build_object('id',existing.id,'points',existing.points,'stars',existing.stars,'moves',existing.moves,'crystals',existing.crystals);
 end if;
 if p_id is null or p_directions is null or cardinality(p_directions) not between 1 and 512 or array_ndims(p_directions) <> 1 then raise exception 'Invalid move sequence'; end if;
 if (select count(*) from public.runs where user_id=uid and created_at > now()-interval '1 hour') >= 120 then raise exception 'Too many runs. Please try later.'; end if;
 select * into lvl from public.ranked_levels where id=p_level and published;
 if not found or lvl.revision <> p_revision then raise exception 'This trail version is unavailable'; end if;
 if p_level not in (1,7) and not exists(select 1 from public.runs where user_id=uid and level_id=p_level-1 and not hidden) then raise exception 'Finish the previous ranked trail first'; end if;
 path := lvl.definition->'path'; lifts := lvl.definition->'lifts'; gems := lvl.definition->'gems'; pos := path->0;
 foreach step in array p_directions loop
   if step is null or step not in ('north','east','south','west','up','down') then raise exception 'Unknown move'; end if;
   if idx = jsonb_array_length(path)-1 then raise exception 'Moves after the portal'; end if;
   target := null;
   if step in ('up','down') then
     select candidate.i into target from (
       select case when (link->>'from')::int=idx then (link->>'to')::int else (link->>'from')::int end i
       from jsonb_array_elements(lifts) link where idx in ((link->>'from')::int,(link->>'to')::int)
     ) candidate
     where case when step='up' then (path->candidate.i->>'y')::numeric > (pos->>'y')::numeric else (path->candidate.i->>'y')::numeric < (pos->>'y')::numeric end
     order by abs((path->candidate.i->>'y')::numeric-(pos->>'y')::numeric) limit 1;
   else
     dx := case step when 'east' then 1 when 'west' then -1 else 0 end;
     dz := case step when 'south' then 1 when 'north' then -1 else 0 end;
     if exists(select 1 from jsonb_array_elements(path) c where (c->>'x')::numeric=(pos->>'x')::numeric+dx and (c->>'z')::numeric=(pos->>'z')::numeric+dz and (c->>'y')::numeric>(pos->>'y')::numeric and (c->>'y')::numeric-0.56 < (pos->>'y')::numeric+sqrt(2::numeric)) then raise exception 'Blocked move'; end if;
     select (ord-1)::int into target from jsonb_array_elements(path) with ordinality as cells(c,ord)
       where (c->>'x')::numeric=(pos->>'x')::numeric+dx and (c->>'z')::numeric=(pos->>'z')::numeric+dz and (c->>'y')::numeric <= (pos->>'y')::numeric
       order by (c->>'y')::numeric desc limit 1;
   end if;
   if target is null then raise exception 'Move leaves the trail'; end if;
   idx := target; pos := path->idx; steps := steps+1;
   if gems @> to_jsonb(array[idx]) and not idx=any(seen) then seen:=array_append(seen,idx); end if;
 end loop;
 if idx <> jsonb_array_length(path)-1 then raise exception 'Portal not reached'; end if;
 gem_count := cardinality(seen);
 stars := case when gem_count=jsonb_array_length(gems) and steps<=jsonb_array_length(path)+2 then 3 when gem_count>=2 then 2 else 1 end;
 points := stars*1000 + greatest(0, jsonb_array_length(path)+2-steps)*10;
 insert into public.runs(id,user_id,level_id,revision,directions,moves,crystals,stars,points) values(p_id,uid,p_level,p_revision,p_directions,steps,gem_count,stars,points);
 return jsonb_build_object('id',p_id,'points',points,'stars',stars,'moves',steps,'crystals',gem_count);
end;
$$;

create function public.leaderboard(p_friends boolean default false, p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, username text, display_name text, points bigint, stars bigint, levels bigint, rank bigint)
language sql stable security definer set search_path = '' as $$
 with best as (
   select distinct on (r.user_id,r.level_id) r.user_id,r.level_id,r.points,r.stars
   from public.runs r join public.ranked_levels l on l.id=r.level_id and l.revision=r.revision and l.published
   where not r.hidden order by r.user_id,r.level_id,r.points desc,r.moves asc,r.created_at
 ), totals as (
   select p.id,p.username,p.display_name,sum(b.points) points,sum(b.stars) stars,count(*) levels
   from best b join public.profiles p on p.id=b.user_id
   where p.is_public and not exists(select 1 from private.moderation m where m.user_id=p.id and m.excluded)
   group by p.id
 ), ranked as (select *,dense_rank() over(order by points desc) rank from totals)
 select id,username,display_name,points,stars,levels,rank from ranked r
 where not p_friends or (auth.uid() is not null and (r.id=auth.uid() or exists(select 1 from public.connections c where (c.user_a=auth.uid() and c.user_b=r.id) or (c.user_b=auth.uid() and c.user_a=r.id))))
 order by rank,username limit least(greatest(p_limit,1),100) offset least(greatest(p_offset,0),10000);
$$;

create function public.player_card(p_username text) returns jsonb language sql stable security definer set search_path = '' as $$
 with best as (select distinct on(r.level_id) r.* from public.runs r join public.ranked_levels l on l.id=r.level_id and l.revision=r.revision and l.published join public.profiles p on p.id=r.user_id where p.username=p_username and p.is_public and not r.hidden and not exists(select 1 from private.moderation m where m.user_id=p.id and m.excluded) order by r.level_id,r.points desc,r.moves asc),
 total as (select coalesce(sum(points),0) points,coalesce(sum(stars),0) stars,count(*) levels from best)
 select jsonb_build_object('username',p.username,'display_name',p.display_name,'points',t.points,'stars',t.stars,'levels',t.levels) from public.profiles p cross join total t where p.username=p_username and p.is_public and not exists(select 1 from private.moderation m where m.user_id=p.id and m.excluded);
$$;
create function public.my_results() returns table(level_id integer,stars integer,moves integer) language sql stable security definer set search_path = '' as $$
 select distinct on(r.level_id) r.level_id,r.stars,r.moves from public.runs r join public.ranked_levels l on l.id=r.level_id and l.revision=r.revision and l.published where r.user_id=auth.uid() and not r.hidden order by r.level_id,r.points desc,r.moves asc;
$$;
create function public.invite_details(p_code text) returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('display_name',p.display_name,'username',p.username) from public.profiles p where p.invite_code=p_code and not exists(select 1 from private.moderation m where m.user_id=p.id and m.excluded);
$$;
create function public.accept_invite(p_code text) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); inviter uuid;
begin
 if uid is null then raise exception 'Sign in to connect'; end if;
 select id into inviter from public.profiles where invite_code=p_code and not exists(select 1 from private.moderation where user_id=profiles.id and excluded);
 if inviter is null then raise exception 'Invite not found'; end if;
 if inviter=uid then raise exception 'This is your own invitation'; end if;
 if exists(select 1 from private.moderation where user_id=uid and excluded) then raise exception 'Connections are unavailable'; end if;
 insert into public.connections(user_a,user_b) values(least(uid,inviter),greatest(uid,inviter)) on conflict do nothing;
end;
$$;
create function public.my_connections() returns table(user_id uuid,username text,display_name text) language sql stable security definer set search_path = '' as $$
 select p.id,p.username,p.display_name from public.connections c join public.profiles p on p.id=case when c.user_a=auth.uid() then c.user_b else c.user_a end where auth.uid() in (c.user_a,c.user_b) order by c.created_at desc limit 100;
$$;
create function public.disconnect_player(p_user uuid) returns void language sql security definer set search_path = '' as $$
 delete from public.connections where (user_a=auth.uid() and user_b=p_user) or (user_b=auth.uid() and user_a=p_user);
$$;

create function public.admin_overview(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return jsonb_build_object(
 'players',(select count(*) from public.profiles), 'runs',(select count(*) from public.runs),
 'recent',(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.level_id,r.points,r.stars,r.moves,r.hidden,r.created_at,p.username,p.display_name,coalesce(m.excluded,false) excluded from public.runs r join public.profiles p on p.id=r.user_id left join private.moderation m on m.user_id=p.id order by r.created_at desc,r.id limit 25 offset least(greatest(p_offset,0),10000)) q),
 'audit',(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select action,target,reason,created_at from private.admin_audit order by id desc limit 20) q));
end;
$$;
create function public.admin_moderate_run(p_run uuid,p_hidden boolean,p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_hidden is null or p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then raise exception 'Give a reason (5–500 characters)'; end if;
 update public.runs set hidden=p_hidden where id=p_run;
 if not found then raise exception 'Run not found'; end if;
 insert into private.admin_audit(actor,action,target,reason) values(auth.uid(),case when p_hidden then 'hide_run' else 'restore_run' end,p_run::text,trim(p_reason));
end;
$$;
create function public.admin_moderate_player(p_username text,p_excluded boolean,p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_excluded is null or p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then raise exception 'Give a reason (5–500 characters)'; end if;
 select id into target from public.profiles where username=p_username;
 if target is null then raise exception 'Player not found'; end if;
 insert into private.moderation(user_id,excluded) values(target,p_excluded) on conflict(user_id) do update set excluded=p_excluded;
 insert into private.admin_audit(actor,action,target,reason) values(auth.uid(),case when p_excluded then 'exclude_player' else 'restore_player' end,target::text,trim(p_reason));
end;
$$;
-- PostgreSQL grants new functions to PUBLIC by default; close that boundary explicitly.
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.is_admin(),public.submit_run(uuid,integer,integer,text[]),public.leaderboard(boolean,integer,integer),public.player_card(text),public.my_results(),public.invite_details(text),public.accept_invite(text),public.my_connections(),public.disconnect_player(uuid),public.admin_overview(integer),public.admin_moderate_run(uuid,boolean,text),public.admin_moderate_player(text,boolean,text) from public,anon,authenticated;
grant execute on function public.leaderboard(boolean,integer,integer),public.player_card(text),public.invite_details(text) to anon,authenticated;
grant execute on function public.is_admin(),public.submit_run(uuid,integer,integer,text[]),public.my_results(),public.accept_invite(text),public.my_connections(),public.disconnect_player(uuid),public.admin_overview(integer),public.admin_moderate_run(uuid,boolean,text),public.admin_moderate_player(text,boolean,text) to authenticated;
