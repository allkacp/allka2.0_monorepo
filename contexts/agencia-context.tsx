"use client";

import { createContext, useContext, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgenciaProject {
  id: string;
  clientName: string;
  name: string;
  category: string;
  status: "briefing" | "producao" | "revisao" | "entregue" | "cancelado";
  value: number;
  startDate: string;
  deliveryDate?: string;
  completedDate?: string;
  tasksDone: number;
  tasksTotal: number;
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PROFILE: AgenciaProfile = {
  id: "ag1",
  name: "Agência Criativa SP",
  cnpj: "12.345.678/0001-90",
  email: "contato@criativasp.com.br",
  plan: "2000",
  planDiscount: 20,
  partnerName: "Carlos Mendonça",
  status: "active",
  createdAt: "2025-09-01",
  currentMrr: 2000,
  totalProjects: 12,
  totalTasks: 58,
};

const MOCK_PROJECTS: AgenciaProject[] = [
  {
    id: "p1",
    clientName: "Padaria Francesa",
    name: "Identidade Visual Completa",
    category: "Branding",
    status: "entregue",
    value: 5800,
    startDate: "2026-01-05",
    completedDate: "2026-02-10",
    tasksDone: 10,
    tasksTotal: 10,
  },
  {
    id: "p2",
    clientName: "Clínica Sorria Mais",
    name: "Social Media Mensal",
    category: "Social Media",
    status: "producao",
    value: 3200,
    startDate: "2026-02-01",
    deliveryDate: "2026-04-30",
    tasksDone: 8,
    tasksTotal: 20,
  },
  {
    id: "p3",
    clientName: "Loja Virtual ModaFit",
    name: "E-commerce Landing Page",
    category: "UX/UI + Dev",
    status: "revisao",
    value: 9500,
    startDate: "2026-02-15",
    deliveryDate: "2026-04-20",
    tasksDone: 9,
    tasksTotal: 11,
  },
  {
    id: "p4",
    clientName: "Academia PowerUp",
    name: "Campanha Matrícula 2026",
    category: "Performance",
    status: "briefing",
    value: 4400,
    startDate: "2026-03-20",
    deliveryDate: "2026-05-10",
    tasksDone: 1,
    tasksTotal: 8,
  },
];

const MOCK_TASKS: AgenciaTask[] = [
  {
    id: "t1",
    projectId: "p2",
    projectName: "Social Media Mensal",
    clientName: "Clínica Sorria Mais",
    name: "Pack 12 posts — Março",
    category: "Design",
    status: "done",
    nomadeName: "Beatriz Alves",
    value: 480,
    dueDate: "2026-03-20",
    deliveredAt: "2026-03-18",
  },
  {
    id: "t2",
    projectId: "p2",
    projectName: "Social Media Mensal",
    clientName: "Clínica Sorria Mais",
    name: "Pack 12 posts — Abril",
    category: "Design",
    status: "in_progress",
    nomadeName: "Beatriz Alves",
    value: 480,
    dueDate: "2026-04-18",
  },
  {
    id: "t3",
    projectId: "p3",
    projectName: "E-commerce Landing Page",
    clientName: "Loja Virtual ModaFit",
    name: "Ajustes pós-revisão v2",
    category: "Dev",
    status: "review",
    nomadeName: "Fernando Costa",
    value: 600,
    dueDate: "2026-04-10",
  },
  {
    id: "t4",
    projectId: "p3",
    projectName: "E-commerce Landing Page",
    clientName: "Loja Virtual ModaFit",
    name: "SEO On-page",
    category: "SEO",
    status: "available",
    value: 900,
    dueDate: "2026-04-25",
  },
  {
    id: "t5",
    projectId: "p4",
    projectName: "Campanha Matrícula 2026",
    clientName: "Academia PowerUp",
    name: "Criação de criativo para Meta Ads",
    category: "Design",
    status: "in_progress",
    nomadeName: "Renata Lima",
    value: 750,
    dueDate: "2026-04-15",
  },
];

const MOCK_INVOICES: AgenciaInvoice[] = [
  {
    id: "inv1",
    number: "2026-0111",
    description: "Plano Allka — Jan/2026",
    amount: 2000,
    status: "paid",
    issuedAt: "2026-01-01",
    dueDate: "2026-01-05",
    paidAt: "2026-01-04",
  },
  {
    id: "inv2",
    number: "2026-0145",
    description: "Plano Allka — Fev/2026",
    amount: 2000,
    status: "paid",
    issuedAt: "2026-02-01",
    dueDate: "2026-02-05",
    paidAt: "2026-02-03",
  },
  {
    id: "inv3",
    number: "2026-0178",
    description: "Plano Allka — Mar/2026",
    amount: 2000,
    status: "paid",
    issuedAt: "2026-03-01",
    dueDate: "2026-03-05",
    paidAt: "2026-03-04",
  },
  {
    id: "inv4",
    number: "2026-0201",
    description: "Plano Allka — Abr/2026",
    amount: 2000,
    status: "pending",
    issuedAt: "2026-04-01",
    dueDate: "2026-04-10",
  },
];

// ── Context ────────────────────────────────────────────────────────────────────

interface AgenciaContextType {
  profile: AgenciaProfile;
  projects: AgenciaProject[];
  tasks: AgenciaTask[];
  invoices: AgenciaInvoice[];
}

const AgenciaContext = createContext<AgenciaContextType | undefined>(undefined);

export function AgenciaProvider({ children }: { children: React.ReactNode }) {
  const [profile] = useState<AgenciaProfile>(MOCK_PROFILE);
  const [projects] = useState<AgenciaProject[]>(MOCK_PROJECTS);
  const [tasks] = useState<AgenciaTask[]>(MOCK_TASKS);
  const [invoices] = useState<AgenciaInvoice[]>(MOCK_INVOICES);

  return (
    <AgenciaContext.Provider value={{ profile, projects, tasks, invoices }}>
      {children}
    </AgenciaContext.Provider>
  );
}

export function useAgencia() {
  const ctx = useContext(AgenciaContext);
  if (!ctx) throw new Error("useAgencia must be used inside AgenciaProvider");
  return ctx;
}
