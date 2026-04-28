"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiClient } from "@/lib/api-client";

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
  status: "available" | "in_progress" | "review" | "done" | "cancelled";
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
        apiClient.getInvoices({ limit: "100" }),
        apiClient.getTasks({ limit: "500" }),
      ]);

      let companyProjectIds: string[] = [];

      if (projectsRes.status === "fulfilled") {
        const pData: any = projectsRes.value;
        const pList = pData.data || (Array.isArray(pData) ? pData : []);
        companyProjectIds = pList.map((p: any) => String(p.id));
        setProjects(
          pList.map((p: any) => ({
            id: String(p.id),
            name: p.title || p.name || "",
            category: p.type || p.category || "",
            status: p.status || "briefing",
            value: p.budget || p.value || 0,
            startDate: p.start_date || p.startDate || "",
            deliveryDate: p.end_date || p.deliveryDate || p.delivery_date || "",
            completedDate: p.completedDate || "",
            tasksDone: p._count?.task_executions || p.tasksDone || 0,
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
        setInvoices(iList);
      }

      // Step 3: filter tasks that belong to this company's projects
      if (tasksRes.status === "fulfilled" && companyProjectIds.length > 0) {
        const tData: any = tasksRes.value;
        const tList = tData.data || (Array.isArray(tData) ? tData : []);
        const companyTasks = tList.filter((t: any) =>
          companyProjectIds.includes(String(t.project_id)),
        );

        // Map task status from API shape to EmpresaTask shape
        const statusMap: Record<string, EmpresaTask["status"]> = {
          pending: "available",
          available: "available",
          in_progress: "in_progress",
          review: "review",
          completed: "done",
          done: "done",
          cancelled: "cancelled",
          canceled: "cancelled",
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
            name: t.title || t.name || "",
            category: t.type || t.category || "",
            status: statusMap[t.status] || "available",
            nomadeName: t.assigned_to_name || undefined,
            value: t.value || 0,
            dueDate: t.due_date || t.dueDate || "",
            deliveredAt:
              t.status === "done" || t.status === "completed"
                ? t.updated_at || t.delivered_at || undefined
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
