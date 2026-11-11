"use client";

import { useEffect } from "react";

/**
 * Registra o service worker só na versão de produção: em
 * desenvolvimento o cache atrapalharia a atualização automática.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem service worker o app continua funcionando, só não fica offline.
    });
  }, []);
  return null;
}
