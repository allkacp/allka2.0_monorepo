// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, DollarSign } from "lucide-react"

interface ProjectTypeData {
  type: string
  budget: number
  count: number
  percentage: number
  color: string
}

interface ProjectTypeBreakdownProps {
  data: ProjectTypeData[]
  totalValue: number
  isLoading?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  "Marketing Digital": "#3B82F6",
  "Desenvolvimento Web": "#8B5CF6",
  Design: "#EC4899",
  "E-commerce": "#F59E0B",
  "Desenvolvimento Mobile": "#10B981",
  Consultoria: "#6366F1",
  "Desenvolvimento Backend": "#14B8A6",
}

export function ProjectTypeBreakdown({ data, totalValue, isLoading = false }: ProjectTypeBreakdownProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: item.type,
    value: item.budget,
    count: item.count,
  }))

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-lg">
              <BarChart className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Tipos de Projetos</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Distribuição de valor por tipo no período</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">
              R$ {(totalValue / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-gray-600">Total do período</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="mb-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
                stroke="#9CA3AF"
              />
              <YAxis
                stroke="#9CA3AF"
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  padding: "12px",
                }}
                formatter={(value: number) => [
                  `R$ ${(value / 1000).toFixed(1)}k`,
                  "Valor Total",
                ]}
                labelStyle={{ color: "#F3F4F6" }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || "#6366F1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-indigo-600" />
            Detalhamento por Tipo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((item, index) => (
              <div
                key={item.type}
                className="p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[item.type] || "#6366F1" }}
                    />
                    <span className="text-sm font-medium text-gray-900">{item.type}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.count}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Valor</span>
                    <span className="font-semibold text-gray-900">
                      R$ {(item.budget / 1000).toFixed(1)}k
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: TYPE_COLORS[item.type] || "#6366F1",
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-gray-500">% do total</span>
                    <span className="text-xs font-medium text-gray-700">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
