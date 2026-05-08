
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, TrendingUp, BarChart3 } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface MetricChartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metricKey: string
  metricTitle: string
  chartType?: "line" | "bar"
  data: Array<{ date: string; value: number; label?: string }>
  dataKeys?: string[]
  colors?: string[]
}

export function MetricChartModal({
  open,
  onOpenChange,
  metricKey,
  metricTitle,
  chartType = "line",
  data,
  dataKeys = ["value"],
  colors = ["#3b82f6"],
}: MetricChartModalProps) {
  const [period, setPeriod] = useState("30")
  const chartRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!chartRef.current) return

    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      })

      const link = document.createElement("a")
      link.download = `${metricKey}-grafico-${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error("Erro ao baixar gráfico:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {chartType === "line" ? <TrendingUp className="h-6 w-6" /> : <BarChart3 className="h-6 w-6" />}
            {metricTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Período:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDownload} variant="outline" className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Baixar Gráfico
            </Button>
          </div>

          <div ref={chartRef} className="bg-white p-6 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{metricTitle}</h3>
              <p className="text-sm text-gray-500">Período: Últimos {period} dias</p>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              {chartType === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  {dataKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={colors[index] || colors[0]}
                      strokeWidth={2}
                      dot={{ fill: colors[index] || colors[0], r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  {dataKeys.map((key, index) => (
                    <Bar key={key} dataKey={key} fill={colors[index] || colors[0]} radius={[8, 8, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor Atual</p>
              <p className="text-2xl font-bold">{data[data.length - 1]?.value.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Média do Período</p>
              <p className="text-2xl font-bold">
                {(data.reduce((acc, d) => acc + d.value, 0) / data.length).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Variação</p>
              <p className="text-2xl font-bold text-green-600">
                +{(((data[data.length - 1]?.value - data[0]?.value) / data[0]?.value) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
