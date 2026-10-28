import { useEffect, useState } from "react";
import { UserPlus, Plus, X, Loader2, Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FramedModal } from "@/components/framed-panel";

type Contact = { id: string; name: string; email?: string | null; document?: string | null };
export type RegisteredContactFields = { consultorId: string; clientRecordId: string; consultor: string; emailConsultor: string; cliente: string; clienteEmail: string; clienteCnpj: string };
type Props = {
  ownerId?: string | null; ownerType: "agency" | "company"; ownerName: string;
  value: RegisteredContactFields; onChange: (fields: Partial<RegisteredContactFields>) => void;
  errors?: { consultor?: string; cliente?: string };
};
export function ProjectRegisteredContacts({ ownerId, ownerType, ownerName, value, onChange, errors }: Props) {
  const [consultants, setConsultants] = useState<Contact[]>([]);
  const [clients, setClients] = useState<Contact[]>([]);
  const [consultantQuery, setConsultantQuery] = useState(""), [clientQuery, setClientQuery] = useState("");
  const [loading, setLoading] = useState({ consultant: true, client: true });
  const [failures, setFailures] = useState({ consultant: "", client: "" });
  const [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState<"consultant" | "client" | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", password: "", type: "pj" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmation: false });
  const [saving, setSaving] = useState(false), [createError, setCreateError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading({ consultant: true, client: true });
    const timer = setTimeout(() => {
      for (const kind of ["consultant", "client"] as const) {
        const params: Record<string, string> = { kind, search: kind === "consultant" ? consultantQuery : clientQuery, selected_id: kind === "consultant" ? value.consultorId : value.clientRecordId };
        if (ownerId) params[ownerType === "agency" ? "agency_id" : "company_id"] = ownerId;
        apiClient.getProjectContactOptions(params).then((result: any) => {
          if (!active) return;
          (kind === "consultant" ? setConsultants : setClients)(result.data ?? []);
          setFailures(prev => ({ ...prev, [kind]: "" }));
        }).catch((error: any) => { if (active) setFailures(prev => ({ ...prev, [kind]: error.message || "Não foi possível consultar os cadastros." })); })
          .finally(() => { if (active) setLoading(prev => ({ ...prev, [kind]: false })); });
      }
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [ownerId, ownerType, consultantQuery, clientQuery, refresh, value.consultorId, value.clientRecordId]);
  const selectConsultant = (contact: Contact) => onChange({ consultorId: contact.id, consultor: contact.name, emailConsultor: contact.email ?? "" });
  const selectClient = (contact: Contact) => onChange({ clientRecordId: contact.id, cliente: contact.name, clienteEmail: contact.email ?? "", clienteCnpj: contact.document ?? "" });
  const openCreation = (kind: "consultant" | "client") => { setDraft({ name: "", email: "", password: "", type: "pj" }); setConfirmPassword(""); setVisiblePasswords({ password: false, confirmation: false }); setCreateError(""); setCreating(kind); };
  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    if (!creating || saving) return;
    if (creating === "consultant" && draft.password !== confirmPassword) {
      setCreateError("As senhas não coincidem. Confira os dois campos.");
      return;
    }
    setSaving(true); setCreateError("");
    try {
      let created: Contact;
      if (creating === "consultant") {
        const payload = { name: draft.name.trim(), email: draft.email.trim().toLowerCase(), password: draft.password, role: ownerType === "agency" ? "agency_consultant" : "company_consultant" };
        created = ownerType === "agency" ? await apiClient.createAgencyUser(payload) : await apiClient.createCompanyUser(payload);
        selectConsultant(created); setConsultants(prev => [created, ...prev.filter(item => item.id !== created.id)]); setConsultantQuery("");
      } else {
        created = await apiClient.createClientRecord({ name: draft.name.trim(), email: draft.email.trim().toLowerCase() || undefined, type: draft.type, status: "active", ...(ownerId ? { [ownerType === "agency" ? "agency_id" : "company_id"]: ownerId } : {}) });
        selectClient(created); setClients(prev => [created, ...prev.filter(item => item.id !== created.id)]); setClientQuery("");
      }
      setRefresh(count => count + 1); setCreating(null); setDraft({ name: "", email: "", password: "", type: "pj" }); setConfirmPassword(""); setVisiblePasswords({ password: false, confirmation: false });
    } catch (error: any) { setCreateError(error.message || "Não foi possível salvar o cadastro."); }
    finally { setSaving(false); }
  }
  return <section className="col-span-2 space-y-3" aria-label="Cadastros vinculados do projeto">
    <p className="text-xs text-slate-500">Selecione cadastros vinculados a {ownerName || "esta empresa"}. Sem cadastro, é necessário criar antes de salvar o projeto.</p>
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">Consultor responsável *</p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1"><SearchableSelect ariaLabel="Consultor responsável" items={consultants.map(item => ({ value: item.id, label: item.name, sublabel: item.email ?? undefined }))} value={value.consultorId} onValueChange={id => { const item = consultants.find(contact => contact.id === id); if (item) selectConsultant(item); }} placeholder="Pesquisar consultor cadastrado..." searchPlaceholder="Digite nome ou e-mail do consultor..." onSearchChange={setConsultantQuery} emptyMessage="Nenhum consultor encontrado. Cadastre um consultor desta empresa." loading={loading.consultant} errorMessage={failures.consultant} onAddNew={() => openCreation("consultant")} addNewLabel="Cadastrar consultor" /></div>
        <Button type="button" variant="outline" aria-label="Cadastrar consultor" onClick={() => openCreation("consultant")}><UserPlus className="h-4 w-4" /></Button>
      </div>
      {!loading.consultant && !failures.consultant && !consultants.length && <p className="text-xs text-amber-700">É obrigatório cadastrar um usuário com função Consultor nesta empresa.</p>}
      {errors?.consultor && <p role="alert" className="text-xs text-red-600">{errors.consultor}</p>}
      <label className="block text-xs text-slate-600">E-mail do consultor<Input className="mt-1 h-8 text-xs bg-slate-50" value={value.emailConsultor} readOnly placeholder="Preenchido pelo cadastro selecionado" /></label>
    </div>
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">Cliente vinculado *</p>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1"><SearchableSelect ariaLabel="Cliente vinculado" items={clients.map(item => ({ value: item.id, label: item.name, sublabel: item.email || item.document || undefined }))} value={value.clientRecordId} onValueChange={id => { const item = clients.find(contact => contact.id === id); if (item) selectClient(item); }} placeholder="Pesquisar cliente vinculado..." searchPlaceholder="Digite nome ou e-mail do cliente..." onSearchChange={setClientQuery} emptyMessage="Nenhum cliente encontrado. Cadastre um cliente vinculado à empresa." loading={loading.client} errorMessage={failures.client} onAddNew={() => openCreation("client")} addNewLabel="Cadastrar cliente" /></div>
        <Button type="button" variant="outline" aria-label="Cadastrar cliente" onClick={() => openCreation("client")}><Plus className="h-4 w-4" /></Button>
      </div>
      {!loading.client && !failures.client && !clients.length && <p className="text-xs text-amber-700">Cadastre um cliente vinculado à empresa para continuar.</p>}
      {errors?.cliente && <p role="alert" className="text-xs text-red-600">{errors.cliente}</p>}
    </div>
    <FramedModal open={!!creating} onOpenChange={open => { if (!open && !saving) setCreating(null); }} title={creating === "consultant" ? "Cadastrar consultor" : "Cadastrar cliente"} testId="project-contact-create">
      <header className="flex shrink-0 items-center justify-between rounded-xl px-4 py-3 text-white" style={{ background: "var(--app-brand-gradient)" }}>
        <h2 className="text-sm font-semibold">{creating === "consultant" ? "Cadastrar consultor" : "Cadastrar cliente"} — {ownerName}</h2>
        <button type="button" aria-label="Fechar cadastro" disabled={saving} onClick={() => setCreating(null)}><X className="h-4 w-4" /></button>
      </header>
      <form onSubmit={saveContact} className="space-y-3 overflow-y-auto p-4">
        <label className="block text-xs font-medium">Nome *<Input required value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} /></label>
        <label className="block text-xs font-medium">E-mail {creating === "consultant" ? "*" : "(opcional)"}<Input type="email" required={creating === "consultant"} value={draft.email} onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))} /></label>
        {creating === "consultant" ? <>
          <p className="text-xs text-slate-500">Função: Consultor. O usuário ficará vinculado somente a esta empresa.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="consultant-password" className="block text-xs font-medium">Senha de acesso *</label>
              <div className="relative">
                <Input id="consultant-password" className="pr-24" type={visiblePasswords.password ? "text" : "password"} autoComplete="new-password" required minLength={6} value={draft.password} onChange={e => { setDraft(prev => ({ ...prev, password: e.target.value })); setCreateError(""); }} />
                <button type="button" aria-label={visiblePasswords.password ? "Ocultar senha de acesso" : "Mostrar senha de acesso"} aria-pressed={visiblePasswords.password} className="absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-md px-3 text-xs text-violet-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={() => setVisiblePasswords(prev => ({ ...prev, password: !prev.password }))}>
                  {visiblePasswords.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{visiblePasswords.password ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="consultant-confirm-password" className="block text-xs font-medium">Confirmar senha *</label>
              <div className="relative">
                <Input id="consultant-confirm-password" className="pr-24" type={visiblePasswords.confirmation ? "text" : "password"} autoComplete="new-password" required minLength={6} value={confirmPassword} aria-invalid={!!createError && draft.password !== confirmPassword} aria-describedby={createError ? "project-contact-create-error" : undefined} onChange={e => { setConfirmPassword(e.target.value); setCreateError(""); }} />
                <button type="button" aria-label={visiblePasswords.confirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"} aria-pressed={visiblePasswords.confirmation} className="absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-md px-3 text-xs text-violet-700 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600" onClick={() => setVisiblePasswords(prev => ({ ...prev, confirmation: !prev.confirmation }))}>
                  {visiblePasswords.confirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{visiblePasswords.confirmation ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          </div>
        </> : <label className="block text-xs font-medium">Tipo de cliente<select className="mt-1 h-9 w-full rounded-md border px-2" value={draft.type} onChange={e => setDraft(prev => ({ ...prev, type: e.target.value }))}><option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option></select></label>}
        {createError && <p id="project-contact-create-error" role="alert" className="text-xs text-red-600">{createError}</p>}
        <footer className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" disabled={saving} onClick={() => setCreating(null)}>Cancelar cadastro</Button>
          <Button className="btn-brand" type="submit" disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar cadastro</Button>
        </footer>
      </form>
    </FramedModal>
  </section>;
}
