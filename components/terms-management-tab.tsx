
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Clock, Eye, FileText, AlertTriangle, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

interface Term {
  id: number
  name: string
  version: string
  publishedAt: string
  signedAt?: string
  expiresAt?: string
  content: string
  status: "active" | "pending" | "expired"
}

interface TermsManagementTabProps {
  company: any
}

export function TermsManagementTab({ company }: TermsManagementTabProps) {
  const { toast } = useToast()
  const [terms, setTerms] = useState<Term[]>([])

  useEffect(() => {
    apiClient.getTerms().then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setTerms(list.map((t: any) => ({
        id: t.id,
        name: t.name ?? t.title ?? '',
        version: t.version ?? 'v1.0',
        publishedAt: t.publishedAt ?? t.createdAt ?? '',
        signedAt: t.signedAt,
        expiresAt: t.expiresAt,
        content: t.content ?? '',
        status: t.status ?? 'pending',
      })));
    }).catch(() => {});
  }, [])
  const [showTermModal, setShowTermModal] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null)
  const [showSignConfirm, setShowSignConfirm] = useState(false)
  const [termToSign, setTermToSign] = useState<Term | null>(null)

  const activeTerms = terms.filter(t => t.status === "active")
  const pendingTerms = terms.filter(t => t.status === "pending")
  const expiredTerms = terms.filter(t => t.status === "expired")

  const handleViewTerm = (term: Term) => { setSelectedTerm(term); setShowTermModal(true) }
  const handleSignTerm = (term: Term) => { setTermToSign(term); setShowSignConfirm(true) }

  const confirmSignTerm = () => {
    if (!termToSign) return
    setTerms(prev => prev.map(t => t.id === termToSign.id
      ? { ...t, status: "active" as const, signedAt: new Date().toISOString().split("T")[0], expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] }
      : t
    ))
    toast({ title: "Sucesso!", description: `${termToSign.name} foi assinado com sucesso.` })
    setShowSignConfirm(false)
    setTermToSign(null)
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR")

  return (
    <div className="space-y-5">

      {/* ── Sumário de status ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Ativos</p>
            <p className="text-xl font-bold text-emerald-600 leading-none">{activeTerms.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Pendentes</p>
            <p className="text-xl font-bold text-amber-600 leading-none">{pendingTerms.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Expirados</p>
            <p className="text-xl font-bold text-slate-500 leading-none">{expiredTerms.length}</p>
          </div>
        </div>
      </div>

      {/* ── Termos Pendentes ── */}
      {pendingTerms.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pendentes de assinatura</span>
            <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{pendingTerms.length}</span>
          </div>
          <div className="space-y-2">
            {pendingTerms.map(term => (
              <div key={term.id} className="bg-white rounded-xl border-2 border-amber-200 px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800">{term.name}</p>
                    <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">{term.version}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Publicado em {fmt(term.publishedAt)} · <span className="text-amber-600 font-semibold">Assinatura obrigatória</span></p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleViewTerm(term)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleSignTerm(term)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold btn-brand rounded-lg transition-colors"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Assinar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Termos Ativos ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ativos</span>
          <span className="ml-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{activeTerms.length}</span>
        </div>
        {activeTerms.length > 0 ? (
          <div className="space-y-1.5">
            {activeTerms.map(term => (
              <div key={term.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:border-slate-300 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800">{term.name}</p>
                    <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">{term.version}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {term.signedAt && <>Assinado em {fmt(term.signedAt)}</>}
                    {term.expiresAt && <> · Válido até {fmt(term.expiresAt)}</>}
                  </p>
                </div>
                <button
                  onClick={() => handleViewTerm(term)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex-shrink-0"
                >
                  <Eye className="h-3 w-3" />
                  Ver
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-slate-200 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">Nenhum termo ativo</p>
          </div>
        )}
      </div>

      {/* ── Termos Expirados ── */}
      {expiredTerms.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Expirados</span>
            <span className="ml-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{expiredTerms.length}</span>
          </div>
          <div className="space-y-1.5">
            {expiredTerms.map(term => (
              <div key={term.id} className="bg-white/60 rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 opacity-70">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 line-through">{term.name}</p>
                    <span className="text-[9px] font-semibold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-200">{term.version}</span>
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Expirado</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmt(term.publishedAt)} → {fmt(term.expiresAt || "")}</p>
                </div>
                <button
                  onClick={() => handleViewTerm(term)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 text-[10px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex-shrink-0"
                >
                  <Eye className="h-3 w-3" />
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Visualizar Termo ── */}
      {showTermModal && selectedTerm && (
        <Dialog open={showTermModal} onOpenChange={setShowTermModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTerm.status === "active" ? "bg-emerald-100" : selectedTerm.status === "pending" ? "bg-amber-100" : "bg-slate-100"}`}>
                  <FileText className={`h-4 w-4 ${selectedTerm.status === "active" ? "text-emerald-600" : selectedTerm.status === "pending" ? "text-amber-600" : "text-slate-400"}`} />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold">{selectedTerm.name}</DialogTitle>
                  <DialogDescription className="text-[11px]">
                    {selectedTerm.version} · Publicado em {fmt(selectedTerm.publishedAt)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="max-h-52 overflow-y-auto bg-slate-50 rounded-lg p-3.5 text-xs text-slate-700 leading-relaxed border border-slate-200">
              {selectedTerm.content}
            </div>
            {selectedTerm.signedAt && (
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-[11px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                Assinado em {fmt(selectedTerm.signedAt)}
                {selectedTerm.expiresAt && <> · Válido até {fmt(selectedTerm.expiresAt)}</>}
              </div>
            )}
            <DialogFooter>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowTermModal(false)}>
                Fechar
              </Button>
              {selectedTerm.status === "pending" && (
                <Button size="sm" className="text-xs h-8 btn-brand" onClick={() => { setShowTermModal(false); handleSignTerm(selectedTerm) }}>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Assinar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: Confirmar Assinatura ── */}
      {showSignConfirm && termToSign && (
        <Dialog open={showSignConfirm} onOpenChange={setShowSignConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold">Confirmar Assinatura</DialogTitle>
            </DialogHeader>
            <div className="bg-blue-50 border border-blue-200 px-3.5 py-3 rounded-lg space-y-1">
              <p className="text-xs text-blue-800">
                A empresa <strong>{company.name}</strong> irá assinar:
              </p>
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {termToSign.name} <span className="font-normal text-blue-600">— {termToSign.version}</span>
              </p>
            </div>
            <p className="text-[10px] text-slate-400">Esta ação será registrada para auditoria e não poderá ser desfeita.</p>
            <DialogFooter>
              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowSignConfirm(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="text-xs h-8 btn-brand" onClick={confirmSignTerm}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
