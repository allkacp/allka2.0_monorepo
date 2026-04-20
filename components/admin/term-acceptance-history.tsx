// @ts-nocheck
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { Search, Download, Calendar, User, FileText, Building2 } from "lucide-react"
import type { TermAcceptance } from "@/types/terms"

interface TermAcceptanceHistoryProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  acceptances?: TermAcceptance[]
}

// Acceptances loaded from API via parent component
const MOCK_ACCEPTANCES: TermAcceptance[] = []

export function TermAcceptanceHistory({ open, onOpenChange, acceptances = MOCK_ACCEPTANCES }: TermAcceptanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAcceptances, setFilteredAcceptances] = useState(acceptances)

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    const filtered = acceptances.filter(
      (acceptance) =>
        acceptance.user_name?.toLowerCase().includes(value.toLowerCase()) ||
        acceptance.user_email?.toLowerCase().includes(value.toLowerCase()) ||
        acceptance.term_name?.toLowerCase().includes(value.toLowerCase()),
    )
    setFilteredAcceptances(filtered)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Usuário", "Email", "Tipo de Conta", "Nível de Aceite", "Termo", "Versão", "Data de Aceite", "IP", "Status"],
      ...filteredAcceptances.map((acceptance) => [
        acceptance.user_name || "",
        acceptance.user_email || "",
        acceptance.account_type || "",
        acceptance.acceptance_level === "empresa" ? "Empresa" : "Usuário",
        acceptance.term_name || "",
        acceptance.term_version || "",
        new Date(acceptance.accepted_at).toLocaleString("pt-BR"),
        acceptance.ip_address || "",
        acceptance.is_current ? "Atual" : "Histórico",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historico-aceites-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const columns = [
    {
      accessorKey: "user_name",
      header: "Usuário",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.original.user_name}</div>
            <div className="text-xs text-gray-500">{row.original.user_email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "term_name",
      header: "Termo",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-sm">{row.original.term_name}</div>
            <div className="text-xs text-gray-500">v{row.original.term_version}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "acceptance_level",
      header: "Nível",
      cell: ({ row }: any) =>
        row.original.acceptance_level === "empresa" ? (
          <div className="flex items-center gap-1 text-blue-700">
            <Building2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Empresa</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-purple-700">
            <User className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Usuário</span>
          </div>
        ),
    },
    {
      accessorKey: "accepted_at",
      header: "Data de Aceite",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm">{new Date(row.original.accepted_at).toLocaleDateString("pt-BR")}</div>
            <div className="text-xs text-gray-500">
              {new Date(row.original.accepted_at).toLocaleTimeString("pt-BR")}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP",
      cell: ({ row }: any) => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{row.original.ip_address}</code>,
    },
    {
      accessorKey: "is_current",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_current ? "default" : "secondary"}>
          {row.original.is_current ? "Atual" : "Histórico"}
        </Badge>
      ),
    },
  ]

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por usuário, email ou termo..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">{acceptances.length}</div>
            <div className="text-xs text-gray-600">Total de Aceites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{acceptances.filter((a) => a.is_current).length}</div>
            <div className="text-xs text-gray-600">Aceites Atuais</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(acceptances.map((a) => a.user_id)).size}
            </div>
            <div className="text-xs text-gray-600">Usuários Únicos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(acceptances.map((a) => a.term_id)).size}
            </div>
            <div className="text-xs text-gray-600">Termos Diferentes</div>
          </CardContent>
        </Card>
      </div>

      <DataTable columns={columns} data={filteredAcceptances} searchKey="user_name" />
    </div>
  )

  // Se passado open/onOpenChange, renderiza como Dialog; caso contrário, renderiza inline
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Aceites de Termos
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return content
}
