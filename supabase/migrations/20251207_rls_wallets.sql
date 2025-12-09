alter table public.wallets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname='wallet_select_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_select_own" on public.wallets for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policy where polname='wallet_upsert_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_upsert_own" on public.wallets for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policy where polname='wallet_update_own' and polrelid='public.wallets'::regclass) then
    create policy "wallet_update_own" on public.wallets for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

alter table public.transactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname='tx_select_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_select_own" on public.transactions for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policy where polname='tx_insert_own' and polrelid='public.transactions'::regclass) then
    create policy "tx_insert_own" on public.transactions for insert
    with check (auth.uid() = user_id);
  end if;
end $$;
