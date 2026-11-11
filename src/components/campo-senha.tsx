"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo de senha com botão para mostrar/ocultar e dica opcional. */
export function CampoSenha({
  name,
  rotulo,
  autoComplete,
  className,
  dica,
}: {
  name: string;
  rotulo: string;
  autoComplete: string;
  className: string;
  dica?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      <label htmlFor={id}>{rotulo}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          maxLength={72}
          aria-describedby={dica ? `${id}-dica` : undefined}
          className={`${className} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-2xl text-musgo hover:text-tinta"
        >
          {visivel ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
        </button>
      </div>
      {dica && (
        <span id={`${id}-dica`} className="text-xs font-normal text-musgo">
          {dica}
        </span>
      )}
    </div>
  );
}
