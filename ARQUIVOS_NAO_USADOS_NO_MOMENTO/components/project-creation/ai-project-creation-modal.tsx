
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Bot, Send, User, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AIProjectCreationModalProps {
  open: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  suggestions?: ProductSuggestion[]
  projectData?: Partial<ProjectData>
}

interface ProductSuggestion {
  id: string
  name: string
  description: string
  price: number
  reason: string
  selected: boolean
}

interface ProjectData {
  name: string
  description: string
  goals: string[]
  target_audience: string
  industry: string
  budget: number
  timeline: string
  client_info: {
    name: string
    contact: string
    company: string
  }
}

export function AIProjectCreationModal({ open, onClose }: AIProjectCreationModalProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [projectData, setProjectData] = useState<Partial<ProjectData>>({})
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize conversation
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content:
          "Olá! Sou a Allka.ai e vou te ajudar a criar o projeto perfeito. Vamos começar com algumas perguntas para entender melhor suas necessidades.\n\nPara começar, me conte: qual é o objetivo principal deste projeto?",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [open, messages.length])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setCurrentMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/projects/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          projectData,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          suggestions: data.suggestions,
          projectData: data.projectData,
        }

        setMessages((prev) => [...prev, assistantMessage])

        if (data.projectData) {
          setProjectData((prev) => ({ ...prev, ...data.projectData }))
        }
      } else {
        throw new Error("Failed to get AI response")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao comunicar com a IA",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const createProject = async () => {
    if (!projectData.name || !projectData.description) {
      toast({
        title: "Erro",
        description: "Informações insuficientes para criar o projeto",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/projects/create-from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData,
          selectedProducts,
          chatHistory: messages,
        }),
      })

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Projeto criado com sucesso!",
        })
        onClose()
        window.location.reload()
      } else {
        throw new Error("Failed to create project")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar projeto",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const isProjectReady = projectData.name && projectData.description && projectData.goals?.length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Criar Projeto com Allka.ai
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[calc(90vh-120px)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                      <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === "user" ? "bg-blue-100" : "bg-green-100"
                          }`}
                        >
                          {message.role === "user" ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bot className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <Card className={message.role === "user" ? "bg-blue-50" : ""}>
                          <CardContent className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Product Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="ml-11 space-y-2">
                        <p className="text-sm font-medium">Produtos Sugeridos:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {message.suggestions.map((suggestion) => (
                            <Card
                              key={suggestion.id}
                              className={`cursor-pointer transition-all ${
                                selectedProducts.includes(suggestion.id)
                                  ? "ring-2 ring-blue-500 bg-blue-50"
                                  : "hover:shadow-md"
                              }`}
                              onClick={() => toggleProductSelection(suggestion.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{suggestion.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      <strong>Por que:</strong> {suggestion.reason}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-sm">R$ {suggestion.price.toLocaleString()}</p>
                                    {selectedProducts.includes(suggestion.id) && (
                                      <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Allka.ai está pensando...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="Digite sua mensagem..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !currentMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Project Summary Sidebar */}
          <div className="w-80 border-l pl-6">
            <div className="sticky top-0">
              <h3 className="font-semibold mb-4">Resumo do Projeto</h3>

              <ScrollArea className="h-[calc(90vh-200px)]">
                <div className="space-y-4">
                  {projectData.name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome</p>
                      <p className="text-sm">{projectData.name}</p>
                    </div>
                  )}

                  {projectData.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                      <p className="text-sm">{projectData.description}</p>
                    </div>
                  )}

                  {projectData.goals && projectData.goals.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Objetivos</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {projectData.goals.map((goal, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {projectData.target_audience && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Público-Alvo</p>
                      <p className="text-sm">{projectData.target_audience}</p>
                    </div>
                  )}

                  {projectData.industry && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Setor</p>
                      <p className="text-sm">{projectData.industry}</p>
                    </div>
                  )}

                  {projectData.budget && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Orçamento</p>
                      <p className="text-sm">R$ {projectData.budget.toLocaleString()}</p>
                    </div>
                  )}

                  {selectedProducts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Produtos Selecionados</p>
                      <p className="text-sm">{selectedProducts.length} produto(s)</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Button onClick={createProject} disabled={!isProjectReady || isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Projeto"
                  )}
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
