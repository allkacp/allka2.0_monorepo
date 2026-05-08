// @ts-nocheck
/**
 * TermAcceptanceGate
 *
 * Modal bloqueante exibido quando o usuário possui termos pendentes de aceite.
 * Cobre toda a plataforma impedindo o uso até que todos os termos obrigatórios
 * sejam aceitos.
 *
 * Dois cenários:
 *  - acceptance_level === "empresa": termo para o user master/inicial da conta corporativa
 *  - acceptance_level === "usuario": termo individual para qualquer usuário cadastrado
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export interface PendingTerm {
  id: string
  name: string
  version: string
  content: string
  type: string
  is_mandatory: boolean
  acceptance_level: "empresa" | "usuario"
}

interface TermAcceptanceGateProps {
  /** Lista de termos pendentes de aceite para o usuário atual */
  pendingTerms: PendingTerm[]
  /** Informações do usuário atual (para exibição) */
  user?: {
    name?: string
    email?: string
    account_type?: string
    is_master?: boolean
  }
  /** Callback chamado quando todos os termos obrigatórios forem aceitos */
  onAllAccepted: (acceptedTermIds: string[]) => void
}

const TYPE_LABELS: Record<string, string> = {
  terms_of_service: "Termos de Serviço",
  privacy_policy: "Política de Privacidade",
  data_processing: "Processamento de Dados",
  service_agreement: "Acordo de Serviços",
  custom: "Documento",
}

