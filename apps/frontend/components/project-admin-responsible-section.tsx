/**
 * ProjectAdminResponsibleSection — ata 2026-08, reparo "editar Admin
 * responsável de projeto já existente".
 *
 * Seção FUNCIONAL e ISOLADA dentro da tela de gestão de um projeto real —
 * deliberadamente separada da aba "Dados do Projeto" (que é decorativa: seu
 * botão "Salvar" só simula um delay e nunca chama a API, descoberta
 * registrada no encerramento deste lote). Tem seu próprio botão "Salvar
 * Admin responsável", loading e mensagens de sucesso/erro — nunca depende
 * do salvamento geral da aba.
 *
 * Chama PUT /api/projects/:id enviando só `{ admin_responsible_user_id }`
 * (reaproveitado do backend, sem rota nova — auditado como seguro pra
 * atualização parcial: ver comentário em routes/projects.ts). Em erro, a
 * seleção anterior é preservada (nunca aplica otimisticamente antes da
 * resposta do servidor).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/api-client";
import { useAccountType } from "@/contexts/account-type-context";

interface AdminOption {
  id: string;
  name: string;
  email: string;
}

export interface ProjectAdminResponsibleSectionProps {
  projectId: string | number;
  adminResponsibleId?: string | null;
  adminResponsibleName?: string | null;
  adminResponsibleEmail?: string | null;
  adminResponsibleIsMaster?: boolean;
  /** Chamado com os dados canônicos devolvidos pelo servidor após salvar —
   * o chamador atualiza só este projeto no seu próprio estado, sem recarregar
   * a lista inteira nem fechar o modal. */
  onUpdated?: (data: { id: string | null; name: string | null; email: string | null; isMaster: boolean }) => void;
}

const NONE_VALUE = "__none__";

export function ProjectAdminResponsibleSection({
  projectId,
  adminResponsibleId,
  adminResponsibleName,
  adminResponsibleEmail,
  adminResponsibleIsMaster,
  onUpdated,
}: ProjectAdminResponsibleSectionProps) {
  const { accountType } = useAccountType();
  const isAdmin = accountType === "admin";

  const [options, setOptions] = useState<AdminOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selected, setSelected] = useState<string>(adminResponsibleId ?? NONE_VALUE);
  const [currentName, setCurrentName] = useState(adminResponsibleName ?? null);
  const [currentEmail, setCurrentEmail] = useState(adminResponsibleEmail ?? null);
  const [currentIsMaster, setCurrentIsMaster] = useState(!!adminResponsibleIsMaster);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAt, setSuccessAt] = useState<number | null>(null);
  const savingRef = useRef(false);

  // Se o projeto mudar (abrir outro projeto no mesmo modal) ou os dados
  // vierem atualizados de fora, ressincroniza — mas nunca durante um save
  // em andamento, pra não sobrescrever a seleção que o usuário acabou de
  // escolher.
  useEffect(() => {
    if (savingRef.current) return;
    setSelected(adminResponsibleId ?? NONE_VALUE);
    setCurrentName(adminResponsibleName ?? null);
    setCurrentEmail(adminResponsibleEmail ?? null);
    setCurrentIsMaster(!!adminResponsibleIsMaster);
  }, [projectId, adminResponsibleId, adminResponsibleName, adminResponsibleEmail, adminResponsibleIsMaster]);

  const fetchOptions = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingOptions(true);
    try {
      const res = await apiClient.getAdminResponsibleOptions();
      setOptions(res?.data ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  const dirty = selected !== (adminResponsibleId ?? NONE_VALUE);

  async function handleSave() {
    // Bloqueia clique duplo — uma requisição por clique.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSuccessAt(null);
    try {
      const value = selected === NONE_VALUE ? null : selected;
      const updated = await apiClient.updateProject(projectId, { admin_responsible_user_id: value });
      const name = updated?.admin_responsible?.name ?? null;
      const email = updated?.admin_responsible?.email ?? null;
      const isMaster = !!updated?.admin_responsible?.admin_profile?.is_master;
      setCurrentName(name);
      setCurrentEmail(email);
      setCurrentIsMaster(isMaster);
      setSelected(updated?.admin_responsible_user_id ?? NONE_VALUE);
      setSuccessAt(Date.now());
      onUpdated?.({ id: updated?.admin_responsible_user_id ?? null, name, email, isMaster });
    } catch (err: any) {
      // Erro: a seleção volta pro valor salvo (não fica "meio trocada").
      setSelected(adminResponsibleId ?? NONE_VALUE);
      setError(err?.message ?? "Não foi possível salvar o Admin responsável. Tente novamente.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!isAdmin) {
    // Fora do escopo administrativo — a seção nem aparece (mesmo padrão de
    // "não é necessário Master, mas precisa ser Admin interno" das outras
    // telas administrativas desta ata).
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3" data-testid="project-admin-responsible-section">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-semibold text-slate-800">Admin responsável da Allka</p>
      </div>
      <p className="text-xs text-slate-500">
        Alertas de tarefa/etapa atrasada deste projeto serão enviados a este Admin, além do executor/participantes.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {currentName ? (
          <>
            <span className="text-sm font-medium text-slate-800">{currentName}</span>
            {currentEmail && <span className="text-xs text-slate-500">{currentEmail}</span>}
            <Badge variant={currentIsMaster ? "default" : "outline"} className="text-[10px]">
              {currentIsMaster ? "Master" : "Admin"}
            </Badge>
          </>
        ) : (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Admin responsável não definido
          </span>
        )}
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-48">
          <SearchableSelect
            items={[{ value: NONE_VALUE, label: "Sem responsável" }, ...options.map((o) => ({ value: o.id, label: o.name, sublabel: o.email }))]}
            value={selected}
            onValueChange={setSelected}
            placeholder={loadingOptions ? "Carregando..." : "Pesquisar admin..."}
            searchPlaceholder="Digite para buscar..."
            emptyMessage="Nenhum administrador encontrado."
            className="h-8 text-xs"
          />
        </div>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 btn-brand border-0"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saving ? "Salvando..." : "Salvar Admin responsável"}
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && successAt && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Admin responsável atualizado.
        </p>
      )}
    </div>
  );
}
