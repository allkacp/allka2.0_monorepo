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
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<EmpresaProfile | null>(null);
  const [projects, setProjects] = useState<EmpresaProject[]>([]);
  const [tasks, setTasks] = useState<EmpresaTask[]>([]);
  const [invoices, setInvoices] = useState<EmpresaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [companiesRes, projectsRes, invoicesRes] =
          await Promise.allSettled([
            apiClient.getCompanies({ limit: "1" }),
            apiClient.getProjects({ limit: "100" }),
            apiClient.getInvoices({ limit: "100" }),
          ]);
        if (cancelled) return;
        if (companiesRes.status === "fulfilled") {
          const data: any = companiesRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          if (list[0])
            setProfile({
              id: String(list[0].id),
              name: list[0].name || "",
              cnpj: list[0].document || "",
              email: list[0].email || "",
              phone: list[0].phone || "",
              address: list[0].address || "",
              plan: list[0].plan || "",
              status: list[0].status || "active",
              createdAt: list[0].created_at || list[0].createdAt || "",
              totalInvested: list[0].totalInvested || 0,
              activeProjects: list[0].activeProjects || 0,
            });
        }
        if (projectsRes.status === "fulfilled") {
          const data: any = projectsRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          setProjects(
            list.map((p: any) => ({
              id: String(p.id),
              name: p.name || "",
              category: p.type || p.category || "",
              status: p.status || "briefing",
              value: p.budget || p.value || 0,
              startDate: p.startDate || p.start_date || "",
              deliveryDate: p.deliveryDate || p.delivery_date || "",
              completedDate: p.completedDate || "",
              tasksDone: p.tasksDone || 0,
              tasksTotal: p.tasksTotal || 0,
              nomadeCount: p.nomadeCount || 0,
            })),
          );
        }
        if (invoicesRes.status === "fulfilled") {
          const data: any = invoicesRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          setInvoices(list);
        }
      } catch (err) {
        console.error("[EmpresaProvider] Failed to load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
