// Editor de comentário rico — Tiptap (ProseMirror), schema controlado, sem
// contentEditable improvisado. Formatação por seleção: negrito, itálico,
// tamanho e cor (paleta fechada, nunca CSS arbitrário) aplicam-se só ao
// trecho selecionado, via duas Marks customizadas (Color/Size) que
// renderizam <span class="ac-color-*"> / <span class="ac-size-*"> — as
// mesmas classes que o backend aceita em sanitizeRichContent
// (apps/backend/src/routes/share.ts). O picker de emoji (emoji-mart) é
// carregado sob demanda (só quando o botão é clicado) pra não pesar o
// bundle inicial da página pública de share.
import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, mergeAttributes } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Smile, Paperclip, Type, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMENT_COLORS, COMMENT_SIZES, type CommentColor, type CommentSize } from "@/lib/share-api";

const EmojiPicker = lazy(() => import("./emoji-picker"));

// ── Marks customizadas (cor/tamanho por seleção, classe fechada) ──────────
const ColorMark = Mark.create({
  name: "acColor",
  addAttributes() {
    return { color: { default: "default" } };
  },
  parseHTML() {
    return COMMENT_COLORS.map((c) => ({ tag: `span.ac-color-${c}`, attrs: { color: c } }));
  },
  renderHTML({ HTMLAttributes }) {
    const color = (HTMLAttributes.color as string) || "default";
    return ["span", mergeAttributes({ class: `ac-color-${color}` }), 0];
  },
  addCommands() {
    return {
      setColor:
        (color: CommentColor) =>
        ({ commands }: any) =>
          commands.setMark(this.name, { color }),
      unsetColor:
        () =>
        ({ commands }: any) =>
          commands.unsetMark(this.name),
    } as any;
  },
});

const SizeMark = Mark.create({
  name: "acSize",
  addAttributes() {
    return { size: { default: "base" } };
  },
  parseHTML() {
    return COMMENT_SIZES.map((s) => ({ tag: `span.ac-size-${s}`, attrs: { size: s } }));
  },
  renderHTML({ HTMLAttributes }) {
    const size = (HTMLAttributes.size as string) || "base";
    return ["span", mergeAttributes({ class: `ac-size-${size}` }), 0];
  },
  addCommands() {
    return {
      setSize:
        (size: CommentSize) =>
        ({ commands }: any) =>
          commands.setMark(this.name, { size }),
      unsetSize:
        () =>
        ({ commands }: any) =>
          commands.unsetMark(this.name),
    } as any;
  },
});

const COLOR_SWATCH_BG: Record<CommentColor, string> = {
  default: "bg-foreground",
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-violet-500",
  pink: "bg-pink-500",
};

const SIZE_LABEL: Record<CommentSize, string> = { sm: "Pequeno", base: "Normal", lg: "Grande" };

export type CommentEditorHandle = {
  getHTML: () => string;
  isEmpty: () => boolean;
  clear: () => void;
};

/**
 * Popover ancorado a um elemento, mas renderizado via portal em
 * document.body. Necessário porque o card de comentários e a barra de
 * ferramentas usam `overflow-hidden` / `overflow-x-auto` — um popover
 * `position: absolute` filho dessas árvores fica clipado e some, mesmo
 * "aberto" no estado React. Portal + `position: fixed` escapa desse
 * clipping. `anchorRef` deve ser colocado num wrapper (div) em volta do
 * botão-gatilho, nunca no <Button> em si (ele não é forwardRef).
 */
