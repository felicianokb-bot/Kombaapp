import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const tokenPath = path.resolve(process.cwd(), 'CLI Kombo.txt')

// Permitir token também via variáveis de ambiente (ex.: SUPABASE_DB_TOKEN ou SUPABASE_SERVICE_ROLE)
const envToken = process.env.SUPABASE_DB_TOKEN || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_TOKEN

if (!fs.existsSync(envPath)) {
  console.error('[erro] .env.local não encontrado')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const supaUrl = (envContent.match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1]?.trim()
if (!supaUrl) {
  console.error('[erro] VITE_SUPABASE_URL não definido em .env.local')
  process.exit(1)
}
const m = supaUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
const ref = m?.[1]
if (!ref) {
  console.error('[erro] Não foi possível extrair project ref do VITE_SUPABASE_URL')
  process.exit(1)
}

let token = envToken || ''
if (!token && fs.existsSync(tokenPath)) {
  const raw = fs.readFileSync(tokenPath, 'utf8')
  const firstLine = raw.split(/\r?\n/).find(line => line.trim().length > 0) || ''
  token = firstLine.replace(/\r/g, '').trim()
}
if (!token) {
  console.error('[erro] Token não encontrado. Defina SUPABASE_DB_TOKEN ou SUPABASE_SERVICE_ROLE (env) ou preencha "CLI Kombo.txt"')
  process.exit(1)
}

const sql = `
create extension if not exists "uuid-ossp";
begin;

-- profiles
create table if not exists public.profiles (
  user_id uuid primary key,
  name text,
  location text,
  avatar_url text,
  email text
);

alter table public.profiles enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='profiles_select_own' and polrelid='public.profiles'::regclass) then
    create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='profiles_upsert_own' and polrelid='public.profiles'::regclass) then
    create policy "profiles_upsert_own" on public.profiles for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='profiles_update_own' and polrelid='public.profiles'::regclass) then
    create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- services
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  business_name text not null,
  category text not null,
  description text,
  base_price numeric not null default 0,
  price_unit text not null,
  location text,
  cover_image text,
  available boolean default true,
  created_at timestamptz not null default now()
);
alter table public.services enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='services_select_all' and polrelid='public.services'::regclass) then
    create policy "services_select_all" on public.services for select using (true);
  end if;
  if not exists (select 1 from pg_policy where polname='services_insert_own' and polrelid='public.services'::regclass) then
    create policy "services_insert_own" on public.services for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='services_update_own' and polrelid='public.services'::regclass) then
    create policy "services_update_own" on public.services for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- trips
create table if not exists public.trips (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid not null,
  origin text not null,
  destination text not null,
  date date not null,
  time text,
  transport_type text not null,
  capacity integer,
  capacity_unit text not null,
  price_per_unit numeric not null,
  currency text not null,
  description text,
  status text not null check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.trips enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='trips_select_all' and polrelid='public.trips'::regclass) then
    create policy "trips_select_all" on public.trips for select using (true);
  end if;
  if not exists (select 1 from pg_policy where polname='trips_insert_own' and polrelid='public.trips'::regclass) then
    create policy "trips_insert_own" on public.trips for insert with check (auth.uid() = host_id);
  end if;
  if not exists (select 1 from pg_policy where polname='trips_update_own' and polrelid='public.trips'::regclass) then
    create policy "trips_update_own" on public.trips for update using (auth.uid() = host_id) with check (auth.uid() = host_id);
  end if;
end $$;

create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  amount numeric not null,
  type text not null check (type in ('deposit','withdrawal','payment','earning')),
  status text not null check (status in ('pending','completed','failed')),
  date timestamptz not null default now(),
  reference text not null
);

create table if not exists public.wallets (
  user_id uuid primary key,
  balance numeric not null default 0
);

alter table public.transactions enable row level security;
alter table public.wallets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname='tx_select_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_select_own" on public.transactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='tx_insert_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policy where polname='wallet_select_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_select_own" on public.wallets for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='wallet_upsert_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_upsert_own" on public.wallets for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='wallet_update_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_update_own" on public.wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_transactions_user_id on public.transactions(user_id);

-- messages (chat)
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid not null,
  receiver_id uuid,
  role text not null check (role in ('user','bot','other')),
  text text not null,
  timestamp timestamptz not null default now()
);
alter table public.messages enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='messages_select_user' and polrelid='public.messages'::regclass) then
    create policy "messages_select_user" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id or receiver_id is null);
  end if;
  if not exists (select 1 from pg_policy where polname='messages_insert_user' and polrelid='public.messages'::regclass) then
    create policy "messages_insert_user" on public.messages for insert with check (auth.uid() = sender_id);
  end if;
end $$;

-- provider_presence (presença online)
create table if not exists public.provider_presence (
  user_id uuid primary key,
  online boolean default false,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);
alter table public.provider_presence enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='presence_upsert_own' and polrelid='public.provider_presence'::regclass) then
    create policy "presence_upsert_own" on public.provider_presence for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='presence_update_own' and polrelid='public.provider_presence'::regclass) then
    create policy "presence_update_own" on public.provider_presence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='presence_select_all' and polrelid='public.provider_presence'::regclass) then
    create policy "presence_select_all" on public.provider_presence for select using (true);
  end if;
end $$;

-- locations (histórico de coordenadas)
create table if not exists public.locations (
  id bigint generated by default as identity primary key,
  user_id uuid not null,
  role text,
  lat double precision,
  lng double precision,
  speed double precision,
  heading double precision,
  timestamp timestamptz not null default now()
);
alter table public.locations enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='locations_insert_own' and polrelid='public.locations'::regclass) then
    create policy "locations_insert_own" on public.locations for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policy where polname='locations_select_own' and polrelid='public.locations'::regclass) then
    create policy "locations_select_own" on public.locations for select using (auth.uid() = user_id);
  end if;
end $$;

-- jobs (matching de solicitações)
create table if not exists public.jobs (
  id text primary key,
  client_id uuid not null,
  origin text not null,
  destination text not null,
  radius_km numeric,
  status text not null check (status in ('pending','assigned','no_service')),
  provider_id uuid,
  assigned_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
do $$
begin
  if not exists (select 1 from pg_policy where polname='jobs_select_all' and polrelid='public.jobs'::regclass) then
    create policy "jobs_select_all" on public.jobs for select using (true);
  end if;
  if not exists (select 1 from pg_policy where polname='jobs_insert_client' and polrelid='public.jobs'::regclass) then
    create policy "jobs_insert_client" on public.jobs for insert with check (auth.uid() = client_id);
  end if;
  if not exists (select 1 from pg_policy where polname='jobs_update_assigned' and polrelid='public.jobs'::regclass) then
    create policy "jobs_update_assigned" on public.jobs for update using (auth.uid() = client_id or auth.uid() = provider_id);
  end if;
end $$;

-- services: colunas extras usadas no front
alter table public.services add column if not exists rating numeric default 0;
alter table public.services add column if not exists distance text;

commit;
`

const url = `https://api.supabase.com/v1/projects/${ref}/db/query`
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: sql })
})
const text = await res.text()
console.log('[status]', res.status)
console.log(text)
if (!res.ok) process.exit(1)
