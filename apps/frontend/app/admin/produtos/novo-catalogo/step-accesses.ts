// Acessos de UMA etapa em RASCUNHO DA TELA (18/10): adicionar, editar e remover acessos só muda esta lista local; o servidor só é tocado quando a
// etapa é salva ("Salvar rascunho da etapa" ou "Concluir e salvar etapa"). Cancelar descarta tudo sem deixar acesso parcial gravado.
// Este arquivo é puro (sem tela): modelo dos itens, avisos de cada acesso e a gravação (commit) na ordem certa.
import { apiClient } from "@/lib/api-client";
import { conditionFromServer, emptyCondition, type AccessCondition } from "./access-condition";
import { emptyForm, formIssues, fromReq, toBody, type Form } from "./catalog2-connections-ui";
import { accessPatch } from "./step-access-picker";

export type ItemState = "saved" | "new" | "edited" | "removed";
export interface AccessItem {
  uid: string;
  /** Id e chave no servidor (só quem já foi salvo alguma vez). */
  reqId?: string; key?: string;
  state: ItemState;
  form: Form;
  /** Como está salvo no servidor (para saber se mudou). */
  base?: Form;
  typeName: string; typeObj: any;
  /** Só para state = removed: "all" (tira de todas as etapas) ou "tarefa::etapa" (passa para outra etapa que usa). */
  decision?: string;
}
export interface StepScope { task: { key: string; name: string }; step: { key: string; name: string } }

let n = 1;
const uid = () => `a${Date.now().toString(36)}${n++}`;
const sameForm = (a: Form, b: Form) => JSON.stringify(a) === JSON.stringify(b);

export const accessName = (i: AccessItem) => (i.form as any).label?.trim?.() || i.typeName;

/** Acessos que a etapa já tem salvos (só os próprios, cadastrados nela). */
export function itemsFromRequirements(reqs: any[]): AccessItem[] {
  return reqs.map((r) => {
    const form = fromReq(r);
    return { uid: uid(), reqId: r.id, key: r.key, state: "saved" as const, form, base: form, typeName: r.label?.trim() || r.connection_type?.name || r.key, typeObj: r.connection_type ?? {} };
  });
}

/** Item novo, só na tela, com o padrão do tipo de acesso (primeiro método e permissão permitidos). */
export function newItemFromType(type: any, scope: StepScope): AccessItem {
  const form: Form = {
    ...emptyForm(), connection_type_id: type.id, method: type.allowed_methods?.[0] ?? "", permission_level: type.permission_levels?.[0]?.key ?? "",
    when_needed: "before_step", when_task_key: scope.task.key, when_step_key: scope.step.key,
    dependents: [{ task_key: scope.task.key, step_key: scope.step.key, kind: "start" }],
  };
  return { uid: uid(), state: "new", form, typeName: type.name, typeObj: type };
}

/** Acerta o estado de cada item conforme o formulário (saved ↔ edited). Removido e novo ficam como estão. */
export function syncStates(items: AccessItem[], concluding = false): AccessItem[] {
  return items.map((i) => {
    if (i.state === "new" || i.state === "removed" || !i.base) return i;
    const changed = !sameForm(i.form, i.base) || (concluding && !!i.base.draft_incomplete);
    return { ...i, state: changed ? "edited" : "saved" };
  });
}

export const activeItems = (items: AccessItem[]) => items.filter((i) => i.state !== "removed");
export const hasPending = (items: AccessItem[]) => items.some((i) => i.state === "new" || i.state === "removed" || (i.state === "edited" && !!i.base && !sameForm(i.form, i.base)));
/** Quantos acessos estão realmente configurados (completos). Acesso incompleto NUNCA entra na contagem. */
export const configuredCount = (items: AccessItem[]) => activeItems(items).filter((i) => formIssues(i.form).length === 0).length;
export const incompleteCount = (items: AccessItem[]) => activeItems(items).filter((i) => formIssues(i.form).length > 0).length;

/** Mensagens para CONCLUIR, identificando o acesso pelo nome. */
/** `borrowed` = acessos de OUTRAS etapas que esta etapa escolheu usar (também contam como acesso da etapa). */
export function accessIssues(items: AccessItem[], needsAccess: boolean, borrowed = 0): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  const act = activeItems(items);
  if (needsAccess && act.length === 0 && borrowed === 0) out.push({ field: "accesses", message: "A etapa está marcada como “precisa de acesso”, mas nenhum acesso foi adicionado. Adicione um acesso ou desligue essa opção." });
  for (const i of act) {
    const iss = formIssues(i.form);
    if (iss.length) out.push({ field: `access:${i.uid}`, message: `O acesso “${accessName(i)}” está incompleto: ${iss.join("; ")}.` });
  }
  return out;
}

/** Outras etapas que USAM o acesso (marcaram "usar nesta etapa"). */
export function otherUsers(version: any, key: string, myTask: string, myStep: string): { task: any; step: any }[] {
  const all: { task: any; step: any }[] = (version?.tasks ?? []).flatMap((t: any) => (t.steps ?? []).map((s: any) => ({ task: t, step: s })));
  return all.filter(({ task, step }) => !(task.key === myTask && step.key === myStep) && step.ops?.access_scope === "some" && Array.isArray(step.ops.access_keys) && step.ops.access_keys.includes(key));
}

