"use client";

import { useActionState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cadastrar, definirSenha, entrar, recuperarSenha } from "@/app/auth/actions";
import { ESTADO_INICIAL } from "@/lib/formulario";
import { BotaoEnviar } from "./botao-enviar";
import { CampoSenha } from "./campo-senha";

export type ModoAcesso = "entrar" | "cadastrar" | "recuperar" | "nova-senha";

const ACOES = { entrar, cadastrar, recuperar: recuperarSenha, "nova-senha": definirSenha };
const BOTAO: Record<ModoAcesso, [string, string]> = {
  entrar: ["Entrar", "Entrando…"],
  cadastrar: ["Criar conta", "Criando conta…"],
  recuperar: ["Enviar link", "Enviando…"],
  "nova-senha": ["Salvar nova senha", "Salvando…"],
};

const campo =
  "w-full rounded-2xl border border-superficie bg-superficie/80 px-4 py-3 text-base text-tinta placeholder:text-musgo/60 focus:bg-superficie focus:outline-none focus:ring-2 focus:ring-floresta/40";
const rotulo = "flex flex-col gap-1.5 text-sm font-medium";

/** Formulário de acesso: entrar, cadastrar, recuperar senha ou definir nova senha. */
export function FormAcesso({ modo }: { modo: ModoAcesso }) {
  const [estado, enviar] = useActionState(ACOES[modo], ESTADO_INICIAL);
  const v = estado.valores ?? {};
  const novaSenha = modo === "cadastrar" || modo === "nova-senha";

  return (
    <form action={enviar} className="cartao-branco flex flex-col gap-4 rounded-[var(--radius-cartao)] p-5">
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-despesa-suave px-4 py-3 text-sm text-despesa">
          {estado.erro}
        </p>
      )}

      {/* key: refaz os campos com o que foi digitado quando volta com erro */}
      <div key={estado.versao} className="flex flex-col gap-4">
        {modo === "cadastrar" && (
          <label className={rotulo}>
            Como quer ser chamado
            <input name="nome" autoComplete="given-name" required maxLength={60} defaultValue={v.nome} className={campo} />
          </label>
        )}

        {modo !== "nova-senha" && (
          <label className={rotulo}>
            E-mail
            <input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v.email} className={campo} />
          </label>
        )}

        {modo !== "recuperar" && (
          <CampoSenha
            name="senha"
            rotulo={modo === "nova-senha" ? "Nova senha" : "Senha"}
            autoComplete={novaSenha ? "new-password" : "current-password"}
            className={campo}
            dica={novaSenha ? "Mínimo de 8 caracteres." : undefined}
          />
        )}

        {novaSenha && <CampoSenha name="confirmacao" rotulo="Confirme a senha" autoComplete="new-password" className={campo} />}
      </div>

      <BotaoEnviar
        pendente={BOTAO[modo][1]}
        className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-floresta px-5 text-sm font-medium text-sobre-floresta hover:bg-floresta-2"
      >
        {BOTAO[modo][0]} <ArrowUpRight aria-hidden size={16} />
      </BotaoEnviar>
    </form>
  );
}
