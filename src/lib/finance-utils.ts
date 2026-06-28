import type { Transaction } from '@/services/transactions'

export const MONTH_NAMES_PT = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
]
export const MONTH_LABELS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
export const AVAILABLE_YEARS = [2026, 2027, 2028, 2029, 2030]

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatMonthYear(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${MONTH_NAMES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
}

export function getYearFromDate(date: string): number {
  return new Date(date).getFullYear()
}

export function detectTransfers(transactions: Transaction[]): Set<string> {
  const transferIds = new Set<string>()
  const groups: Record<string, Transaction[]> = {}
  transactions.forEach((t) => {
    const dateKey = (t.date || '').split(' ')[0]
    const key = `${dateKey}_${Math.abs(t.amount)}`
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  Object.values(groups).forEach((group) => {
    if (group.length === 2 && group[0].type !== group[1].type) {
      transferIds.add(group[0].id)
      transferIds.add(group[1].id)
    }
  })
  return transferIds
}

export function prepareTransactionData(
  data: Partial<Transaction>,
  userId: string,
  origin: 'manual' | 'import' = 'manual',
): Partial<Transaction> {
  const date = new Date(data.date || new Date())
  return {
    ...data,
    year: data.year || date.getFullYear(),
    month_year: data.month_year || formatMonthYear(date),
    created_by: userId,
    origin,
    source: data.source || (origin === 'import' ? 'Importação' : 'Manual'),
  }
}
