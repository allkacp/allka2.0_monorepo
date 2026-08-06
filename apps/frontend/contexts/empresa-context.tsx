"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiClient } from "@/lib/api-client";
import { podeConsultarEmpresa } from "@/lib/conta-logada";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmpresaProjectStage {
  name: string;
  status: "pending" | "in_progress" | "done";
}

export interface EmpresaContractedProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  value: number;
  stages?: EmpresaProjectStage[];
}

export interface EmpresaProject {
  id: string;
  seq?: number | null;
  name: string;
  category: string;
  status:
    | "briefing"
    | "producao"
    | "revisao"
    | "entregue"
    | "cancelado"
    | "aguardando_pagamento";
  value: number;
  startDate: string;
  deliveryDate?: string;
  completedDate?: string;
  tasksDone: number;
  tasksTotal: number;
  nomadeCount: number;
  nomadeNames?: string[];
  teamMembers?: { name: string; role: string }[];
  products?: EmpresaContractedProduct[];
  checkoutLinks?: { self: string; client: string };
  payerMode?: "self" | "client";
}

export interface EmpresaTask {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  category: string;
  /**
   * Balde grosso, usado pelos cards e pelo dashboard. É derivado de
   * `rawStatus` — não é o que o banco guarda.
   */
  status:
    | "available"
    | "in_progress"
    | "review"
    | "approval"
    | "done"
    | "cancelled";
  /**
   * O status real da tarefa (EM_APROVACAO, APROVACAO_PENDENTE_CLIENTE, …).
   * Necessário porque a decisão de aprovar depende do valor exato, e o balde
   * acima perde essa informação.
   */
  rawStatus: string;
  /** Está parada esperando o aceite DESTE cliente. */
  aguardandoMinhaAprovacao: boolean;
  nomadeName?: string;
  value: number;
  dueDate: string;
  deliveredAt?: string;
}

