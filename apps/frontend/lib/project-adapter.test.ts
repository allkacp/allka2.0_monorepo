import { describe, expect, it } from "vitest";
import { adaptApiProject } from "@/lib/project-adapter";

// Lote "Arquivar Projetos" (ata 2026-08) — cobre só o mapeamento novo
// (archived_at/archive_reason/archived_by → isArchived/archivedAtDate/
// archiveReason/archivedByName). admin/projetos/page.tsx não monta em
// jsdom (loop pré-existente do @radix-ui/react-compose-refs, já
// documentado em admin/usuarios/page.test.tsx e
// features/planner/planner-board.tsx) — este arquivo pura-função é o jeito
// de cobrir a lógica de adaptação sem depender da página inteira.

describe("adaptApiProject — arquivamento", () => {
  it("projeto nunca arquivado: isArchived false e campos de arquivamento nulos", () => {
    const project = adaptApiProject({
      id: "p1",
      title: "Projeto Ativo",
      status: "in-progress",
      archived_at: null,
      archive_reason: null,
      archived_by: null,
    });
    expect(project.isArchived).toBe(false);
    expect(project.archivedAt).toBeNull();
    expect(project.archivedAtDate).toBe("");
    expect(project.archiveReason).toBeNull();
    expect(project.archivedByName).toBeNull();
  });

  it("projeto arquivado: isArchived true e motivo/data/responsável mapeados", () => {
    const project = adaptApiProject({
      id: "p2",
      title: "Projeto Arquivado",
      status: "in-progress",
      archived_at: "2026-08-25T10:00:00.000Z",
      archive_reason: "Perda do projeto — cliente cancelou o contrato",
      archived_by: { id: "u1", name: "Admin Teste" },
    });
    expect(project.isArchived).toBe(true);
    expect(project.archivedAt).toBe("2026-08-25T10:00:00.000Z");
    expect(project.archivedAtDate).toBe("25/08/2026");
    expect(project.archiveReason).toBe("Perda do projeto — cliente cancelou o contrato");
    expect(project.archivedByName).toBe("Admin Teste");
  });

  it("status original (ex.: in-progress) é preservado mesmo depois de arquivado — não é sobrescrito por 'archived'", () => {
    const project = adaptApiProject({
      id: "p3",
      title: "Projeto",
      status: "in-progress",
      archived_at: "2026-08-25T10:00:00.000Z",
    });
    expect(project.status).toBe("in-progress");
  });

  it("campo archived_by ausente (sem include) não quebra — archivedByName fica null", () => {
    const project = adaptApiProject({
      id: "p4",
      title: "Projeto",
      status: "cancelled",
      archived_at: "2026-08-25T10:00:00.000Z",
      archive_reason: "Motivo qualquer",
    });
    expect(project.archivedByName).toBeNull();
  });
});
