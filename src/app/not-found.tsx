import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[2rem] font-medium tracking-[-0.035em]">Página não encontrada</h1>
      <Link
        href="/dashboard"
        className="rounded-full bg-floresta px-5 py-3 text-sm font-medium text-sobre-floresta hover:bg-floresta-2"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