export function TermAcceptanceGate({ pendingTerms, user, onAllAccepted }: TermAcceptanceGateProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!pendingTerms || pendingTerms.length === 0 || done) return null

  const mandatoryTerms = pendingTerms.filter((t) => t.is_mandatory)
  const allMandatoryAccepted = mandatoryTerms.every((t) => accepted[t.id])
  const totalAccepted = pendingTerms.filter((t) => accepted[t.id]).length

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAccept = (id: string) => {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    // Simula envio para API — substituir por chamada real
    await new Promise((resolve) => setTimeout(resolve, 900))
    const acceptedIds = Object.entries(accepted)
      .filter(([, v]) => v)
      .map(([id]) => id)
    setSubmitting(false)
    setDone(true)
    onAllAccepted(acceptedIds)
  }

  // Separar termos por nível para exibição contextual
  const empresaTerms = pendingTerms.filter((t) => t.acceptance_level === "empresa")
  const usuarioTerms = pendingTerms.filter((t) => t.acceptance_level === "usuario")

  return (
    /* Overlay que cobre toda a tela — z-[9999] garante que fica acima de tudo */
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]">

        {/* Cabeçalho fixo */}
        <div className="flex items-start gap-4 p-6 pb-4 border-b">
          <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Termos pendentes de aceite</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.name ? (
                <>Olá, <strong>{user.name}</strong>. Para </>
              ) : (
                "Para "
              )}
              continuar usando a plataforma, é necessário ler e aceitar os documentos abaixo.
            </p>
          </div>
          {/* Contexto: empresa ou usuário */}
          {empresaTerms.length > 0 && (
            <Badge className="shrink-0 bg-blue-100 text-blue-800 border-blue-200 gap-1">
              <Building2 className="h-3 w-3" />
              Conta Empresarial
            </Badge>
          )}
        </div>

        {/* Corpo com scroll */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-3">

            {/* Seção: termos de empresa */}
            {empresaTerms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Building2 className="h-4 w-4" />
                  Termos da Empresa
                  <span className="text-xs font-normal text-blue-500">
                    (aceite como representante da organização)
                  </span>
                </div>
                {empresaTerms.map((term) => (
                  <TermCard
                    key={term.id}
                    term={term}
                    isAccepted={!!accepted[term.id]}
                    isExpanded={!!expanded[term.id]}
                    onToggleExpand={() => toggleExpand(term.id)}
                    onToggleAccept={() => toggleAccept(term.id)}
                  />
                ))}
              </div>
            )}

            {/* Divisor quando há os dois tipos */}
            {empresaTerms.length > 0 && usuarioTerms.length > 0 && (
              <Separator className="my-2" />
            )}

            {/* Seção: termos de usuário */}
            {usuarioTerms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                  <User className="h-4 w-4" />
                  Termos Individuais
                  <span className="text-xs font-normal text-purple-500">
                    (aceite pessoal e intransferível)
                  </span>
                </div>
                {usuarioTerms.map((term) => (
                  <TermCard
                    key={term.id}
                    term={term}
                    isAccepted={!!accepted[term.id]}
                    isExpanded={!!expanded[term.id]}
                    onToggleExpand={() => toggleExpand(term.id)}
                    onToggleAccept={() => toggleAccept(term.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Rodapé fixo */}
        <div className="p-6 pt-4 border-t bg-gray-50 rounded-b-2xl space-y-4">
          {/* Progresso */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalAccepted} de {pendingTerms.length} documento{pendingTerms.length !== 1 ? "s" : ""} aceito{totalAccepted !== 1 ? "s" : ""}
            </span>
            {!allMandatoryAccepted && mandatoryTerms.length > 0 && (
              <div className="flex items-center gap-1.5 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">
                  {mandatoryTerms.filter((t) => !accepted[t.id]).length} obrigatório(s) pendente(s)
                </span>
              </div>
            )}
            {allMandatoryAccepted && (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs">Todos os obrigatórios aceitos</span>
              </div>
            )}
          </div>

          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${pendingTerms.length > 0 ? (totalAccepted / pendingTerms.length) * 100 : 0}%` }}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!allMandatoryAccepted || submitting}
            onClick={handleConfirm}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Registrando aceites...
              </span>
            ) : (
              "Confirmar Aceites e Continuar"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao confirmar, registramos seu aceite com data, hora e IP como exigido pela LGPD.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── TermCard: card individual de cada termo ─────────────────────────────── */

interface TermCardProps {
  term: PendingTerm
  isAccepted: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleAccept: () => void
}

function TermCard({ term, isAccepted, isExpanded, onToggleExpand, onToggleAccept }: TermCardProps) {
  const isEmpresa = term.acceptance_level === "empresa"

  return (
    <div
      className={`rounded-xl border-2 transition-colors ${
        isAccepted ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
      }`}
    >
      {/* Cabeçalho do card */}
      <div className="flex items-start gap-3 p-4">
        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            isAccepted ? "bg-green-100" : isEmpresa ? "bg-blue-50" : "bg-purple-50"
          }`}
        >
          {isAccepted ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className={isEmpresa ? "h-5 w-5 text-blue-600" : "h-5 w-5 text-purple-600"} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{term.name}</span>
            <Badge variant="outline" className="text-xs">
              v{term.version}
            </Badge>
            {term.is_mandatory && (
              <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Obrigatório</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[term.type] || "Documento"}</p>
        </div>

        {/* Botão expandir/recolher */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Recolher
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Ler
            </>
          )}
        </button>
      </div>

      {/* Conteúdo expandível */}
      {isExpanded && (
        <div className="px-4 pb-3">
          <Separator className="mb-3" />
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {term.content}
            </pre>
          </div>
        </div>
      )}

      {/* Checkbox de aceite */}
      <div className="px-4 pb-4">
        <label
          className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors ${
            isAccepted
              ? "border-green-300 bg-green-50"
              : "border-dashed border-gray-300 hover:border-gray-400 bg-white"
          }`}
        >
          <Checkbox
            checked={isAccepted}
            onCheckedChange={onToggleAccept}
            className={isAccepted ? "border-green-500 bg-green-500" : ""}
          />
          <span className={`text-sm font-medium ${isAccepted ? "text-green-700" : "text-gray-600"}`}>
            Li e aceito os termos do documento <strong>{term.name}</strong>
          </span>
        </label>
      </div>
    </div>
  )
}
