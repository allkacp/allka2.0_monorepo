// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Edit, Save, X, Plus, Clock, User } from "lucide-react"
import type { Agency } from "@/types/agency"

interface AgencyKnowledgeBaseProps {
  agency: Agency
}

// Mock knowledge base data
const mockKnowledgeBase = {
  briefing_history: [
    {
      id: 1,
      project_name: "Website Redesign - TechCorp",
      briefing:
        "Cliente busca modernização completa do site corporativo com foco em UX/UI. Preferência por design minimalista e cores corporativas (azul e branco). Target: empresas B2B.",
      created_at: "2024-01-15T10:00:00Z",
      created_by: "Sistema IA",
    },
    {
      id: 2,
      project_name: "Mobile App Development",
      briefing:
        "Desenvolvimento de app mobile para delivery de comida. Cliente valoriza rapidez na entrega e interface intuitiva. Integração com sistemas de pagamento necessária.",
      created_at: "2024-01-10T14:30:00Z",
      created_by: "João Silva",
    },
  ],
  contracting_patterns: [
    {
      id: 1,
      pattern: "Projetos de Website",
      description:
        "Cliente prefere pacotes completos incluindo design, desenvolvimento e SEO básico. Orçamento médio: R$ 15.000 - R$ 25.000",
      frequency: "Mensal",
      last_updated: "2024-01-20T10:00:00Z",
    },
    {
      id: 2,
      pattern: "Campanhas de Marketing",
      description:
        "Foco em campanhas sazonais (Black Friday, Natal). Preferência por estratégias multi-canal com ênfase em redes sociais.",
      frequency: "Trimestral",
      last_updated: "2024-01-18T15:00:00Z",
    },
  ],
  guidelines: [
    {
      id: 1,
      title: "Comunicação com Clientes",
      content:
        "Sempre manter comunicação formal e profissional. Responder e-mails em até 4 horas úteis. Reuniões semanais obrigatórias para projetos em andamento.",
      category: "Comunicação",
      last_updated: "2024-01-15T10:00:00Z",
    },
    {
      id: 2,
      title: "Padrões de Qualidade",
      content:
        "Todo projeto deve passar por revisão interna antes da entrega. Documentação técnica obrigatória. Testes de usabilidade para interfaces.",
      category: "Qualidade",
      last_updated: "2024-01-12T16:00:00Z",
    },
  ],
}

export function AgencyKnowledgeBase({ agency }: AgencyKnowledgeBaseProps) {
  const [knowledgeBase, setKnowledgeBase] = useState(mockKnowledgeBase)
  const [editingGuideline, setEditingGuideline] = useState<number | null>(null)
  const [newGuideline, setNewGuideline] = useState({ title: "", content: "", category: "" })
  const [isAddingGuideline, setIsAddingGuideline] = useState(false)

  const handleSaveGuideline = (id: number, updatedGuideline: any) => {
    setKnowledgeBase((prev) => ({
      ...prev,
      guidelines: prev.guidelines.map((guideline) =>
        guideline.id === id ? { ...guideline, ...updatedGuideline, last_updated: new Date().toISOString() } : guideline,
      ),
    }))
    setEditingGuideline(null)
  }

  const handleAddGuideline = () => {
    if (newGuideline.title && newGuideline.content) {
      const guideline = {
        id: Date.now(),
        ...newGuideline,
        last_updated: new Date().toISOString(),
      }
      setKnowledgeBase((prev) => ({
        ...prev,
        guidelines: [...prev.guidelines, guideline],
      }))
      setNewGuideline({ title: "", content: "", category: "" })
      setIsAddingGuideline(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Base de Conhecimento
          </h2>
          <p className="text-gray-600">Histórico de briefings, padrões de contratação e diretrizes da agência</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Brain className="h-3 w-3" />
          Alimentado por IA
        </Badge>
      </div>

      <Tabs defaultValue="briefings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="briefings">Histórico de Briefings</TabsTrigger>
          <TabsTrigger value="patterns">Padrões de Contratação</TabsTrigger>
          <TabsTrigger value="guidelines">Diretrizes</TabsTrigger>
        </TabsList>

        <TabsContent value="briefings" className="space-y-4">
          {knowledgeBase.briefing_history.map((briefing) => (
            <Card key={briefing.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{briefing.project_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      {new Date(briefing.created_at).toLocaleDateString()}
                      <User className="h-4 w-4 ml-2" />
                      {briefing.created_by}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{briefing.briefing}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {knowledgeBase.contracting_patterns.map((pattern) => (
            <Card key={pattern.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pattern.pattern}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Frequência: {pattern.frequency}
                      </span>
                      <span>Atualizado em {new Date(pattern.last_updated).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{pattern.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddingGuideline(true)} disabled={isAddingGuideline}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Diretriz
            </Button>
          </div>

          {isAddingGuideline && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Diretriz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newGuideline.title}
                    onChange={(e) => setNewGuideline({ ...newGuideline, title: e.target.value })}
                    placeholder="Ex: Padrões de Comunicação"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Categoria</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={newGuideline.category}
                    onChange={(e) => setNewGuideline({ ...newGuideline, category: e.target.value })}
                    placeholder="Ex: Comunicação, Qualidade, Processo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Conteúdo</label>
                  <Textarea
                    value={newGuideline.content}
                    onChange={(e) => setNewGuideline({ ...newGuideline, content: e.target.value })}
                    placeholder="Descreva a diretriz..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddGuideline}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingGuideline(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {knowledgeBase.guidelines.map((guideline) => (
            <Card key={guideline.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{guideline.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <Badge variant="outline">{guideline.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Atualizado em {new Date(guideline.last_updated).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingGuideline(guideline.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingGuideline === guideline.id ? (
                  <GuidelineEditor
                    guideline={guideline}
                    onSave={(updated) => handleSaveGuideline(guideline.id, updated)}
                    onCancel={() => setEditingGuideline(null)}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">{guideline.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GuidelineEditor({ guideline, onSave, onCancel }: any) {
  const [title, setTitle] = useState(guideline.title)
  const [content, setContent] = useState(guideline.content)
  const [category, setCategory] = useState(guideline.category)

  const handleSave = () => {
    onSave({ title, content, category })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Título</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Categoria</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Conteúdo</label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}
