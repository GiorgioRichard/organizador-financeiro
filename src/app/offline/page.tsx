import { WifiOff } from "lucide-react";
import { Rodape } from "@/components/rodape";

export const metadata = { title: "Sem conexão · Organizador financeiro" };

/** Tela mostrada pelo service worker quando não há internet. */
export default function OfflinePage() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="vidro grid size-16 place-items-center rounded-full text-floresta">
        <WifiOff aria-hidden size={26} />
      </span>
      <h1 className="text-[2rem] font-medium leading-tight deitado:text-2xl tracking-[-0.035em]">Sem conexão</h1>
      <p className="text-sm text-musgo">
        Seus dados ficam no servidor, então é preciso internet para ver saldos e lançamentos. Assim que a
        conexão voltar, toque em tentar de novo.
      </p>
      {/* <a> e não <Link>: recarrega a página inteira, de propósito */}
      <a
        href="/dashboard"
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-floresta px-6 text-sm font-medium text-sobre-floresta"
      >
        Tentar de novo
      </a>
      <Rodape />
    </main>
  );
}
