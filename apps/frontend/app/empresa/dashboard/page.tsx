// @ts-nocheck
"use client";

import { EmpresaDashboard } from "@/app/_shared/dashboard-empresa";

export default function EmpresaDashboardPage() {
  return (
    <EmpresaDashboard
      storageKey="empresa_dashboard_widgets_v1"
      projectsPath="/empresa/projetos"
      tasksPath="/empresa/tarefas"
      invoicesPath="/empresa/faturas"
    />
  );
}
