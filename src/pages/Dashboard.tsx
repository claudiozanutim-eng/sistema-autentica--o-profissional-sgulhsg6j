import { useEffect, useState, useMemo } from 'react'
import { getTransactions, type Transaction } from '@/services/transactions'
import { getAccounts } from '@/services/accounts'
import { useRealtime } from '@/hooks/use-realtime'
import { useAppStore } from '@/stores/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
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
import { ArrowDownRight, ArrowUpRight, DollarSign, Clock } from 'lucide-react'
import {
  formatCurrency,
  AVAILABLE_YEARS,
  MONTH_NAMES_PT,
  MONTH_LABELS_PT,
} from '@/lib/finance-utils'

const PIE_COLORS = ['#1E3A5F', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899']

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useAppStore()

  const loadData = async () => {
    try {
      setTransactions(await getTransactions(selectedYear))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadData()
  }, [selectedYear])
  useRealtime('transactions', () => loadData())

  const filtered = useMemo(
    () =>
      selectedMonth !== null
        ? transactions.filter((t) => new Date(t.date).getMonth() === selectedMonth)
        : transactions,
    [transactions, selectedMonth],
  )

  const stats = useMemo(() => {
    let income = 0,
      expense = 0,
      pending = 0
    filtered.forEach((t) => {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
      if (t.status === 'pending') pending += t.amount
    })
    return { income, expense, profit: income - expense, pending }
  }, [filtered])

  const pieData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const g = t.group || 'Outros'
        map[g] = (map[g] || 0) + t.amount
      })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const barData = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number }> = {}
    MONTH_NAMES_PT.forEach((m) => {
      map[m] = { month: m, income: 0, expense: 0 }
    })
    transactions.forEach((t) => {
      const m = MONTH_NAMES_PT[new Date(t.date).getMonth()]
      if (map[m]) {
        if (t.type === 'income') map[m].income += t.amount
        else map[m].expense += t.amount
      }
    })
    return Object.values(map)
  }, [transactions])

  const areaData = useMemo(() => {
    let cumulative = 0
    return barData.map((d) => {
      cumulative += d.income - d.expense
      return { month: d.month, balance: cumulative }
    })
  }, [barData])

  if (loading) return <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 text-sm">Acompanhamento financeiro em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth === null ? 'all' : String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {MONTH_LABELS_PT.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: 'Receita Total',
            value: stats.income,
            icon: ArrowUpRight,
            color: 'bg-emerald-100 text-emerald-600',
          },
          {
            label: 'Despesas Totais',
            value: stats.expense,
            icon: ArrowDownRight,
            color: 'bg-red-100 text-red-600',
          },
          {
            label: 'Lucro Líquido',
            value: stats.profit,
            icon: DollarSign,
            color: 'bg-blue-100 text-blue-600',
          },
          {
            label: 'Pendentes',
            value: stats.pending,
            icon: Clock,
            color: 'bg-amber-100 text-amber-600',
          },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
              <div className={`w-8 h-8 ${s.color} rounded-full flex items-center justify-center`}>
                <s.icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(s.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">
              Despesas por Grupo
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">
              Receitas vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{
                income: { label: 'Receitas', color: '#10B981' },
                expense: { label: 'Despesas', color: '#EF4444' },
              }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
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
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="income"
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="expense"
                    fill="var(--color-expense)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Saldo Acumulado</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ChartContainer
            config={{ balance: { label: 'Saldo', color: '#1E3A5F' } }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#1E3A5F"
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
