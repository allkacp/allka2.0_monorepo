import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient, ApiError } from "@/lib/api-client";

// "Solicitar Grupo de Notificação" (Líder) — ata 2026-08, bloco 3/5. O
// grupo fica Pendente e o Admin Master decide. Seletor de membros
// PAGINADO e pesquisável (o backend já limita ao escopo de responsabilidade
// do líder — nunca a base inteira).

const PAGE_SIZE = 10;

interface EligibleMember {
  id: string;
  name: string;
  email: string;
  account_type: string;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onRequested: () => void;
}

export function NotificationGroupRequestModal({ open, onClose, onRequested }: Props) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Map<string, EligibleMember>>(new Map());
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<EligibleMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPurpose("");
    setDescription("");
    setSelected(new Map());
    setSearch("");
    setPage(1);
    setError("");
  }, [open]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getNotificationGroupEligibleMembers({
        q: search.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setMembers((res?.data ?? []) as EligibleMember[]);
      setTotal(res?.total ?? 0);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    if (!open) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => void loadMembers(), 200);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [open, loadMembers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const toggle = (m: EligibleMember) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.set(m.id, m);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function submit() {
    if (saving) return;
    if (name.trim().length < 2) {
      setError("Dê um nome ao grupo.");
      return;
    }
    if (purpose.trim().length < 3) {
      setError("Explique a finalidade do grupo.");
      return;
    }
    if (selected.size === 0) {
      setError("Selecione ao menos um membro.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiClient.requestNotificationGroup({
        name: name.trim(),
        purpose: purpose.trim(),
        description: description.trim() || undefined,
        member_user_ids: [...selected.keys()],
      });
      onRequested();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.out_of_scope_user_ids) {
        setError("Alguns membros estão fora do seu escopo — remova-os e tente de novo.");
      } else {
        setError(err instanceof ApiError ? err.message : "Não foi possível enviar a solicitação.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <StandardModalDialog open={open} onClose={onClose} title="Solicitar Grupo de Notificação" subtitle="Vai para aprovação do Admin Master" size="compact">
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nome do grupo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Finalidade (obrigatória)</label>
          <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className="mt-1" placeholder="Por que este grupo precisa existir?" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Descrição (opcional)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Membros ({selected.size} selecionado{selected.size !== 1 ? "s" : ""})
            </label>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pessoas sob sua responsabilidade..."
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
            {loading && <p className="text-xs text-slate-400 p-3">Carregando...</p>}
            {!loading && members.length === 0 && (
              <p className="text-xs text-slate-400 p-3">Ninguém encontrado no seu escopo.</p>
            )}
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m)} />
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{m.name}</span>
                  <span className="text-slate-400"> · {m.account_type}</span>
                </span>
              </label>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>{total} pessoas · página {page}/{totalPages}</span>
              <span className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" className="btn-brand border-0" onClick={() => void submit()} disabled={saving}>
            {saving ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </div>
    </StandardModalDialog>
  );
}
