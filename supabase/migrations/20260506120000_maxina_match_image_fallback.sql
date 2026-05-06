-- MAXINA premium fallback image pipeline
-- Adds image-source tracking to profiles and a dedicated storage bucket for
-- generated/curated match-card cover images. The pipeline generates a Vertex
-- AI Imagen fallback once per user and reuses the stored URL on every load.

begin;

-- 1. Profile columns -----------------------------------------------------------
alter table public.profiles
  add column if not exists profile_image_url text,
  add column if not exists profile_image_source text
    check (profile_image_source in ('uploaded','imported','generated','initials')),
  add column if not exists match_cover_image_url text,
  add column if not exists match_cover_source text
    check (match_cover_source in ('uploaded','generated','curated_library')),
  add column if not exists fallback_seed text,
  add column if not exists image_last_generated_at timestamptz,
  add column if not exists has_uploaded_photo boolean not null default false;

-- Backfill: promote any pre-existing avatar_url into the new fields so the
-- resolver does not overwrite legitimate user uploads on first call.
update public.profiles
   set profile_image_url    = coalesce(profile_image_url, avatar_url),
       profile_image_source = case
         when profile_image_source is not null then profile_image_source
         when avatar_url is not null and avatar_url <> '' then 'uploaded'
         else 'initials'
       end,
       has_uploaded_photo   = coalesce(has_uploaded_photo,
                                       avatar_url is not null and avatar_url <> '')
 where profile_image_source is null;

-- Stable seed for deterministic Imagen prompts and initials gradients.
update public.profiles
   set fallback_seed = encode(gen_random_bytes(8), 'hex')
 where fallback_seed is null;

create index if not exists profiles_match_cover_source_idx
  on public.profiles (match_cover_source);

create index if not exists profiles_profile_image_source_idx
  on public.profiles (profile_image_source);

-- 2. Storage bucket for generated/curated match covers ------------------------
insert into storage.buckets (id, name, public)
values ('match-covers', 'match-covers', true)
on conflict (id) do nothing;

-- Public read so match cards can load directly from the CDN URL.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'match_covers_public_read'
  ) then
    create policy match_covers_public_read
      on storage.objects for select
      using (bucket_id = 'match-covers');
  end if;

  -- Only the service role (edge function) writes to this bucket. End users
  -- never upload here directly, preventing tampering with generated covers.
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'match_covers_service_write'
  ) then
    create policy match_covers_service_write
      on storage.objects for insert to service_role
      with check (bucket_id = 'match-covers');
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'match_covers_service_update'
  ) then
    create policy match_covers_service_update
      on storage.objects for update to service_role
      using (bucket_id = 'match-covers');
  end if;
end $$;

-- 3. Helper view used by the resolver edge function ---------------------------
-- Returns the canonical image-priority result for any profile so we can avoid
-- re-implementing the priority logic on every caller.
create or replace view public.profile_match_image_resolution as
select
  p.user_id,
  p.full_name,
  p.display_name,
  p.has_uploaded_photo,
  case
    when p.has_uploaded_photo and p.profile_image_url is not null
      then 'uploaded'
    when p.profile_image_source = 'imported' and p.profile_image_url is not null
      then 'imported'
    when p.profile_image_source = 'generated' and p.profile_image_url is not null
      then 'generated'
    else 'initials'
  end as resolved_profile_source,
  p.profile_image_url,
  p.match_cover_image_url,
  p.match_cover_source,
  p.fallback_seed,
  p.image_last_generated_at
from public.profiles p;

grant select on public.profile_match_image_resolution to authenticated, anon, service_role;

commit;
