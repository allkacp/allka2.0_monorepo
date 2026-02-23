// @ts-nocheck
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CreditCard, Trash2, Plus, Building2, Star } from "lucide-react"
import type { Agency } from "@/types/agency"

interface AgencyPreferencesProps {
  agency: Agency
  onUpdate: (data: Partial<Agency>) => void
}

// Mock saved cards data
const mockSavedCards = [
  {
    id: 1,
    last_four: "4532",
    brand: "visa",
    exp_month: 12,
    exp_year: 2025,
    is_default: true,
  },
  {
    id: 2,
    last_four: "8765",
    brand: "mastercard",
    exp_month: 8,
    exp_year: 2026,
    is_default: false,
  },
]

export function AgencyPreferences({ agency, onUpdate }: AgencyPreferencesProps) {
  const [bankAccount, setBankAccount] = useState(agency.bank_account || {})
  const [savedCards, setSavedCards] = useState(mockSavedCards)
  const [isEditingBank, setIsEditingBank] = useState(false)
  const [cardToSetDefault, setCardToSetDefault] = useState<number | null>(null)

  const handleSaveBankAccount = () => {
    onUpdate({ bank_account: bankAccount })
    setIsEditingBank(false)
  }

  const handleDeleteCard = (cardId: number) => {
    setSavedCards((cards) => cards.filter((card) => card.id !== cardId))
  }

  const handleSetDefaultCard = (cardId: number) => {
    setSavedCards((cards) =>
      cards.map((card) => ({
        ...card,
        is_default: card.id === cardId,
      })),
    )
    setCardToSetDefault(null)
  }

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "💳"
      case "mastercard":
        return "💳"
      case "amex":
        return "💳"
      default:
        return "💳"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Preferências</h2>
        <p className="text-slate-600 dark:text-slate-400">Gerencie suas informações de pagamento e preferências</p>
      </div>

      {/* Bank Account Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Building2 className="h-5 w-5 text-blue-500" />
                Conta Bancária para Saque
              </CardTitle>
              <CardDescription>
                Configure sua conta bancária para receber os saques (deve ter o mesmo CNPJ da agência)
              </CardDescription>
            </div>
            <Button
              variant={isEditingBank ? "default" : "outline"}
              onClick={() => setIsEditingBank(!isEditingBank)}
              className={isEditingBank ? "" : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}
            >
              {isEditingBank ? "Cancelar" : "Editar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {!isEditingBank && bankAccount.bank_name ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Label className="text-slate-600 dark:text-slate-400 text-xs">Banco</Label>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">{bankAccount.bank_name}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Label className="text-slate-600 dark:text-slate-400 text-xs">Agência</Label>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">{bankAccount.agency}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Label className="text-slate-600 dark:text-slate-400 text-xs">Conta</Label>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">{bankAccount.account}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <Label className="text-slate-600 dark:text-slate-400 text-xs">Tipo</Label>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {bankAccount.account_type === "checking" ? "Corrente" : "Poupança"}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nome do Banco</Label>
                <Input
                  id="bank_name"
                  value={bankAccount.bank_name || ""}
                  onChange={(e) => setBankAccount({ ...bankAccount, bank_name: e.target.value })}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  value={bankAccount.agency || ""}
                  onChange={(e) => setBankAccount({ ...bankAccount, agency: e.target.value })}
                  placeholder="Ex: 1234-5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account">Conta</Label>
                <Input
                  id="account"
                  value={bankAccount.account || ""}
                  onChange={(e) => setBankAccount({ ...bankAccount, account: e.target.value })}
                  placeholder="Ex: 12345-6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de Conta</Label>
                <Select
                  value={bankAccount.account_type || ""}
                  onValueChange={(value) => setBankAccount({ ...bankAccount, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <div className="space-y-2">
                  <Label>CNPJ da Conta</Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {agency.cnpj} (deve ser o mesmo CNPJ da agência)
                  </div>
                </div>
              </div>
              {isEditingBank && (
                <div className="md:col-span-2 flex gap-2">
                  <Button onClick={handleSaveBankAccount} className="bg-blue-600 hover:bg-blue-700">
                    Salvar Conta Bancária
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingBank(false)}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Cards Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <CreditCard className="h-5 w-5 text-purple-500" />
                Cartões Salvos
              </CardTitle>
              <CardDescription>Gerencie seus cartões de crédito para contratações mais rápidas</CardDescription>
            </div>
            <Button
              variant="outline"
              className="gap-2 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 bg-transparent"
            >
              <Plus className="h-4 w-4" />
              Adicionar Cartão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {savedCards.length > 0 ? (
            <div className="space-y-3">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getBrandIcon(card.brand)}</div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        •••• •••• •••• {card.last_four}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {card.brand.toUpperCase()} • Expira {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                      </div>
                    </div>
                    {card.is_default && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                        <Star className="h-3 w-3 fill-amber-700" />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCardToSetDefault(card.id)}
                        className="gap-1 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Definir como Padrão
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCard(card.id)}
                      className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
              <p className="font-medium">Nenhum cartão salvo</p>
              <p className="text-sm mt-1">Adicione um cartão para contratações mais rápidas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
          <CardTitle className="text-slate-900 dark:text-slate-100">Preferências de Notificação</CardTitle>
          <CardDescription>Configure como você deseja receber notificações</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Novos Projetos</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Receber notificações sobre novos projetos disponíveis
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 bg-transparent"
              >
                Configurar
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Pagamentos</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Notificações sobre pagamentos e comissões
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 bg-transparent"
              >
                Configurar
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Relatórios</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Relatórios mensais de performance</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 bg-transparent"
              >
                Configurar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={cardToSetDefault !== null} onOpenChange={() => setCardToSetDefault(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Definir Cartão como Padrão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja definir este cartão como padrão? Ele será usado automaticamente em futuras
              contratações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cardToSetDefault && handleSetDefaultCard(cardToSetDefault)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
