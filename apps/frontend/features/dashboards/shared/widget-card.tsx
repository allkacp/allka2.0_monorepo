// WidgetCard — moldura compartilhada de UM widget do dashboard (o "chrome":
// wrapper de drag-and-drop + Card/CardHeader com ícone/título/descrição +
// WidgetPeriodSelector + WidgetExportButton). Essa moldura é idêntica em
// TODO case do switch (widget.type) dentro de renderWidget, repetida ~15x
// por arquivo × 5 arquivos de dashboard (admin/agency/company/partner/leader)
// — só o CONTEÚDO de cada widget (o que vai dentro do CardContent) muda de
// verdade entre eles.
//
// Início da consolidação da Fase 2 (ver memória project_dashboard_consolidation):
// migração feita widget por widget, um de cada vez, testado ao vivo antes de
// seguir pro próximo — NÃO uma reescrita em massa. A lógica de NEGÓCIO de
// cada widget (cálculos, dados específicos de cada perfil) continua onde
// estava, só a moldura visual/de drag-and-drop foi extraída aqui.
import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface WidgetCardProps {
  widgetId: string;
  widgetType: string;
  icon: React.ElementType;
  title: string;
  description: string;
  isCustomizeMode: boolean;
  draggedWidget: string | null;
  dragOverWidget: string | null;
  onDragStart: (e: React.DragEvent, widgetId: string) => void;
  onDragOver: (e: React.DragEvent, widgetId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, widgetId: string) => void;
  onDragEnd: () => void;
  getDragOverClasses: (widgetId: string) => string;
  renderCustomizeControls: () => ReactNode;
  /** Ex.: "bg-gradient-to-br from-card to-card/50" (metrics) vs "overflow-hidden" (quickActions) — cada widget tinha sua própria variação de className no Card. */
  cardClassName?: string;
  /** Default "pb-3 relative". Alguns widgets originais usavam "pb-4 relative". */
  headerClassName?: string;
  /** Cor do ícone no header. Default replica o padrão original (primary). Ex.: "bg-warning/10" (alerts). */
  iconBgClassName?: string;
  iconColorClassName?: string;
  /** Conteúdo extra dentro da MESMA linha do título (ex.: Badge de contagem em "alerts"), depois do bloco título/descrição. */
  titleRowExtra?: ReactNode;
  /** Conteúdo extra na linha de controles, ANTES do periodSelector (ex.: botão de editar métricas). */
  headerControlsExtra?: ReactNode;
  /** <WidgetPeriodSelector widgetId={...} /> — definido localmente em cada
   * arquivo de dashboard (closure sobre o estado de período por widget),
   * por isso é passado pronto em vez de importado aqui. Omitir quando o widget
   * original não tem seletor de período (ex.: alerts). */
  periodSelector?: ReactNode;
  /** <WidgetExportButton widgetId={...} widgetTitle={...} /> — mesmo motivo. */
  exportButton: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}

export function WidgetCard({
  widgetId,
  widgetType,
  icon: Icon,
  title,
  description,
  isCustomizeMode,
  draggedWidget,
  dragOverWidget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  getDragOverClasses,
  renderCustomizeControls,
  cardClassName,
  headerClassName = "pb-3 relative",
  iconBgClassName = "bg-primary/10",
  iconColorClassName = "text-primary",
  titleRowExtra,
  headerControlsExtra,
  periodSelector,
  exportButton,
  contentClassName,
  children,
}: WidgetCardProps) {
  return (
    <div
      key={widgetId}
      data-widget-id={widgetType}
      draggable={isCustomizeMode}
      onDragStart={(e) => onDragStart(e, widgetId)}
      onDragOver={(e) => onDragOver(e, widgetId)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, widgetId)}
      onDragEnd={onDragEnd}
      className={cn(
        "relative transition-all duration-200",
        isCustomizeMode && "cursor-move",
        draggedWidget === widgetId && "opacity-50 scale-95",
        getDragOverClasses(widgetId),
        !draggedWidget && !dragOverWidget && "hover:scale-[1.01]",
      )}
    >
      {isCustomizeMode && renderCustomizeControls()}
      <Card className={cn("border-0 shadow-lg", cardClassName)}>
        <CardHeader className={headerClassName}>
          <div className="flex items-center gap-3 pr-20">
            {isCustomizeMode && (
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className={cn("p-2 rounded-lg shrink-0", iconBgClassName)}>
              <Icon className={cn("h-4 w-4", iconColorClassName)} />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold leading-tight">
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            </div>
            {titleRowExtra}
          </div>
          {(headerControlsExtra || periodSelector) && (
            <div className="flex items-center gap-2 mt-2">
              {headerControlsExtra}
              {periodSelector}
            </div>
          )}
          {exportButton}
        </CardHeader>
        <CardContent className={contentClassName}>{children}</CardContent>
      </Card>
    </div>
  );
}
