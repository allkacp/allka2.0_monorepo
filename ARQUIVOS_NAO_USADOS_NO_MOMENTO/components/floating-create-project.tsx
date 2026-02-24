// @ts-nocheck
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Bot, FileText, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ProjectCreationModal } from "./project-creation/project-creation-modal"
import { AIProjectCreationModal } from "./project-creation/ai-project-creation-modal"
import { ProjectCloneModal } from "./project-creation/project-clone-modal"
import { useUserPermissions } from "@/lib/user-permissions"

export function FloatingCreateProject() {
  const { hasPermission, currentUserRole } = useUserPermissions()
  const [showManualCreation, setShowManualCreation] = useState(false)
  const [showAICreation, setShowAICreation] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)

  // Only show for users with create_projects permission
  if (!hasPermission(currentUserRole, "create_projects")) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setShowAICreation(true)} className="cursor-pointer">
              <Bot className="mr-2 h-4 w-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium">Criar com IA</span>
                <span className="text-xs text-muted-foreground">Allka.ai te guiará no processo</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowManualCreation(true)} className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4 text-green-600" />
              <div className="flex flex-col">
                <span className="font-medium">Criar Manualmente</span>
                <span className="text-xs text-muted-foreground">Com sugestões da IA</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCloneModal(true)} className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4 text-purple-600" />
              <div className="flex flex-col">
                <span className="font-medium">Clonar Projeto</span>
                <span className="text-xs text-muted-foreground">Criar combo recorrente</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <ProjectCreationModal open={showManualCreation} onClose={() => setShowManualCreation(false)} />

      <AIProjectCreationModal open={showAICreation} onClose={() => setShowAICreation(false)} />

      <ProjectCloneModal open={showCloneModal} onClose={() => setShowCloneModal(false)} />
    </>
  )
}
