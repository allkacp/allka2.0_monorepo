// Área administrativa de Dashboards Padrão por Perfil (item 9) + Banners
// (item 10). Admin gerencia um DashboardTemplate por perfil (persistido no
// backend, ver routes/dashboard-templates.ts) — separado da personalização
// pessoal de cada usuário, que continua em localStorage.
//
// O editor de layout abaixo (TemplateEditorSheet) usa o MESMO núcleo
// compartilhado que os 6 dashboards de produção usam pra editar a própria
// visão — useDashboardWidgetEditor + DashboardWidgetEditorModeToggle/Body/
// Footer (ver features/dashboards/shared/dashboard-widget-editor*.ts).
// Não é um editor paralelo simplificado: é o painel "Editar Dashboard" real
// (catálogo/add/remover/drag/resize/visibilidade/salvar), só que a fonte
// inicial é o DashboardTemplate (não localStorage) e o save vai pra API de
// template (não localStorage pessoal). O catálogo por perfil também é o
// real de cada tela (AGENCY_WIDGET_LIBRARY etc., exportados das próprias
// páginas de dashboard) — nunca uma lista paralela.
import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, type DashboardTemplate, type DashboardTemplateContent } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageLoader } from "@/components/ui/loading";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutTemplate,
  Plus,
  Star,
  Copy,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Megaphone,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardRole } from "@/lib/dashboard-widget-roles";
import type { WidgetState } from "@/features/dashboards/shared/dashboard-common";
import { useDashboardWidgetEditor, type EditorWidgetLibraryItem } from "@/features/dashboards/shared/dashboard-widget-editor";
import { DashboardEditorScreen } from "@/features/dashboards/shared/dashboard-editor-screen";
import { DashboardTemplateContentList } from "@/features/dashboards/shared/dashboard-template-content";
import { AGENCY_WIDGET_LIBRARY } from "@/app/agency/dashboard/page";
import { COMPANY_WIDGET_LIBRARY } from "@/app/company/dashboard/page";
import { LEADER_WIDGET_LIBRARY } from "@/app/leader/dashboard/page";
import { PARTNER_WIDGET_LIBRARY } from "@/app/partner/dashboard/page";
import { ADMIN_WIDGET_LIBRARY } from "@/features/dashboards/admin/admin-dashboard-page";
import { NOMAD_WIDGET_CATALOG } from "@/app/nomades/dashboard/page";
import { dashboardRoleToProfile } from "@/features/dashboards/shared/dashboard-template-profile";

const CATALOG_BY_ROLE: Record<DashboardRole, EditorWidgetLibraryItem[]> = {
  ADMIN: ADMIN_WIDGET_LIBRARY,
  AGENCY: AGENCY_WIDGET_LIBRARY,
  COMPANY: COMPANY_WIDGET_LIBRARY,
  LEADER: LEADER_WIDGET_LIBRARY,
  PARTNER: PARTNER_WIDGET_LIBRARY,
  NOMAD: NOMAD_WIDGET_CATALOG,
};

const PROFILES: { role: DashboardRole; label: string }[] = [
  { role: "ADMIN", label: "Admin" },
  { role: "AGENCY", label: "Agency" },
  { role: "COMPANY", label: "Company" },
  { role: "LEADER", label: "Leader" },
  { role: "PARTNER", label: "Partner" },
  { role: "NOMAD", label: "Nomad" },
];

