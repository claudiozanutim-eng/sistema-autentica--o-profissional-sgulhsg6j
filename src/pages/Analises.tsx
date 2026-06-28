import { useEffect, useState, useMemo } from 'react'
import { getTransactions, type Transaction } from '@/services/transactions'
import { getAccounts, type Account } from '@/services/accounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Slider } from '@/components/ui/slider'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/finance-utils'

export default function Analises() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [inflation, setInflation] = useState(6)
  const [yieldRate, setYieldRate] = useState(12)
  const [months, setMonths] = useState(36)

  useEffect(() => {
    getTransactions().then(setTransactions).catch(console.error)
    getAccounts().then(setAccounts).catch(console.error)
  }, [])

  const projectionData = useMemo(() => {
    const accountBalance = accounts.reduce((sum, a) => sum + (a.initial_balance || 0), 0)
    let txBalance = 0
    const monthlySurplus: number[] = new Array(12).fill(0)
    transactions.forEach((t) => {
      const val = t.type === 'income' ? t.amount : -t.amount
      txBalance += val
      const m = new Date(t.date).getMonth()
      if (m >= 0 && m < 12) monthlySurplus[m] += val
    })
    const avgSurplus = monthlySurplus.reduce((a, b) => a + b, 0) / 12
    const currentBalance = accountBalance + txBalance

    const monthlyYield = yieldRate / 100 / 12
    const monthlyInflation = inflation / 100 / 12
    let balance = currentBalance
    let surplus = avgSurplus
    const data: { month: string; value: number }[] = [
      { month: 'Atual', value: Math.round(balance) },
    ]

    for (let i = 1; i <= months; i++) {
      balance = balance * (1 + monthlyYield) + surplus
      surplus = surplus * (1 - monthlyInflation)
      data.push({ month: `M${i}`, value: Math.round(balance) })
    }
    return data
  }, [transactions, accounts, inflation, yieldRate, months])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análises & Projeções</h1>
        <p className="text-slate-500 text-sm">Projeção de patrimônio com variáveis ajustáveis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">
              Projeção de Patrimônio
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ChartContainer
              config={{ value: { label: 'Patrimônio', color: '#10B981' } }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectionData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    dy={10}
                    interval={Math.max(0, Math.floor(months / 12))}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dx={-10}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorProj)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Variáveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-600">Inflação Anual</label>
                  <span className="text-sm font-bold text-slate-900">{inflation}%</span>
                </div>
                <Slider
                  value={[inflation]}
                  onValueChange={(v) => setInflation(v[0])}
                  min={0}
                  max={20}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-600">Rendimento Anual</label>
                  <span className="text-sm font-bold text-slate-900">{yieldRate}%</span>
                </div>
                <Slider
                  value={[yieldRate]}
                  onValueChange={(v) => setYieldRate(v[0])}
                  min={0}
                  max={30}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-600">Período (meses)</label>
                  <span className="text-sm font-bold text-slate-900">{months}</span>
                </div>
                <Slider
                  value={[months]}
                  onValueChange={(v) => setMonths(v[0])}
                  min={12}
                  max={60}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-emerald-50">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600">Patrimônio Projetado</p>
              <p className="text-3xl font-bold text-emerald-700">
                {formatCurrency(projectionData[projectionData.length - 1]?.value || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">em {months} meses</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
