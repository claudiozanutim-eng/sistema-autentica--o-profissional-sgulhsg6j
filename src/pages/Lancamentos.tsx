import { useEffect, useState, useMemo } from 'react'
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  type Transaction,
} from '@/services/transactions'
import { getAccounts, type Account } from '@/services/accounts'
import { getChartOfAccounts, type ChartOfAccount } from '@/services/chart-of-accounts'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/stores/main'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  formatCurrency,
  detectTransfers,
  prepareTransactionData,
  MONTH_NAMES_PT,
  MONTH_LABELS_PT,
} from '@/lib/finance-utils'

const PAGE_SIZE = 50

export default function Lancamentos() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([])
  const { user } = useAuth()
  const { toast } = useToast()
  const { selectedYear } = useAppStore()

  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    group: '',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
  })

  const loadData = async () => {
    try {
      const [tx, acc, coa] = await Promise.all([
        getTransactions(selectedYear),
        getAccounts(),
        getChartOfAccounts(),
      ])
      setTransactions(tx)
      setAccounts(acc)
      setChartOfAccounts(coa.filter((c) => c.active))
    } catch (e) {
      console.error(e)
    }
  }
  useEffect(() => {
    loadData()
  }, [selectedYear])
  useRealtime('transactions', () => loadData())

  const transferIds = useMemo(() => detectTransfers(transactions), [transactions])

  const groupOptions = useMemo(
    () => [...new Set(chartOfAccounts.map((c) => c.group))],
    [chartOfAccounts],
  )

  const categoryOptions = useMemo(
    () => chartOfAccounts.filter((c) => c.group === form.group),
    [chartOfAccounts, form.group],
  )

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        if (
          search &&
          !t.description.toLowerCase().includes(search.toLowerCase()) &&
          !t.category.toLowerCase().includes(search.toLowerCase())
        )
          return false
        if (filterGroup !== 'all' && t.group !== filterGroup) return false
        if (filterAccount !== 'all' && t.account_id !== filterAccount) return false
        if (filterStatus !== 'all' && t.status !== filterStatus) return false
        return true
      }),
    [transactions, search, filterGroup, filterAccount, filterStatus],
  )

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const balances = useMemo(() => {
    let income = 0,
      expense = 0,
      pending = 0
    transactions.forEach((t) => {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
      if (t.status === 'pending') pending += t.amount
    })
    const consolidated = income - expense
    return { month: income - expense, consolidated, available: consolidated - pending }
  }, [transactions])

  const groups =
    groupOptions.length > 0
      ? groupOptions
      : [...new Set(transactions.map((t) => t.group).filter(Boolean))]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!form.group) {
      toast({ title: 'Selecione um grupo.', variant: 'destructive' })
      return
    }
    if (!form.category) {
      toast({ title: 'Selecione uma categoria.', variant: 'destructive' })
      return
    }
    const matchingCoa = chartOfAccounts.find(
      (c) => c.group === form.group && c.category === form.category,
    )
    if (!matchingCoa) {
      toast({ title: 'Categoria não pertence ao grupo selecionado.', variant: 'destructive' })
      return
    }
    try {
      await createTransaction(
        prepareTransactionData(
          {
            ...form,
            amount: Number(form.amount),
            type: matchingCoa.type as any,
            status: form.status as any,
            user_id: user.id,
            account_id: form.account_id || accounts.find((a) => a.active)?.id || '',
          },
          user.id,
          'manual',
        ),
      )
      setIsOpen(false)
      setForm({
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        group: '',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        account_id: '',
      })
      toast({ title: 'Lançamento criado com sucesso.' })
    } catch {
      toast({ title: 'Erro ao criar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este lançamento?')) return
    try {
      await deleteTransaction(id)
      toast({ title: 'Excluído com sucesso.' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lançamentos</h1>
          <p className="text-slate-500 text-sm">Gestão detalhada de transações financeiras.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Novo Lançamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grupo</label>
                <Select
                  value={form.group}
                  onValueChange={(v) => setForm({ ...form, group: v, category: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-medium ${!form.group ? 'text-slate-300' : ''}`}>
                  Categoria
                </label>
                <Select
                  value={form.category}
                  onValueChange={(v) => {
                    const coa = chartOfAccounts.find(
                      (c) => c.category === v && c.group === form.group,
                    )
                    setForm({ ...form, category: v, type: coa?.type || form.type })
                  }}
                  disabled={!form.group}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.group ? 'Selecione uma categoria' : 'Selecione um grupo primeiro'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.category}>
                        {c.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    className={`text-sm font-medium ${!form.category ? 'text-slate-300' : ''}`}
                  >
                    Valor (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    disabled={!form.category}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={!form.category ? 'bg-slate-50' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className={`text-sm font-medium ${!form.category ? 'text-slate-300' : ''}`}
                  >
                    Data
                  </label>
                  <Input
                    type="date"
                    required
                    disabled={!form.category}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={!form.category ? 'bg-slate-50' : ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Tipo (auto)</label>
                  <Select value={form.type} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta</label>
                <Select
                  value={form.account_id}
                  onValueChange={(v) => setForm({ ...form, account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.active)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                Salvar Lançamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Saldo do Mês', value: balances.month, color: 'text-slate-900' },
          {
            label: 'Saldo Consolidado',
            value: balances.consolidated,
            color: balances.consolidated >= 0 ? 'text-emerald-600' : 'text-red-600',
          },
          {
            label: 'Dinheiro Disponível',
            value: balances.available,
            color: balances.available >= 0 ? 'text-emerald-600' : 'text-red-600',
          },
        ].map((b) => (
          <Card key={b.label} className="border-slate-200">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{b.label}</p>
              <p className={`text-2xl font-bold ${b.color}`}>{formatCurrency(b.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-600">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {t.description}
                      {transferIds.has(t.id) && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                          Transferência
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{t.group || '-'}</TableCell>
                    <TableCell>
                      {t.status === 'paid' && (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Pago
                        </Badge>
                      )}
                      {t.status === 'pending' && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 hover:bg-amber-100"
                        >
                          Pendente
                        </Badge>
                      )}
                      {t.status === 'overdue' && (
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-800 hover:bg-red-100"
                        >
                          Atrasado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id)}
                        className="text-slate-400 hover:text-red-600 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
