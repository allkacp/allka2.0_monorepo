// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, User, Globe, Shield, CheckCircle } from "lucide-react"
import type { Company } from "@/types/user"
import type { AcceptedTerms } from "@/types/admin"

interface AcceptedTermsHistoryProps {
  company: Company
}

// Mock data - replace with actual API calls
const mockAcceptedTerms: AcceptedTerms[] = [
  {
    id: 1,
    account_id: 1,
    account_type: "company",
    term_type: "terms_of_service",
    term_version: "2.1",
    accepted_by: 1,
    accepted_at: "2024-01-15T10:30:00Z",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: 2,
    account_id: 1,
    account_type: "company",
    term_type: "privacy_policy",
    term_version: "1.5",
    accepted_by: 1,
    accepted_at: "2024-01-15T10:30:00Z",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: 3,
    account_id: 1,
    account_type: "company",
    term_type: "data_processing",
    term_version: "1.2",
    accepted_by: 1,
    accepted_at: "2024-01-15T10:30:00Z",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: 4,
    account_id: 1,
    account_type: "company",
    term_type: "service_agreement",
    term_version: "3.0",
    accepted_by: 2,
    accepted_at: "2023-12-01T14:20:00Z",
    ip_address: "192.168.1.101",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
]

export function AcceptedTermsHistory({ company }: AcceptedTermsHistoryProps) {
  const [acceptedTerms, setAcceptedTerms] = useState<AcceptedTerms[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAcceptedTerms(mockAcceptedTerms)
      setLoading(false)
    }, 1000)
  }, [])

  const getTermTypeLabel = (termType: string) => {
    switch (termType) {
      case "terms_of_service":
        return "Termos de Serviço"
      case "privacy_policy":
        return "Política de Privacidade"
      case "data_processing":
        return "Processamento de Dados"
      case "service_agreement":
        return "Acordo de Serviços"
      default:
        return termType
    }
  }

  const getTermTypeIcon = (termType: string) => {
    switch (termType) {
      case "terms_of_service":
        return <FileText className="h-5 w-5 text-blue-600" />
      case "privacy_policy":
        return <Shield className="h-5 w-5 text-green-600" />
      case "data_processing":
        return <Globe className="h-5 w-5 text-purple-600" />
      case "service_agreement":
        return <CheckCircle className="h-5 w-5 text-orange-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getUserName = (userId: number) => {
    const user = company.users.find((u) => u.id === userId)
    return user ? user.name : `Usuário ${userId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Termos Aceitos</span>
          </CardTitle>
          <CardDescription>Histórico de todos os termos e políticas aceitos pela sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">{acceptedTerms.length} termos aceitos</span>
            </div>
            <Badge variant="outline" className="text-green-600">
              Conformidade em dia
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Terms List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Histórico de Aceites</h3>

        <div className="grid gap-4">
          {acceptedTerms.map((term) => (
            <Card key={term.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {getTermTypeIcon(term.term_type)}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium">{getTermTypeLabel(term.term_type)}</h4>
                        <p className="text-sm text-muted-foreground">Versão {term.term_version}</p>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>Aceito por: {getUserName(term.accepted_by)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(term.accepted_at).toLocaleDateString()} às{" "}
                            {new Date(term.accepted_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <p>IP: {term.ip_address}</p>
                        <p className="truncate max-w-md">User Agent: {term.user_agent}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aceito
                    </Badge>
                    <Button variant="outline" size="sm">
                      Ver Documento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Current Terms Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status Atual dos Termos</CardTitle>
          <CardDescription>Verifique se todos os termos necessários foram aceitos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { type: "terms_of_service", label: "Termos de Serviço", required: true },
              { type: "privacy_policy", label: "Política de Privacidade", required: true },
              { type: "data_processing", label: "Processamento de Dados", required: true },
              { type: "service_agreement", label: "Acordo de Serviços", required: false },
            ].map((termInfo) => {
              const isAccepted = acceptedTerms.some((term) => term.term_type === termInfo.type)
              const latestVersion = acceptedTerms
                .filter((term) => term.term_type === termInfo.type)
                .sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime())[0]

              return (
                <div key={termInfo.type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getTermTypeIcon(termInfo.type)}
                    <div>
                      <p className="font-medium">{termInfo.label}</p>
                      {latestVersion && (
                        <p className="text-xs text-muted-foreground">
                          Versão {latestVersion.term_version} -{" "}
                          {new Date(latestVersion.accepted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {termInfo.required && (
                      <Badge variant="outline" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                    <Badge variant={isAccepted ? "default" : "destructive"} className="text-xs">
                      {isAccepted ? "Aceito" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
