// Barra de abas da tela do projeto (ProjectManagementModal). No desktop (≥ 1024 px) é a mesma grade de 9 colunas de sempre;
// abaixo disso as abas quebram em linhas (antes: ~1.200 px de largura fixa com rolagem lateral no celular — reteste Codex 01/11).
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PROJECT_TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "descricao", label: "Dados do Projeto" },
  { value: "produtos", label: "Produtos" },
  { value: "tarefas", label: "Tarefas" },
  { value: "arquivos", label: "Arquivos" },
  { value: "documentos", label: "Documentos" },
  { value: "cofre", label: "Cofre" },
  { value: "faturamento", label: "Faturamento" },
  { value: "log", label: "Log" },
] as const;

const TRIGGER_CLASS =
  "px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100";

export function ProjectTabsList() {
  return (
    <div className="flex-shrink-0 bg-white dark:bg-background px-[50px] max-md:px-3 pt-0 pb-[10px] overflow-x-auto" data-testid="project-tabs-bar">
      <TabsList
        data-testid="project-tabs"
        className="grid w-max grid-cols-9 gap-1 bg-transparent p-0 h-auto max-lg:flex max-lg:w-full max-lg:flex-wrap"
      >
        {PROJECT_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={TRIGGER_CLASS}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
