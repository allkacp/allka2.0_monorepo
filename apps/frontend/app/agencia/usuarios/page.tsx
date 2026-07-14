"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Mail, Loader2, Pencil, Lock, Unlock, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SlidePanel } from "@/components/slide-panel";
import { useToast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";

// Self-service: a própria Agency cria/gerencia seus colaboradores via
// /api/agency/users. Não mostra agency_id nem permite escolher outra
// agência — o backend sempre vincula à agência do usuário logado. Espelha
// company/usuarios/page.tsx (Tarefa 11).
interface AgencyUser {
  id: string;
  user_code: string | null;
  name: string;
  email: string;
  role: string;
  account_type: string;
  is_active: boolean;
  agency_id: string | null;
  agency_name: string | null;
  created_at: string;
}

const EMPTY_FORM = { name: "", email: "", password: "" };

export default function AgenciaUsuariosPage() {
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState<AgencyUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", is_active: true, password: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "200" };
      if (search) params.search = search;
      const data: any = await apiClient.getAgencyUsers(params);
      setUsers(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  // agency_admin nunca é atribuível via este painel self-service (o backend
  // só aceita role="agency_user" aqui) — então role === "agency_admin"
  // identifica com segurança quem é o usuário principal.
  function isPrincipal(u: AgencyUser) {
    return u.role === "agency_admin";
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setCreateOpen(true);
  }
  function closeCreate() {
    if (saving) return;
    setCreateOpen(false);
  }
  async function handleCreate() {
    if (!form.name.trim()) {
      setFormError("Nome é obrigatório");
      return;
    }
    if (!form.email.trim()) {
      setFormError("E-mail é obrigatório");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Senha precisa ter ao menos 6 caracteres");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await apiClient.createAgencyUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "agency_user",
      });
      toast({ title: "Usuário criado com sucesso!" });
      setCreateOpen(false);
      load();
    } catch (e: any) {
      setFormError(e?.message ?? "Erro ao criar usuário");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(u: AgencyUser) {
    setEditUser(u);
    setEditForm({ name: u.name, is_active: u.is_active, password: "" });
    setEditOpen(true);
  }
  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
  }
  async function handleEditSave() {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const payload: Record<string, any> = {
        name: editForm.name,
        is_active: editForm.is_active,
      };
      if (editForm.password) payload.password = editForm.password;
      await apiClient.updateAgencyUser(editUser.id, payload);
      toast({ title: "Usuário atualizado" });
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Usuários"
        description="Colaboradores com acesso à sua agência na plataforma"
        actions={
          <Button onClick={openCreate} size="sm" className="h-9 gap-2 px-4 text-sm btn-brand border-0 shadow-sm">
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <div className="border border-slate-200/70 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 dark:border-slate-800">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm max-w-xs"
          />
          <span className="text-xs text-slate-400 ml-auto">
            {total} usuário{total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-rose-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Nenhum usuário cadastrado ainda.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Função</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.user_code || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {u.name}
                      {isPrincipal(u) && (
                        <span
                          title="Usuário principal — administrador da agência"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/20"
                        >
                          <Crown className="h-2.5 w-2.5" /> Principal
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" /> {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/20">
                      {isPrincipal(u) ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.is_active
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {u.is_active ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Novo usuário */}
      <SlidePanel
        open={createOpen}
        onClose={closeCreate}
        title="Novo usuário"
        subtitle="Colaborador da sua agência"
        widthMode="compact"
        compactWidth={420}
        footer={
          <div className="flex items-center justify-end gap-2 p-4">
            <Button variant="outline" size="sm" onClick={closeCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={saving} className="btn-brand border-0">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Criar usuário
            </Button>
          </div>
        }
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{formError}</p>
          )}
          <div>
            <Label className="text-xs">Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome completo"
              className="h-9 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="usuario@agencia.com"
              className="h-9 text-sm mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Senha temporária</Label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              className="h-9 text-sm mt-1"
            />
          </div>
        </div>
      </SlidePanel>

      {/* Editar usuário */}
      <SlidePanel
        open={editOpen}
        onClose={closeEdit}
        title="Editar usuário"
        subtitle={editUser?.email}
        widthMode="compact"
        compactWidth={420}
        footer={
          <div className="flex items-center justify-end gap-2 p-4">
            <Button variant="outline" size="sm" onClick={closeEdit} disabled={editSaving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleEditSave} disabled={editSaving} className="btn-brand border-0">
              {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Salvar
            </Button>
          </div>
        }
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 text-sm mt-1"
            />
          </div>
          {editUser && isPrincipal(editUser) && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 rounded-md px-3 py-2">
              <Crown className="h-3.5 w-3.5 shrink-0" />
              Usuário principal — administrador da agência. Bloqueio não pode ser alterado por aqui.
            </p>
          )}
          <div>
            <Label className="text-xs">Nova senha (opcional)</Label>
            <Input
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Deixe em branco para não alterar"
              className="h-9 text-sm mt-1"
            />
          </div>
          {!(editUser && isPrincipal(editUser)) && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {editForm.is_active ? "Ativo" : "Bloqueado"}
                </p>
                <p className="text-[10px] text-slate-400">Usuários bloqueados não conseguem fazer login</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
              >
                {editForm.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {editForm.is_active ? "Bloquear" : "Desbloquear"}
              </Button>
            </div>
          )}
        </div>
      </SlidePanel>
    </div>
  );
}
