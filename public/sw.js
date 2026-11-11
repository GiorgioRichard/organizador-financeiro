/*
 * Service worker do Organizador.
 *  - Arquivos do app (/_next/static, ícones): guardados no primeiro uso.
 *  - Telas: sempre da rede (dados financeiros precisam estar atualizados);
 *    sem conexão, mostra a tela /offline.
 *  - Nada de POST, ações do servidor ou chamadas a outros domínios.
 */
const VERSAO = "organizador-v2"; // v2: ícone novo (limpa o cache antigo)
const OFFLINE = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll([OFFLINE, "/icones/icon-192.png", "/icones/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Arquivos com hash no nome nunca mudam: cache primeiro
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/")) {
    evento.respondWith(
      caches.match(pedido).then(
        (salvo) =>
          salvo ||
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // Navegação entre telas: rede; sem conexão, tela offline
  if (pedido.mode === "navigate") {
    evento.respondWith(fetch(pedido).catch(() => caches.match(OFFLINE)));
  }
});
