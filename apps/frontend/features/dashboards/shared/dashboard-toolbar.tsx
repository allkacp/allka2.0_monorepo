// Item 3 (reunião 09/09/2026) — deixar claramente clicáveis os menus e as
// ações do cabeçalho do dashboard (seletor de dashboard, Exportar, Histórico,
// Compartilhar, Editar, Restaurar).
//
// Os controles JÁ eram <button> reais dentro de <DropdownMenu>/<Popover> do
// design system — só não "pareciam" acionáveis:
//   - o Tailwind v4 não põe mais `cursor: pointer` em <button>, então o mouse
//     mostrava a setinha;
//   - não havia anel de foco de teclado explícito (o do navegador some no
//     cabeçalho escuro do Admin);
//   - o gatilho de menu não mudava nada ao abrir.
//
// Esta função devolve APENAS as classes que faltavam. É concatenada por
// `cn()` às classes atuais de cada botão — não substitui o visual de
// repouso/hover que já existia, não cria um segundo padrão de botão e não
// mexe em lógica, dados ou permissões.
import { cn } from "@/lib/utils";

export interface DashboardToolbarControlOptions {
  /** "light" = dashboards de perfil (cabeçalho claro); "dark" = Painel Admin. */
  theme?: "light" | "dark";
  /** true nos gatilhos de dropdown/popover (seletor de dashboard, Exportar):
   *  acrescenta o sinal visível de "aberto" no próprio botão, além do chevron
   *  que gira via `group-data-[state=open]`. */
  menu?: boolean;
}

const FOCUS_RING_LIGHT =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7d1b6a] focus-visible:ring-offset-1 focus-visible:ring-offset-background";
const FOCUS_RING_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-transparent";

/** Classe padrão de PERCEPÇÃO de clicável para um controle do cabeçalho do
 *  dashboard. Ver o comentário no topo do arquivo. */
export function dashboardToolbarControlClass({
  theme = "light",
  menu = false,
}: DashboardToolbarControlOptions = {}): string {
  return cn(
    "cursor-pointer",
    theme === "dark" ? FOCUS_RING_DARK : FOCUS_RING_LIGHT,
    menu &&
      (theme === "dark"
        ? "data-[state=open]:bg-white/25 data-[state=open]:border-white"
        : "data-[state=open]:border-[#7d1b6a] data-[state=open]:shadow-sm"),
  );
}
