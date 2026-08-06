import { History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Número do registro na plataforma ANTIGA (Dump20260423), mostrado ao lado do
 * identificador novo em quem veio da importação.
 *
 * Existe porque a numeração nova (user_1, prod_1, proj_1, T000001…) recomeça do
 * zero: sem esta referência não há como cruzar um registro daqui com o sistema
 * antigo. Só aparece em registro importado — cadastro nativo não renderiza nada.
 *
 * Deliberadamente chamativo (pílula âmbar com borda): é um estado de transição,
 * a pessoa precisa bater o olho e saber que aquele registro veio de fora. Quando
 * a migração estiver consolidada, dá pra reduzir pra `variante="discreta"`.
 *
 * `entidade` entra no texto do tooltip ("Número deste projeto na plataforma
 * antiga"), e `modeloAntigo` marca a tarefa que continua no formato antigo.
 */
export function LegacyIdBadge({
  legacyId,
  legacyIds,
  entidade = "registro",
  modeloAntigo = false,
  variante = "destaque",
  className = "",
}: {
  legacyId?: number | null;
  /** Quando o registro novo absorveu vários antigos (produtos consolidados). */
  legacyIds?: number[];
  entidade?: string;
  modeloAntigo?: boolean;
  variante?: "destaque" | "discreta";
  className?: string;
}) {
  const ids = legacyIds?.length ? legacyIds : legacyId != null ? [legacyId] : [];
  if (ids.length === 0) return null;

  const texto = ids.length > 1 ? `#${ids.join(" #")}` : `#${ids[0]}`;

  const estilo =
    variante === "destaque"
      ? "gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-400"
      : "gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex w-fit items-center whitespace-nowrap cursor-help ${estilo} ${className}`}
        >
          {variante === "destaque" && <History className="h-3 w-3 shrink-0" />}
          ANTIGA {texto}
          {modeloAntigo && (
            <span className="ml-0.5 rounded-sm bg-amber-200 px-1 text-[9px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
              modelo antigo
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-70">
        {modeloAntigo
          ? `Veio da plataforma antiga (${texto}) e continua no modelo antigo — não tem modelo de tarefa novo vinculado, então o motor novo (etapas/briefing) não se aplica a ela.`
          : ids.length > 1
            ? `Este ${entidade} consolidou ${ids.length} cadastros da plataforma antiga (${texto}); cada um virou uma variação. Use estes números para consultar a base de origem.`
            : `Número deste ${entidade} na plataforma antiga (${texto}), para consulta na base de origem. O identificador oficial continua sendo o do lado.`}
      </TooltipContent>
    </Tooltip>
  );
}
