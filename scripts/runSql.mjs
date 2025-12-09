import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const tokenPath = path.resolve(process.cwd(), 'CLI Kombo.txt')

if (!fs.existsSync(envPath)) {
  console.error('[erro] .env.local não encontrado')
  process.exit(1)
}
if (!fs.existsSync(tokenPath)) {
  console.error('[erro] Token não encontrado em "CLI Kombo.txt"')
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

const token = fs.readFileSync(tokenPath, 'utf8').trim()
if (!token) {
  console.error('[erro] Token vazio em CLI Kombo.txt')
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
