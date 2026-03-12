// @ts-nocheck
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, Image, FileDown, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExportButtonProps {
  pageRef: React.RefObject<HTMLElement>
  filename?: string
  onlyImageFormats?: boolean
}

function dateStr() {
  return new Date().toISOString().split("T")[0]
}

function downloadBlob(content: string, filename: string, mimeType: string) {
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

export function ExportButton({ pageRef, filename = "export", onlyImageFormats = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const hideExportButtons = (el: HTMLElement) => {
    const btns = el.querySelectorAll("[data-export-button]")
    btns.forEach((b) => { (b as HTMLElement).style.visibility = "hidden" })
    return () => btns.forEach((b) => { (b as HTMLElement).style.visibility = "" })
  }

  const captureScreenshot = async (el: HTMLElement) => {
    const { toPng } = await import("html-to-image")
    return toPng(el, { quality: 1, pixelRatio: 2, backgroundColor: "#f1f5f9", cacheBust: true })
  }

  const exportAsPng = async () => {
    const el = pageRef.current
    if (!el) return
    setIsExporting(true)
    try {
      const restore = hideExportButtons(el)
      const dataUrl = await captureScreenshot(el)
      restore()
      const a = document.createElement("a")
      a.download = `${filename}_${dateStr()}.png`
      a.href = dataUrl
      a.click()
      toast({ title: "Exportado como PNG" })
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsPdf = async () => {
    const el = pageRef.current
    if (!el) return
    setIsExporting(true)
    try {
      const restore = hideExportButtons(el)
      const dataUrl = await captureScreenshot(el)
      restore()
      const win = window.open("", "_blank")
      if (!win) {
        toast({ title: "Popup bloqueado. Libere popups para exportar PDF.", variant: "destructive" })
        return
      }
      win.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title>` +
        `<style>@page{margin:10mm}body{margin:0;font-family:sans-serif}` +
        `img{max-width:100%;display:block}` +
        `</style></head><body><img src="${dataUrl}"/></body></html>`
      )
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 600)
      toast({ title: "Abrindo impressão — salve como PDF" })
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsExcel = () => {
    const el = pageRef.current
    if (!el) return
    const tables = el.querySelectorAll("table")
    let tsvContent = "\uFEFF"
    tables.forEach((table) => {
      const rows = table.querySelectorAll("tr")
      rows.forEach((row) => {
        const cells = row.querySelectorAll("th, td")
        tsvContent += Array.from(cells)
          .map((c) => `"${(c.textContent ?? "").trim().replace(/"/g, '""')}"`)
          .join("\t") + "\n"
      })
      tsvContent += "\n"
    })
    if (tsvContent.trim() === "\uFEFF") {
      // No tables found — export visible text in a single column
      tsvContent += `"${(el.innerText ?? "").replace(/"/g, '""').replace(/\n/g, '" \n"')}"`
    }
    downloadBlob(tsvContent, `${filename}_${dateStr()}.xls`, "application/vnd.ms-excel;charset=utf-8;")
    toast({ title: "Exportado como Excel (.xls)" })
  }

  const exportAsDoc = () => {
    const el = pageRef.current
    if (!el) return
    const html =
      `<!DOCTYPE html>` +
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
      `xmlns:w="urn:schemas-microsoft-com:office:word" ` +
      `xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"><title>${filename}</title>` +
      `<style>body{font-family:Calibri,sans-serif;font-size:11pt}` +
      `table{border-collapse:collapse;width:100%}` +
      `th,td{border:1px solid #ccc;padding:4px 8px;font-size:10pt}</style>` +
      `</head><body>${el.innerHTML}</body></html>`
    downloadBlob(html, `${filename}_${dateStr()}.doc`, "application/msword;charset=utf-8;")
    toast({ title: "Exportado como Word (.doc)" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs px-2.5 font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
          data-export-button
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span className="text-slate-600">{isExporting ? "Exportando…" : "Exportar"}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportAsPng}>
          <Image className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          <span className="text-sm">PNG</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportAsPdf}>
          <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="text-sm">PDF</span>
        </DropdownMenuItem>
        {!onlyImageFormats && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportAsExcel}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-sm">Excel (.xls)</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={exportAsDoc}>
              <FileDown className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-sm">Word (.doc)</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
