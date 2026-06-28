import { useEffect, useState, useMemo } from 'react'
import { getTransactions, type Transaction } from '@/services/transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function Analises() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    getTransactions().then(setTransactions)
  }, [])

  const { categoryData, cashflowData } = useMemo(() => {
    const catMap: Record<string, number> = {}
    const flowMap: Record<string, { date: string; net: number }> = {}

    transactions.forEach((t) => {
      // Categorias de despesas
      if (t.type === 'expense') {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount
      }

      // Fluxo de caixa
      const d = t.date.split(' ')[0]
      if (!flowMap[d]) flowMap[d] = { date: d.slice(5), net: 0 }
      flowMap[d].net += t.type === 'income' ? t.amount : -t.amount
    })

    const categories = Object.keys(catMap)
      .map((k) => ({ name: k, value: catMap[k] }))
      .sort((a, b) => b.value - a.value)
    const flow = Object.values(flowMap).sort((a, b) => a.date.localeCompare(b.date))

    return { categoryData: categories, cashflowData: flow }
  }, [transactions])

  const COLORS = ['#1e293b', '#2563eb', '#15803d', '#dc2626', '#f59e0b', '#8b5cf6']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análise Financeira</h1>
        <p className="text-slate-500 text-sm">Inteligência visual para tomadas de decisão.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg">
                            <p className="font-medium text-slate-900">{payload[0].name}</p>
                            <p className="text-slate-600">
                              R$ {payload[0].value?.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">
              Evolução do Fluxo de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {cashflowData.length > 0 ? (
              <ChartContainer
                config={{ net: { label: 'Saldo', color: '#2563eb' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={cashflowData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dx={-10}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#2563eb"
                      fillOpacity={1}
                      fill="url(#colorNet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