export interface EmpresaInvoice {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

export interface EmpresaProfile {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  status: "active" | "suspended";
  createdAt: string;
  totalInvested: number;
  activeProjects: number;
}

// ── Context ────────────────────────────────────────────────────────────────────

interface EmpresaContextType {
  profile: EmpresaProfile | null;
  projects: EmpresaProject[];
  tasks: EmpresaTask[];
  invoices: EmpresaInvoice[];
  loading: boolean;
  addProject: (project: EmpresaProject) => void;
  confirmProjectPayment: (projectId: string) => void;
  refetch: () => void;
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<EmpresaProfile | null>(null);
  const [projects, setProjects] = useState<EmpresaProject[]>([]);
  const [tasks, setTasks] = useState<EmpresaTask[]>([]);
  const [invoices, setInvoices] = useState<EmpresaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    // Contexto montado para todo mundo, mas só a empresa (e o admin) enxerga
    // estes dados — ver lib/conta-logada.ts. Sem esta guarda, um nômade
    // logado disparava /clients e levava 403 em toda navegação.
    if (!podeConsultarEmpresa()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Step 1: load company profile first to know the company ID
      const companiesRes = await apiClient.getCompanies({ limit: "1" });

      let companyId = "1";
      const cData: any = companiesRes;
      const cList = cData.data || (Array.isArray(cData) ? cData : []);
      if (cList[0]) {
        companyId = String(cList[0].id);
        setProfile({
          id: companyId,
          name: cList[0].name || "",
          cnpj: cList[0].document || "",
          email: cList[0].email || "",
          phone: cList[0].phone || "",
          address: cList[0].address || "",
          plan: cList[0].plan || "",
          status: cList[0].status || "active",
          createdAt: cList[0].created_at || cList[0].createdAt || "",
          totalInvested: cList[0].totalInvested || 0,
          activeProjects: cList[0].activeProjects || 0,
        });
      }

      // Step 2: load projects (filtered by company) + invoices in parallel
      const [projectsRes, invoicesRes, tasksRes] = await Promise.allSettled([
        apiClient.getProjects({ limit: "100", client_id: companyId }),
        apiClient.getInvoices({ limit: "100", company_id: companyId }),
        // `/project-tasks`, não `/tasks`. O segundo é a tabela legada de
        // execuções, cujas linhas vêm com `project_id: null` — o filtro por
        // projeto logo abaixo nunca casava e o cliente via a lista sempre
        // vazia. As tarefas reais da plataforma (as que o motor de etapas
        // movimenta) estão em /project-tasks, já recortadas por empresa no
        // backend via getTaskScopeWhere.
        apiClient.getOperationalTasks({ limit: "500" }),
      ]);

      let companyProjectIds: string[] = [];

      if (projectsRes.status === "fulfilled") {
        const pData: any = projectsRes.value;
        const pList = pData.data || (Array.isArray(pData) ? pData : []);
        companyProjectIds = pList.map((p: any) => String(p.id));
        setProjects(
          pList.map((p: any) => ({
            id: String(p.id),
            seq: p._seq ?? null,
            name: p.title || p.name || "",
            category: p.type || p.category || "",
            status: p.status || "briefing",
            value: p.budget || p.value || 0,
            startDate: p.start_date || p.startDate || "",
            deliveryDate: p.end_date || p.deliveryDate || p.delivery_date || "",
            completedDate: p.completedDate || "",
            tasksDone:
              p._count?.project_tasks ||
              p._count?.task_executions ||
              p.tasksDone ||
              0,
            tasksTotal: p.tasksTotal || 0,
            nomadeCount: p.nomadeCount || 0,
            nomadeNames: (() => {
              try {
                return JSON.parse(p.nomades || "[]");
              } catch {
                return [];
              }
            })(),
            teamMembers: p.teamMembers || [],
            products: (p.products || []).map((prod: any) => ({
              id: String(prod.id),
              name: prod.name || "",
              category: prod.category || "",
              quantity: prod.quantity ?? 1,
              value: prod.price ?? prod.value ?? 0,
            })),
          })),
        );
      }

      if (invoicesRes.status === "fulfilled") {
        const iData: any = invoicesRes.value;
        const iList = iData.data || (Array.isArray(iData) ? iData : []);
        setInvoices(
          iList.map((i: any) => ({
            id: String(i.id),
            number: i.invoice_number || i.number || "",
            description: i.description || "",
            amount: i.amount || 0,
            status: i.status || "pending",
            issuedAt: i.created_at || i.issuedAt || "",
            dueDate: i.due_date || i.dueDate || "",
            paidAt: i.paid_at || i.paidAt || undefined,
          })),
        );
      }

      // Step 3: tarefas da empresa
      //
      // Sem filtrar por `companyProjectIds` aqui: /project-tasks já vem
      // recortado por empresa no backend, e o filtro local dependia da lista
      // de projetos ter vindo completa — com o teto de 100, uma tarefa de um
      // projeto além desse limite sumia da tela sem motivo aparente.
      if (tasksRes.status === "fulfilled") {
        const tData: any = tasksRes.value;
        const tList = tData.data || (Array.isArray(tData) ? tData : []);
        const companyTasks = tList;

        // Status real da tarefa → balde exibido ao cliente.
        //
        // Este mapa só conhecia o vocabulário antigo (pending/review/completed)
        // e o motor de etapas grava o novo (EM_EXECUCAO, EM_APROVACAO,
        // APROVACAO_PENDENTE_CLIENTE…). Como o fallback é "available", toda
        // tarefa real chegava ao cliente como "Disponível" — inclusive as que
        // estavam paradas esperando o aceite dele.
        const statusMap: Record<string, EmpresaTask["status"]> = {
          // Vocabulário legado, mantido para dados antigos
          pending: "available",
          available: "available",
          in_progress: "in_progress",
          review: "review",
          completed: "done",
          done: "done",
          cancelled: "cancelled",
          canceled: "cancelled",

          // Vocabulário real da plataforma
          PARA_LANCAMENTO: "available",
          EM_LANCAMENTO: "available",
          AGUARDANDO_INFORMACOES: "available",
          AGUARDANDO_ETAPA: "available",
          AGUARDANDO_NOMADE: "available",
          LIBERADA_PARA_EXECUCAO: "available",
          LANCAMENTO_ENVIADO_PARA_ANALISE: "in_progress",
          EM_EXECUCAO: "in_progress",
          ENTREGA_PENDENTE: "in_progress",
          ENTREGA_ATRASADA: "in_progress",
          MELHORIAS_FINAIS: "in_progress",
          EM_REVISAO: "review",
          NAO_SEGUIU_ORIENTACOES: "review",
          REPROVADA: "review",
          // Aprovação da agência ainda não saiu: para o cliente é entrega em
          // conferência, não algo que ele possa aceitar.
          EM_APROVACAO: "approval",
          APROVACAO_PENDENTE_CLIENTE: "approval",
          QUALIFICACAO_PENDENTE: "approval",
          APROVADA: "done",
          CONCLUIDA: "done",
          PAUSADA: "cancelled",
          CANCELADA: "cancelled",
        };

        setTasks(
          companyTasks.map((t: any) => ({
            id: String(t.id),
            projectId: String(t.project_id),
            projectName:
              projectsRes.status === "fulfilled"
                ? (() => {
                    const pData: any = projectsRes.value;
                    const pList =
                      pData.data || (Array.isArray(pData) ? pData : []);
                    return (
                      pList.find(
                        (p: any) => String(p.id) === String(t.project_id),
                      )?.title ||
                      pList.find(
                        (p: any) => String(p.id) === String(t.project_id),
                      )?.name ||
                      ""
                    );
                  })()
                : "",
            name: t.title || t.name_snapshot || t.name || "",
            // /project-tasks guarda a categoria no snapshot do modelo de tarefa.
            category: t.category_snapshot || t.catalog_task?.category || t.type || "",
            status: statusMap[t.status] || "available",
            rawStatus: t.status || "",
            // Só o segundo nível é ação dele. Em EM_APROVACAO a bola ainda
            // está com a agência, e o backend recusaria o aceite mesmo assim.
            aguardandoMinhaAprovacao: t.status === "APROVACAO_PENDENTE_CLIENTE",
            nomadeName:
              t.nomade_responsavel?.name || t.assignee?.name || t.assigned_to_name || undefined,
            // ProjectTask não tem campo de valor — ver o comentário na tela
            // company/tarefas. Fica 0 e a tela não exibe coluna de preço.
            value: 0,
            dueDate: t.due_date || t.dueDate || "",
            deliveredAt: ["done", "completed", "CONCLUIDA", "APROVADA"].includes(
              t.status,
            )
              ? t.data_conclusao || t.completed_at || t.updated_at || undefined
              : undefined,
          })),
        );
      }
    } catch (err) {
      console.error("[EmpresaProvider] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addProject = useCallback((project: EmpresaProject) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  const confirmProjectPayment = useCallback((projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const stages: EmpresaProjectStage[] = [
          { name: "Briefing e Planejamento", status: "pending" },
          { name: "Desenvolvimento", status: "pending" },
          { name: "Revisão", status: "pending" },
          { name: "Entrega Final", status: "pending" },
        ];
        return {
          ...p,
          status: "briefing" as const,
          tasksDone: 0,
          tasksTotal: p.products?.length ?? 0,
          products: p.products?.map((prod) => ({ ...prod, stages })),
        };
      }),
    );
  }, []);

  return (
    <EmpresaContext.Provider
      value={{
        profile,
        projects,
        tasks,
        invoices,
        loading,
        addProject,
        confirmProjectPayment,
        refetch,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa must be used inside EmpresaProvider");
  return ctx;
}
