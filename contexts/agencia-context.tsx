"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgenciaProjectStage {
  name: string;
  status: "pending" | "in_progress" | "done";
}

export interface AgenciaContractedProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  value: number;
  stages?: AgenciaProjectStage[];
}

export interface AgenciaProject {
  id: string;
  clientName: string;
  name: string;
  category: string;
  status: "briefing" | "producao" | "revisao" | "entregue" | "cancelado" | "aguardando_pagamento";
  value: number;
  startDate: string;
  deliveryDate?: string;
  completedDate?: string;
  tasksDone: number;
  tasksTotal: number;
  products?: AgenciaContractedProduct[];
  checkoutLinks?: { self: string; client: string };
  payerMode?: "self" | "client";
}

export interface AgenciaTask {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  name: string;
  category: string;
  status: "available" | "in_progress" | "review" | "done" | "cancelled";
  nomadeName?: string;
  value: number;
  dueDate: string;
  deliveredAt?: string;
}

export interface AgenciaInvoice {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

export interface AgenciaProfile {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  plan: string;
  planDiscount: number;
  partnerName?: string;
  status: "active" | "suspended";
  createdAt: string;
  currentMrr: number;
  totalProjects: number;
  totalTasks: number;
}

// ── Context ────────────────────────────────────────────────────────────────────

interface AgenciaContextType {
  profile: AgenciaProfile | null;
  projects: AgenciaProject[];
  tasks: AgenciaTask[];
  invoices: AgenciaInvoice[];
  loading: boolean;
  addProject: (project: AgenciaProject) => void;
  confirmProjectPayment: (projectId: string) => void;
}

const AgenciaContext = createContext<AgenciaContextType | undefined>(undefined);

export function AgenciaProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AgenciaProfile | null>(null);
  const [projects, setProjects] = useState<AgenciaProject[]>([]);
  const [tasks, setTasks] = useState<AgenciaTask[]>([]);
  const [invoices, setInvoices] = useState<AgenciaInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [agenciesRes, projectsRes, invoicesRes] = await Promise.allSettled([
          apiClient.getAgencies({ limit: "1" }),
          apiClient.getProjects({ limit: "100" }),
          apiClient.getInvoices({ limit: "100" }),
        ]);
        if (cancelled) return;
        if (agenciesRes.status === "fulfilled") {
          const data: any = agenciesRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          if (list[0]) setProfile({
            id: String(list[0].id),
            name: list[0].name || "",
            cnpj: list[0].document || "",
            email: list[0].email || "",
            plan: list[0].plan || "",
            planDiscount: list[0].planDiscount || 0,
            partnerName: list[0].partnerName || "",
            status: list[0].status || "active",
            createdAt: list[0].created_at || list[0].createdAt || "",
            currentMrr: list[0].currentMrr || 0,
            totalProjects: list[0].totalProjects || 0,
            totalTasks: list[0].totalTasks || 0,
          });
        }
        if (projectsRes.status === "fulfilled") {
          const data: any = projectsRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          setProjects(list.map((p: any) => ({
            id: String(p.id),
            clientName: p.client || p.clientName || "",
            name: p.name || "",
            category: p.type || p.category || "",
            status: p.status || "briefing",
            value: p.budget || p.value || 0,
            startDate: p.startDate || p.start_date || "",
            deliveryDate: p.deliveryDate || p.delivery_date || "",
            completedDate: p.completedDate || "",
            tasksDone: p.tasksDone || 0,
            tasksTotal: p.tasksTotal || 0,
          })));
        }
        if (invoicesRes.status === "fulfilled") {
          const data: any = invoicesRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          setInvoices(list);
        }
      } catch (err) {
        console.error("[AgenciaProvider] Failed to load:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const addProject = useCallback((project: AgenciaProject) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  const confirmProjectPayment = useCallback((projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const stages: AgenciaProjectStage[] = [
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
      })
    );
  }, []);

  return (
    <AgenciaContext.Provider value={{ profile, projects, tasks, invoices, loading, addProject, confirmProjectPayment }}>
      {children}
    </AgenciaContext.Provider>
  );
}

export function useAgencia() {
  const ctx = useContext(AgenciaContext);
  if (!ctx) throw new Error("useAgencia must be used inside AgenciaProvider");
  return ctx;
}
