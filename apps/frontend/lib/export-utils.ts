// Utilitários de exportação para a plataforma Allka
import type { DateRange } from "react-day-picker"

export interface ProjectData {
  id: string | number
  name: string
  status: string
  type: string
  budget: number
  spent: number
  company?: string
  agency?: string
  createdDate: string
  dueDate?: string
  progress?: number
  [key: string]: unknown
}

function formatDateRange(dateRange: DateRange): string {
  const from = dateRange.from ? dateRange.from.toLocaleDateString("pt-BR") : ""
  const to = dateRange.to ? dateRange.to.toLocaleDateString("pt-BR") : from
  return `${from}_${to}`.replace(/\//g, "-")
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ─── CSV ───────────────────────────────────────────────────────────────────────

export function exportToCSV(data: ProjectData[], dateRange: DateRange): void {
  const headers = [
    "ID",
    "Nome",
    "Status",
    "Tipo",
    "Orçamento",
    "Gasto",
    "Empresa",
    "Agência",
    "Data Criação",
    "Data Entrega",
    "Progresso (%)",
  ]

  const rows = data.map((p) => [
    p.id,
    p.name,
    p.status,
    p.type,
    formatCurrency(p.budget),
    formatCurrency(p.spent),
    p.company ?? "",
    p.agency ?? "",
    p.createdDate,
    p.dueDate ?? "",
    p.progress ?? 0,
  ])

  const csvContent =
    "\uFEFF" + // BOM para UTF-8 no Excel
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n")

  downloadFile(csvContent, `projetos_${formatDateRange(dateRange)}.csv`, "text/csv;charset=utf-8;")
}

// ─── Excel (CSV com separador de tabulação, abre no Excel) ────────────────────

export function exportToExcel(data: ProjectData[], dateRange: DateRange): void {
  const headers = [
    "ID",
    "Nome",
    "Status",
    "Tipo",
    "Orçamento (R$)",
    "Gasto (R$)",
    "Empresa",
    "Agência",
    "Data Criação",
    "Data Entrega",
    "Progresso (%)",
  ]

  const rows = data.map((p) => [
    p.id,
    p.name,
    p.status,
    p.type,
    p.budget,
    p.spent,
    p.company ?? "",
    p.agency ?? "",
    p.createdDate,
    p.dueDate ?? "",
    p.progress ?? 0,
  ])

  const tsvContent =
    "\uFEFF" +
    [headers, ...rows].map((row) => row.join("\t")).join("\n")

  downloadFile(
    tsvContent,
    `projetos_${formatDateRange(dateRange)}.xls`,
    "application/vnd.ms-excel;charset=utf-8;"
  )
}

// ─── PDF (HTML impresso via janela do browser) ────────────────────────────────

export function exportToPDF(data: ProjectData[], dateRange: DateRange): void {
  const from = dateRange.from ? dateRange.from.toLocaleDateString("pt-BR") : ""
  const to = dateRange.to ? dateRange.to.toLocaleDateString("pt-BR") : from

  const rows = data
    .map(
      (p) => `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.status}</td>
        <td>${p.type}</td>
        <td>${formatCurrency(p.budget)}</td>
        <td>${formatCurrency(p.spent)}</td>
        <td>${p.company ?? ""}</td>
        <td>${p.createdDate}</td>
        <td>${p.dueDate ?? ""}</td>
        <td>${p.progress ?? 0}%</td>
      </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Projetos</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    p { margin: 0 0 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>Relatório de Projetos</h1>
  <p>Período: ${from} – ${to} &nbsp;|&nbsp; Total: ${data.length} projetos</p>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Nome</th><th>Status</th><th>Tipo</th>
        <th>Orçamento</th><th>Gasto</th><th>Empresa</th>
        <th>Criação</th><th>Entrega</th><th>Progresso</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 500)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
