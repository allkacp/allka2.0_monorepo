// Formulário único de criação de um ShareLink — Permissão, URL
// personalizada, PIN e Expiração vivem juntos aqui, porque são todos
// propriedades do MESMO link que está sendo gerado (não faz sentido
// espalhar em abas separadas). Reutilizado nas 5 telas de compartilhamento
// (admin/agency/company/leader/partner) dentro da aba única de
// configuração — ver uso em app/{agency,company,leader,partner}/dashboard/page.tsx
// e features/dashboards/admin/admin-dashboard-page.tsx.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareSlugField } from "./share-slug-field";

export function ShareCreateForm({
  permission,
  onPermissionChange,
  slug,
  onSlugChange,
  slugExcludeId,
  pinEnabled,
  onPinEnabledChange,
  pin,
  onPinChange,
  expiryEnabled,
  onExpiryEnabledChange,
  expiry,
  onExpiryChange,
  periodLabel,
  allowFilterChanges,
  onAllowFilterChangesChange,
  disabled,
}: {
  permission: "view" | "comment";
  onPermissionChange: (v: "view" | "comment") => void;
  slug: string;
  onSlugChange: (v: string) => void;
  /** Id do próprio ShareLink ao editar um já existente — evita o slug atual "se autodenunciar" como indisponível. */
  slugExcludeId?: string;
  pinEnabled: boolean;
  onPinEnabledChange: (v: boolean) => void;
  pin: string;
  onPinChange: (v: string) => void;
  expiryEnabled: boolean;
  onExpiryEnabledChange: (v: boolean) => void;
  expiry: string;
  onExpiryChange: (v: string) => void;
  periodLabel?: string;
  allowFilterChanges?: boolean;
  onAllowFilterChangesChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* ── Permissão ── */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Quem acessar o link poderá:</p>
        <div className="space-y-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPermissionChange("view")}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all disabled:opacity-60",
              permission === "view"
                ? "border-violet-400 bg-violet-50 dark:bg-violet-950/25 dark:border-violet-600"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                permission === "view" ? "border-violet-500" : "border-muted-foreground",
              )}
            >
              {permission === "view" && <div className="h-2 w-2 rounded-full bg-violet-500" />}
            </div>
            <div>
              <p className="text-sm font-medium">Somente Visualizar</p>
              <p className="text-xs text-muted-foreground">Acesso de leitura aos dados do dashboard</p>
            </div>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPermissionChange("comment")}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all disabled:opacity-60",
              permission === "comment"
                ? "border-violet-400 bg-violet-50 dark:bg-violet-950/25 dark:border-violet-600"
                : "border-border hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                permission === "comment" ? "border-violet-500" : "border-muted-foreground",
              )}
            >
              {permission === "comment" && <div className="h-2 w-2 rounded-full bg-violet-500" />}
            </div>
            <div>
              <p className="text-sm font-medium">Visualizar + Comentar</p>
              <p className="text-xs text-muted-foreground">Pode adicionar comentários e anotações</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── URL personalizada ── */}
      <ShareSlugField value={slug} onChange={onSlugChange} excludeId={slugExcludeId} disabled={disabled} />

      {/* ── PIN — visualmente evidente, nunca discreto a ponto de passar
          despercebido se o link está protegido ou não. ── */}
      <div
        className={cn(
          "rounded-lg border p-3 transition-colors",
          pinEnabled ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" : "border-border",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className={cn("h-4 w-4 shrink-0", pinEnabled ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium">Proteger este link com PIN</p>
              <p className="text-xs text-muted-foreground">
                Quem acessar este link precisará informar o PIN antes de visualizar o dashboard.
              </p>
            </div>
          </div>
          <Switch
            checked={pinEnabled}
            disabled={disabled}
            onCheckedChange={(v) => {
              onPinEnabledChange(v);
              if (!v) onPinChange("");
            }}
          />
        </div>
        {pinEnabled && (
          <div className="space-y-1.5 mt-3">
            <Label htmlFor="share-pin" className="text-sm">
              PIN (4 dígitos)
            </Label>
            <Input
              id="share-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              disabled={disabled}
              value={pin}
              onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="text-center tracking-[0.5em] text-lg w-28"
            />
            {pin.length > 0 && pin.length < 4 && (
              <p className="text-xs text-destructive">Digite exatamente 4 dígitos</p>
            )}
          </div>
        )}
      </div>

      {/* ── Expiração ── */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <p className="text-sm font-medium">Definir Expiração</p>
          <p className="text-xs text-muted-foreground">O link deixa de funcionar após essa data</p>
        </div>
        <Switch
          checked={expiryEnabled}
          disabled={disabled}
          onCheckedChange={(v) => {
            onExpiryEnabledChange(v);
            if (!v) onExpiryChange("");
          }}
        />
      </div>
      {expiryEnabled && (
        <div className="space-y-1.5">
          <Label htmlFor="share-expiry" className="text-sm">
            Data de expiração
          </Label>
          <Input
            id="share-expiry"
            type="date"
            disabled={disabled}
            value={expiry}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onExpiryChange(e.target.value)}
          />
        </div>
      )}

      {/* ── Período (já travado no momento da criação) ── */}
      {periodLabel && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs border border-border/50 flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Este link abrirá com:</span>
          <strong className="text-foreground">{periodLabel}</strong>
        </div>
      )}
      {onAllowFilterChangesChange && (
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="text-sm font-medium">Permitir alterar filtros</p>
            <p className="text-xs text-muted-foreground">Quem receber pode mudar período e datas</p>
          </div>
          <Switch checked={!!allowFilterChanges} disabled={disabled} onCheckedChange={onAllowFilterChangesChange} />
        </div>
      )}
    </div>
  );
}
