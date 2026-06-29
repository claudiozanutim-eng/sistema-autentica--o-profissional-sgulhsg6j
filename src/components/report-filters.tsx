import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { AVAILABLE_YEARS, MONTH_LABELS_PT } from '@/lib/finance-utils'
import type { Account } from '@/services/accounts'
import type { CreditCard } from '@/services/credit-cards'

interface ReportFiltersProps {
  year: number
  month: number | null
  accountId: string | null
  creditCardId: string | null
  accounts: Account[]
  creditCards: CreditCard[]
  onYearChange: (year: number) => void
  onMonthChange: (month: number | null) => void
  onAccountChange: (accountId: string | null) => void
  onCreditCardChange: (creditCardId: string | null) => void
}

export function ReportFilters({
  year,
  month,
  accountId,
  creditCardId,
  accounts,
  creditCards,
  onYearChange,
  onMonthChange,
  onAccountChange,
  onCreditCardChange,
}: ReportFiltersProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Ano</Label>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="h-9">
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
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Mês</Label>
        <Select
          value={month === null ? 'all' : String(month)}
          onValueChange={(v) => onMonthChange(v === 'all' ? null : Number(v))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MONTH_LABELS_PT.map((m, i) => (
              <SelectItem key={i} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Conta</Label>
        <Select
          value={accountId || 'all'}
          onValueChange={(v) => onAccountChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Cartão</Label>
        <Select
          value={creditCardId || 'all'}
          onValueChange={(v) => onCreditCardChange(v === 'all' ? null : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {creditCards.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
