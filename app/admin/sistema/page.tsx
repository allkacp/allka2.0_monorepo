// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Server, Database, Activity, AlertTriangle, CheckCircle, HardDrive, Cpu, Zap, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { apiClient } from "@/lib/api-client"

const defaultSystemData = {
  status: { api: "operational", database: "operational", storage: "operational", email: "operational" },
  performance: { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, apiResponseTime: 0 },
  services: [] as any[],
  logs: [] as any[],
}

export default function AdminSistemaPage() {
  const [mockSystemData, setSystemData] = useState(defaultSystemData)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    apiClient.getReportSummary().then((data: any) => {
      if (data) setSystemData(prev => ({ ...prev, ...data }))
    }).catch(() => {})
  }, [])

  return (
    <div className="container mx-auto space-y-6 px-0 py-0">
      <PageHeader
        title="Gestão do Sistema"
        description="Monitore e gerencie a infraestrutura da plataforma"
        action={
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Status
          </Button>
        }
      />

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">API Status</p>
                <p className="text-2xl font-bold mt-2">Operacional</p>
              </div>
              <CheckCircle className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Banco de Dados</p>
                <p className="text-2xl font-bold mt-2">Operacional</p>
              </div>
              <Database className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Armazenamento</p>
                <p className="text-2xl font-bold mt-2">Operacional</p>
              </div>
              <HardDrive className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tempo Resposta</p>
                <p className="text-2xl font-bold mt-2">{mockSystemData.performance.apiResponseTime}ms</p>
              </div>
              <Zap className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Uso de CPU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{mockSystemData.performance.cpuUsage}%</span>
                    <Badge
                      variant="outline"
                      className={
                        mockSystemData.performance.cpuUsage < 60
                          ? "bg-green-50 text-green-700 border-green-200"
                          : mockSystemData.performance.cpuUsage < 80
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {mockSystemData.performance.cpuUsage < 60
                        ? "Normal"
                        : mockSystemData.performance.cpuUsage < 80
                          ? "Moderado"
                          : "Alto"}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        mockSystemData.performance.cpuUsage < 60
                          ? "bg-green-500"
                          : mockSystemData.performance.cpuUsage < 80
                            ? "bg-orange-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${mockSystemData.performance.cpuUsage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Uso de Memória
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{mockSystemData.performance.memoryUsage}%</span>
                    <Badge
                      variant="outline"
                      className={
                        mockSystemData.performance.memoryUsage < 70
                          ? "bg-green-50 text-green-700 border-green-200"
                          : mockSystemData.performance.memoryUsage < 85
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {mockSystemData.performance.memoryUsage < 70
                        ? "Normal"
                        : mockSystemData.performance.memoryUsage < 85
                          ? "Moderado"
                          : "Alto"}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        mockSystemData.performance.memoryUsage < 70
                          ? "bg-green-500"
                          : mockSystemData.performance.memoryUsage < 85
                            ? "bg-orange-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${mockSystemData.performance.memoryUsage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Uso de Disco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{mockSystemData.performance.diskUsage}%</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Normal
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full"
                      style={{ width: `${mockSystemData.performance.diskUsage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSystemData.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        <p className="text-sm text-gray-600">Último reinício: {service.lastRestart}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Uptime</p>
                        <p className="font-semibold">{service.uptime}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {service.status === "running" ? "Rodando" : "Parado"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Reiniciar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockSystemData.logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div
                      className={`mt-1 w-2 h-2 rounded-full ${
                        log.level === "error" ? "bg-red-500" : log.level === "warning" ? "bg-orange-500" : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            log.level === "error"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : log.level === "warning"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Modo de Manutenção</Label>
                  <p className="text-sm text-gray-600">Desabilita acesso temporariamente para manutenção</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Modo Debug</Label>
                  <p className="text-sm text-gray-600">Ativa logs detalhados para desenvolvimento</p>
                </div>
                <Switch checked={debugMode} onCheckedChange={setDebugMode} />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-4">Ações do Sistema</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Backup Manual
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Limpar Cache
                  </Button>
                  <Button variant="outline">
                    <Server className="h-4 w-4 mr-2" />
                    Reiniciar Serviços
                  </Button>
                  <Button variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Verificar Integridade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
