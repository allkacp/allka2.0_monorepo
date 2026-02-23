
import { useState } from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle, Calendar, Infinity, X } from "lucide-react"
import type { User } from "@/types/user"
import { cn } from "@/lib/utils"

interface UserStatusConfirmationDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string, duration: "indefinite" | Date) => void
}

export function UserStatusConfirmationDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: UserStatusConfirmationDialogProps) {
  const [reason, setReason] = useState("")
  const [durationType, setDurationType] = useState<"indefinite" | "specific">("indefinite")
  const [specificDate, setSpecificDate] = useState("")
  const [errors, setErrors] = useState<{ reason?: string; date?: string }>({})

  const handleConfirm = () => {
    const newErrors: { reason?: string; date?: string } = {}

    console.log("[v0] Validating status change form:", { reason, durationType, specificDate })

    // Validate reason
    if (!reason.trim()) {
      newErrors.reason = "Por favor, especifique o motivo da ação"
    }

    // Validate date if specific duration is selected
    if (durationType === "specific") {
      if (!specificDate) {
        newErrors.date = "Por favor, selecione uma data"
      } else {
        const selectedDate = new Date(specificDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (selectedDate <= today) {
          newErrors.date = "A data deve ser futura"
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      console.log("[v0] Validation errors:", newErrors)
      setErrors(newErrors)
      return
    }

    console.log("[v0] Form validation passed, calling onConfirm")

    // Call onConfirm with the reason and duration
    const duration = durationType === "indefinite" ? "indefinite" : new Date(specificDate)
    onConfirm(reason, duration)

    // Reset form
    setReason("")
    setDurationType("indefinite")
    setSpecificDate("")
    setErrors({})

    console.log("[v0] Form reset completed")
  }

  const handleCancel = () => {
    setReason("")
    setDurationType("indefinite")
    setSpecificDate("")
    setErrors({})
    onOpenChange(false)
  }

  if (!user) return null

  const isActivating = !user.is_active
  const actionText = isActivating ? "ativar" : "desativar"
  const actionTextCapitalized = isActivating ? "Ativar" : "Desativar"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-[800px]",
            "shadow-[rgba(0,0,0,0.2)_-8px_0px_32px_0px,rgba(0,0,0,0.1)_-4px_0px_16px_0px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
            "duration-300 ease-in-out overflow-hidden flex flex-col",
          )}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-shrink-0 p-8 pb-4 border-b">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-6 w-6 text-info" />
              <h2 className="text-2xl font-bold">Confirmar {actionTextCapitalized} Usuário</h2>
            </div>
            <p className="text-muted-foreground">
              {isActivating
                ? "Ative o usuário para restaurar seu acesso à plataforma"
                : "Desative o usuário para suspender seu acesso à plataforma"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
            <div className="bg-warning-muted border border-warning rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning-foreground">Você está prestes a {actionText} o usuário</h3>
                  <p className="text-sm text-warning-foreground mt-1">
                    <strong>{user.name}</strong> ({user.email})
                  </p>
                  <p className="text-sm text-warning-foreground/80 mt-2">
                    {isActivating
                      ? "Ao ativar este usuário, ele terá acesso novamente à plataforma e poderá realizar suas atividades normalmente."
                      : "Ao desativar este usuário, ele perderá o acesso à plataforma e não poderá realizar login até ser reativado."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-semibold">
                Motivo da {isActivating ? "Ativação" : "Desativação"} *
              </Label>
              <Textarea
                id="reason"
                placeholder={`Descreva o motivo para ${actionText} este usuário...`}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (errors.reason) setErrors({ ...errors, reason: undefined })
                }}
                className={`min-h-[100px] ${errors.reason ? "border-destructive" : ""}`}
              />
              {errors.reason && <p className="text-sm text-destructive">{errors.reason}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Duração da {isActivating ? "Ativação" : "Desativação"} *</Label>
              <RadioGroup
                value={durationType}
                onValueChange={(value) => setDurationType(value as "indefinite" | "specific")}
              >
                <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="indefinite" id="indefinite" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="indefinite" className="cursor-pointer font-medium flex items-center space-x-2">
                      <Infinity className="h-4 w-4 text-info" />
                      <span>Indeterminado</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isActivating
                        ? "O usuário permanecerá ativo até que seja desativado manualmente."
                        : "O usuário permanecerá inativo até que seja ativado manualmente."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="specific" id="specific" className="mt-1" />
                  <div className="flex-1 space-y-3">
                    <Label htmlFor="specific" className="cursor-pointer font-medium flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Data Específica</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isActivating
                        ? "O usuário será automaticamente desativado na data selecionada."
                        : "O usuário será automaticamente reativado na data selecionada."}
                    </p>
                    {durationType === "specific" && (
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={specificDate}
                          onChange={(e) => {
                            setSpecificDate(e.target.value)
                            if (errors.date) setErrors({ ...errors, date: undefined })
                          }}
                          className={errors.date ? "border-destructive" : ""}
                          min={new Date().toISOString().split("T")[0]}
                        />
                        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-info-muted border border-info rounded-lg p-4">
              <h4 className="font-semibold text-info-foreground text-sm mb-2">Informações Importantes</h4>
              <ul className="text-sm text-info-foreground/90 space-y-1 list-disc list-inside">
                <li>Esta ação será registrada no histórico do usuário</li>
                <li>O usuário será notificado sobre a mudança de status</li>
                {durationType === "specific" && <li>A reversão automática ocorrerá às 00:00 da data selecionada</li>}
              </ul>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-end space-x-2 p-8 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className={isActivating ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}
            >
              {actionTextCapitalized} Usuário
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
