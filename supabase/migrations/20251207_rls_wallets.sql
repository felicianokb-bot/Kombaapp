-- Habilita RLS na tabela de carteiras e consolida as políticas de segurança.
alter table public.wallets enable row level security;

do $$
begin
  -- Remove políticas antigas para evitar conflitos e redundância.
  if exists (select 1 from pg_policy where polname='wallet_select_own' and polrelid='public.wallets'::regclass) then
    drop policy "wallet_select_own" on public.wallets;
  end if;
  if exists (select 1 from pg_policy where polname='wallet_upsert_own' and polrelid='public.wallets'::regclass) then
    drop policy "wallet_upsert_own" on public.wallets;
  end if;
  if exists (select 1 from pg_policy where polname='wallet_update_own' and polrelid='public.wallets'::regclass) then
    drop policy "wallet_update_own" on public.wallets;
  end if;

  -- Cria uma única política abrangente que dá ao proprietário da carteira acesso total (SELECT, INSERT, UPDATE, DELETE).
  -- Esta é a única política necessária para a tabela 'wallets'.
  if not exists (select 1 from pg_policy where polname='wallets_owner_all_access' and polrelid='public.wallets'::regclass) then
    create policy "wallets_owner_all_access" on public.wallets for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

-- Habilita RLS na tabela de transações e define políticas de segurança.
alter table public.transactions enable row level security;

do $$
begin
  -- Permite que usuários vejam apenas suas próprias transações.
  if not exists (select 1 from pg_policy where polname='tx_select_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_select_own" on public.transactions for select
    using (auth.uid() = user_id);
  end if;

  -- Permite que usuários insiram transações apenas para si mesmos.
  if not exists (select 1 from pg_policy where polname='tx_insert_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_insert_own" on public.transactions for insert
    with check (auth.uid() = user_id);
  end if;
end $$;
