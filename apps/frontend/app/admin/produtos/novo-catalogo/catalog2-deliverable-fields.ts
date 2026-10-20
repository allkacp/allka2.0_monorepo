// Campos do entregável (modelo puro, sem tela): usado pelo resumo da tarefa, pelo bloco "Entregáveis desta etapa" e pelo modal.
// Um entregável é SEMPRE o mesmo registro (catalog2_task_deliverables); a etapa é a fonte do vínculo (step_id) e o resumo da tarefa só reflete.
import type { Visibility } from "./catalog2-ops-ui";

export const DELIVERABLE_TYPES: [string, string][] = [["arquivo", "Arquivo (link do arquivo)"], ["link", "Link"], ["texto", "Texto"], ["registro_sistema", "Registro do sistema"], ["outro", "Outro"]];
export const DELIVERABLE_RESPONSIBLES: [string, string][] = [["executor", "Executor"], ["lider", "Líder"], ["agencia", "Agência"], ["cliente", "Cliente"], ["sistema", "Sistema"]];
export const DELIVERABLE_MOMENTS: [string, string][] = [["", "Sem momento definido"], ["step_end", "Ao concluir a etapa"], ["cycle_end", "No fim do ciclo"], ["before_approval", "Antes da aprovação do cliente"], ["on_request", "Sob demanda"]];
export const DELIVERABLE_CYCLE_SCOPES: [string, string][] = [["every_cycle", "Todo ciclo"], ["first_execution", "Só na primeira execução"]];
export const FILE_PREFIX = "file:";
export const labelOf = (list: [string, string][], key: string) => list.find(([k]) => k === key)?.[1] ?? key;
export const shortType = (t: string) => labelOf(DELIVERABLE_TYPES, t).replace(/ \(.*\)$/, "");

export const fieldsOf = (d: any) => ({
  name: d.name ?? "", description: d.description ?? "", type: d.type ?? "arquivo", format: d.format ?? "", responsible: d.responsible ?? "executor", step_id: d.step_id ?? "",
  delivery_moment: d.delivery_moment ?? "", is_required: d.is_required ?? true, requires_approval: d.requires_approval ?? true, evidence_required: !!d.evidence_required,
  requires_qualification: !!d.requires_qualification, cycle_scope: d.cycle_scope ?? "every_cycle", is_conditional: !!d.is_conditional,
  condition_text: (() => { try { return d.condition_json ? String(JSON.parse(d.condition_json).text ?? "") : ""; } catch { return ""; } })(),
  template_url: d.template_url ?? "", template_name: d.template_name ?? "", visibility: (d.visibility ?? "client") as Visibility,
});
export type Fields = ReturnType<typeof fieldsOf>;

export const payloadOf = (v: Fields) => ({
  name: v.name.trim(), description: v.description.trim() || null, type: v.type, format: v.format.trim() || null, responsible: v.responsible, step_id: v.step_id || null,
  delivery_moment: v.delivery_moment || null, is_required: v.is_required, requires_approval: v.requires_approval, evidence_required: v.evidence_required,
  requires_qualification: v.requires_qualification, cycle_scope: v.cycle_scope, is_conditional: v.is_conditional,
  condition_json: v.is_conditional && v.condition_text.trim() ? JSON.stringify({ text: v.condition_text.trim() }) : null,
  template_url: v.template_url.trim() || null, template_name: v.template_name.trim() || null, visibility: v.visibility,
});

/** O que falta para o entregável estar COMPLETO (rascunho nunca consulta isto). */
export interface DeliverableIssue { section: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; field: string; message: string }
export function deliverableIssues(f: Fields): DeliverableIssue[] {
  const out: DeliverableIssue[] = [];
  if (!f.name.trim()) out.push({ section: 1, field: "name", message: "Informe o nome do entregável." });
  if (!f.description.trim()) out.push({ section: 1, field: "description", message: "Descreva o que é o entregável e como ele deve vir." });
  if (f.is_conditional && !f.condition_text.trim()) out.push({ section: 6, field: "condition", message: "Escreva a condição em que este entregável passa a valer (ou desmarque “condicional”)." });
  return out;
}

/** Situação para o resumo: completo quando não falta nada; `draft` = salvo como rascunho no servidor. */
export function deliverableSituation(d: any): { complete: boolean; missing: string[]; draft: boolean } {
  const issues = deliverableIssues(fieldsOf(d));
  const labels: Record<string, string> = { name: "nome", description: "descrição", condition: "condição" };
  return { complete: issues.length === 0 && !d.draft_incomplete, missing: issues.map((i) => labels[i.field] ?? i.field), draft: !!d.draft_incomplete };
}

/** Frase curta do entregável para o cartão da etapa: "Plano… — aprovação do cliente — só 1ª execução". */
export function deliverableBrief(d: any): string {
  const f = fieldsOf(d);
  const parts = [f.name || "(sem nome)"];
  if (f.requires_approval) parts.push("aprovação do cliente");
  if (f.cycle_scope === "first_execution") parts.push("só 1ª execução"); else parts.push("todo ciclo");
  return parts.join(" — ");
}