export default function DashboardTemplatesPage() {
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState<DashboardRole>("AGENCY");
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [deleteTarget, setDeleteTarget] = useState<DashboardTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // editorOpen=true + editorTemplate=null → modo "novo template" (mesma
  // tela de "+ Criar novo dashboard"). editorTemplate=<template> → edição.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTemplate, setEditorTemplate] = useState<DashboardTemplate | null>(null);

  // requestSeqRef evita que uma resposta antiga (ex.: usuário trocou de
  // perfil rápido, disparando um fetch novo antes do anterior terminar)
  // sobrescreva o state depois de uma resposta mais nova já ter chegado —
  // sem isso, a última resposta a CHEGAR vence, não a última a ser PEDIDA.
  const requestSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = ++requestSeqRef.current;
    setState("loading");
    apiClient
      .listDashboardTemplates(dashboardRoleToProfile(activeRole))
      .then((res: { templates: DashboardTemplate[] }) => {
        if (requestSeqRef.current !== seq) return;
        setTemplates(res.templates ?? []);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (requestSeqRef.current !== seq) return;
        console.error("Erro ao carregar dashboard templates:", err);
        setState("error");
      });
  }, [activeRole]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDuplicate(t: DashboardTemplate) {
    setBusyId(t.id);
    try {
      await apiClient.duplicateDashboardTemplate(t.id);
      toast({ title: "Template duplicado" });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao duplicar", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(t: DashboardTemplate) {
    setBusyId(t.id);
    try {
      await apiClient.setDefaultDashboardTemplate(t.id);
      toast({ title: `"${t.name}" agora é o padrão de ${activeRole}` });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao definir padrão", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(t: DashboardTemplate) {
    setBusyId(t.id);
    try {
      await apiClient.updateDashboardTemplate(t.id, { is_active: !t.is_active });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteDashboardTemplate(deleteTarget.id);
      toast({ title: "Template removido" });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: "Não foi possível remover", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      {/* Mesma árvore de wrappers do DashboardShellFrame usado por
          /admin/dashboard (features/dashboards/shared/dashboard-shell-frame.tsx)
          — reproduzida aqui em vez de importar o componente porque ele só
          expõe 1 slot de children (tudo dentro da área com scroll), e o
          TemplateEditorPanel precisa ficar como IRMÃO da área com scroll
          (mesmo container `relative`, fora do `overflow-y-auto`) pro
          EmbeddedSlideScreen dele se posicionar corretamente. Classes
          idênticas às do DashboardShellFrame: container mx-auto px-0 py-0
          (sem padding extra aqui — o respiro já vem do
          STANDARD_SHELL_PANEL_CLASS por fora e do <main> do AppLayout). */}
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto space-y-4 px-0 py-0">
        {/* Header — mesma linguagem visual da barra unificada de
            /admin/dashboard (gradiente, radius, sombra, tipografia):
            título+ícone à esquerda, ação primária (btn-brand) à direita. */}
        <div
          className="relative overflow-hidden flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]"
          style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <LayoutTemplate className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">Dashboards Padrão por Perfil</h1>
              <p className="text-[11px] text-white/70 leading-snug">
                Defina o template inicial de cada perfil e os banners/avisos fixos dos dashboards.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditorTemplate(null);
              setEditorOpen(true);
            }}
            className="btn-brand h-8 px-4 text-sm gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Novo template
          </Button>
        </div>

        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as DashboardRole)}>
          <TabsList className="h-9 p-1 rounded-lg">
            {PROFILES.map((p) => (
              <TabsTrigger key={p.role} value={p.role} className="text-xs font-semibold rounded-md px-3">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PROFILES.map((p) => (
            <TabsContent key={p.role} value={p.role} className="mt-4">
              {state === "loading" && (
                <p className="text-sm text-muted-foreground text-center py-16">Carregando templates...</p>
              )}
              {state === "error" && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <p className="text-sm text-destructive text-center">Não foi possível carregar os templates.</p>
                  <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
                </div>
              )}
              {state === "ready" && templates.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <p className="text-sm text-muted-foreground text-center">Nenhum template criado para este perfil.</p>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setEditorTemplate(null);
                      setEditorOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Criar primeiro template
                  </Button>
                </div>
              )}
              {state === "ready" && templates.length > 0 && (
                <div className="grid gap-3">
                  {templates.map((t) => (
                    <Card
                      key={t.id}
                      className="rounded-[20px] border border-[#e6ebf3] dark:border-slate-700/60 shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)] transition-shadow"
                    >
                      <CardContent className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <LayoutTemplate className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{t.name}</p>
                            {t.is_default && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1">
                                <Star className="h-3 w-3 fill-current" /> Padrão
                              </Badge>
                            )}
                            {!t.is_active && (
                              <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(t.widgets?.length ?? 0)} widgets · {t._count?.contents ?? 0} banner/aviso
                            {t.creator ? ` · criado por ${t.creator.name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={t.is_active}
                            disabled={busyId === t.id}
                            onCheckedChange={() => handleToggleActive(t)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setEditorTemplate(t);
                              setEditorOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <button
                            disabled={busyId === t.id}
                            onClick={() => handleSetDefault(t)}
                            title="Definir como padrão"
                            className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50 shrink-0"
                          >
                            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                            <Star className={cn("relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors", t.is_default && "fill-amber-400 text-amber-400 group-hover:text-amber-300")} />
                          </button>
                          <button
                            disabled={busyId === t.id}
                            onClick={() => handleDuplicate(t)}
                            title="Duplicar"
                            className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50 shrink-0"
                          >
                            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                            <Copy className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
                          </button>
                          <button
                            disabled={busyId === t.id}
                            onClick={() => setDeleteTarget(t)}
                            title="Excluir"
                            className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50 shrink-0"
                          >
                            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-destructive" />
                            <Trash2 className="relative z-10 h-4 w-4 text-destructive group-hover:text-white transition-colors" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        </div>
        </div>

        {/* Irmão da área com scroll, ainda dentro do container `relative`
            (mesmo padrão do DashboardShellFrame usado por /admin/dashboard)
            — o EmbeddedSlideScreen dentro do editor se posiciona com
            `absolute inset-0` relativo a este container. */}
        <TemplateEditorPanel
          open={editorOpen}
          template={editorTemplate}
          role={activeRole}
          onClose={() => setEditorOpen(false)}
          onSaved={(saved) => {
            setEditorTemplate(saved);
            load();
          }}
        />
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir template?"
        message={`"${deleteTarget?.name}" será removido permanentemente, junto com os banners associados. Usuários que já personalizaram o próprio dashboard não são afetados.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Editor de layout + banners ────────────────────────────────────────────

function getTemplateWidgetTitle(catalog: EditorWidgetLibraryItem[], type: string, customTitle?: string) {
  if (customTitle) return customTitle;
  return catalog.find((c) => c.id === type)?.name ?? type;
}

// Wrapper de PERSISTÊNCIA em cima do MESMO DashboardEditorScreen usado por
// "+ Criar novo dashboard"/"Editar Dashboard" no /admin/dashboard (ver
// admin-dashboard-page.tsx) — item 3/6/7 da correção: não existe mais um
// editor visual paralelo pra templates, só este wrapper decidindo pra onde
// o resultado vai (API de template em vez de localStorage pessoal) e
// oferecendo as ações extras que só fazem sentido em modo template
// ("Definir como padrão", "Conteúdo/Banners" — item 10/11).
function TemplateEditorPanel({
  open,
  template,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: DashboardTemplate | null;
  role: DashboardRole;
  onClose: () => void;
  onSaved: (saved: DashboardTemplate) => void;
}) {
  const { toast } = useToast();
  const isNew = !template;
  const catalog = CATALOG_BY_ROLE[role] ?? [];
  const editor = useDashboardWidgetEditor(
    ((template?.widgets as WidgetState[] | undefined) ?? []).slice().sort((a, b) => a.order - b.order),
  );
  const [name, setName] = useState(template?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [bannersOpen, setBannersOpen] = useState(false);
  const [contents, setContents] = useState<DashboardTemplateContent[]>(template?.contents ?? []);

  // Re-sincroniza quando um template DIFERENTE é aberto (troca de id, ou
  // "novo" ↔ "editar"). O painel fica sempre montado (mesmo padrão do
  // EmbeddedSlideScreen no dashboard real — não gatear por `open` senão a
  // animação de saída é cortada), então isso não roda a cada render, só
  // quando o alvo muda de verdade.
  const lastKeyRef = useRef<string>(template?.id ?? "__new__");
  useEffect(() => {
    const key = template?.id ?? "__new__";
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    editor.reset(((template?.widgets as WidgetState[] | undefined) ?? []).slice().sort((a, b) => a.order - b.order));
    setName(template?.name ?? "");
    setContents(template?.contents ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const loadContents = useCallback(() => {
    if (!template) return;
    apiClient
      .getDashboardTemplate(template.id)
      .then((res: { template: DashboardTemplate }) => setContents(res.template.contents ?? []));
  }, [template]);

  async function performSave() {
    setSaving(true);
    try {
      const widgets = editor.finalize();
      if (isNew) {
        const { template: created } = await apiClient.createDashboardTemplate({
          name: name.trim() || `Novo template — ${role}`,
          profile: dashboardRoleToProfile(role),
          widgets,
        });
        toast({ title: "Template criado" });
        onSaved(created);
      } else if (template) {
        const { template: updated } = await apiClient.updateDashboardTemplate(template.id, {
          name: name.trim() || template.name,
          widgets,
        });
        toast({ title: "Template salvo" });
        onSaved(updated);
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault() {
    if (!template) return;
    setSettingDefault(true);
    try {
      const { template: updated } = await apiClient.setDefaultDashboardTemplate(template.id);
      toast({ title: `"${updated.name}" agora é o padrão de ${role}` });
      onSaved(updated);
    } catch (err: any) {
      toast({ title: "Erro ao definir padrão", description: err?.message, variant: "destructive" });
    } finally {
      setSettingDefault(false);
    }
  }

  return (
    <>
      <DashboardEditorScreen
        open={open}
        isNew={isNew}
        name={name}
        onNameChange={setName}
        defaultDisplayName={template?.name || "Template"}
        titleNew={`Novo Template — ${role}`}
        titleEdit={`Editando template — ${template?.name ?? ""}`}
        editor={editor}
        catalog={catalog}
        getWidgetTitle={(type, customTitle) => getTemplateWidgetTitle(catalog, type, customTitle)}
        maxColSpan={role === "NOMAD" ? 2 : 3}
        saving={saving}
        onSave={() => setShowSaveConfirm(true)}
        onCancel={() => setShowCancelConfirm(true)}
        extraTop={
          contents.length > 0 ? (
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preview — como aparece no topo do dashboard
              </p>
              <DashboardTemplateContentList
                contents={contents}
                onDismiss={() => toast({ title: "Gerencie em \"Conteúdo / Banners\"" })}
              />
            </div>
          ) : undefined
        }
        footerExtra={
          !isNew && template ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-sm"
                onClick={() => setBannersOpen(true)}
              >
                <Megaphone className="h-3.5 w-3.5" />
                Conteúdo / Banners
                {contents.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{contents.length}</Badge>
                )}
              </Button>
              <Button
                variant={template.is_default ? "secondary" : "outline"}
                size="sm"
                className={cn("h-8 gap-1.5 text-sm", template.is_default && "text-amber-700 dark:text-amber-400")}
                disabled={template.is_default || settingDefault}
                onClick={handleSetDefault}
              >
                <Star className={cn("h-3.5 w-3.5", template.is_default && "fill-amber-400 text-amber-400")} />
                {settingDefault ? "Definindo..." : template.is_default ? "Padrão atual" : "Definir como padrão"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <ConfirmationDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title={isNew ? "Cancelar criação" : "Cancelar edição"}
        message={
          isNew
            ? "As alterações feitas neste template não serão salvas."
            : "As alterações feitas neste template não serão salvas."
        }
        confirmText="Descartar"
        cancelText="Continuar editando"
        destructive
        onConfirm={onClose}
      />

      <ConfirmationDialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title={isNew ? "Criar template" : "Salvar template"}
        message={
          isNew
            ? `Deseja criar o template "${name.trim() || `Novo template — ${role}`}" com ${editor.draftWidgets.length} widget(s)?`
            : "Deseja salvar as alterações feitas neste template?"
        }
        confirmText={isNew ? "Criar" : "Salvar"}
        cancelText="Cancelar"
        destructive={false}
        onConfirm={performSave}
      />

      <Dialog open={bannersOpen} onOpenChange={setBannersOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conteúdo / Banners — {template?.name}</DialogTitle>
          </DialogHeader>
          {template && (
            <TemplateContentsPanel
              templateId={template.id}
              onChanged={loadContents}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Banners/avisos (item 10) ───────────────────────────────────────────────

function TemplateContentsPanel({ templateId, onChanged }: { templateId: string; onChanged?: () => void }) {
  const { toast } = useToast();
  const [contents, setContents] = useState<DashboardTemplateContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DashboardTemplateContent | "new" | null>(null);
  // Exclusão física de um banner/aviso (DELETE) — dupla confirmação
  // (ata 2026-08, interface/usabilidade). Guarda contra clique duplo por
  // `deleting`; erro aparece dentro do diálogo; a linha só some após o
  // sucesso da API (load()).
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .getDashboardTemplate(templateId)
      .then((res: { template: DashboardTemplate }) => setContents(res.template.contents ?? []))
      .finally(() => setLoading(false));
    onChanged?.();
  }, [templateId, onChanged]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function confirmDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await apiClient.deleteDashboardTemplateContent(deleteId);
      setDeleteId(null);
      load();
    } finally {
      setDeleting(false);
    }
  }
  const deleteContent = deleteId ? contents.find((c) => c.id === deleteId) ?? null : null;

  if (loading) return <PageLoader text="Carregando…" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Conteúdo / Banners</p>
          <p className="text-xs text-muted-foreground">
            Avisos e banners de campanha que aparecem no topo do dashboard deste perfil.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Adicionar banner
        </Button>
      </div>

      {contents.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-xl border border-dashed border-border/60">
          <Megaphone className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">Nenhum banner ou aviso configurado ainda.</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing("new")}>
            <Plus className="h-3.5 w-3.5" /> Adicionar banner
          </Button>
        </div>
      )}

      {contents
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
            {c.type === "banner" ? (
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Megaphone className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {c.active ? "Ativo" : "Inativo"}
                {c.locked ? " · Fixo (locked)" : ""}
                {c.starts_at || c.ends_at ? ` · ${c.starts_at ? new Date(c.starts_at).toLocaleDateString("pt-BR") : "sem início"} – ${c.ends_at ? new Date(c.ends_at).toLocaleDateString("pt-BR") : "sem fim"}` : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Editar "${c.title}"`} onClick={() => setEditing(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Excluir "${c.title}"`} onClick={() => setDeleteId(c.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}

      {editing && (
        <ContentEditorDialog
          templateId={templateId}
          content={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmationDialog
        open={deleteId !== null}
        onClose={() => { if (!deleting) setDeleteId(null); }}
        onConfirm={confirmDelete}
        twoStep
        destructive
        icon={Trash2}
        title="Excluir banner/aviso"
        message="Este banner/aviso deixa de aparecer no topo do dashboard deste perfil. A exclusão é permanente."
        targetName={deleteContent?.title ?? ""}
        targetDetail={deleteContent?.type === "notice" ? "Aviso" : "Banner"}
        consequences={["Some do dashboard de todos os usuários deste perfil.", "Ação irreversível — não há restauração."]}
        continueText="Continuar para confirmação"
        finalConfirmText={`Excluir "${deleteContent?.title ?? ""}" definitivamente`}
      />
    </div>
  );
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ContentEditorDialog({
  templateId,
  content,
  onClose,
  onSaved,
}: {
  templateId: string;
  content: DashboardTemplateContent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<"banner" | "notice">(content?.type ?? "banner");
  const [title, setTitle] = useState(content?.title ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [linkUrl, setLinkUrl] = useState(content?.link_url ?? "");
  const [linkLabel, setLinkLabel] = useState(content?.link_label ?? "");
  const [active, setActive] = useState(content?.active ?? true);
  const [locked, setLocked] = useState(content?.locked ?? false);
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue(content?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toDatetimeLocalValue(content?.ends_at ?? null));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedContent, setSavedContent] = useState<DashboardTemplateContent | null>(content);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        body: body.trim() || null,
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        active,
        locked,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      };
      if (savedContent) {
        await apiClient.updateDashboardTemplateContent(savedContent.id, payload);
      } else {
        const { content: created } = await apiClient.createDashboardTemplateContent(templateId, payload);
        setSavedContent(created);
      }
      toast({ title: "Salvo" });
      onSaved();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Imagem só pode ser anexada depois que o conteúdo existe (precisa do
    // id na URL de upload) — se ainda não foi salvo, salva primeiro.
    let target = savedContent;
    if (!target) {
      if (!title.trim()) {
        toast({ title: "Preencha o título antes de anexar imagem", variant: "destructive" });
        return;
      }
      const { content: created } = await apiClient.createDashboardTemplateContent(templateId, {
        type,
        title: title.trim(),
        active,
        locked,
      });
      target = created;
      setSavedContent(created);
    }
    setUploadingImage(true);
    try {
      await apiClient.uploadDashboardTemplateContentImage(target.id, file);
      toast({ title: "Imagem enviada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{savedContent ? "Editar" : "Novo"} banner/aviso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="flex gap-2">
            <button
              onClick={() => setType("banner")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm", type === "banner" ? "border-primary bg-primary/10" : "border-border/60")}
            >
              <Sparkles className="h-3.5 w-3.5" /> Banner
            </button>
            <button
              onClick={() => setType("notice")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm", type === "notice" ? "border-primary bg-primary/10" : "border-border/60")}
            >
              <Megaphone className="h-3.5 w-3.5" /> Aviso
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem (opcional)</Label>
            <Textarea value={body ?? ""} onChange={(e) => setBody(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Link (opcional)</Label>
              <Input value={linkUrl ?? ""} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Texto do link</Label>
              <Input value={linkLabel ?? ""} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Saiba mais" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início (opcional)</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim (opcional)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-2">
              {savedContent?.image_storage_key && (
                <img
                  src={apiClient.dashboardTemplateContentImageUrl(savedContent.id)}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover border border-border/60"
                />
              )}
              <label className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border/60 hover:bg-accent cursor-pointer">
                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {uploadingImage ? "Enviando…" : "Enviar imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">Se desativado, não aparece pra ninguém.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Fixo (locked)</p>
              <p className="text-xs text-muted-foreground">Usuário não pode dispensar/remover da própria visão.</p>
            </div>
            <Switch checked={locked} onCheckedChange={setLocked} />
          </div>

          {/* Preview — mesmo visual do card renderizado no dashboard real
              (ver dashboard-template-content.tsx), pra ver antes de salvar. */}
          <div className="space-y-1.5">
            <Label>Preview</Label>
            <div
              className={cn(
                "relative flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm",
                type === "banner"
                  ? "border-primary/30 bg-primary/5"
                  : "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50",
              )}
            >
              {savedContent?.image_storage_key && (
                <img
                  src={apiClient.dashboardTemplateContentImageUrl(savedContent.id)}
                  alt=""
                  className="hidden sm:block h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              )}
              {type === "banner" ? (
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              ) : (
                <Megaphone className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold leading-tight">{title || "Título do banner"}</p>
                {body && <p className="text-xs text-muted-foreground leading-snug">{body}</p>}
                {linkUrl && (
                  <span className="inline-block text-xs font-medium text-primary mt-1">{linkLabel || "Saiba mais"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
