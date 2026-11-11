"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

type Tema = "sistema" | "claro" | "escuro";

const OPCOES: { valor: Tema; rotulo: string; Icone: LucideIcon }[] = [
  { valor: "sistema", rotulo: "Sistema", Icone: Monitor },
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
];

const ouvintes = new Set<() => void>();

function lerTema(): Tema {
  try {
    const t = localStorage.getItem("tema");
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

function aplicarTema(tema: Tema) {
  try {
    if (tema === "sistema") localStorage.removeItem("tema");
    else localStorage.setItem("tema", tema);
  } catch {
    // Sem acesso ao armazenamento (aba privada): vale só nesta página.
  }
  const raiz = document.documentElement;
  if (tema === "sistema") delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  // Mantém outras abas abertas em sincronia
  const aoMudarEmOutraAba = (e: StorageEvent) => {
    if (e.key !== "tema") return;
    const t = lerTema();
    if (t === "sistema") delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = t;
    avisar();
  };
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

/** Escolha de tema em pílula: Sistema, Claro ou Escuro. */
export function SeletorTema() {
  const tema = useSyncExternalStore(assinar, lerTema, () => "sistema" as Tema);

  return (
    <fieldset>
      <legend className="text-xs text-musgo">Aparência</legend>
      <div className="mt-1.5 flex rounded-full bg-tinta/[0.06] p-1">
        {OPCOES.map(({ valor, rotulo, Icone }) => (
          <label
            key={valor}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs text-musgo transition has-[:checked]:bg-superficie has-[:checked]:font-medium has-[:checked]:text-tinta has-[:checked]:sombra-suave has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-floresta/40"
          >
            <input
              type="radio"
              name="tema"
              value={valor}
              checked={tema === valor}
              onChange={() => aplicarTema(valor)}
              className="sr-only"
            />
            <Icone aria-hidden size={13} />
            {rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
