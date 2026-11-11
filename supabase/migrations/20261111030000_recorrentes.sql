-- =============================================================
-- Lançamentos recorrentes: a tabela de despesas fixas passa a
-- aceitar também cobranças mensais (aluguel, internet) e receitas
-- recorrentes (salário).
--  * frequencia 'anual': vence em mes/dia, à vista ou em parcelas.
--  * frequencia 'mensal': vence todo mês no `dia`, a partir de `desde`.
-- =============================================================

alter table public.despesas_fixas
  add column frequencia text not null default 'anual'
    check (frequencia in ('anual', 'mensal')),
  add column desde date not null default current_date;

-- Receita recorrente também é permitida (a FK de categoria confere o tipo).
alter table public.despesas_fixas drop constraint despesas_fixas_tipo_check;
alter table public.despesas_fixas alter column tipo drop default;
alter table public.despesas_fixas
  add constraint despesas_fixas_tipo_check check (tipo in ('receita', 'despesa')),
  add constraint despesas_fixas_mensal_sem_parcelas check (frequencia = 'anual' or parcelas = 1);

-- Lançamento gerado por recorrência deve ter o mesmo tipo dela.
-- (receita paga cria receita; despesa paga cria despesa)
