"use client"

// Chat aberto separado, numa janela própria do navegador (botão "Abrir chat em outra janela").
// Logada, mas sem o menu da plataforma; usa as mesmas cores do tema.
import { SettingsProvider } from "@/contexts/settings-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { ChatProvider } from "@/contexts/chat-context"
import { ChatStandalone } from "@/components/chat-widget"

export default function ChatWindowPage() {
  return (
    <SettingsProvider>
      <SidebarProvider>
        <ChatProvider>
          <ChatStandalone />
        </ChatProvider>
      </SidebarProvider>
    </SettingsProvider>
  )
}
