import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/finance-utils'

interface ReportSummaryCardsProps {
  totalIncome: number
  totalExpense: number
  netBalance: number
  creditCardTotal: number
}

export function ReportSummaryCards({
  totalIncome,
  totalExpense,
  netBalance,
  creditCardTotal,
}: ReportSummaryCardsProps) {
  const cards = [
    {
      label: 'Receita Total',
      value: totalIncome,
      icon: ArrowUpRight,
      bg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Despesas Totais',
      value: totalExpense,
      icon: ArrowDownRight,
      bg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    {
      label: 'Saldo Líquido',
      value: netBalance,
      icon: DollarSign,
      bg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: netBalance >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      label: 'Faturas Cartão',
      value: creditCardTotal,
      icon: CreditCard,
      bg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-slate-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{c.label}</CardTitle>
            <div className={`w-8 h-8 ${c.bg} rounded-full flex items-center justify-center`}>
              <c.icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.valueColor}`}>{formatCurrency(c.value)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
