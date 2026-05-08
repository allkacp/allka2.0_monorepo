// @ts-nocheck
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, User, MessageSquare, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import type { NotificationHistory } from "@/types/terms"

interface NotificationHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history?: NotificationHistory[]
}

export function NotificationHistoryModal({ open, onOpenChange, history = [] }: NotificationHistoryModalProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Notificações</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{item.message_title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.recipient_name || item.recipient_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.sent_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(item.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          {item.status === "sent" && "Enviado"}
                          {item.status === "failed" && "Falhou"}
                          {item.status === "pending" && "Pendente"}
                        </div>
                      </Badge>
                      <Badge variant="outline">{item.channel}</Badge>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700">{item.message_content}</div>

                  {item.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm text-red-700">
                        <strong>Erro:</strong> {item.error_message}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>Regra: {item.rule_name || "Manual"}</div>
                    {item.opened_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Aberto em {formatDate(item.opened_at)}
                      </div>
                    )}
                  </div>

                  <Separator />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
