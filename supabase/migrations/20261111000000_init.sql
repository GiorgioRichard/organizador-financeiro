-- =============================================================
-- Organizador financeiro pessoal - schema inicial (MVP)
-- Regras:
--  * Valores monetários em centavos (bigint), nunca float.
--  * Toda tabela tem user_id e RLS ativo com política de dono.
--  * Chaves compostas (id, user_id) garantem que nenhuma linha
--    referencie dados de outro usuário.
-- =============================================================

-- ---------- Função utilitária: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Contas ----------
create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  nome                text not null check (char_length(nome) between 1 and 60),
  tipo                text not null check (tipo in ('corrente', 'poupanca', 'carteira', 'cartao')),
  saldo_inicial_cents bigint not null default 0,
  dia_fechamento      smallint check (dia_fechamento between 1 and 31),
  dia_vencimento      smallint check (dia_vencimento between 1 and 31),
  limite_cents        bigint check (limite_cents >= 0),
  arquivada           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint accounts_id_user_unique unique (id, user_id),
  constraint accounts_cartao_campos check (
    (tipo = 'cartao' and dia_fechamento is not null and dia_vencimento is not null)
    or
    (tipo <> 'cartao' and dia_fechamento is null and dia_vencimento is null and limite_cents is null)
  )
);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------- Categorias ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 40),
  tipo       text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz not null default now(),
  constraint categories_id_user_tipo_unique unique (id, user_id, tipo),
  constraint categories_nome_unique unique (user_id, tipo, nome)
);

-- ---------- Lançamentos ----------
create table public.transactions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  account_id             uuid not null,
  category_id            uuid,
  tipo                   text not null check (tipo in ('receita', 'despesa', 'transferencia')),
  valor_cents            bigint not null check (valor_cents > 0),
  data                   date not null,
  descricao              text not null check (char_length(descricao) between 1 and 120),
  transfer_to_account_id uuid,
  parcela_grupo_id       uuid,
  parcela_n              smallint,
  parcela_total          smallint,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint transactions_account_fk
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  constraint transactions_transfer_fk
    foreign key (transfer_to_account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  -- category precisa ser do mesmo usuário e do mesmo tipo (receita/despesa)
  constraint transactions_category_fk
    foreign key (category_id, user_id, tipo) references public.categories (id, user_id, tipo) on delete restrict,

  constraint transactions_tipo_regras check (
    (tipo = 'transferencia'
       and transfer_to_account_id is not null
       and transfer_to_account_id <> account_id
       and category_id is null)
    or
    (tipo in ('receita', 'despesa')
       and transfer_to_account_id is null
       and category_id is not null)
  ),
  constraint transactions_parcela_regras check (
    (parcela_grupo_id is null and parcela_n is null and parcela_total is null)
    or
    (parcela_grupo_id is not null
       and parcela_total between 2 and 120
       and parcela_n between 1 and parcela_total)
  )
);

create index transactions_user_data_idx on public.transactions (user_id, data);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_parcela_idx on public.transactions (parcela_grupo_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------- Orçamentos (limite mensal por categoria de despesa) ----------
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid not null,
  tipo         text not null default 'despesa' check (tipo = 'despesa'),
  mes          text not null check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  limite_cents bigint not null check (limite_cents > 0),
  created_at   timestamptz not null default now(),
  constraint budgets_category_fk
    foreign key (category_id, user_id, tipo) references public.categories (id, user_id, tipo) on delete cascade,
  constraint budgets_categoria_mes_unique unique (user_id, category_id, mes)
);

-- ---------- Categorias padrão para cada novo usuário ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, nome, tipo) values
    (new.id, 'Salário', 'receita'),
    (new.id, 'Renda extra', 'receita'),
    (new.id, 'Outras receitas', 'receita'),
    (new.id, 'Moradia', 'despesa'),
    (new.id, 'Alimentação', 'despesa'),
    (new.id, 'Transporte', 'despesa'),
    (new.id, 'Saúde', 'despesa'),
    (new.id, 'Educação', 'despesa'),
    (new.id, 'Lazer', 'despesa'),
    (new.id, 'Contas e serviços', 'despesa'),
    (new.id, 'Compras', 'despesa'),
    (new.id, 'Outras despesas', 'despesa');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "accounts: dono acessa"
  on public.accounts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories: dono acessa"
  on public.categories for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "transactions: dono acessa"
  on public.transactions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "budgets: dono acessa"
  on public.budgets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Nenhum acesso para o papel anônimo
revoke all on public.accounts, public.categories, public.transactions, public.budgets from anon;
grant select, insert, update, delete on public.accounts, public.categories, public.transactions, public.budgets to authenticated;

-- Função de seed não deve ser chamada via API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
