import { useEffect, useState, useMemo } from 'react'
import { getTransactions, type Transaction } from '@/services/transactions'
import { getAccounts, type Account } from '@/services/accounts'
import { getCreditCards, type CreditCard } from '@/services/credit-cards'
import { useRealtime } from '@/hooks/use-realtime'
import { useAppStore } from '@/stores/main'
import { ReportFilters } from '@/components/report-filters'
import { ReportSummaryCards } from '@/components/report-summary-cards'
import { ReportCharts } from '@/components/report-charts'
import { ReportCategoryBreakdown } from '@/components/report-category-breakdown'
import { MONTH_NAMES_PT } from '@/lib/finance-utils'

export default function Relatorios() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [creditCardId, setCreditCardId] = useState<string | null>(null)
  const { selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useAppStore()

  const loadData = async () => {
    try {
      const [txns, accs, cards] = await Promise.all([
        getTransactions(selectedYear),
        getAccounts(),
        getCreditCards(),
      ])
      setTransactions(txns)
      setAccounts(accs)
      setCreditCards(cards)
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

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedMonth !== null && new Date(t.date).getMonth() !== selectedMonth) return false
      if (accountId && t.account_id !== accountId) return false
      if (creditCardId && t.credit_card_id !== creditCardId) return false
      return true
    })
  }, [transactions, selectedMonth, accountId, creditCardId])

  const stats = useMemo(() => {
    let income = 0,
      expense = 0,
      creditCardTotal = 0
    filtered.forEach((t) => {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
      if (t.credit_card_id && t.type === 'expense') creditCardTotal += t.amount
    })
    return {
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      creditCardTotal,
    }
  }, [filtered])

  const barData = useMemo(() => {
    const map: Record<string, { month: string; income: number; expense: number }> = {}
    MONTH_NAMES_PT.forEach((m) => {
      map[m] = { month: m, income: 0, expense: 0 }
    })
    transactions.forEach((t) => {
      if (accountId && t.account_id !== accountId) return
      if (creditCardId && t.credit_card_id !== creditCardId) return
      const m = MONTH_NAMES_PT[new Date(t.date).getMonth()]
      if (map[m]) {
        if (t.type === 'income') map[m].income += t.amount
        else map[m].expense += t.amount
      }
    })
    return Object.values(map)
  }, [transactions, accountId, creditCardId])

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

  const categoryData = useMemo(() => {
    const map: Record<string, { group: string; category: string; amount: number }> = {}
    filtered
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = `${t.group || 'Outros'}|${t.category}`
        if (!map[key]) map[key] = { group: t.group || 'Outros', category: t.category, amount: 0 }
        map[key].amount += t.amount
      })
    return Object.values(map)
  }, [filtered])

  if (loading) return <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm">Análise financeira completa — {selectedYear}</p>
      </div>

      <ReportFilters
        year={selectedYear}
        month={selectedMonth}
        accountId={accountId}
        creditCardId={creditCardId}
        accounts={accounts}
        creditCards={creditCards}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        onAccountChange={setAccountId}
        onCreditCardChange={setCreditCardId}
      />

      <ReportSummaryCards {...stats} />

      <ReportCharts barData={barData} pieData={pieData} />

      <ReportCategoryBreakdown data={categoryData} />
    </div>
  )
}
