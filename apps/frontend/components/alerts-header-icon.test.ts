import { describe, expect, it } from "vitest";
import { systemAlertLink, isSafeInternalPath } from "@/components/alerts-header-icon";

// Regression tests for a real bug: this function used to hardcode
// "/agency/tarefas" for any project_task alert regardless of the logged-in
// user's actual account_type. Navigating a non-agency user there flipped
// AccountTypeProvider's inferred account_type to "agencias" (it infers from
// the URL, see contexts/account-type-context.tsx), which in turn made
// AlertsHeaderIcon switch to the agency-only alerts endpoint — so clicking
// one alert appeared to make every other alert "disappear". Never hardcode
// a single account_type's route here again.
describe("systemAlertLink", () => {
  it("routes a project_task alert to each account type's OWN task list, never hardcoded to agency", () => {
    expect(systemAlertLink("project_task", null, "empresas")).toBe("/company/tarefas");
    expect(systemAlertLink("project_task", null, "nomades")).toBe("/nomades/minhastarefas");
    expect(systemAlertLink("project_task", null, "admin")).toBe("/admin/tarefas");
    expect(systemAlertLink("project_task", null, "agencias")).toBe("/agency/tarefas");
    expect(systemAlertLink("project_task", null, "lider")).toBe("/leader/tarefas");
  });

  it("deep-links to the specific task for account types with a task-detail drawer wired to a URL", () => {
    expect(systemAlertLink("project_task", "task-123", "agencias")).toBe("/agency/tarefas/task-123");
    expect(systemAlertLink("project_task", "task-123", "admin")).toBe("/admin/tarefas/task-123");
    expect(systemAlertLink("project_task", "task-123", "lider")).toBe("/leader/tarefas?tarefaId=task-123");
  });

  it("falls back to the plain list (no id) for account types without a task-detail deep-link yet", () => {
    expect(systemAlertLink("project_task", "task-123", "empresas")).toBe("/company/tarefas");
    expect(systemAlertLink("project_task", "task-123", "nomades")).toBe("/nomades/minhastarefas");
  });

  it("routes a project alert to the account's own project list, deep-linking only where supported", () => {
    expect(systemAlertLink("project", "proj-1", "agencias")).toBe("/agency/projetos/proj-1");
    expect(systemAlertLink("project", "proj-1", "admin")).toBe("/admin/tarefas");
    expect(systemAlertLink("project", null, "empresas")).toBe("/company/tarefas");
  });

  // Reparo "Ver alerta" (ata 2026-08): "/admin/alertas" como resposta
  // genérica pra "não sei o destino" era o bug real reportado — essa rota
  // só existe dentro do portal admin, então pra qualquer outro account_type
  // o botão "não abria lugar nenhum". Agora null: sem destino conhecido,
  // sem botão funcional (nunca abre em branco, nunca navega pra undefined).
  it("devolve null (sem destino) pra um entity_type desconhecido — nunca /admin/alertas", () => {
    expect(systemAlertLink("something_else", "x", "admin")).toBeNull();
    expect(systemAlertLink("something_else", "x", "empresas")).toBeNull();
  });

  it("Avulso sem referência (entity_type null) devolve null — nunca um destino inventado", () => {
    expect(systemAlertLink(null, null, "admin")).toBeNull();
    expect(systemAlertLink(null, null, "empresas")).toBeNull();
  });

  it("ocorrência de Alerta Programado (entity_type 'alert_schedule') devolve null — nunca teve tela própria", () => {
    expect(systemAlertLink("alert_schedule", "schedule-1", "admin")).toBeNull();
    expect(systemAlertLink("alert_schedule", "schedule-1", "empresas")).toBeNull();
  });

  it("etapa (project_task_stage) abre a TAREFA-mãe via entity_parent_id, nunca inventa página de etapa", () => {
    expect(systemAlertLink("project_task_stage", "stage-1", "agencias", "task-parent-1")).toBe("/agency/tarefas/task-parent-1");
    expect(systemAlertLink("project_task_stage", "stage-1", "admin", "task-parent-1")).toBe("/admin/tarefas/task-parent-1");
    expect(systemAlertLink("project_task_stage", "stage-1", "lider", "task-parent-1")).toBe("/leader/tarefas?tarefaId=task-parent-1");
  });

  it("etapa sem entity_parent_id conhecido (ocorrência anterior ao reparo) cai na lista geral — nunca em branco", () => {
    expect(systemAlertLink("project_task_stage", "stage-1", "empresas", null)).toBe("/company/tarefas");
    expect(systemAlertLink("project_task_stage", "stage-1", "admin", undefined)).toBe("/admin/tarefas");
  });

  it("never returns a route starting with /agency for a non-agency account_type", () => {
    const accountTypes = ["admin", "empresas", "nomades", "lider"] as const;
    for (const accountType of accountTypes) {
      for (const entity_id of [null, "some-id"]) {
        expect(systemAlertLink("project_task", entity_id, accountType)).not.toMatch(/^\/agency/);
        expect(systemAlertLink("project", entity_id, accountType)).not.toMatch(/^\/agency/);
      }
    }
  });
});

describe("isSafeInternalPath", () => {
  it("aceita caminho interno relativo", () => {
    expect(isSafeInternalPath("/admin/tarefas/123")).toBe(true);
    expect(isSafeInternalPath("/leader/tarefas?tarefaId=123")).toBe(true);
  });

  it("rejeita javascript:, data:, protocolo desconhecido e URL absoluta/protocol-relative", () => {
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalPath("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeInternalPath("https://evil.example.com")).toBe(false);
    expect(isSafeInternalPath("//evil.example.com")).toBe(false);
    expect(isSafeInternalPath("mailto:x@example.com")).toBe(false);
  });

  it("rejeita caminho que não começa com /", () => {
    expect(isSafeInternalPath("admin/tarefas")).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
  });
});
