import { ImageResponse } from "next/og";
import { Desenho } from "./icon";

/** Ícone da tela inicial do iPhone (o iOS arredonda os cantos sozinho). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<Desenho lado={180} escala={0.74} cantos={0} />, size);
}
