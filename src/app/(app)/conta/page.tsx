import { Suspense } from "react";
import Link from "next/link";
import { Download, KeyRound, ShieldCheck } from "lucide-react";
import { Entrada } from "@/components/entrada";
import { exigirUsuario } from "@/lib/auth";
import { Aviso, Carregando, Titulo, botaoPrimario } from "../ui";
import { SeletorTema } from "../seletor-tema";
import { FormRestaurar } from "./form-restaurar";

type SearchParams = Promise<{ ok?: string }>;

export default function ContaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="conteudo" className="flex flex-col gap-5">
      <Titulo titulo="Configurações" subtitulo="Seu perfil, aparência e backup dos dados" />
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await exigirUsuario();
  const { ok } = await searchParams;
  const nome = typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : "";

  return (
    <Entrada className="flex flex-col gap-5">
      <Aviso ok={ok} />

      <section aria-labelledby="perfil" className="vidro rounded-[var(--radius-cartao)] p-5">
        <h2 id="perfil" className="text-sm text-musgo">Perfil</h2>
        {nome && <p className="mt-2 text-lg font-medium">{nome}</p>}
        <p className="text-sm text-musgo">{user.email}</p>
        <div className="mt-4 max-w-sm">
          <SeletorTema />
        </div>
        <Link href="/conta/senha" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">
          <KeyRound aria-hidden size={16} /> Alterar senha
        </Link>
      </section>

      <section aria-labelledby="backup" className="cartao-branco rounded-[var(--radius-cartao)] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-menta/70 text-floresta">
            <ShieldCheck aria-hidden size={18} />
          </span>
          <h2 id="backup" className="text-xl font-medium tracking-tight">Backup dos dados</h2>
        </div>
        <p className="mt-3 text-sm text-musgo">
          Baixe um arquivo com todas as suas contas, categorias, lançamentos, recorrentes e limites. Guarde em um lugar
          seguro (Google Drive, iCloud, e-mail). Recomendado uma vez por mês e antes de grandes mudanças.
        </p>
        <a href="/conta/backup" download className={`${botaoPrimario} mt-4`}>
          <Download aria-hidden size={16} /> Baixar backup (JSON)
        </a>

        <hr className="my-6 border-linha" />

        <h3 className="font-medium">Restaurar de um arquivo</h3>
        <p className="mb-4 mt-1 text-sm text-musgo">
          Use para recuperar dados ou levar tudo para outra conta. Baixe um backup atual antes, por segurança.
        </p>
        <FormRestaurar />
      </section>
    </Entrada>
  );
}
