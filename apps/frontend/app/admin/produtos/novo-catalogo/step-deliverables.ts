// Entregáveis de UMA etapa em RASCUNHO DA TELA (19/10): criar, editar, vincular, desvincular, excluir e ordenar só mexem numa lista local;
// o servidor só é tocado quando a etapa é salva. É sempre o MESMO registro de entregável (nunca uma cópia paralela): a etapa é a fonte do vínculo.
import { apiClient } from "@/lib/api-client";
import { deliverableIssues, fieldsOf, payloadOf, type Fields } from "./catalog2-deliverable-fields";

export type DelivState = "saved" | "new" | "edited" | "linked" | "unlinked" | "deleted";
export interface DelivItem {
  uid: string;
  /** Id e chave no servidor (só quem já existe). */
  id?: string; key?: string;
  state: DelivState;
  fields: Fields;
  /** Como está no servidor (para saber se mudou). */
  base?: Fields;
  /** O usuário escolheu "Salvar rascunho" neste entregável (ou ele já está como rascunho no servidor). */
  draft: boolean;
  serverDraft: boolean;
}

let n = 1;
const uid = () => `d${Date.now().toString(36)}${n++}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Entregáveis que já estão ligados à etapa, na ordem salva. */
export function itemsFromTask(deliverables: any[], stepId: string): DelivItem[] {
  return deliverables
    .filter((d) => d.step_id === stepId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((d) => { const f = fieldsOf(d); return { uid: uid(), id: d.id, key: d.key, state: "saved" as const, fields: f, base: f, draft: !!d.draft_incomplete, serverDraft: !!d.draft_incomplete }; });
}
/** Entregáveis da tarefa SEM etapa (podem ser vinculados a esta). */
export const unlinkedOf = (deliverables: any[]) => deliverables.filter((d) => !d.step_id);

export const newItem = (stepId: string, fields?: Partial<Fields>, draft = false): DelivItem => ({ uid: uid(), state: "new", fields: { ...fieldsOf({}), step_id: stepId, ...fields }, draft, serverDraft: false });
export function linkItem(d: any, stepId: string): DelivItem {
  const f = fieldsOf(d);
  return { uid: uid(), id: d.id, key: d.key, state: "linked", fields: { ...f, step_id: stepId }, base: f, draft: !!d.draft_incomplete, serverDraft: !!d.draft_incomplete };
}

/** Acerta saved ↔ edited conforme os campos (new/linked/unlinked/deleted ficam como estão). */
export function syncDelivStates(items: DelivItem[]): DelivItem[] {
  return items.map((i) => (i.state === "saved" || i.state === "edited") && i.base ? { ...i, state: same(i.fields, i.base) && i.draft === i.serverDraft ? "saved" as const : "edited" as const } : i);
}
/** Marcado como rascunho no servidor, mas com todos os campos obrigatórios preenchidos: não falta nada. A marca de rascunho só sai ao concluir a etapa. */
export const isStaleDraft = (i: DelivItem): boolean => !!i.draft && (i.state === "saved" || i.state === "linked" || i.state === "edited") && deliverableIssues(i.fields).length === 0;
export const activeDeliv = (items: DelivItem[]) => items.filter((i) => i.state !== "unlinked" && i.state !== "deleted");
export const hasDelivPending = (items: DelivItem[]) => items.some((i) => i.state !== "saved");

/** Mensagens para CONCLUIR a etapa, citando o entregável pelo nome. */
export function delivIssues(items: DelivItem[], declaredNone: boolean): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  const act = activeDeliv(items);
  if (declaredNone) {
    // Declarar "não tem entregáveis" e ainda ter entregável ligado seria contraditório: o usuário decide (remover o vínculo ou desmarcar).
    if (act.length) out.push({ field: "deliverables", message: `Você declarou que esta etapa não tem entregáveis, mas há ${act.length} ligado${act.length === 1 ? "" : "s"} a ela. Marque “tem entregáveis” ou remova o vínculo.` });
    return out;
  }
  for (const i of act) {
    const iss = deliverableIssues(i.fields);
    if (iss.length || (i.draft && !isStaleDraft(i))) out.push({ field: `deliverable:${i.uid}`, message: `O entregável “${i.fields.name.trim() || "(sem nome)"}” está incompleto${iss.length ? `: ${iss.map((x) => x.message.replace(/\.$/, "").toLowerCase()).join("; ")}` : " (salvo como rascunho)"}.` });
  }
  return out;
}

export interface DelivCommit { items: DelivItem[]; createdIds: string[] }

/** Nova ordem do task inteiro: mantém os entregáveis de outras etapas onde estão e reparte as "vagas" da etapa na ordem local. */
export function mergeOrder(taskOrder: string[], stepOwnedBefore: Set<string>, localOrder: string[], removed: Set<string>): string[] {
  const keepOthers = taskOrder.filter((id) => !removed.has(id));
  const slots = keepOthers.map((id, i) => (stepOwnedBefore.has(id) ? i : -1)).filter((i) => i >= 0);
  const out = keepOthers.slice();
  const mine = localOrder.filter((id) => !removed.has(id));
  slots.forEach((slot, k) => { if (mine[k]) out[slot] = mine[k]; });
  for (const id of mine.slice(slots.length)) out.push(id);
  return out;
}

/**
 * Grava os entregáveis da etapa: desvincular → excluir → vincular → alterar → criar → ordenar. `onProgress` recebe a lista a cada passo
 * (se algo falhar — ex.: exclusão recusada por referência — o que já foi gravado fica registrado e o erro sobe com a mensagem do servidor).
 */
export async function commitDelivItems(items: DelivItem[], p: { taskId: string; stepId: string; taskDeliverableIds: string[]; onProgress?: (items: DelivItem[]) => void }): Promise<DelivCommit> {
  let cur = items.slice();
  const emit = () => p.onProgress?.(cur);
  const createdIds: string[] = [];
  const removed = new Set<string>();
  for (const i of cur.filter((x) => x.state === "unlinked" && x.id)) { await apiClient.updateCatalog2Deliverable(i.id!, { step_id: null }); cur = cur.filter((x) => x.uid !== i.uid); emit(); }
  for (const i of cur.filter((x) => x.state === "deleted" && x.id)) { await apiClient.deleteCatalog2Deliverable(i.id!); removed.add(i.id!); cur = cur.filter((x) => x.uid !== i.uid); emit(); }
  for (const i of cur.filter((x) => x.state === "linked" || x.state === "edited")) {
    await apiClient.updateCatalog2Deliverable(i.id!, { ...payloadOf(i.fields), draft: i.draft });
    const saved = { ...i.fields };
    // Se o usuário trocou a etapa responsável, o entregável sai desta etapa (continua o mesmo registro, agora em outra).
    cur = saved.step_id === p.stepId ? cur.map((x) => (x.uid === i.uid ? { ...x, state: "saved" as const, fields: saved, base: saved, serverDraft: i.draft } : x)) : cur.filter((x) => x.uid !== i.uid); emit();
  }
  for (const i of cur.filter((x) => x.state === "new")) {
    const r: any = await apiClient.createCatalog2Deliverable(p.taskId, { ...payloadOf(i.fields), draft: i.draft });
    createdIds.push(r.id);
    const saved = { ...i.fields };
    cur = saved.step_id === p.stepId ? cur.map((x) => (x.uid === i.uid ? { ...x, id: r.id, key: r.key, state: "saved" as const, fields: saved, base: saved, serverDraft: i.draft } : x)) : cur.filter((x) => x.uid !== i.uid); emit();
  }
  // ordem: só se a ordem local difere da salva (ou entrou algo novo/vinculado)
  // Ordem: só os que continuam nesta etapa disputam as "vagas"; quem saiu (desvinculado ou movido) fica onde estava na tarefa.
  const localOrder = cur.map((x) => x.id!).filter(Boolean);
  const stay = new Set(localOrder);
  const base = [...p.taskDeliverableIds.filter((id) => !removed.has(id)), ...createdIds.filter((id) => !p.taskDeliverableIds.includes(id))];
  if (!same(base.filter((id) => stay.has(id)), localOrder)) {
    const order = mergeOrder(base, stay, localOrder, removed);
    if (order.length === base.length && new Set(order).size === order.length) await apiClient.reorderCatalog2Deliverables(p.taskId, order);
  }
  return { items: cur, createdIds };
}
