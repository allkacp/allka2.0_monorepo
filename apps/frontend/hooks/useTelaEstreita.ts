import { useEffect, useState } from "react";

/**
 * A tela é estreita (celular)?
 *
 * Existe para as tabelas: as telas de administração têm de 8 a 14 colunas, o
 * que num aparelho de 390px vira uma planilha para arrastar de lado. Em vez
 * de reescrever cada tabela como cartão — são 64, em 49 arquivos, e o risco
 * de quebrar é alto — as telas escondem as colunas secundárias quando isto
 * for verdadeiro.
 *
 * Casa com o breakpoint `md` do Tailwind (768px), o mesmo usado no CSS de
 * acabamento mobile.
 */
export function useTelaEstreita(limite = 768): boolean {
  const [estreita, setEstreita] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < limite,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${limite - 1}px)`);
    const aplicar = () => setEstreita(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [limite]);

  return estreita;
}
