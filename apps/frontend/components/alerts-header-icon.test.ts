import { describe, expect, it } from "vitest";
import { systemAlertLink } from "@/components/alerts-header-icon";

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

  it("falls back to /admin/alertas for an unknown entity_type", () => {
    expect(systemAlertLink("something_else", "x", "admin")).toBe("/admin/alertas");
    expect(systemAlertLink(null, null, "admin")).toBe("/admin/alertas");
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