function useAnchoredPopover(open: boolean, onClose: () => void) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", visibility: "hidden" });

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setStyle({
        position: "fixed",
        left: Math.round(rect.left),
        bottom: Math.round(window.innerHeight - rect.top + 6),
        zIndex: 1000,
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // "mousedown" (não "click"): o efeito só é registrado após o commit do
    // render que abriu o popover, ou seja, depois que o clique que abriu
    // já terminou de se propagar — não fecha no mesmo clique que abre.
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return { anchorRef, contentRef, style };
}

// Impede que o clique no botão da toolbar mova o foco do DOM (e colapse a
// seleção do navegador) antes do comando do Tiptap rodar — técnica padrão
// em toolbars ProseMirror. `chain().focus()` já restaura o foco e reaplica
// a seleção que o ProseMirror manteve internamente.
function preserveEditorSelection(e: React.MouseEvent) {
  e.preventDefault();
}

export const CommentEditor = React.forwardRef<
  CommentEditorHandle,
  {
    placeholder: string;
    maxLength: number;
    disabled?: boolean;
    onAttachClick: () => void;
    attachDisabled?: boolean;
    onLengthChange?: (len: number) => void;
  }
>(function CommentEditor(
  { placeholder, maxLength, disabled, onAttachClick, attachDisabled, onLengthChange },
  ref,
) {
  const [sizeOpen, setSizeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const closeSize = useCallback(() => setSizeOpen(false), []);
  const closeColor = useCallback(() => setColorOpen(false), []);
  const closeEmoji = useCallback(() => setEmojiOpen(false), []);

  const sizePopover = useAnchoredPopover(sizeOpen, closeSize);
  const colorPopover = useAnchoredPopover(colorOpen, closeColor);
  const emojiPopover = useAnchoredPopover(emojiOpen, closeEmoji);

  // Refs pra manter `onUpdate` estável (não recriar a cada render por causa
  // de `maxLength`/`onLengthChange` mudando de identidade).
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;
  const onLengthChangeRef = useRef(onLengthChange);
  onLengthChangeRef.current = onLengthChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
        hardBreak: {},
      }),
      Placeholder.configure({ placeholder }),
      ColorMark,
      SizeMark,
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[72px] max-h-64 overflow-y-auto rounded-xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow",
      },
    },
    onUpdate({ editor: e }) {
      const text = e.getText();
      if (text.length > maxLengthRef.current) {
        // Corta o excesso sem quebrar a formatação do que ficou —
        // simples: se passou do limite, desfaz a última entrada.
        e.commands.undo();
        return;
      }
      onLengthChangeRef.current?.(text.length);
    },
    editable: !disabled,
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  React.useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    isEmpty: () => !!editor?.isEmpty,
    clear: () => editor?.commands.clearContent(),
  }));

  if (!editor) return null;

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  };

  return (
    <div className="space-y-2">
      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-0.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Negrito"
          title="Negrito"
          disabled={disabled}
          className={cn("h-7 w-7 p-0 shrink-0", editor.isActive("bold") && "bg-accent")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Itálico"
          title="Itálico"
          disabled={disabled}
          className={cn("h-7 w-7 p-0 shrink-0", editor.isActive("italic") && "bg-accent")}
          onMouseDown={preserveEditorSelection}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        {/* ── Tamanho ── */}
        <div className="shrink-0" ref={sizePopover.anchorRef}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Tamanho do texto"
            title="Tamanho do texto"
            aria-expanded={sizeOpen}
            disabled={disabled}
            className="h-7 px-2 gap-1"
            onMouseDown={preserveEditorSelection}
            onClick={() => setSizeOpen((v) => !v)}
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
        </div>
        {sizeOpen &&
          createPortal(
            <div
              ref={sizePopover.contentRef}
              style={sizePopover.style}
              className="flex flex-col rounded-xl border border-border/60 bg-popover p-1 shadow-lg min-w-[110px]"
            >
              {COMMENT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent"
                  onMouseDown={preserveEditorSelection}
                  onClick={() => {
                    (editor.chain().focus() as any).setSize(s).run();
                    setSizeOpen(false);
                  }}
                >
                  {SIZE_LABEL[s]}
                </button>
              ))}
              <button
                type="button"
                className="text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent text-muted-foreground"
                onMouseDown={preserveEditorSelection}
                onClick={() => {
                  (editor.chain().focus() as any).unsetSize().run();
                  setSizeOpen(false);
                }}
              >
                Remover
              </button>
            </div>,
            document.body,
          )}

        {/* ── Cor ── */}
        <div className="shrink-0" ref={colorPopover.anchorRef}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Cor do texto"
            title="Cor do texto"
            aria-expanded={colorOpen}
            disabled={disabled}
            className="h-7 px-2 gap-1"
            onMouseDown={preserveEditorSelection}
            onClick={() => setColorOpen((v) => !v)}
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
        </div>
        {colorOpen &&
          createPortal(
            <div
              ref={colorPopover.contentRef}
              style={colorPopover.style}
              className="grid grid-cols-4 gap-1.5 rounded-xl border border-border/60 bg-popover p-2 shadow-lg"
            >
              {COMMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={`Cor ${c}`}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 border-transparent hover:scale-110 transition-transform",
                    COLOR_SWATCH_BG[c],
                  )}
                  onMouseDown={preserveEditorSelection}
                  onClick={() => {
                    (editor.chain().focus() as any).setColor(c).run();
                    setColorOpen(false);
                  }}
                />
              ))}
            </div>,
            document.body,
          )}

        {/* ── Emoji (lazy) ── */}
        <div className="shrink-0" ref={emojiPopover.anchorRef}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Inserir emoji"
            title="Inserir emoji"
            aria-expanded={emojiOpen}
            disabled={disabled}
            className="h-7 w-7 p-0"
            onMouseDown={preserveEditorSelection}
            onClick={() => setEmojiOpen((v) => !v)}
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
        </div>
        {emojiOpen &&
          createPortal(
            <div ref={emojiPopover.contentRef} style={emojiPopover.style} className="shadow-lg rounded-xl overflow-hidden">
              <Suspense
                fallback={
                  <div className="w-[280px] h-[120px] flex items-center justify-center text-xs text-muted-foreground bg-popover border border-border/60 rounded-xl">
                    Carregando…
                  </div>
                }
              >
                <EmojiPicker onSelect={insertEmoji} />
              </Suspense>
            </div>,
            document.body,
          )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Anexar arquivo"
          title="Anexar arquivo"
          className="h-7 px-2 text-xs gap-1 shrink-0"
          onMouseDown={preserveEditorSelection}
          onClick={onAttachClick}
          disabled={disabled || attachDisabled}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Anexar
        </Button>
      </div>
    </div>
  );
});
