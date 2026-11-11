-- =============================================================
-- Despesas fixas anuais (IPTU, IPVA, licenciamento, seguro...).
--  * Cada uma vence uma vez por ano em `mes`/`dia`, à vista ou em
--    `parcelas` mensais seguidas (ex.: IPTU em 10x a partir de fevereiro).
--  * Pagar uma parcela cria um lançamento de despesa ligado a ela por
--    (despesa_fixa_id, fixa_vencimento). O índice único impede pagar
--    a mesma parcela duas vezes.
-- =============================================================

create table public.despesas_fixas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 60),
  valor_cents bigint not null check (valor_cents > 0),
  tipo        text not null default 'despesa' check (tipo = 'despesa'),
  category_id uuid not null,
  account_id  uuid not null,
  mes         smallint not null check (mes between 1 and 12),
  dia         smallint not null check (dia between 1 and 31),
  parcelas    smallint not null default 1 check (parcelas between 1 and 12),
  ativa       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint despesas_fixas_id_user_unique unique (id, user_id),
  constraint despesas_fixas_category_fk
    foreign key (category_id, user_id, tipo) references public.categories (id, user_id, tipo) on delete restrict,
  constraint despesas_fixas_account_fk
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict
);

create trigger despesas_fixas_set_updated_at
  before update on public.despesas_fixas
  for each row execute function public.set_updated_at();

alter table public.transactions
  add column despesa_fixa_id uuid,
  add column fixa_vencimento date,
  add constraint transactions_fixa_fk
    foreign key (despesa_fixa_id, user_id) references public.despesas_fixas (id, user_id)
    on delete set null (despesa_fixa_id),
  add constraint transactions_fixa_regras check (
    (despesa_fixa_id is null) = (fixa_vencimento is null) or despesa_fixa_id is null
  );

create unique index transactions_fixa_paga_unique
  on public.transactions (despesa_fixa_id, fixa_vencimento)
  where despesa_fixa_id is not null;

alter table public.despesas_fixas enable row level security;

create policy "despesas_fixas: dono acessa"
  on public.despesas_fixas for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.despesas_fixas from anon;
grant select, insert, update, delete on public.despesas_fixas to authenticated;
