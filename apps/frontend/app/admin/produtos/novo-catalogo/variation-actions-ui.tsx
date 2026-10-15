"use client";
import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Ações visíveis (com texto) de variações e opções: editar nome, tornar padrão ("normal") e excluir.

/** Botão com texto que pede confirmação antes de excluir. */
export function ConfirmDeleteButton({ label, title, message, onConfirm, size = "md", testId }: { label: string; title: string; message?: string; onConfirm: () => void | Promise<unknown>; size?: "sm" | "md"; testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid={testId} onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-md border border-red-200 bg-white font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-transparent ${size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}>
        <Trash2 className="h-3.5 w-3.5" />{label}
      </button>
      <ConfirmationDialog open={open} onClose={() => setOpen(false)} title={title} message={message ?? "Esta ação não pode ser desfeita."} confirmText="Excluir" destructive onConfirm={async () => { await onConfirm(); }} />
    </>
  );
}

/** Nome da variação com botão "Editar nome" (edição na própria linha; Enter salva, Esc cancela). */
export function EditableVariationName({ name, readOnly, onRename }: { name: string; readOnly: boolean; onRename: (next: string) => void | Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const commit = async () => {
    const v = value.trim();
    if (!v) return;
    if (v !== name) await onRename(v);
    setEditing(false);
  };
  if (editing) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <Input autoFocus aria-label="Nome da variação" maxLength={120} className="h-8 w-64 max-w-full text-sm" value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void commit(); } if (e.key === "Escape") { setValue(name); setEditing(false); } }} />
        <Button type="button" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => void commit()} disabled={!value.trim()}><Check className="h-3.5 w-3.5" />Salvar nome</Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" onClick={() => { setValue(name); setEditing(false); }}><X className="h-3.5 w-3.5" />Cancelar</Button>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{name}</span>
      {!readOnly && (
        <button type="button" data-testid="variation-rename" onClick={() => { setValue(name); setEditing(true); }}
          aria-label="Editar nome da variação" title="Editar nome" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-200">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
