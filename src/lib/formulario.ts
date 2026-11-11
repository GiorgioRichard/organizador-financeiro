/**
 * Estado dos formulários com useActionState. Quando a validação falha,
 * a ação devolve o erro e o que foi digitado, e o formulário se
 * repreenche (o React limpa formulários depois de cada envio).
 * Senhas nunca voltam.
 */
export type EstadoForm = {
  erro?: string;
  valores?: Record<string, string>;
  /** Muda a cada falha para o formulário remontar com os valores. */
  versao: number;
};

export const ESTADO_INICIAL: EstadoForm = { versao: 0 };

const NAO_DEVOLVER = new Set(["senha", "confirmacao", "senha_atual"]);

export function falha(formData: FormData, erro: string): EstadoForm {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string" && !chave.startsWith("$") && !NAO_DEVOLVER.has(chave)) valores[chave] = valor;
  }
  return { erro, valores, versao: Date.now() };
}

export type AcaoForm = (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
