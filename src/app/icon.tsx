import { ImageResponse } from "next/og";

/**
 * Ícones do app, gerados no build: cartão menta com "R$" sobre o verde
 * floresta. A versão "mascaravel" deixa margem para o recorte do Android.
 */
export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    { id: "mascaravel", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const tipo = await id;
  const lado = tipo === "192" ? 192 : 512;
  // Ícone mascarável: conteúdo dentro de 60% do centro
  const escala = tipo === "mascaravel" ? 0.6 : 0.78;
  return new ImageResponse(<Desenho lado={lado} escala={escala} cantos={tipo === "mascaravel" ? 0 : lado * 0.22} />, {
    width: lado,
    height: lado,
  });
}

export function Desenho({ lado, escala, cantos }: { lado: number; escala: number; cantos: number }) {
  const cartao = lado * escala;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f3b33, #17493f)",
        borderRadius: cantos,
      }}
    >
      <div
        style={{
          width: cartao,
          height: cartao * 0.68,
          borderRadius: cartao * 0.16,
          background: "linear-gradient(135deg, #e3f2e8, #b3dbbf)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0f3b33",
          fontSize: cartao * 0.34,
          fontWeight: 700,
          letterSpacing: -cartao * 0.015,
        }}
      >
        R$
      </div>
    </div>
  );
}
