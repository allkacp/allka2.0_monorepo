import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductTaskKanbanCard } from "@/components/product-task-kanban-card"

// Reteste Codex de 02/11: no Kanban de "Produtos → Ver tarefas" o clique no cartão SEO abriu o formulário de
// LANÇAMENTO. Agora ver (olho) e lançar (botão nomeado) são ações separadas e o cartão em si não faz nada.
function renderCard(over: Partial<Parameters<typeof ProductTaskKanbanCard>[0]> = {}) {
  const onView = vi.fn()
  const onLaunch = vi.fn()
  render(
    <ProductTaskKanbanCard
      code="T015718"
      name="SEO Técnico"
      executor="Sem executor atribuído"
      deadline={{ text: "Lançar até 08/11/2026", title: "Prazo para lançar a tarefa — não é o prazo de entrega." }}
      status="Para lançamento"
      rawStatus="PARA_LANCAMENTO"
      borderColor="#f97316"
      onView={onView}
      onLaunch={onLaunch}
      {...over}
    />,
  )
  return { onView, onLaunch }
}

describe("ProductTaskKanbanCard", () => {
  it("clicar no cartão não lança nem abre nada; o olho abre só o detalhe", async () => {
    const user = userEvent.setup()
    const { onView, onLaunch } = renderCard()
    await user.click(screen.getByText("SEO Técnico"))
    await user.click(screen.getByText("T015718"))
    expect(onLaunch).not.toHaveBeenCalled()
    expect(onView).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Ver detalhes da tarefa T015718" }))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onLaunch).not.toHaveBeenCalled()
  })

  it("lançar só pelo botão nomeado, e só em Para lançamento", async () => {
    const user = userEvent.setup()
    const { onView, onLaunch } = renderCard()
    await user.click(screen.getByRole("button", { name: "Lançar tarefa" }))
    expect(onLaunch).toHaveBeenCalledTimes(1)
    expect(onView).not.toHaveBeenCalled()
  })

  it("lançamento já começado vira Continuar lançamento e mostra o substatus Em lançamento (o mesmo do detalhe)", () => {
    renderCard({ rawStatus: "EM_LANCAMENTO" })
    expect(screen.getByRole("button", { name: "Continuar lançamento" })).toBeInTheDocument()
    expect(screen.getByTestId("task-launch-substatus")).toHaveTextContent("Em lançamento")
    expect(screen.queryByRole("button", { name: "Lançar tarefa" })).not.toBeInTheDocument()
  })

  it("ainda não lançada: sem selo de substatus", () => {
    renderCard()
    expect(screen.queryByTestId("task-launch-substatus")).not.toBeInTheDocument()
  })

  it("aguardando informações mostra selo próprio dentro de Para lançamento", () => {
    renderCard({ rawStatus: "AGUARDANDO_INFORMACOES" })
    expect(screen.getByTestId("task-launch-substatus")).toHaveTextContent("Aguard. informações")
    expect(screen.getByRole("button", { name: "Continuar lançamento" })).toBeInTheDocument()
  })

  it("fora de Para lançamento não oferece lançar; o olho continua", async () => {
    const user = userEvent.setup()
    const { onView, onLaunch } = renderCard({ status: "Em Execução", rawStatus: "EM_EXECUCAO", deadline: null })
    expect(screen.queryByRole("button", { name: /lançamento|Lançar/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ver detalhes da tarefa T015718" }))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onLaunch).not.toHaveBeenCalled()
  })
})
