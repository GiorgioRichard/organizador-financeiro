# Organizador financeiro pessoal

Aplicativo web para lançar receitas, despesas e transferências, controlar contas e cartões
e acompanhar o orçamento mensal por categoria. Sem conexão com bancos e sem serviços externos
de dados financeiros.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Supabase** (Postgres, Auth e Row Level Security)
- **Zod** para validação de entradas
- **Tailwind CSS** para a interface

## Regras de cálculo

- Valores em **centavos** (`bigint`) no banco e na aplicação. Nunca `float`.
- **Transferência não é despesa**: só movimenta saldo entre contas próprias.
- **Cartão**: a compra é registrada na data em que ocorreu. Pagar a fatura é transferência
  da conta corrente para o cartão.
- **Parcelamento**: a diferença de centavos vai para a última parcela (`splitCents`).

## Segurança

- RLS ativo em todas as tabelas, com `user_id = auth.uid()` para leitura, escrita e exclusão.
- Chaves compostas `(id, user_id)` impedem que um lançamento use conta ou categoria de outro usuário.
- Acesso anônimo revogado nas tabelas de dados.
- Somente a chave **anon** é usada no cliente. A `service_role` nunca entra no projeto.
- `proxy.ts` renova a sessão e protege as rotas privadas. O Painel verifica o usuário de novo.
- Cabeçalhos de segurança configurados em `next.config.ts`.

## Como rodar (Supabase local)

Pré-requisitos: Docker em execução e Node.js 20+.

```bash
npm install
npm run db:start      # sobe o Supabase local (Postgres, Auth, Studio, etc.)
npm run db:status     # mostra API URL e anon key
```

1. Copie `.env.example` para `.env.local`.
2. Preencha `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a *anon key* exibida por `npm run db:status`.
3. Aplique as migrações do zero: `npm run db:reset`.
4. Rode a aplicação: `npm run dev` e acesse http://localhost:3000.

Painel do banco local (Supabase Studio): http://127.0.0.1:54323

Para parar: `npm run db:stop`.

Projeto na nuvem: crie o projeto no Supabase, rode `npx supabase link --project-ref <ref>`
e depois `npx supabase db push`, ou cole a migração no SQL Editor.

## Estrutura

```
supabase/migrations/     schema, constraints, RLS, seed de categorias e saldos_contas()
src/lib/money.ts         conversão e formatação de valores em centavos
src/lib/datas.ts         datas ISO no fuso de São Paulo e ciclo de fatura do cartão
src/lib/financas.ts      consultas: contas, categorias, saldos e fatura atual
src/lib/auth.ts          exigirUsuario(): cliente + usuário, ou volta ao login
src/lib/supabase/        clientes Supabase (servidor e navegador)
src/proxy.ts             sessão e proteção de rotas
src/app/auth/actions.ts  entrar, cadastrar e sair (Server Actions)
src/app/login/           tela de login e cadastro
src/app/(app)/           telas privadas, com menu comum (layout.tsx)
  dashboard/             saldo em contas, faturas e resumo do mês
  contas/                contas e cartões: criar, editar, arquivar
  lancamentos/           lista por mês, novo lançamento, parcelas, exclusão
```

## Testes

```bash
npm test    # testes de money.ts e datas.ts (node --test, sem dependências)
```

## Feito

- Contas e cartões (criar, editar, arquivar) com ciclo de fatura por dia de fechamento.
- Lançamentos de receita, despesa e transferência, com parcelamento de despesas.
- Painel com saldo em contas, faturas atuais e resultado do mês.
- Despesas fixas anuais (IPTU, IPVA...) à vista ou em até 12x, com "Pagar" por parcela.
- Agenda: calendário do mês com receitas, despesas e vencimentos; lançar direto num dia.
- Cadastro com nome, confirmação de senha e botão para mostrar a senha.
- Tema claro/escuro (segue o sistema ou a escolha no menu do avatar).
- Animações de entrada (GSAP) e rolagem suave (Lenis), desligadas com "reduzir movimento".
- Recorrentes mensais (aluguel, salário) e anuais (IPTU, IPVA), com "Pagar"/"Receber".
- Editar lançamentos e contas; formulários mantêm o que foi digitado quando há erro.
- Orçamento por categoria (o limite vale do mês escolhido em diante) e resumo de gastos e receitas.
- Gerenciar categorias (criar, renomear, excluir as que não estão em uso).
- Recuperar senha por e-mail e trocar a senha pelo menu do avatar.
- PWA: instalável, ícones próprios, atalhos e tela "Sem conexão".
- Relatório mensal em PDF (botão "Relatório PDF" no Extrato e no Orçamento).
- Backup em JSON (Configurações → "Baixar backup") e restauração a partir do arquivo, na mesma
  conta, numa conta nova ou em outro servidor. Os ids são recriados e as categorias de mesmo
  nome são reaproveitadas; o arquivo é validado inteiro antes de qualquer dado ser apagado.
- Testado como iPhone 15 (WebKit, motor do Safari) e Pixel 7 (Chrome Android): sem rolagem lateral, campos com 16px (sem zoom no iPhone), área segura do notch, PDF e service worker funcionando.

## Leis de UX aplicadas

| Lei | Onde |
| --- | --- |
| Jakob | Padrões conhecidos de apps de banco: menu inferior, calendário mensal, pílulas de abas. |
| Fitts | Alvos de toque com no mínimo 44px (menu, botões de excluir, dias do calendário). |
| Hick | Poucas opções por tela; formulários mostram só os campos do tipo escolhido. |
| Miller | Informação em blocos curtos: três indicadores por mês, listas por seção. |
| Postel | Valores aceitos como "1.200", "1200,00" ou "R$ 1.200"; dia 31 vira o último dia do mês. |
| Tesler | Padrões prontos: data de hoje, sugestões de IPTU/IPVA que já escolhem a categoria. |
| Doherty | Botões mostram "Salvando…" na hora e ficam bloqueados contra clique duplo. |
| Von Restorff | Uma ação principal por tela em destaque; "a vencer" em âmbar, atrasadas em vermelho. |
| Pico-final | Mensagem de sucesso ao salvar ou pagar; entrada animada das telas. |
| Estética-usabilidade | Visual consistente (vidro, cartões, tipografia) nos dois temas. |

Acessibilidade: link "Pular para o conteúdo", rótulos em todos os campos, foco visível,
avisos com `role="alert"`/`status`, dias do calendário com descrição completa para leitor
de tela, contraste nos dois temas e respeito a "reduzir movimento".

## PWA (instalar como app)

O service worker só é registrado na versão de produção:

```bash
npm run build
npm run start
```

No computador, abra http://localhost:3000 no Chrome ou Edge e use "Instalar app" na barra de
endereço. Para testar a tela offline: DevTools → Application → Service workers → Offline.

No celular, o navegador só instala PWAs servidos por **HTTPS**. Para usar no telefone, publique
o app (por exemplo na Vercel) com um projeto Supabase na nuvem e abra o endereço https.

O app guarda só os arquivos da interface; saldos e lançamentos sempre vêm do servidor, para
nunca mostrar dados financeiros desatualizados.

## Próximas etapas

- Publicar (Vercel + Supabase na nuvem) para instalar no celular.
- Notificações de vencimento (o PWA já permite Web Push).
- Exportar lançamentos em CSV.
