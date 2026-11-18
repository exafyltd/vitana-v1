-- Minimal Supabase-like base for an isolated local database (never a shared system).
-- Roles, auth.uid() from the PostgREST JWT claims, default privileges like Supabase,
-- and stubs of the tables the reactions RPC reads.
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'local-only';
GRANT anon, authenticated, service_role TO authenticator;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE PUBLICATION supabase_realtime;

CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, display_name text, full_name text, avatar_url text);
CREATE TABLE public.global_community_profiles (user_id uuid PRIMARY KEY, display_name text, avatar_url text);
CREATE TABLE public.chat_messages (id uuid PRIMARY KEY, sender_id uuid, receiver_id uuid, group_id uuid, body text);
CREATE TABLE public.chat_group_members (group_id uuid, user_id uuid);
CREATE TABLE public.global_messages (id uuid PRIMARY KEY, thread_id uuid);
CREATE TABLE public.global_thread_participants (thread_id uuid, user_id uuid, is_active boolean);
CREATE TABLE public.messages (id uuid PRIMARY KEY, thread_id uuid);
CREATE TABLE public.thread_participants (thread_id uuid, user_id uuid, is_active boolean);
