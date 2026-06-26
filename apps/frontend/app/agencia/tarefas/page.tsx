"use client";

import { useLocation } from "react-router-dom";
import AdminTarefasPage from "@/app/admin/tarefas/page";

export default function AgenciaTarefasPage() {
  const location = useLocation();
  const initialSearch = (location.state as any)?.search ?? "";

  return <AdminTarefasPage routeBase="/agency/tarefas" initialSearch={initialSearch} />;
}