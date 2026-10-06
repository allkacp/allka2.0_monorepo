"use client";

// Peças compartilhadas do módulo "Conexões e acessos necessários": formulário de conexão (cliente), estado e textos.
// NUNCA mostra nem guarda senha em campo comum: o único campo sensível é o "segredo protegido", enviado direto ao cofre e jamais devolvido.
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const NO_PASSWORD_MESSAGE = "Você não precisa compartilhar suas senhas. Utilize uma conexão oficial, convite ou autorização segura.";

export const STATE_TONE: Record<string, string> = {
  valid: "bg-emerald-100 text-emerald-800", dispensed: "bg-slate-100 text-slate-600", awaiting_validation: "bg-sky-100 text-sky-800", submitted: "bg-sky-100 text-sky-800",
  awaiting_submission: "bg-amber-100 text-amber-800", not_requested: "bg-slate-100 text-slate-500", incomplete: "bg-orange-100 text-orange-800", invalid: "bg-rose-100 text-rose-800",
  needs_correction: "bg-orange-100 text-orange-800", expired: "bg-rose-100 text-rose-800", removed: "bg-rose-100 text-rose-800", revoked: "bg-rose-100 text-rose-800",
};
export function StateBadge({ status, label }: { status: string; label?: string }) {
  return <span data-testid="conn-status" className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[status] ?? "bg-slate-100 text-slate-600"}`}>{label ?? status}</span>;
}

export const METHOD_LABEL: Record<string, string> = {
  oauth: "OAuth / integração oficial", account_link: "Vinculação de conta", manager_account: "Conta gerenciadora", partner_business: "Empresa parceira",
  user_invite: "Convite de usuário corporativo da Allka", temporary_user: "Usuário temporário (permissão mínima)", revocable_token: "Token revogável", app_password: "Senha de aplicação",
  api_key: "Chave de API / integração por API", secure_browser: "Navegador seguro da Allka (login uma vez, uso por tempo autorizado)", plugin: "Integração por plugin", protected_file: "Arquivo protegido", manual_instruction: "Instrução manual", other: "Outro método",
};
export const SCOPE_LABEL: Record<string, string> = { task: "Somente nesta tarefa", selected_tasks: "Em tarefas selecionadas", project: "Em todo este projeto" };
const SECRET_METHODS = ["revocable_token", "api_key", "app_password", "protected_file", "temporary_user"];
export interface ConnFieldDef { key: string; label: string; type: "text" | "secret" | "url" | "email" | "number" | "textarea"; required: boolean; help?: string | null }
const LBL = "mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";
const SEL = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900";

/** Formulário "Conectar agora": escolhe o método (mais seguro primeiro), informa só metadados e o escopo de uso. */
export function ConnectForm({
  allowedMethods, permissionLevels, defaultPermission, defaultScope = "project", tasks, submitLabel = "Conectar agora", onSubmit, onCancel, fields = [],
}: {
  fields?: ConnFieldDef[];
  allowedMethods: string[]; permissionLevels: { key: string; label: string }[]; defaultPermission?: string; defaultScope?: string;
  tasks?: { id: string; title: string }[]; submitLabel?: string; onSubmit: (body: Record<string, any>) => Promise<void>; onCancel?: () => void;
}) {
  const [method, setMethod] = useState(allowedMethods[0] ?? "manual_instruction");
  const [label, setLabel] = useState("");
  const [account, setAccount] = useState("");
  const [externalId, setExternalId] = useState("");
  const [permission, setPermission] = useState(defaultPermission ?? permissionLevels[0]?.key ?? "");
  const [scope, setScope] = useState(defaultScope);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsSecret = SECRET_METHODS.includes(method);
  const needsTasks = scope !== "project";
  const taskOk = !needsTasks || (scope === "task" ? taskIds.length === 1 : taskIds.length >= 1);
  const fieldsOk = fields.every((f) => !f.required || (vals[f.key] ?? "").trim() !== "");
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await onSubmit({ method, label: label.trim() || undefined, account_label: account.trim() || null, external_id: externalId.trim() || null, permission_level: permission || null, scope, ...(needsTasks ? { task_ids: taskIds } : {}), ...(fields.length ? { fields: fields.map((f) => ({ key: f.key, value: (vals[f.key] ?? "").trim() })).filter((x) => x.value) } : {}), ...(needsSecret && secret ? { secret_value: secret } : {}) });
      setSecret("");
    } catch (e: any) { setErr(e?.message ?? "Não foi possível conectar."); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2.5 rounded-lg border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900 dark:bg-violet-950/20" data-testid="connect-form">
      <p className="flex items-start gap-1.5 text-xs text-emerald-800 dark:text-emerald-300"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{NO_PASSWORD_MESSAGE}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className={LBL}>Como você prefere conectar?</label>
          <select aria-label="Forma de conexão" className={SEL} value={method} onChange={(e) => setMethod(e.target.value)}>{allowedMethods.map((m) => <option key={m} value={m}>{METHOD_LABEL[m] ?? m}</option>)}</select>
        </div>
        <div><label className={LBL}>Nível de permissão</label>
          <select aria-label="Nível de permissão" className={SEL} value={permission} onChange={(e) => setPermission(e.target.value)}>{permissionLevels.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}</select>
        </div>
        <div><label className={LBL}>Nome da conexão</label><Input aria-label="Nome da conexão" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: CRM da empresa" /></div>
        <div><label className={LBL}>Conta/usuário (identificação, não é senha)</label><Input aria-label="Conta ou usuário" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex.: e-mail da conta ou nome do usuário" /></div>
        <div className="sm:col-span-2"><label className={LBL}>ID, endereço ou identificador da conta</label><Input aria-label="Identificador da conta" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="Ex.: ID da conta de anúncios, URL do site" /></div>
      </div>
      {fields.length > 0 && (
        <div className="space-y-2 rounded-md border border-violet-200 bg-white p-2 dark:border-violet-900 dark:bg-slate-900" data-testid="connect-fields">
          <p className="text-[11px] font-semibold text-violet-800 dark:text-violet-200">O que precisamos para este acesso</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className={`${LBL} flex items-center gap-1`}>{f.type === "secret" ? <KeyRound className="h-3 w-3" /> : null}{f.label}{f.required ? <span className="text-red-600"> *</span> : null}</label>
                {f.type === "textarea"
                  ? <textarea aria-label={f.label} rows={3} className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                  : <Input aria-label={f.label} type={f.type === "secret" ? "password" : f.type === "number" ? "number" : f.type === "email" ? "email" : "text"} autoComplete="off" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} placeholder={f.type === "url" ? "https://…" : f.type === "secret" ? "Fica cifrado em cofre" : ""} />}
                {f.help && <p className="mt-0.5 text-[11px] text-slate-500">{f.help}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {method === "secure_browser" && (
        <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-900" data-testid="secure-browser-note">Você faz o login <strong>uma única vez</strong> no navegador seguro da Allka (a sua senha não passa por nós) e autoriza, por tempo determinado, quem pode usar. Você pode revogar a qualquer momento e todo uso fica registrado. Configure em <strong>Navegador seguro</strong> no menu.</p>
      )}
      {needsSecret && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/20">
          <label className={`${LBL} flex items-center gap-1`}><KeyRound className="h-3 w-3" />Segredo protegido (token ou senha de aplicação — revogável)</label>
          <Input aria-label="Segredo protegido" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Fica cifrado em cofre e nunca é mostrado novamente" />
          <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">Use apenas uma credencial separada da sua senha principal e que você possa revogar quando quiser. Nunca digite a senha principal.</p>
        </div>
      )}
      <div>
        <label className={LBL}>Onde esta conexão pode ser usada</label>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(SCOPE_LABEL).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5"><input type="radio" name="grant-scope" checked={scope === k} onChange={() => { setScope(k); setTaskIds([]); }} />{v}</label>
          ))}
        </div>
        {needsTasks && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(tasks ?? []).map((t) => (
              <label key={t.id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[11px]">
                <input type={scope === "task" ? "radio" : "checkbox"} name="grant-task" checked={taskIds.includes(t.id)} onChange={(e) => setTaskIds(scope === "task" ? [t.id] : e.target.checked ? [...taskIds, t.id] : taskIds.filter((x) => x !== t.id))} />{t.title}
              </label>
            ))}
            {(tasks ?? []).length === 0 && <span className="text-[11px] text-slate-500">As tarefas ainda não existem; escolha "Em todo este projeto" ou faça depois da contratação.</span>}
          </div>
        )}
        <p className="mt-1 text-[11px] text-slate-500">Outro projeto sempre exige uma nova autorização sua. Você pode reduzir ou revogar o uso a qualquer momento.</p>
      </div>
      {err && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">{err}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy || !taskOk || !fieldsOk} onClick={() => void submit()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{submitLabel}</Button>
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </div>
  );
}

export { apiClient };
