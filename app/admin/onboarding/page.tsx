// @ts-nocheck
import { useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Rocket, Plus, Pencil, Trash2, Eye, GripVertical, FileText, Video,
  ImageIcon, CheckCircle2, Users, Building2, UserCheck, Briefcase,
  ArrowUp, ArrowDown, Play, RefreshCw,
} from "lucide-react";

const ACCOUNT_TYPE_ICONS = { admin: Users, company: Building2, agency: Briefcase, nomad: UserCheck };
const ACCOUNT_TYPE_LABELS = { admin: "Admin", company: "Empresa", agency: "Agência", nomad: "Nômade" };
const ACCOUNT_TYPE_COLORS = {
  admin:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  company: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  agency:  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  nomad:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
};
const CONTENT_ICONS = { slide: FileText, video: Video, text: ImageIcon };

const INITIAL_CIRCUITS = [
  {
    id: "1", name: "Boas-vindas Admin", accountType: "admin",
    description: "Circuito de onboarding para administradores do sistema",
    elements: [
      { id: "e1", type: "slide", title: "Bem-vindo ao ALLKA", content: "Introdução ao sistema", order: 1 },
      { id: "e2", type: "video", title: "Tour pela plataforma", content: "https://…", duration: 180, order: 2 },
      { id: "e3", type: "text",  title: "Primeiros passos", content: "Guia de configuração inicial", order: 3 },
    ],
    isActive: true, completionRate: 87, totalUsers: 23,
  },
  {
    id: "2", name: "Onboarding Empresas", accountType: "company",
    description: "Circuito de onboarding para empresas clientes",
    elements: [
      { id: "e4", type: "slide", title: "Bem-vindo", content: "Introdução para empresas", order: 1 },
      { id: "e5", type: "video", title: "Como criar projetos", content: "https://…", duration: 240, order: 2 },
    ],
    isActive: true, completionRate: 92, totalUsers: 156,
  },
  {
    id: "3", name: "Onboarding Agências", accountType: "agency",
    description: "Circuito de onboarding para agências parceiras",
    elements: [
      { id: "e6", type: "slide", title: "Bem-vindo", content: "Introdução para agências", order: 1 },
      { id: "e7", type: "text",  title: "Programa de parceria", content: "Detalhes do programa", order: 2 },
    ],
    isActive: true, completionRate: 78, totalUsers: 45,
  },
  {
    id: "4", name: "Onboarding Nômades", accountType: "nomad",
    description: "Circuito de onboarding para profissionais nômades",
    elements: [
      { id: "e8", type: "video", title: "Como funciona", content: "https://…", duration: 300, order: 1 },
      { id: "e9", type: "slide", title: "Suas primeiras tarefas", content: "Guia inicial", order: 2 },
    ],
    isActive: true, completionRate: 95, totalUsers: 234,
  },
];

function CompletionBar({ pct }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">{pct}%</span>
    </div>
  );
}

