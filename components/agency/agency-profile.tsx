// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  MapPin,
  Phone,
  Mail,
  FileText,
  Crown,
  AlertCircle,
  Download,
  Trash2,
  Edit2,
  Upload,
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  Eye,
} from "lucide-react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { LogoEditor } from "@/components/logo-editor"
import type { Agency } from "@/types/agency"

interface AgencyProfileProps {
  agency: Agency
  isAdmin?: boolean
  onUpdate?: (data: Partial<Agency>) => void
  onPromoteToPartner?: () => void
}

export function AgencyProfile({ agency, isAdmin = false, onUpdate, onPromoteToPartner }: AgencyProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: agency.name,
    email: agency.email,
    phone: agency.phone,
    cnpj: agency.cnpj,
    address: { ...agency.address },
  })
  const [fileToDelete, setFileToDelete] = useState<number | null>(null)
  const [fileToView, setFileToView] = useState<{ id: number; name: string; url: string } | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([
    {
      id: 1,
      name: "Contrato de Prestação de Serviços - Modelo.pdf",
      type: "pdf",
      file_size: 245760,
      file_url: "/placeholder.svg?height=400&width=600",
      uploaded_at: new Date().toISOString(),
      can_delete: false,
      is_template: true,
    },
    {
      id: 2,
      name: "Proposta Comercial - Template.pdf",
      type: "pdf",
      file_size: 189440,
      file_url: "/placeholder.svg?height=400&width=600",
      uploaded_at: new Date().toISOString(),
      can_delete: false,
      is_template: true,
    },
    ...agency.files,
  ])
  const [showStatsDetails, setShowStatsDetails] = useState(false)

  const handleSave = () => {
    onUpdate?.(formData)
    setIsEditing(false)
  }

  const handleDeleteFile = (fileId: number) => {
    console.log("[v0] Deleting file:", fileId)
    setUploadedFiles((files) => files.filter((file) => file.id !== fileId))
    setFileToDelete(null)
  }

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    console.log("[v0] Downloading file:", fileName, fileUrl)
    const link = document.createElement("a")
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setFileToView(null)
  }

  const handleFilesSelected = (files: File[]) => {
    console.log("[v0] Files selected for upload:", files)

    const newFiles = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      type: file.type.includes("pdf") ? "pdf" : "image",
      file_size: file.size,
      file_url: URL.createObjectURL(file),
      uploaded_at: new Date().toISOString(),
      can_delete: true,
      is_template: false,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
    setShowUploadDialog(false)
  }

  const handleLogoChange = (file: File) => {
    console.log("[v0] Logo changed:", file.name)
    onUpdate?.({ logo: URL.createObjectURL(file) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LogoEditor currentLogo={agency.logo} onLogoChange={handleLogoChange} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{agency.name}</h1>
            <p className="text-slate-600 dark:text-slate-400">CNPJ: {agency.cnpj}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusBadge(agency.status).color}>{getStatusBadge(agency.status).text}</Badge>
              {agency.is_partner && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800">
                  <Crown className="h-3 w-3 mr-1" />
                  Partner {agency.partner_level}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            >
              <Edit2 className="h-4 w-4" />
              Editar Dados
            </Button>
          )}
          {isAdmin && !agency.is_partner && agency.status === "active" && (
            <Button
              onClick={onPromoteToPartner}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 gap-2 shadow-md"
            >
              <Crown className="h-4 w-4" />
              Promover a Partner
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {agency.status === "pending" && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-900 dark:text-amber-200">
                <strong>Conta pendente de aprovação.</strong> Aguarde a análise da equipe Allka para ativação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 pb-4">
          <CardTitle className="text-slate-900 dark:text-slate-100">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Nome da Agência
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    CNPJ
                  </Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="street" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Endereço
                  </Label>
                  <Input
                    id="street"
                    value={`${formData.address.street}, ${formData.address.number}`}
                    onChange={(e) => {
                      const [street, number] = e.target.value.split(",")
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: street?.trim() || "", number: number?.trim() || "" },
                      })
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  Salvar Alterações
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{agency.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{agency.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">CNPJ</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{agency.cnpj}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 md:col-span-2 lg:col-span-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Endereço</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {agency.address.street}, {agency.address.number}
                    {agency.address.complement && ` - ${agency.address.complement}`} • {agency.address.neighborhood} •{" "}
                    {agency.address.city}/{agency.address.state} • CEP: {agency.address.zipCode}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="h-5 w-5 text-purple-500" />
              Arquivos e Documentos
            </CardTitle>
            <Button
              onClick={() => setShowUploadDialog(true)}
              size="sm"
              variant="outline"
              className="gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-600 hover:border-purple-300"
            >
              <Upload className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {uploadedFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 border rounded-xl hover:shadow-md transition-all ${
                      file.is_template
                        ? "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText
                            className={`h-4 w-4 flex-shrink-0 ${file.is_template ? "text-purple-500" : "text-blue-500"}`}
                          />
                          {file.is_template && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0 h-5 bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
                            >
                              Modelo
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm mb-1 line-clamp-2">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFileToView({ id: file.id, name: file.name, url: file.file_url })}
                        className="flex-1 gap-1 h-8 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                      </Button>
                      {(isAdmin || file.can_delete) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFileToDelete(file.id)}
                          className="gap-1 h-8 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">Nenhum arquivo enviado</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50/30 dark:from-slate-900 dark:to-green-950/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-slate-100">Estatísticas de Desempenho</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatsDetails(true)}
              className="gap-2 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 hover:border-green-300"
            >
              <Eye className="h-4 w-4" />
              Ver Detalhes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90">Projetos Total</p>
                </div>
                <p className="text-4xl font-bold mb-1">{agency.stats.total_projects}</p>
                <p className="text-xs opacity-75">Desde o início</p>
              </div>
            </div>

            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90">Projetos Ativos</p>
                </div>
                <p className="text-4xl font-bold mb-1">{agency.stats.active_projects}</p>
                <p className="text-xs opacity-75">Em andamento</p>
              </div>
            </div>

            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90">MRR</p>
                </div>
                <p className="text-4xl font-bold mb-1">R$ {(agency.stats.mrr / 1000).toFixed(1)}k</p>
                <p className="text-xs opacity-75">Receita mensal recorrente</p>
              </div>
            </div>

            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90">Agências Lideradas</p>
                </div>
                <p className="text-4xl font-bold mb-1">{agency.stats.led_agencies}</p>
                <p className="text-xs opacity-75">MRR: R$ {(agency.stats.led_agencies_mrr / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={fileToDelete !== null} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && handleDeleteFile(fileToDelete)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={fileToView !== null} onOpenChange={() => setFileToView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visualizar Documento</DialogTitle>
            <DialogDescription>Deseja baixar este documento?</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{fileToView?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clique em baixar para salvar o arquivo</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToView(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => fileToView && handleDownloadFile(fileToView.url, fileToView.name)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Arquivos</DialogTitle>
            <DialogDescription>
              Faça upload de apresentações, certificados e outros documentos da agência
            </DialogDescription>
          </DialogHeader>
          <FileUploadZone onFilesSelected={handleFilesSelected} />
        </DialogContent>
      </Dialog>

      {/* Statistics Details Modal */}
      <Dialog open={showStatsDetails} onOpenChange={setShowStatsDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes das Estatísticas</DialogTitle>
            <DialogDescription>Visão completa do desempenho da agência</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">78%</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">+12% vs mês anterior</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">R$ 8.5k</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">+5% vs mês anterior</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Clientes Ativos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">32</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Últimos 30 dias</p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Crescimento MRR</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">+18%</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Últimos 3 meses</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Distribuição de Projetos</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Desenvolvimento Web</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">18 projetos</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Marketing Digital</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">15 projetos</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Design & Branding</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">12 projetos</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStatsDetails(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusBadge(status: string) {
  const variants = {
    pending: {
      variant: "outline" as const,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      text: "Aguardando Aprovação",
    },
    active: {
      variant: "default" as const,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      text: "Ativa",
    },
    inactive: {
      variant: "secondary" as const,
      color: "text-slate-600 bg-slate-50 border-slate-200",
      text: "Inativa",
    },
    suspended: {
      variant: "destructive" as const,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      text: "Suspensa",
    },
  }
  return variants[status as keyof typeof variants] || variants.pending
}
