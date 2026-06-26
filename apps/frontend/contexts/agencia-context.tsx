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
  partnerLevel: "bronze" | "silver" | "gold" | "platinum" | "diamond";
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

    const normalize = (value: string) =>
      value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

    async function load() {
      try {
        const [currentUserRes, agenciesRes, projectsRes, invoicesRes] =
          await Promise.allSettled([
            apiClient.getCurrentUser(),
            apiClient.getAgencies({ limit: "20" }),
            apiClient.getProjects({ limit: "100" }),
            apiClient.getInvoices({ limit: "100" }),
          ]);
        if (cancelled) return;
        const currentUser =
          currentUserRes.status === "fulfilled"
            ? (currentUserRes.value as any)
            : null;
        const activeAgencyName =
          currentUser?.agency_name ||
          currentUser?.agency?.name ||
          currentUser?.active_agency_name ||
          "";
        if (agenciesRes.status === "fulfilled") {
          const data: any = agenciesRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          const matchedAgency = activeAgencyName
            ? list.find((agency: any) => {
                const agencyName = String(agency?.name || "");
                return (
                  normalize(agencyName) === normalize(activeAgencyName) ||
                  normalize(agencyName).includes(normalize(activeAgencyName)) ||
                  normalize(activeAgencyName).includes(normalize(agencyName))
                );
              })
            : list[0];
          const source = matchedAgency || list[0];
          if (source)
            setProfile({
              id: String(currentUser?.agency_id || currentUser?.active_agency_id || source.id || source.name || ""),
              name: activeAgencyName || source.name || "",
              cnpj: source.document || source.cnpj || "",
              email: source.email || "",
              plan: source.plan || source.planType || "",
              planDiscount: source.planDiscount || 0,
              partnerName: source.partnerName || "",
              status: source.status || "active",
              createdAt: source.created_at || source.createdAt || "",
              currentMrr: source.currentMrr || 0,
              totalProjects: source.totalProjects || 0,
              totalTasks: source.totalTasks || 0,
              partnerLevel: source.partner_level || "bronze",
            });
        }
        if (projectsRes.status === "fulfilled") {
          const data: any = projectsRes.value;
          const list = data.data || (Array.isArray(data) ? data : []);
          const scopedList = activeAgencyName
            ? list.filter((p: any) => {
                const normalizedProjectAgency = String(p.agency || "")
                  .trim()
                  .toLowerCase();
                const normalizedAgencyName = activeAgencyName
                  .trim()
                  .toLowerCase();
                return (
                  normalizedProjectAgency === normalizedAgencyName ||
                  normalizedProjectAgency.includes(normalizedAgencyName) ||
                  normalizedAgencyName.includes(normalizedProjectAgency)
                );
              })
            : list;
          setProjects(
            scopedList.map((p: any) => ({
              id: String(p.id),
              clientName:
                (typeof p.client === "object" ? p.client?.name : p.client) ||
                p.clientName ||
                "",
              name: p.title || p.name || "",
              category: p.type || p.category || "",
              status: p.status || "briefing",
              value: p.budget || p.value || 0,
              startDate: p.startDate || p.start_date || "",
              deliveryDate: p.deliveryDate || p.delivery_date || p.end_date || "",
              completedDate: p.completedDate || "",
              tasksDone: p._count?.task_executions || p.tasksDone || 0,
              tasksTotal: p._count?.task_executions || p.tasksTotal || 0,
            })),
          );
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

    const handleProjectPaid = () => {
      load();
    };
    window.addEventListener("allka:project-paid", handleProjectPaid as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(
        "allka:project-paid",
        handleProjectPaid as EventListener,
      );
    };
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
      }),
    );
  }, []);

  return (
    <AgenciaContext.Provider
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
    </AgenciaContext.Provider>
  );
}

export function useAgencia() {
  const ctx = useContext(AgenciaContext);
  if (!ctx) throw new Error("useAgencia must be used inside AgenciaProvider");
  return ctx;
}
