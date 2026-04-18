import type React from "react";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Sparkles, Send, SkipForward, CheckCircle2 } from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";

interface ProjectWizardSlidePanelProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onCreateWithAI: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ProjectWizardSlidePanel({
  open,
  onClose,
  onSkip,
  onCreateWithAI,
}: ProjectWizardSlidePanelProps) {
  const { sidebarWidth } = useSidebar();
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsMounted(true));
      return () => cancelAnimationFrame(id);
    }
    if (!isClosing) setIsMounted(false);
  }, [open, isClosing]);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCreateButton, setShowCreateButton] = useState(false);

  const handleStart = () => {
    setStarted(true);

    // Mensagem inicial do usuário
    const userMessage: Message = {
      id: "user-1",
      role: "user",
      content: "Olá! Gostaria de ajuda para criar um novo projeto.",
    };

    setMessages([userMessage]);

    // Simular resposta da IA após um delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: "ai-1",
        role: "assistant",
        content:
          "Olá! Prazer em te ajudar! 🌟\n\nVou te fazer algumas perguntas para entender melhor o seu projeto:\n\n1. Qual é o nome ou título do projeto?\n2. É um projeto recorrente (assinatura) ou avulso?\n3. Qual é o tipo: Company, Agency ou Squad?\n4. Pode me contar um pouco sobre o objetivo e escopo do projeto?\n\nResponda quando estiver pronto!",
      };
      setMessages((prev) => [...prev, aiMessage]);
      setShowCreateButton(true);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 420);
  };

  if (!open && !isClosing) return null;

  return (
    <div
      data-slot="sheet-content"
      data-state={isClosing ? "closed" : "open"}
      className="fixed top-0 z-50 h-[calc(100vh-24px)] bg-background shadow-2xl flex flex-col overflow-hidden border-l border-border data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0"
      style={{
        left: `${sidebarWidth}px`,
        width: `calc(100vw - ${sidebarWidth}px)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-white" />
          <h2 className="text-lg font-semibold text-white">
            {started ? "Criando seu Projeto" : "Novo Projeto"}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!started ? (
          // Welcome Screen
          <div className="h-full flex flex-col items-center justify-center px-8 text-center">
            <div className="mb-8 relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Sou a Allka
            </h3>

            <p className="text-base text-gray-600 mb-8 max-w-md">
              Posso te ajudar a selecionar os produtos certos para este projeto
              e criar um briefing completo!
            </p>

            <div className="flex flex-col gap-3 w-full max-w-sm">
              <Button
                onClick={handleStart}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Começar Conversa
              </Button>

              <Button
                onClick={onSkip}
                variant="outline"
                size="lg"
                className="border-gray-300 bg-transparent"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular e Configurar Manualmente
              </Button>
            </div>
          </div>
        ) : (
          // Chat Interface
          <div className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}

                {showCreateButton && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={onCreateWithAI}
                      size="lg"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Criar Projeto com Ajuda da IA
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4 bg-background shrink-0">
              <div className="max-w-3xl mx-auto space-y-3">
                <div className="flex justify-center">
                  <Button
                    onClick={onSkip}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 bg-transparent"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Pular e Configurar Manualmente
                  </Button>
                </div>

                <form onSubmit={handleSendMessage}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Button
                      type="submit"
                      disabled={!input.trim()}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
