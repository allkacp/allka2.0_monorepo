
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, FileText, Star, Clock, DollarSign, TrendingUp, Link2, Copy } from "lucide-react"

interface ImportTaskTemplateModalProps {
  open: boolean
  onClose: () => void
  onImport: (template: any, linkedToOriginal: boolean) => void
}

export default function ImportTaskTemplateModal({ open, onClose, onImport }: ImportTaskTemplateModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState<"name" | "code">("name")
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  const mockTemplates = [
    {
      id: "1",
      code: "TPL-001",
      name: "Landing Page Responsiva",
      description: "Criação de landing page responsiva com foco em conversão",
      category: "Web Development",
      base_price: 800,
      estimated_hours: 16,
      stats: { average_rating: 4.6, total_executions: 45 },
    },
    {
      id: "2",
      code: "TPL-002",
      name: "Design de Posts Instagram",
      description: "Criação de posts para Instagram com identidade visual",
      category: "Design",
      base_price: 300,
      estimated_hours: 8,
      stats: { average_rating: 4.8, total_executions: 120 },
    },
    {
      id: "3",
      code: "TPL-003",
      name: "Sistema de Dashboard Administrativo",
      description: "Dashboard completo com gráficos e relatórios personalizados",
      category: "Web Development",
      base_price: 2500,
      estimated_hours: 40,
      stats: { average_rating: 4.9, total_executions: 22 },
    },
    {
      id: "4",
      code: "TPL-004",
      name: "E-commerce Completo",
      description: "Loja virtual completa com carrinho, checkout e painel admin",
      category: "Web Development",
      base_price: 5000,
      estimated_hours: 80,
      stats: { average_rating: 4.7, total_executions: 15 },
    },
    {
      id: "5",
      code: "TPL-005",
      name: "Campanha de Email Marketing",
      description: "Criação de template responsivo para email marketing",
      category: "Design",
      base_price: 400,
      estimated_hours: 10,
      stats: { average_rating: 4.5, total_executions: 67 },
    },
  ]

  const filteredTemplates = mockTemplates.filter((t) => {
    const searchValue = searchTerm.toLowerCase()
    if (searchType === "code") {
      return t.code.toLowerCase().includes(searchValue)
    }
    return t.name.toLowerCase().includes(searchValue)
  })

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
    setShowImportDialog(true)
  }

  const handleConfirmImport = (linkedToOriginal: boolean) => {
    onImport(selectedTemplate, linkedToOriginal)
    setShowImportDialog(false)
    onClose()
  }

  return (
    <>
      {/* Main Import Modal */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Importar Modelo de Tarefa
            </DialogTitle>
            <DialogDescription>Selecione um modelo pré-configurado para adicionar ao produto</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4 flex-shrink-0">
            {/* Search Type Toggle */}
            <div className="flex gap-2">
              <Button
                variant={searchType === "name" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("name")}
                className={
                  searchType === "name"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    : ""
                }
              >
                Por Nome
              </Button>
              <Button
                variant={searchType === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("code")}
                className={
                  searchType === "code"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    : ""
                }
              >
                Por COD
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchType === "code" ? "Buscar por COD..." : "Buscar por nome..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6 pb-6">
            <ScrollArea className="h-[calc(90vh-280px)]">
              <div className="space-y-3 pr-4">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum modelo encontrado</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="group border rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base mb-1">{template.name}</h4>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {template.code}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSelectTemplate(template)}
                              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-shrink-0"
                            >
                              Selecionar
                            </Button>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              R$ {template.base_price.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.estimated_hours}h
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {template.stats.average_rating}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {template.stats.total_executions} execuções
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Mode Selection Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Como deseja importar este modelo?</DialogTitle>
            <DialogDescription>
              Escolha se deseja vincular ao modelo original ou criar uma cópia independente
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Linked Mode */}
            <button
              onClick={() => handleConfirmImport(true)}
              className="group relative p-6 border-2 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-200">
                  <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Vincular ao Original</h3>
                  <p className="text-sm text-muted-foreground">
                    Atualizações no modelo original serão refletidas automaticamente neste produto
                  </p>
                </div>
              </div>
              <Badge className="absolute top-3 right-3 bg-blue-500">Recomendado</Badge>
            </button>

            {/* Copy Mode */}
            <button
              onClick={() => handleConfirmImport(false)}
              className="group relative p-6 border-2 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-200">
                  <Copy className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Criar Cópia</h3>
                  <p className="text-sm text-muted-foreground">
                    Cria uma cópia independente que pode ser editada livremente sem afetar o original
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
