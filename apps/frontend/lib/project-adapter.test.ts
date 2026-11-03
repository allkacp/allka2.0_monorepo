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

describe("adaptApiProject — Admin responsável (ata 2026-08, reparo 'editar projeto já existente')", () => {
  it("projeto sem Admin responsável: campos ficam nulos/false, nunca inventados", () => {
    const project = adaptApiProject({
      id: "p5",
      title: "Projeto sem admin",
      status: "in-progress",
      admin_responsible_user_id: null,
      admin_responsible: null,
    });
    expect(project.adminResponsibleId).toBeNull();
    expect(project.adminResponsibleName).toBeNull();
    expect(project.adminResponsibleEmail).toBeNull();
    expect(project.adminResponsibleIsMaster).toBe(false);
  });

  it("projeto com Admin responsável (Master): mapeia nome/e-mail/badge a partir do include do backend", () => {
    const project = adaptApiProject({
      id: "p6",
      title: "Projeto com admin",
      status: "in-progress",
      admin_responsible_user_id: "u9",
      admin_responsible: { id: "u9", name: "Admin Master Teste", email: "master@allka.test", admin_profile: { is_master: true } },
    });
    expect(project.adminResponsibleId).toBe("u9");
    expect(project.adminResponsibleName).toBe("Admin Master Teste");
    expect(project.adminResponsibleEmail).toBe("master@allka.test");
    expect(project.adminResponsibleIsMaster).toBe(true);
  });

  it("Admin comum (não Master): adminResponsibleIsMaster fica false", () => {
    const project = adaptApiProject({
      id: "p7",
      title: "Projeto com admin comum",
      status: "in-progress",
      admin_responsible_user_id: "u10",
      admin_responsible: { id: "u10", name: "Admin Comum Teste", email: "comum@allka.test", admin_profile: { is_master: false } },
    });
    expect(project.adminResponsibleIsMaster).toBe(false);
  });
});

// 01/11 (teste do Codex no proj_956): a lista mostrava "Company" para a Lamego Academy
// porque, sem company_type gravado, o adaptador caía num "company" fixo. A categoria
// agora vem do vínculo real do projeto; Partner é status da agência, não outra categoria.
describe("adaptApiProject — categoria da conta (coluna Empresa)", () => {
  it("projeto de agência sem company_type gravado: Agency (nunca Company por padrão)", () => {
    const p = adaptApiProject({ id: "a1", title: "Pedido", status: "in-progress", agency: "Lamego Academy", agency_id: "ag1", company_id: null, company_type: null });
    expect(p.companyType).toBe("agency");
    expect(p.companyIsPartner).toBe(false);
  });
  it("agência com perfil Partner ativo: companyIsPartner true", () => {
    const p = adaptApiProject({ id: "a2", title: "Pedido", status: "in-progress", agency_id: "ag1", agency_owner: { id: "ag1", name: "Lamego Academy", partner_profile: { status: "active" } } });
    expect(p.companyType).toBe("agency");
    expect(p.companyIsPartner).toBe(true);
  });
  it("Partner apenas convidado não conta como Partner", () => {
    const p = adaptApiProject({ id: "a3", title: "Pedido", status: "in-progress", agency_id: "ag1", agency_owner: { id: "ag1", name: "X", partner_profile: { status: "invited" } } });
    expect(p.companyIsPartner).toBe(false);
  });
  it("projeto de empresa (novo ou legado) continua Company; company_type gravado tem prioridade", () => {
    expect(adaptApiProject({ id: "c1", title: "P", status: "draft", company_id: "co1" }).companyType).toBe("company");
    expect(adaptApiProject({ id: "c2", title: "P", status: "draft", client_id: "co2" }).companyType).toBe("company");
    expect(adaptApiProject({ id: "c3", title: "P", status: "draft", agency_id: "ag1", company_type: "nomad" }).companyType).toBe("nomad");
  });
  it("sem nenhum vínculo: categoria vazia (sem selo), em vez de inventar Company", () => {
    expect(adaptApiProject({ id: "x1", title: "P", status: "draft" }).companyType).toBe("");
  });
});
