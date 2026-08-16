/**
 * "Novo Grupo" / "Editar Grupo" (painel de notificações, aba Grupos) —
 * cadastro do grupo em si (nome, descrição, membros do próprio time do
 * usuário). Usar o grupo como alvo de uma notificação/regra de verdade é
 * uma etapa futura, não conectada aqui ainda.
 */
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api-client";

export type EligibleMember = { id: string; name: string; email: string };

export type NotificationGroupDraft = {
  id?: string;
  name: string;
  description: string;
  member_user_ids: string[];
};

interface NotificationGroupFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: NotificationGroupDraft | null;
  onSave: (draft: NotificationGroupDraft) => Promise<void>;
}

export function NotificationGroupFormModal({ open, onClose, initial, onSave }: NotificationGroupFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<EligibleMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setSelectedIds(new Set(initial?.member_user_ids ?? []));
    setSearch("");
    setError("");
    setLoadingMembers(true);
    apiClient
      .getNotificationGroupEligibleMembers()
      .then((res) => setMembers(res?.data ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [open, initial]);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredMembers = members.filter(
    (m) =>
      !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSave() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        description: description.trim(),
        member_user_ids: [...selectedIds],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o grupo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StandardModalDialog
      open={open}
      onClose={onClose}
      title={initial?.id ? "Editar Grupo" : "Novo Grupo"}
      subtitle="Organize pessoas do seu time para facilitar o envio de avisos"
      size="large"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="outline" className="h-9 text-sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="h-9 text-sm btn-brand border-0" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar grupo"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Líderes de Projeto" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Descrição (opcional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pra que serve esse grupo" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Membros</label>
            <span className="text-[10px] text-slate-400">{selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}</span>
          </div>
          <div className="relative mb-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-8 h-8 text-xs" />
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loadingMembers && <p className="text-xs text-slate-400 text-center py-6">Carregando...</p>}
            {!loadingMembers && filteredMembers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma pessoa encontrada.</p>
            )}
            {filteredMembers.map((m) => (
              <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <Checkbox checked={selectedIds.has(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </StandardModalDialog>
  );
}
