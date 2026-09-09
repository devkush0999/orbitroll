-- Cloudinary stores files. Supabase stores verified metadata and publication state.
create table private.media_uploads (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('image','video')),
 title text not null check(char_length(title) between 1 and 80),
 verification_attempts integer not null default 0,
 created_at timestamptz not null default now()
);
create index media_uploads_created on private.media_uploads(created_at);
alter table private.media_uploads enable row level security;
create table public.media_assets (
 id uuid primary key references private.media_uploads(id) on delete cascade,
 public_id text not null unique,
 kind text not null check(kind in ('image','video')),
 title text not null check(char_length(title) between 1 and 80),
 secure_url text not null check(secure_url like 'https://res.cloudinary.com/%'),
 bytes bigint not null check(bytes > 0 and bytes <= 10485760),
 width integer not null check(width between 1 and 4096),
 height integer not null check(height between 1 and 4096),
 duration numeric check(duration is null or duration between 0 and 30),
 format text not null check(format in ('jpg','png','webp','mp4','webm')),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
create index published_media_recent on public.media_assets(created_at desc,id) where published;
revoke all on public.media_assets from anon,authenticated;
grant select on public.media_assets to anon,authenticated;
create policy published_media on public.media_assets for select to anon,authenticated using(published);

create function public.admin_reserve_media(p_kind text,p_title text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket private.media_uploads;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('image','video') or p_title is null or char_length(trim(p_title)) not between 1 and 80 then raise exception 'Invalid media details'; end if;
 -- One global lock keeps the free-tier budget correct across all administrators.
 perform pg_catalog.pg_advisory_xact_lock(924071);
 if (select count(*) from private.media_uploads where created_at>now()-interval '1 day')>=20 then raise exception 'Daily upload limit reached (20). Try tomorrow.'; end if;
 if (select count(*) from private.media_uploads where owner_id=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Hourly upload limit reached (5). Try later.'; end if;
 if (select coalesce(sum(bytes),0) from public.media_assets)>=209715200 then raise exception 'Media storage budget reached (200 MB). Review Cloudinary usage.'; end if;
 insert into private.media_uploads(owner_id,kind,title) values(auth.uid(),p_kind,trim(p_title)) returning * into ticket;
 return jsonb_build_object('id',ticket.id,'kind',ticket.kind,'title',ticket.title,'public_id','orbit-roll/'||ticket.id::text);
end; $$;
create function public.admin_media_ticket(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare ticket private.media_uploads;
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 select * into ticket from private.media_uploads where id=p_id and owner_id=auth.uid() and created_at>now()-interval '1 day' for update;
 if not found then raise exception 'Upload ticket expired or unavailable'; end if;
 if exists(select 1 from public.media_assets where id=p_id) then return jsonb_build_object('id',ticket.id,'complete',true); end if;
 if ticket.verification_attempts >= 10 then raise exception 'Verification retry limit reached. Check the file in Cloudinary.'; end if;
 update private.media_uploads set verification_attempts=verification_attempts+1 where id=p_id;
 return jsonb_build_object('id',ticket.id,'kind',ticket.kind,'title',ticket.title,'public_id','orbit-roll/'||ticket.id::text);
end; $$;
-- Only the Edge Function service client can register provider-verified metadata.
create function public.service_finalize_media(p_id uuid,p_actor uuid,p_url text,p_bytes bigint,p_width integer,p_height integer,p_duration numeric,p_format text) returns void language plpgsql security definer set search_path='' as $$
declare ticket private.media_uploads;
begin
 if not exists(select 1 from private.admin_users where user_id=p_actor) then raise exception 'Admin access required'; end if;
 select * into ticket from private.media_uploads where id=p_id and owner_id=p_actor and created_at>now()-interval '1 day' for update;
 if not found then raise exception 'Upload ticket expired or unavailable'; end if;
 if ticket.kind='image' and (p_bytes>2097152 or p_format not in ('jpg','png','webp')) then raise exception 'Image exceeds upload policy'; end if;
 if ticket.kind='video' and (p_format not in ('mp4','webm') or p_duration is null or p_duration<=0 or p_duration>30) then raise exception 'Video exceeds upload policy'; end if;
 insert into public.media_assets(id,public_id,kind,title,secure_url,bytes,width,height,duration,format)
 values(ticket.id,'orbit-roll/'||ticket.id::text,ticket.kind,ticket.title,p_url,p_bytes,p_width,p_height,p_duration,p_format) on conflict(id) do nothing;
end; $$;
create function public.admin_media_library(p_offset integer default 0) returns setof public.media_assets language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 return query select * from public.media_assets order by created_at desc,id limit 24 offset least(greatest(p_offset,0),2400);
end; $$;
create function public.admin_publish_media(p_id uuid,p_published boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_published is null or p_reason is null or char_length(trim(p_reason)) not between 5 and 500 then raise exception 'Give a reason (5–500 characters)'; end if;
 update public.media_assets set published=p_published where id=p_id;
 if not found then raise exception 'Media not found'; end if;
 insert into private.admin_audit(actor,action,target,reason) values(auth.uid(),case when p_published then 'publish_media' else 'unpublish_media' end,p_id::text,trim(p_reason));
end; $$;
revoke all on function public.admin_reserve_media(text,text),public.admin_media_ticket(uuid),public.service_finalize_media(uuid,uuid,text,bigint,integer,integer,numeric,text),public.admin_media_library(integer),public.admin_publish_media(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.admin_reserve_media(text,text),public.admin_media_ticket(uuid),public.admin_media_library(integer),public.admin_publish_media(uuid,boolean,text) to authenticated;
grant execute on function public.service_finalize_media(uuid,uuid,text,bigint,integer,integer,numeric,text) to service_role;
