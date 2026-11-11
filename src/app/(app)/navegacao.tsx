"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Plus, ReceiptText, WalletCards, type LucideIcon } from "lucide-react";

type Aba = { href: string; rotulo: string };

/** Abas do controle segmentado no topo, conforme a seção atual. */
function abasDaSecao(caminho: string): Aba[] {
  if (caminho.startsWith("/lancamentos")) {
    return [
      { href: "/lancamentos", rotulo: "Extrato" },
      { href: "/lancamentos/novo", rotulo: "Novo" },
    ];
  }
  if (caminho.startsWith("/agenda")) {
    return [
      { href: "/agenda", rotulo: "Calendário" },
      { href: "/agenda/fixas", rotulo: "Recorrentes" },
    ];
  }
  if (caminho.startsWith("/contas")) {
    return [
      { href: "/contas", rotulo: "Contas" },
      { href: "/contas/nova", rotulo: "Nova" },
    ];
  }
  if (caminho.startsWith("/orcamento")) {
    return [
      { href: "/orcamento", rotulo: "Orçamento" },
      { href: "/orcamento/categorias", rotulo: "Categorias" },
    ];
  }
  return [
    { href: "/dashboard", rotulo: "Visão geral" },
    { href: "/orcamento", rotulo: "Orçamento" },
  ];
}

export function Segmentado() {
  const caminho = usePathname();
  const abas = abasDaSecao(caminho);
  return (
    <nav aria-label="Seção" className="vidro flex rounded-full p-1">
      {abas.map((aba) => {
        const ativa = caminho === aba.href;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={
              ativa
                ? "rounded-full bg-superficie px-4 py-1.5 text-sm font-medium sombra-suave"
                : "rounded-full px-4 py-1.5 text-sm text-musgo hover:text-tinta"
            }
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

const MENU: { href: string; rotulo: string; Icone: LucideIcon; ativo: (c: string) => boolean }[] = [
  { href: "/dashboard", rotulo: "Início", Icone: House, ativo: (c) => c === "/dashboard" || c.startsWith("/orcamento") },
  {
    href: "/lancamentos",
    rotulo: "Extrato",
    Icone: ReceiptText,
    ativo: (c) => c.startsWith("/lancamentos") && c !== "/lancamentos/novo",
  },
  { href: "/lancamentos/novo", rotulo: "Lançar", Icone: Plus, ativo: (c) => c === "/lancamentos/novo" },
  { href: "/agenda", rotulo: "Agenda", Icone: CalendarDays, ativo: (c) => c.startsWith("/agenda") },
  { href: "/contas", rotulo: "Contas", Icone: WalletCards, ativo: (c) => c.startsWith("/contas") },
];

/**
 * Menu flutuante. Em pé: no rodapé, com o item ativo em pílula com rótulo.
 * Celular deitado (variante `deitado`): vira uma coluna na lateral direita,
 * só com ícones, para não cobrir o conteúdo na tela baixa.
 */
export function MenuInferior() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] deitado:inset-x-auto deitado:inset-y-0 deitado:right-[max(0.75rem,env(safe-area-inset-right))] deitado:items-center deitado:px-0 deitado:pb-0"
    >
      <ul className="flex items-center gap-1.5 deitado:flex-col">
        {MENU.map(({ href, rotulo, Icone, ativo }) => {
          const atual = ativo(caminho);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={atual ? "page" : undefined}
                aria-label={rotulo}
                title={rotulo}
                className={
                  atual
                    ? "vidro vidro-menu flex h-12 items-center gap-2 rounded-full pl-4 pr-1 text-sm font-medium deitado:size-11 deitado:justify-center deitado:p-0"
                    : "vidro vidro-menu grid size-12 place-items-center rounded-full text-tinta/70 transition hover:text-tinta deitado:size-11"
                }
              >
                {atual && <span className="deitado:hidden">{rotulo}</span>}
                <span
                  className={
                    atual
                      ? "grid size-10 place-items-center rounded-full bg-superficie shadow-[0_4px_14px_-4px_rgb(15_59_51/0.35)] deitado:size-9"
                      : "contents"
                  }
                >
                  <Icone aria-hidden size={18} strokeWidth={2} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
