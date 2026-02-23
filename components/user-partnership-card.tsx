// @ts-nocheck
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Handshake, Star, Plus, Check } from "lucide-react"
import { User as UserType } from "@/types/user"

interface UserPartnershipCardProps {
  user: UserType | null
  accountType?: string
  onInviteSent?: (partnershipType: string) => void
}

export function UserPartnershipCard({ user, accountType, onInviteSent }: UserPartnershipCardProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [selectedPartnershipType, setSelectedPartnershipType] = useState<string | null>(null)
  const [isPartner, setIsPartner] = useState(false)
  const [partnershipData, setPartnershipData] = useState({
    commissionType: "percentage",
    commissionValue: "",
    minimumGuaranteed: "",
    notes: ""
  })

  // Determinar tipo de usuário - usar accountType fornecido como prioridade
  const getUserType = () => {
    if (!user) return undefined
    
    // Usar accountType fornecido como prop (prioridade máxima)
    if (accountType) {
      const type = String(accountType).toLowerCase()
      if (type.includes("company")) return "company"
      if (type.includes("nomad") || type.includes("nomade")) return "nomade"
      if (type.includes("agency") || type.includes("agencia")) return "agencia"
      return undefined
    }
    
    // Tentar accountType do user
    if (user.accountType) {
      const accountTypeStr = String(user.accountType).toLowerCase()
      if (accountTypeStr.includes("company")) return "company"
      if (accountTypeStr.includes("nomad") || accountTypeStr.includes("nomade")) return "nomade"
      if (accountTypeStr.includes("agency") || accountTypeStr.includes("agencia")) return "agencia"
    }
    
    // Tentar tipo como fallback
    if ((user as any).tipo) {
      const tipo = String((user as any).tipo).toLowerCase()
      if (tipo.includes("company")) return "company"
      if (tipo.includes("nomad") || tipo.includes("nomade")) return "nomade"
      if (tipo.includes("agency") || tipo.includes("agencia")) return "agencia"
    }
    
    // Tentar type como fallback
    if ((user as any).type) {
      const type = String((user as any).type).toLowerCase()
      if (type.includes("company")) return "company"
      if (type.includes("nomad") || type.includes("nomade")) return "nomade"
      if (type.includes("agency") || type.includes("agencia")) return "agencia"
    }
    
    // Se nada foi encontrado, retorna undefined (sem fallback mascarador)
    return undefined
  }

  const userType = getUserType()

  // Configuração de parcerias por tipo
  const partnershipConfig: Record<string, any> = {
    nomade: {
      title: "Convide este Nômade para uma parceria",
      description: "Expanda sua rede e ganhe comissões através de parcerias estratégicas",
      icon: Star,
      buttons: [
        { type: "nomade-partner", label: "Convidar como Nômade Partner", icon: Plus }
      ]
    },
    agencia: {
      title: "Convide esta Agência para parceria",
      description: "Estabeleça parcerias comerciais e expanda suas operações",
      icon: Handshake,
      buttons: [
        { type: "agency-partner", label: "Convidar como Agency Partner", icon: Plus }
      ]
    },
    company: {
      title: "Convide esta Empresa para parceria",
      description: "Crie oportunidades de negócio e colaboração estratégica",
      icon: Star,
      buttons: [
        { type: "company-partner", label: "Convidar como Company Partner", icon: Plus }
      ]
    }
  }

  const config = partnershipConfig[userType]
  const IconComponent = config?.icon

  // Não exibir o card se: usuário for null, já for partner, ou tipo não foi identificado
  if (!user || isPartner || !userType || !config) return null

  const handleInviteClick = (type: string) => {
    setSelectedPartnershipType(type)
    setIsInviteModalOpen(true)
  }

  const handleConfirmInvite = () => {
    setIsConfirmOpen(true)
  }

  const handleSendInvite = () => {
    setIsPartner(true)
    setIsInviteModalOpen(false)
    setIsConfirmOpen(false)
    onInviteSent?.(selectedPartnershipType || "")
    
    // Reset form
    setPartnershipData({
      commissionType: "percentage",
      commissionValue: "",
      minimumGuaranteed: "",
      notes: ""
    })
  }

  return (
    <div className="mb-6">
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 border-0 shadow-lg">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
        
        {/* Content */}
        <div className="relative p-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                {config.title}
              </h3>
              <p className="text-sm text-blue-100 mb-4">
                {config.description}
              </p>
              
              {/* Buttons */}
              <div className="flex flex-wrap gap-2">
                {config.buttons.map((button: any) => (
                  <Button
                    key={button.type}
                    onClick={() => handleInviteClick(button.type)}
                    className="bg-white/90 hover:bg-white text-blue-700 font-medium text-xs py-2 px-3 rounded-lg transition-all"
                  >
                    <button.icon className="h-3.5 w-3.5 mr-1" />
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal de Convite */}
      <AlertDialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Configurar Parceria</AlertDialogTitle>
            <AlertDialogDescription>
              Defina os termos comerciais para esta parceria
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Tipo de Comissão */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Tipo de Comissão</label>
              <Select value={partnershipData.commissionType} onValueChange={(value) => setPartnershipData({ ...partnershipData, commissionType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="hybrid">Híbrida (Percentual + Mínimo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor de Comissão */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                {partnershipData.commissionType === "percentage" 
                  ? "Percentual de Comissão" 
                  : "Valor da Comissão"}
              </label>
              <Input
                type="number"
                placeholder={partnershipData.commissionType === "percentage" ? "Ex: 15" : "Ex: 500"}
                value={partnershipData.commissionValue}
                onChange={(e) => setPartnershipData({ ...partnershipData, commissionValue: e.target.value })}
              />
            </div>

            {/* Valor Mínimo Garantido (se híbrido) */}
            {partnershipData.commissionType === "hybrid" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Valor Mínimo Garantido (R$)</label>
                <Input
                  type="number"
                  placeholder="Ex: 1000"
                  value={partnershipData.minimumGuaranteed}
                  onChange={(e) => setPartnershipData({ ...partnershipData, minimumGuaranteed: e.target.value })}
                />
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Observações Adicionais (Opcional)</label>
              <Input
                placeholder="Notas sobre a parceria..."
                value={partnershipData.notes}
                onChange={(e) => setPartnershipData({ ...partnershipData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInvite} className="bg-blue-600 hover:bg-blue-700">
              Continuar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio de Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente enviar este convite de parceria com as configurações informadas?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs">
            <p><strong>Tipo:</strong> {selectedPartnershipType}</p>
            <p><strong>Comissão:</strong> {partnershipData.commissionValue} {partnershipData.commissionType === "percentage" ? "%" : "R$"}</p>
            {partnershipData.minimumGuaranteed && (
              <p><strong>Mínimo Garantido:</strong> R$ {partnershipData.minimumGuaranteed}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendInvite} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Enviar Convite
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
