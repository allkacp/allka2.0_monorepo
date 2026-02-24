
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Send, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentMethod {
  id: string
  type: "boleto" | "cartao" | "pix" | "transferencia"
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

interface PaymentConfig {
  email: string
  sendAutomatically: boolean
  frequency: "monthly" | "quarterly" | "yearly"
  sendDay: number
}

interface PaymentConfigurationProps {
  projectId?: string
  projectName?: string
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "boleto",
    type: "boleto",
    label: "Boleto Bancário",
    description: "Boleto enviado automaticamente por email",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    id: "cartao",
    type: "cartao",
    label: "Cartão de Crédito",
    description: "Aviso de cobrança por email",
    icon: <CreditCard className="h-5 w-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    id: "pix",
    type: "pix",
    label: "PIX",
    description: "Aviso de pagamento por email",
    icon: <Send className="h-5 w-5" />,
    color: "bg-green-50 border-green-200 text-green-700",
  },
  {
    id: "transferencia",
    type: "transferencia",
    label: "Transferência Bancária",
    description: "Dados bancários e aviso por email",
    icon: <Send className="h-5 w-5" />,
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
]

export function PaymentConfiguration({ projectId, projectName }: PaymentConfigurationProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [configs, setConfigs] = useState<Record<string, PaymentConfig>>({})

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(selectedMethod === methodId ? null : methodId)
    if (!configs[methodId]) {
      setConfigs(prev => ({
        ...prev,
        [methodId]: {
          email: "",
          sendAutomatically: false,
          frequency: "monthly",
          sendDay: 1,
        },
      }))
    }
  }

  const updateConfig = (methodId: string, key: keyof PaymentConfig, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        [key]: value,
      },
    }))
  }

  const saveConfiguration = (methodId: string) => {
    const config = configs[methodId]
    if (!config?.email) {
      alert("Por favor, preencha o email")
      return
    }
    console.log(`Configuração salva para ${methodId}:`, config)
    alert("Configuração de pagamento salva com sucesso!")
  }

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-gray-900">Formas de Pagamento</h3>
        <p className="text-sm text-gray-600">Selecione uma forma de pagamento para configurar o envio automático de cobranças</p>
      </div>

      <div className="grid gap-3">
        {paymentMethods.map(method => (
          <div key={method.id}>
            <button
              onClick={() => handleSelectMethod(method.id)}
              className={cn(
                "w-full p-4 border-2 rounded-lg transition-all text-left",
                "hover:shadow-md hover:border-opacity-60",
                selectedMethod === method.id ? method.color : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{method.icon}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{method.label}</h4>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                </div>
                {configs[method.id]?.email && (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurado
                  </Badge>
                )}
              </div>
            </button>

            {selectedMethod === method.id && (
              <Card className="mt-2 border-2 border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Email para Notificações</label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={configs[method.id]?.email || ""}
                      onChange={(e) => updateConfig(method.id, "email", e.target.value)}
                      className="bg-white"
                    />
                    <p className="text-xs text-gray-500">Email onde as cobranças serão enviadas</p>
                  </div>

                  {/* Frequency Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Frequência de Envio</label>
                    <select
                      value={configs[method.id]?.frequency || "monthly"}
                      onChange={(e) => updateConfig(method.id, "frequency", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>

                  {/* Send Day */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Dia do Mês para Envio</label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={configs[method.id]?.sendDay || 1}
                      onChange={(e) => updateConfig(method.id, "sendDay", parseInt(e.target.value))}
                      className="bg-white"
                    />
                    <p className="text-xs text-gray-500">Dia entre 1 e 28 (para garantir compatibilidade com todos os meses)</p>
                  </div>

                  {/* Auto Send Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={configs[method.id]?.sendAutomatically || false}
                      onChange={(e) => updateConfig(method.id, "sendAutomatically", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">Envio Automático Habilitado</p>
                      <p className="text-xs text-gray-600">
                        {method.type === "boleto" 
                          ? "Boleto será emitido e enviado automaticamente por email"
                          : method.type === "cartao"
                          ? "Aviso de cobrança será enviado automaticamente por email"
                          : "Aviso de pagamento será enviado automaticamente por email"}
                      </p>
                    </div>
                  </div>

                  {/* Method-Specific Info */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800">
                      {method.type === "boleto" && (
                        <p>O boleto será gerado automaticamente e enviado para o email especificado de acordo com a frequência configurada.</p>
                      )}
                      {method.type === "cartao" && (
                        <p>Um aviso de cobrança será enviado antes da data limite para que o cliente possa se preparar.</p>
                      )}
                      {method.type === "pix" && (
                        <p>O código PIX e instruções de pagamento serão enviados por email na frequência especificada.</p>
                      )}
                      {method.type === "transferencia" && (
                        <p>Os dados bancários para transferência serão incluídos no email de cobrança.</p>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => saveConfiguration(method.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Salvar Configuração
                    </Button>
                    <Button
                      onClick={() => setSelectedMethod(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Resumo de Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.keys(configs).filter(id => configs[id]?.email).length === 0 ? (
            <p className="text-gray-600">Nenhuma forma de pagamento configurada ainda</p>
          ) : (
            <div className="space-y-1">
              {Object.keys(configs).map(methodId => {
                const config = configs[methodId]
                if (!config?.email) return null
                const method = paymentMethods.find(m => m.id === methodId)
                return (
                  <div key={methodId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <div>
                      <p className="font-semibold text-gray-900">{method?.label}</p>
                      <p className="text-xs text-gray-600">{config.email} • {config.frequency === "monthly" ? "Mensal" : config.frequency === "quarterly" ? "Trimestral" : "Anual"}</p>
                    </div>
                    {config.sendAutomatically && <Badge className="bg-green-100 text-green-800">Ativo</Badge>}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
