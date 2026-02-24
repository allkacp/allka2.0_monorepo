
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff } from "lucide-react"

interface Widget {
  id: string
  title: string
  value: string
  subtitle: string
  change: string
  icon: any
  color: string
  visible: boolean
  description: string
}

interface WidgetManagementPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgets: Widget[]
  onUpdateWidgets: (widgets: Widget[]) => void
}

export function WidgetManagementPanel({ open, onOpenChange, widgets, onUpdateWidgets }: WidgetManagementPanelProps) {
  const toggleWidget = (id: string) => {
    onUpdateWidgets(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {widgets.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {widget.visible ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">{widget.title}</p>
                  <p className="text-xs text-muted-foreground">{widget.description}</p>
                </div>
              </div>
              <Switch checked={widget.visible} onCheckedChange={() => toggleWidget(widget.id)} />
            </div>
          ))}
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
      </DialogContent>
    </Dialog>
  )
}