/** Corpo guardado em "acessos guardados" (parked) → formulário para voltar à lista como item novo. */
export function formFromBody(b: any): Form {
  return {
    ...emptyForm(),
    key: undefined,
    connection_type_id: b.connection_type_id, when_needed: b.when_needed, when_task_key: b.when_task_key ?? "", when_step_key: b.when_step_key ?? "", condition_text: b.condition_text ?? "",
    obligation: b.obligation, method: b.method, permission_level: b.permission_level, pending_behavior: b.pending_behavior,
    reason: b.reason ?? "", instructions: b.instructions ?? "", default_grant_scope: b.default_grant_scope, validation_mode: b.validation_mode, asset_rule: b.asset_rule,
    revalidate_days: b.revalidate_days != null ? String(b.revalidate_days) : "", light_check: !!b.light_check,
    reminder_interval_hours: b.reminder_interval_hours != null ? String(b.reminder_interval_hours) : "", reminder_limit: b.reminder_limit != null ? String(b.reminder_limit) : "",
    escalate_after_reminders: b.escalate_after_reminders != null ? String(b.escalate_after_reminders) : "", visible_to_client: b.visible_to_client !== false, shared_with_steps: !!b.shared_with_steps,
    dependents: (b.dependents ?? []).map((d: any) => ({ task_key: d.task_key, step_key: d.step_key ?? "", kind: d.kind })),
    condition: b.triggers?.length ? conditionFromServer({ mode: b.activation_mode, triggers: b.triggers }) : emptyCondition() as AccessCondition,
    original_obligation: b.obligation,
  };
}

export interface CommitResult { items: AccessItem[]; ownKeys: string[]; parked: { reqs: { key: string; body: any }[]; keys: string[] } | null }

/**
 * Grava os acessos da etapa no servidor, na ordem: remoções (ou passagem para outra etapa) → novos/alterados.
 * `onProgress` recebe a lista atualizada a cada passo (se algo falhar no meio, a tela não perde o que já foi gravado).
 * `turnedOff`: a etapa deixou de precisar de acesso → o que sai fica GUARDADO (parked) para voltar quando ligar de novo.
 */
export async function commitAccessItems(items: AccessItem[], p: {
  version: any; scope: StepScope; draft: boolean; turnedOff: boolean; borrowedKeys: string[];
  onProgress?: (items: AccessItem[]) => void;
}): Promise<CommitResult> {
  let cur = items.slice();
  const emit = () => p.onProgress?.(cur);
  const parked: { key: string; body: any }[] = [];
  const toSave = cur.filter((i) => i.state === "new" || i.state === "edited");
  if (toSave.length && !p.version.requires_connections) await apiClient.setVersionConnectionsModule(p.version.id, true);
  // 1. remoções
  for (const i of cur.filter((x) => x.state === "removed" && x.reqId)) {
    const d = i.decision ?? "all";
    if (d !== "all") {
      const [tk, sk] = d.split("::");
      await apiClient.saveConnectionRequirement(p.version.id, i.key!, toBody({ ...(i.base ?? i.form), when_needed: "before_step", when_task_key: tk, when_step_key: sk, dependents: [{ task_key: tk, step_key: sk, kind: "start" }] }));
    } else {
      if (p.turnedOff) parked.push({ key: i.key!, body: toBody(i.base ?? i.form) });
      await apiClient.deleteConnectionRequirement(i.reqId!);
    }
    cur = cur.filter((x) => x.uid !== i.uid); emit();
  }
  cur = cur.filter((x) => x.state !== "removed");
  // 2. novos e alterados
  for (const i of cur.filter((x) => x.state === "new" || x.state === "edited")) {
    const key = i.key ?? `${i.typeObj?.key ?? "conexao"}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const atStep: Form = {
      ...i.form, key, when_needed: "before_step", when_task_key: p.scope.task.key, when_step_key: p.scope.step.key,
      dependents: [{ task_key: p.scope.task.key, step_key: p.scope.step.key, kind: "start" }],
    };
    const r: any = await apiClient.saveConnectionRequirement(p.version.id, key, toBody(atStep, { draft: p.draft, requireComplete: !p.draft }));
    const saved: Form = { ...atStep, draft_incomplete: !!r?.draft_incomplete, original_obligation: atStep.obligation };
    cur = cur.map((x) => (x.uid === i.uid ? { ...x, reqId: r?.id ?? x.reqId, key: String(r?.key ?? key), state: "saved" as const, form: saved, base: saved } : x));
    emit();
  }
  const ownKeys = cur.map((i) => i.key!).filter(Boolean);
  const borrowed = p.borrowedKeys.filter((k) => !ownKeys.includes(k));
  return { items: cur, ownKeys, parked: p.turnedOff && (parked.length || borrowed.length) ? { reqs: parked, keys: borrowed } : null };
}

/** ops da etapa depois de gravar os acessos: usa os próprios + os de outras etapas marcados; "todos" continua "todos". */
export function opsAfterAccesses(ops: Record<string, any> | undefined, c: { ownKeys: string[]; borrowedKeys: string[]; turnedOff: boolean; parked: CommitResult["parked"] }): Record<string, any> {
  const next: Record<string, any> = { ...(ops ?? {}) };
  if (c.turnedOff) {
    delete next.access_scope; delete next.access_keys;
    if (c.parked) next.access_parked = c.parked; else delete next.access_parked;
    return next;
  }
  if (next.access_scope === "all") return next;
  const keys = Array.from(new Set([...c.ownKeys, ...c.borrowedKeys]));
  if (keys.length) Object.assign(next, accessPatch("some", keys));
  return next;
}
