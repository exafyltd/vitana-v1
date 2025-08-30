-- Day 6 — Supabase Auth + Multi-Tenant RLS Migration
-- File: 20250830_day6_multitenant_fixed.sql

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Create enum type (drop first if exists)
drop type if exists public.tenant_role cascade;
create type public.tenant_role as enum
  ('community','patient','professional','staff','admin','exafy_admin');

create table if not exists public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.tenant_role not null default 'community',
  status text not null default 'active',
  created_at timestamptz default now(),
  primary key (user_id, tenant_id)
);

-- Update existing profiles table to be tenant-scoped
alter table public.profiles 
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- Create index for performance
create index if not exists profiles_tenant_id_idx on public.profiles(tenant_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  recipient_id uuid references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.wallet_credits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric not null,
  type text not null,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.messages enable row level security;
alter table public.wallet_credits enable row level security;

-- Drop existing profiles policies to recreate with tenant scope
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;  
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create membership-based RLS policies
create policy tenants_select
  on public.tenants for select
  using (exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = tenants.id
      and m.status = 'active'
  ));

create policy memberships_self
  on public.memberships for select
  using (user_id = auth.uid());

create policy profiles_select
  on public.profiles for select using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = profiles.tenant_id
              and m.status = 'active')
  );

create policy profiles_insert
  on public.profiles for insert with check (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = profiles.tenant_id
              and m.status = 'active')
  );

create policy profiles_update
  on public.profiles for update using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = profiles.tenant_id
              and m.status = 'active')
  );

create policy profiles_delete
  on public.profiles for delete using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = profiles.tenant_id
              and m.status = 'active')
  );

create policy messages_select
  on public.messages for select using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = messages.tenant_id
              and m.status = 'active')
  );

create policy messages_insert
  on public.messages for insert with check (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = messages.tenant_id
              and m.status = 'active')
  );

create policy messages_update
  on public.messages for update using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = messages.tenant_id
              and m.status = 'active')
  );

create policy messages_delete
  on public.messages for delete using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = messages.tenant_id
              and m.status = 'active')
  );

create policy wallet_select
  on public.wallet_credits for select using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = wallet_credits.tenant_id
              and m.status = 'active')
  );

create policy wallet_insert
  on public.wallet_credits for insert with check (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = wallet_credits.tenant_id
              and m.status = 'active')
  );

create policy wallet_update
  on public.wallet_credits for update using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = wallet_credits.tenant_id
              and m.status = 'active')
  );

create policy wallet_delete
  on public.wallet_credits for delete using (
    exists (select 1 from public.memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = wallet_credits.tenant_id
              and m.status = 'active')
  );