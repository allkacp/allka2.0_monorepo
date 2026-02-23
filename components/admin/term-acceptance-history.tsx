// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { Search, Download, Calendar, User, FileText } from "lucide-react"
import type { TermAcceptance } from "@/types/terms"

interface TermAcceptanceHistoryProps {
  acceptances?: TermAcceptance[]
}

export function TermAcceptanceHistory({ acceptances = [] }: TermAcceptanceHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAcceptances, setFilteredAcceptances] = useState(acceptances)

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    const filtered = acceptances.filter(
      (acceptance) =>
        acceptance.user_name?.toLowerCase().includes(value.toLowerCase()) ||
        acceptance.user_email?.toLowerCase().includes(value.toLowerCase()) ||
        acceptance.term_title?.toLowerCase().includes(value.toLowerCase()),
    )
    setFilteredAcceptances(filtered)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Usuário", "Email", "Termo", "Versão", "Data de Aceite", "IP", "Status"],
      ...filteredAcceptances.map((acceptance) => [
        acceptance.user_name || "",
        acceptance.user_email || "",
        acceptance.term_title || "",
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
            <div className="text-sm text-gray-500">{row.original.user_email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "term_title",
      header: "Termo",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.original.term_title}</div>
            <div className="text-sm text-gray-500">v{row.original.term_version}</div>
          </div>
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
            <div>{new Date(row.original.accepted_at).toLocaleDateString("pt-BR")}</div>
            <div className="text-sm text-gray-500">
              {new Date(row.original.accepted_at).toLocaleTimeString("pt-BR")}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP",
      cell: ({ row }: any) => <code className="text-sm bg-gray-100 px-2 py-1 rounded">{row.original.ip_address}</code>,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Aceites
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
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

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{acceptances.length}</div>
              <div className="text-sm text-gray-600">Total de Aceites</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{acceptances.filter((a) => a.is_current).length}</div>
              <div className="text-sm text-gray-600">Aceites Atuais</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(acceptances.map((a) => a.user_id)).size}
              </div>
              <div className="text-sm text-gray-600">Usuários Únicos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(acceptances.map((a) => a.term_id)).size}
              </div>
              <div className="text-sm text-gray-600">Termos Diferentes</div>
            </CardContent>
          </Card>
        </div>

        <DataTable columns={columns} data={filteredAcceptances} searchKey="user_name" />
      </CardContent>
    </Card>
  )
}
