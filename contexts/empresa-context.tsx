"use client";

import { createContext, useContext, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmpresaProject {
  id: string;
  name: string;
  category: string;
  status: "briefing" | "producao" | "revisao" | "entregue" | "cancelado";
  value: number;
  startDate: string;
  deliveryDate?: string;
  completedDate?: string;
  tasksDone: number;
  tasksTotal: number;
  nomadeCount: number;
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PROFILE: EmpresaProfile = {
  id: "emp1",
  name: "Coca-Cola Brasil Ltda.",
  cnpj: "49.808.095/0001-00",
  email: "marketing@cocacola.com.br",
  phone: "(11) 99999-1234",
  address: "Av. Paulista, 1578 — São Paulo, SP",
  plan: "2000",
  status: "active",
  createdAt: "2025-01-15",
  totalInvested: 86400,
  activeProjects: 3,
};

const MOCK_PROJECTS: EmpresaProject[] = [
  {
    id: "p1",
    name: "Campanha Rebranding Q1",
    category: "Branding",
    status: "entregue",
    value: 12000,
    startDate: "2026-01-10",
    completedDate: "2026-02-28",
    tasksDone: 8,
    tasksTotal: 8,
    nomadeCount: 3,
  },
  {
    id: "p2",
    name: "Social Media Pack — Fevereiro",
    category: "Social Media",
    status: "producao",
    value: 8500,
    startDate: "2026-02-01",
    deliveryDate: "2026-04-30",
    tasksDone: 5,
    tasksTotal: 12,
    nomadeCount: 4,
  },
  {
    id: "p3",
    name: "Vídeo Institucional 2026",
    category: "Produção de Vídeo",
    status: "briefing",
    value: 22000,
    startDate: "2026-03-15",
    deliveryDate: "2026-05-15",
    tasksDone: 1,
    tasksTotal: 15,
    nomadeCount: 2,
  },
  {
    id: "p4",
    name: "E-mail Marketing — Newsletter",
    category: "E-mail Marketing",
    status: "revisao",
    value: 4200,
    startDate: "2026-03-01",
    deliveryDate: "2026-04-10",
    tasksDone: 4,
    tasksTotal: 5,
    nomadeCount: 1,
  },
  {
    id: "p5",
    name: "Landing Page Lançamento",
    category: "UX/UI + Dev",
    status: "producao",
    value: 18500,
    startDate: "2026-02-20",
    deliveryDate: "2026-05-01",
    tasksDone: 6,
    tasksTotal: 18,
    nomadeCount: 3,
  },
];

const MOCK_TASKS: EmpresaTask[] = [
  {
    id: "t1",
    projectId: "p2",
    projectName: "Social Media Pack — Fevereiro",
    name: "Criação de 10 posts para Instagram",
    category: "Design",
    status: "done",
    nomadeName: "Ana Lima",
    value: 850,
    dueDate: "2026-03-10",
    deliveredAt: "2026-03-09",
  },
  {
    id: "t2",
    projectId: "p2",
    projectName: "Social Media Pack — Fevereiro",
    name: "Roteiro para 2 Reels",
    category: "Redação",
    status: "in_progress",
    nomadeName: "Pedro Sousa",
    value: 600,
    dueDate: "2026-04-15",
  },
  {
    id: "t3",
    projectId: "p3",
    projectName: "Vídeo Institucional 2026",
    name: "Briefing criativo e roteiro",
    category: "Roteiro",
    status: "review",
    nomadeName: "Carla Nunes",
    value: 1200,
    dueDate: "2026-04-08",
  },
  {
    id: "t4",
    projectId: "p4",
    projectName: "E-mail Marketing — Newsletter",
    name: "Criação de template HTML",
    category: "Dev",
    status: "review",
    nomadeName: "Lucas Dias",
    value: 900,
    dueDate: "2026-04-05",
  },
  {
    id: "t5",
    projectId: "p5",
    projectName: "Landing Page Lançamento",
    name: "Wireframes e protótipo no Figma",
    category: "UX/UI",
    status: "in_progress",
    nomadeName: "Sofia Ramos",
    value: 1400,
    dueDate: "2026-04-20",
  },
  {
    id: "t6",
    projectId: "p5",
    projectName: "Landing Page Lançamento",
    name: "Desenvolvimento front-end",
    category: "Dev",
    status: "available",
    value: 3000,
    dueDate: "2026-05-01",
  },
];

const MOCK_INVOICES: EmpresaInvoice[] = [
  {
    id: "inv1",
    number: "2026-0042",
    description: "Campanha Rebranding Q1",
    amount: 12000,
    status: "paid",
    issuedAt: "2026-01-10",
    dueDate: "2026-01-20",
    paidAt: "2026-01-18",
  },
  {
    id: "inv2",
    number: "2026-0058",
    description: "Social Media Pack — Fevereiro",
    amount: 8500,
    status: "paid",
    issuedAt: "2026-02-01",
    dueDate: "2026-02-10",
    paidAt: "2026-02-09",
  },
  {
    id: "inv3",
    number: "2026-0074",
    description: "Vídeo Institucional 2026 — Entrada (50%)",
    amount: 11000,
    status: "paid",
    issuedAt: "2026-03-15",
    dueDate: "2026-03-20",
    paidAt: "2026-03-19",
  },
  {
    id: "inv4",
    number: "2026-0089",
    description: "E-mail Marketing — Newsletter",
    amount: 4200,
    status: "pending",
    issuedAt: "2026-03-25",
    dueDate: "2026-04-10",
  },
  {
    id: "inv5",
    number: "2026-0102",
    description: "Landing Page Lançamento — Entrada (40%)",
    amount: 7400,
    status: "pending",
    issuedAt: "2026-04-01",
    dueDate: "2026-04-15",
  },
];

// ── Context ────────────────────────────────────────────────────────────────────

interface EmpresaContextType {
  profile: EmpresaProfile;
  projects: EmpresaProject[];
  tasks: EmpresaTask[];
  invoices: EmpresaInvoice[];
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [profile] = useState<EmpresaProfile>(MOCK_PROFILE);
  const [projects] = useState<EmpresaProject[]>(MOCK_PROJECTS);
  const [tasks] = useState<EmpresaTask[]>(MOCK_TASKS);
  const [invoices] = useState<EmpresaInvoice[]>(MOCK_INVOICES);

  return (
    <EmpresaContext.Provider value={{ profile, projects, tasks, invoices }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa must be used inside EmpresaProvider");
  return ctx;
}
