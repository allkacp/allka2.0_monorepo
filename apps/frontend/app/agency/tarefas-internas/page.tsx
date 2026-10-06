"use client"

import { InternalTasksBoard } from "@/components/internal-tasks-board"
import { StandardScreen } from "@/components/standard-screen"
import { ClipboardList } from "lucide-react"


export default function AgencyInternalTasksPage() {
  return (
    <StandardScreen icon={ClipboardList} title="Tarefas internas" description="O quadro da sua equipe: crie tarefas, atribua a alguém, acompanhe prazos e comentários. Os passos do PLAC também podem entrar aqui.">
      <InternalTasksBoard />
    </StandardScreen>
  )
}
