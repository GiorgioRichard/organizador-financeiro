-- =============================================================
-- Saldo de cada conta até uma data.
--  * receita soma, despesa subtrai;
--  * transferência subtrai da origem e soma no destino;
--  * cartão usa a mesma regra: compras deixam o saldo negativo
--    (dívida) e o pagamento da fatura (transferência) o zera.
-- A data vem do app (fuso de São Paulo), porque current_date no
-- banco é UTC.
-- security invoker: roda com as permissões de quem chama, então
-- o RLS das tabelas continua valendo.
-- =============================================================

create or replace function public.saldos_contas(ate date)
returns table (account_id uuid, saldo_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    (a.saldo_inicial_cents + coalesce(sum(
      case
        when t.transfer_to_account_id = a.id then t.valor_cents
        when t.tipo = 'receita' then t.valor_cents
        else -t.valor_cents
      end
    ), 0))::bigint
  from public.accounts a
  left join public.transactions t
    on (t.account_id = a.id or t.transfer_to_account_id = a.id)
   and t.data <= ate
  group by a.id, a.saldo_inicial_cents;
$$;

revoke execute on function public.saldos_contas(date) from public, anon;
grant execute on function public.saldos_contas(date) to authenticated;
