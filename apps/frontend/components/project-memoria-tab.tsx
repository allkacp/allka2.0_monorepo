/**
 * Aba "Memória" do projeto — wrapper fino sobre o MemoryPanel reutilizável
 * (mesmo componente usado em Company/Agência), só fixando o escopo em
 * "project". Ver memory-panel.tsx pro comportamento real.
 */
import { MemoryPanel } from "@/components/memory-panel";

interface ProjectMemoriaTabProps {
  projectId: string | number;
}

export function ProjectMemoriaTab({ projectId }: ProjectMemoriaTabProps) {
  return <MemoryPanel scopeType="project" scopeId={String(projectId)} />;
}
