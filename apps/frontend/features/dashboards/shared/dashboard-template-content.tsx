// Renderizador único de banners/avisos do template (item 10) — usado pelos
// 6 dashboards, nunca duplicado. `locked=true`: sem botão de fechar (faz
// parte da experiência padrão do perfil). `locked=false`: usuário pode
// dispensar, fica salvo em localStorage (ver use-dashboard-template.ts).
import { X, Megaphone, Sparkles } from "lucide-react";
import { apiClient, type DashboardTemplateContent } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function DashboardTemplateContentList({
  contents,
  onDismiss,
}: {
  contents: DashboardTemplateContent[];
  onDismiss: (contentId: string) => void;
}) {
  if (contents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" data-dashboard-template-content="">
      {contents.map((c) => (
        <DashboardTemplateContentCard key={c.id} content={c} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function DashboardTemplateContentCard({
  content,
  onDismiss,
}: {
  content: DashboardTemplateContent;
  onDismiss: (contentId: string) => void;
}) {
  const isBanner = content.type === "banner";
  const Icon = isBanner ? Sparkles : Megaphone;

  const body = (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm",
        isBanner
          ? "border-primary/30 bg-primary/5"
          : "border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50",
      )}
    >
      {content.image_storage_key && (
        <img
          src={apiClient.dashboardTemplateContentImageUrl(content.id)}
          alt=""
          className="h-9 w-9 sm:h-14 sm:w-14 shrink-0 rounded-lg object-cover"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", isBanner ? "text-primary" : "text-amber-600 dark:text-amber-400")} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold leading-tight">{content.title}</p>
        {content.body && <p className="text-xs text-muted-foreground leading-snug">{content.body}</p>}
        {content.link_url && (
          <a
            href={content.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-primary hover:underline mt-1"
          >
            {content.link_label || "Saiba mais"}
          </a>
        )}
      </div>
      {!content.locked && (
        <button
          type="button"
          onClick={() => onDismiss(content.id)}
          aria-label="Dispensar"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return body;
}
