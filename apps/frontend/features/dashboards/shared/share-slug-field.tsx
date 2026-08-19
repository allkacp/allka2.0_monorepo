// Campo de "URL personalizada" reutilizado nas 5 telas de compartilhamento
// (admin/agency/company/leader/partner). Só UX: normaliza visualmente e
// consulta disponibilidade com debounce, mas quem decide de verdade é
// sempre o backend — na criação/edição efetiva (ver
// apps/backend/src/routes/dashboard-shares.ts, resolveSlugInput +
// constraint única) o slug é normalizado e checado de novo.
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Espelha normalizeShareLinkSlug do backend (apps/backend/src/lib/share-link-slug.ts)
// só pra preview em tempo real — o backend normaliza de novo e é quem
// decide de verdade.
export function previewNormalizeSlug(raw: string): string {
  // Remove marcas de acentuação por code point (0x0300–0x036f) em vez de
  // regex literal com caracteres combinantes — mais confiável de editar.
  const withoutDiacritics = Array.from(raw.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0)!;
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return withoutDiacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sugestão pro PRÓXIMO link a ser criado pro mesmo alvo — usada depois de
 * criar um link com sucesso, pra não deixar o campo com um slug que acabou
 * de ser reservado (e que geraria 409 se o usuário clicasse em Gerar de
 * novo sem editar nada). Tenta "base", depois "base-2", "base-3"... até
 * achar um disponível; a checagem é a mesma do campo (só UX — create
 * ainda revalida contra a constraint única do banco).
 */
export async function suggestAvailableSlug(title: string): Promise<string> {
  const base = previewNormalizeSlug(title);
  if (!base) return "";
  for (let i = 1; i <= 20; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    try {
      const res = await apiClient.checkDashboardShareSlug(candidate);
      if (res.available) return candidate;
    } catch {
      return candidate;
    }
  }
  return `${base}-${Date.now()}`;
}

export function ShareSlugField({
  value,
  onChange,
  excludeId,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  /** id do próprio ShareLink, ao editar um já existente — evita o slug atual "se autodenunciar" como indisponível. */
  excludeId?: string;
  disabled?: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    available: boolean;
    normalized: string;
    reason?: "invalid" | "taken";
    message?: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setResult(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.checkDashboardShareSlug(trimmed, excludeId);
        setResult(res);
      } catch {
        setResult(null);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, excludeId]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-1.5">
      <Label htmlFor="share-slug" className="text-sm">
        URL personalizada (opcional)
      </Label>
      <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-2 focus-within:ring-2 focus-within:ring-ring">
        <span className="text-xs text-muted-foreground shrink-0 font-mono truncate max-w-[45%]">
          {origin}/dashboard/share/
        </span>
        <input
          id="share-slug"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="visao-financeira"
          className="flex-1 min-w-0 bg-transparent text-sm font-mono outline-none disabled:opacity-60"
          maxLength={80}
        />
      </div>
      <div className="min-h-[16px] text-xs">
        {checking && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade…
          </span>
        )}
        {!checking && result?.available && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> {result.normalized} disponível
          </span>
        )}
        {!checking && result && !result.available && (
          <span className="flex items-center gap-1 text-destructive">
            <X className="h-3 w-3" /> {result.message ?? "URL indisponível"}
          </span>
        )}
      </div>
    </div>
  );
}