export default function AdminOnboardingPage() {
  useSidebar();
  const { toast } = useToast();
  const [circuits, setCircuits] = useState(INITIAL_CIRCUITS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCircuit, setEditCircuit] = useState(null);
  const [previewCircuit, setPreviewCircuit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addElemCircuit, setAddElemCircuit] = useState(null);
  const [elemForm, setElemForm] = useState({ type: "slide", title: "", content: "", duration: "" });
  const [form, setForm] = useState({ name: "", accountType: "company", description: "", isActive: true });

  const totalCircuits = circuits.length;
  const activeCircuits = circuits.filter(c => c.isActive).length;
  const avgCompletion = circuits.length > 0
    ? Math.round(circuits.reduce((a, c) => a + c.completionRate, 0) / circuits.length) : 0;
  const totalUsers = circuits.reduce((a, c) => a + c.totalUsers, 0);

  function openCreate() {
    setEditCircuit(null);
    setForm({ name: "", accountType: "company", description: "", isActive: true });
    setSheetOpen(true);
  }

  function openEdit(c) {
    setEditCircuit(c);
    setForm({ name: c.name, accountType: c.accountType, description: c.description, isActive: c.isActive });
    setSheetOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) { toast({ title: "Informe o nome do circuito", variant: "destructive" }); return; }
    if (editCircuit) {
      setCircuits(cs => cs.map(c => c.id === editCircuit.id ? { ...c, ...form } : c));
      toast({ title: "Circuito atualizado" });
    } else {
      const newC = {
        id: String(Date.now()), elements: [], completionRate: 0, totalUsers: 0,
        name: form.name, accountType: form.accountType,
        description: form.description, isActive: form.isActive,
      };
      setCircuits(cs => [...cs, newC]);
      toast({ title: "Circuito criado" });
    }
    setSheetOpen(false);
  }

  function handleDelete() {
    setCircuits(cs => cs.filter(c => c.id !== deleteTarget));
    toast({ title: "Circuito removido" });
    setDeleteTarget(null);
  }

  function toggleActive(id) {
    setCircuits(cs => cs.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  }

  function moveElement(circuitId, elementId, dir) {
    setCircuits(cs => cs.map(c => {
      if (c.id !== circuitId) return c;
      const els = [...c.elements].sort((a, b) => a.order - b.order);
      const idx = els.findIndex(e => e.id === elementId);
      if ((dir === "up" && idx === 0) || (dir === "down" && idx === els.length - 1)) return c;
      const ni = dir === "up" ? idx - 1 : idx + 1;
      [els[idx], els[ni]] = [els[ni], els[idx]];
      els.forEach((el, i) => { el.order = i + 1; });
      return { ...c, elements: els };
    }));
  }

  function removeElement(circuitId, elementId) {
    setCircuits(cs => cs.map(c =>
      c.id === circuitId ? { ...c, elements: c.elements.filter(e => e.id !== elementId) } : c
    ));
    toast({ title: "Elemento removido" });
  }

  function handleAddElement() {
    if (!elemForm.title.trim()) { toast({ title: "Informe o título", variant: "destructive" }); return; }
    setCircuits(cs => cs.map(c => {
      if (c.id !== addElemCircuit) return c;
      const newEl = {
        id: String(Date.now()), type: elemForm.type, title: elemForm.title.trim(),
        content: elemForm.content.trim(),
        duration: elemForm.duration ? parseInt(elemForm.duration) : undefined,
        order: c.elements.length + 1,
      };
      return { ...c, elements: [...c.elements, newEl] };
    }));
    toast({ title: "Elemento adicionado" });
    setAddElemCircuit(null);
    setElemForm({ type: "slide", title: "", content: "", duration: "" });
  }

  const tabs = ["all", "admin", "company", "agency", "nomad"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Onboarding</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Circuitos de boas-vindas por tipo de conta</p>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Circuito
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Circuitos",   value: totalCircuits,  icon: Rocket,      color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Ativos",            value: activeCircuits, icon: CheckCircle2,color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Taxa de Conclusão", value: `${avgCompletion}%`, icon: Play,   color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Usuários Impactados",value: totalUsers,    icon: Users,       color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="all"     className="text-xs px-3">Todos</TabsTrigger>
          <TabsTrigger value="admin"   className="text-xs px-3">Admin</TabsTrigger>
          <TabsTrigger value="company" className="text-xs px-3">Empresas</TabsTrigger>
          <TabsTrigger value="agency"  className="text-xs px-3">Agências</TabsTrigger>
          <TabsTrigger value="nomad"   className="text-xs px-3">Nômades</TabsTrigger>
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {circuits.filter(c => tab === "all" || c.accountType === tab).map(circuit => {
              const Icon = ACCOUNT_TYPE_ICONS[circuit.accountType];
              return (
                <Card key={circuit.id} className="p-5">
                  <div className="flex items-start gap-3">
                    {/* icon */}
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {/* body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{circuit.name}</h3>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${ACCOUNT_TYPE_COLORS[circuit.accountType]}`}>
                          {ACCOUNT_TYPE_LABELS[circuit.accountType]}
                        </Badge>
                        {circuit.isActive ? (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{circuit.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{circuit.elements.length} elementos</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{circuit.totalUsers} usuários</span>
                        <CompletionBar pct={circuit.completionRate} />
                      </div>
                    </div>
                    {/* actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setPreviewCircuit(circuit)} title="Preview"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEdit(circuit)} title="Editar"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleActive(circuit.id)} title={circuit.isActive ? "Desativar" : "Ativar"}
                        className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${circuit.isActive ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(circuit.id)} title="Excluir"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* elements list */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Elementos</p>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => { setAddElemCircuit(circuit.id); setElemForm({ type: "slide", title: "", content: "", duration: "" }); }}>
                        <Plus className="h-2.5 w-2.5" /> Adicionar
                      </Button>
                    </div>

                    {addElemCircuit === circuit.id && (
                      <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 space-y-2 mb-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={elemForm.type} onValueChange={v => setElemForm(f => ({ ...f, type: v }))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slide">Slide</SelectItem>
                              <SelectItem value="video">Vídeo</SelectItem>
                              <SelectItem value="text">Texto</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Título…" className="h-7 text-xs"
                            value={elemForm.title} onChange={e => setElemForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Conteúdo ou URL…" className="h-7 text-xs"
                            value={elemForm.content} onChange={e => setElemForm(f => ({ ...f, content: e.target.value }))} />
                          {elemForm.type === "video" && (
                            <Input type="number" placeholder="Duração (s)…" className="h-7 text-xs"
                              value={elemForm.duration} onChange={e => setElemForm(f => ({ ...f, duration: e.target.value }))} />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddElement}>Adicionar</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddElemCircuit(null)}>Cancelar</Button>
                        </div>
                      </div>
                    )}

                    {circuit.elements.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">Nenhum elemento ainda.</p>
                    ) : (
                      circuit.elements.sort((a, b) => a.order - b.order).map((el, idx) => {
                        const CIcon = CONTENT_ICONS[el.type] || FileText;
                        return (
                          <div key={el.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 cursor-move shrink-0" />
                            <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                              <CIcon className="h-3 w-3 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{el.title}</p>
                              {el.type === "video" && el.duration && (
                                <p className="text-[10px] text-slate-400">{Math.floor(el.duration/60)}:{String(el.duration%60).padStart(2,"0")}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button disabled={idx === 0} onClick={() => moveElement(circuit.id, el.id, "up")}
                                className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors">
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button disabled={idx === circuit.elements.length - 1} onClick={() => moveElement(circuit.id, el.id, "down")}
                                className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 transition-colors">
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button onClick={() => removeElement(circuit.id, el.id)}
                                className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              );
            })}
            {circuits.filter(c => tab === "all" || c.accountType === tab).length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <Rocket className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum circuito nesta categoria</p>
                <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar circuito
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editCircuit ? "Editar Circuito" : "Novo Circuito"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Onboarding Empresas Premium" className="h-9 text-sm"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Conta</Label>
              <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="agency">Agência</SelectItem>
                  <SelectItem value="nomad">Nômade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Objetivo deste circuito…" className="text-sm resize-none" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Circuito Ativo</p>
                <p className="text-xs text-slate-400">Exibir para novos usuários</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>{editCircuit ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Sheet */}
      <Sheet open={!!previewCircuit} onOpenChange={v => !v && setPreviewCircuit(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-500" /> Preview: {previewCircuit?.name}
            </SheetTitle>
          </SheetHeader>
          {previewCircuit && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">{previewCircuit.description}</p>
              {previewCircuit.elements.sort((a, b) => a.order - b.order).map((el, i) => {
                const CIcon = CONTENT_ICONS[el.type] || FileText;
                return (
                  <div key={el.id} className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 text-white rounded-full text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{el.title}</p>
                        {el.duration && (
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {Math.floor(el.duration/60)}:{String(el.duration%60).padStart(2,"0")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{el.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Excluir Circuito"
        description="Tem certeza? Todos os elementos deste circuito serão removidos."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
