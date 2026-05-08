// @ts-nocheck
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { useEffect, useState } from "react"
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Eraser,
  Sparkles,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  editable?: boolean
  placeholder?: string
  className?: string
  onAiImprove?: (current: string, callback: (improved: string) => void) => void
  minHeight?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      title={title}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-slate-600 transition-colors text-sm",
        active
          ? "bg-blue-100 text-blue-700"
          : "hover:bg-slate-100 hover:text-slate-900",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Descreva o projeto...",
  className,
  onAiImprove,
  minHeight = "160px",
}: RichTextEditorProps) {
  const [isImproving, setIsImproving] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline hover:text-blue-800 cursor-pointer" },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:float-left before:text-slate-400 before:pointer-events-none before:h-0",
      }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "max-w-none focus:outline-none px-3 py-2 text-slate-800 text-sm leading-relaxed",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600",
          "[&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-3 [&_h2]:mb-1",
          "[&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-2 [&_h3]:mb-0.5",
          "[&_p]:my-1 [&_p]:leading-relaxed",
          "[&_a]:text-blue-600 [&_a]:underline",
          "[&_strong]:font-semibold",
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Sync external value changes (e.g. when project switches)
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    if (currentHtml !== value) {
      editor.commands.setContent(value || "", false)
    }
  }, [value, editor])

  // Sync editable flag
  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editable, editor])

  const handleAiImprove = () => {
    if (!editor || isImproving) return
    const current = editor.getHTML()
    setIsImproving(true)

    if (onAiImprove) {
      onAiImprove(current, (improved) => {
        editor.commands.setContent(improved)
        onChange(improved)
        setIsImproving(false)
      })
    } else {
      // Default simulated improvement
      setTimeout(() => {
        const plain = editor.getText()
        const improved = buildImprovedBriefing(plain, current)
        editor.commands.setContent(improved)
        onChange(improved)
        setIsImproving(false)
      }, 1400)
    }
  }

  const addLink = () => {
    if (!linkUrl) { setShowLinkInput(false); return }
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
    editor?.chain().focus().setLink({ href: url }).run()
    setLinkUrl("")
    setShowLinkInput(false)
  }

  if (!editor) return null

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80">
          {/* Text format */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito (Ctrl+B)">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico (Ctrl+I)">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado (Ctrl+U)">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título H2">
            <span className="text-[10px] font-bold leading-none">H2</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título H3">
            <span className="text-[10px] font-bold leading-none">H3</span>
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista de itens">
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Link */}
          <ToolbarButton
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run()
              } else {
                setShowLinkInput((v) => !v)
              }
            }}
            active={editor.isActive("link")}
            title={editor.isActive("link") ? "Remover link" : "Inserir link"}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {/* Undo / Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer (Ctrl+Z)">
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer (Ctrl+Y)">
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar formatação">
            <Eraser className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Spacer */}
          <div className="flex-1" />

          {/* AI button */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleAiImprove() }}
            disabled={isImproving}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border",
              isImproving
                ? "bg-violet-50 text-violet-400 border-violet-200 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500 hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-md"
            )}
            title="Melhorar texto com Inteligência Artificial"
          >
            {isImproving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Melhorando...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Melhorar com IA
              </>
            )}
          </button>
        </div>
      )}

      {/* Link input popup */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
          <LinkIcon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addLink(); if (e.key === "Escape") setShowLinkInput(false) }}
            placeholder="https://..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
          />
          <button type="button" onClick={addLink} className="text-xs text-blue-600 font-semibold hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-100">
            Inserir
          </button>
          <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-slate-400 hover:text-slate-600 px-1">
            ✕
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Char count */}
      {editable && (
        <div className="px-3 py-1 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <span className="text-[10px] text-slate-400">
            {editor.getText().length} caracteres
          </span>
        </div>
      )}
    </div>
  )
}

// — helpers -------------------------------------------------------------------

function buildImprovedBriefing(plain: string, currentHtml: string): string {
  // If content is already rich HTML with structure, just enhance tone slightly
  const hasRichContent =
    currentHtml.includes("<h2>") ||
    currentHtml.includes("<ul>") ||
    currentHtml.includes("<ol>")

  if (!plain.trim()) {
    return `<h2>Briefing do Projeto</h2>
<p>Adicione aqui uma descrição detalhada do projeto, incluindo objetivos, escopo, público-alvo e resultados esperados.</p>
<h3>Objetivos</h3>
<ul><li>Objetivo principal do projeto</li></ul>
<h3>Escopo</h3>
<ul><li>Principais entregas e atividades</li></ul>`
  }

  if (hasRichContent) {
    // Already structured — just return as is (simulating IA "approved it")
    return currentHtml
  }

  // Build structured briefing from plain text
  const sentences = plain.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  const intro = sentences.slice(0, 2).join(". ")
  const rest = sentences.slice(2)

  const bulletItems = rest.length
    ? rest.map((s) => `<li>${s}</li>`).join("")
    : "<li>A ser detalhado pela equipe responsável</li>"

  return `<h2>Briefing do Projeto</h2>
<p>${intro}${intro.endsWith(".") ? "" : "."}</p>
<h3>Escopo e Objetivos</h3>
<ul>${bulletItems}</ul>
<h3>Considerações</h3>
<p>Este briefing deve ser revisado e complementado com informações adicionais conforme o avanço das negociações e definição de escopo final.</p>`
}
