import { useEffect, useState } from 'react'
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  countLinkedTransactions,
  type Account,
} from '@/services/accounts'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/finance-utils'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Conta Poupança' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
]

const EMPTY_FORM = { name: '', type: 'checking', bank: '', initial_balance: '0' }

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setAccounts(await getAccounts())
    } catch {
      toast({ title: 'Erro ao carregar contas', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('accounts', () => loadData())

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setIsOpen(true)
  }

  const openEdit = (acc: Account) => {
    setForm({
      name: acc.name,
      type: acc.type,
      bank: acc.bank || '',
      initial_balance: String(acc.initial_balance ?? 0),
    })
    setEditingId(acc.id)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = { ...form, initial_balance: Number(form.initial_balance) }
      if (editingId) {
        await updateAccount(editingId, data)
        toast({ title: 'Conta atualizada com sucesso.' })
      } else {
        await createAccount({ ...data, active: true })
        toast({ title: 'Conta criada com sucesso.' })
      }
      setIsOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar conta', variant: 'destructive' })
    }
  }

  const handleToggle = async (acc: Account) => {
    try {
      await updateAccount(acc.id, { active: !acc.active })
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const handleDelete = async (acc: Account) => {
    try {
      const count = await countLinkedTransactions(acc.id)
      const msg =
        count > 0
          ? `Esta conta possui ${count} transação(ões) vinculada(s). Excluir mesmo assim?`
          : 'Deseja excluir esta conta?'
      if (!confirm(msg)) return
      await deleteAccount(acc.id)
      toast({ title: 'Conta excluída com sucesso.' })
    } catch {
      toast({ title: 'Erro ao excluir conta', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Conta
        </Button>
      </div>

      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhuma conta cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((acc) => {
                const typeLabel = ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type
                return (
                  <TableRow key={acc.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{acc.name}</TableCell>
                    <TableCell className="text-slate-600">{typeLabel}</TableCell>
                    <TableCell className="text-slate-600">{acc.bank || '-'}</TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatCurrency(acc.initial_balance || 0)}
                    </TableCell>
                    <TableCell>
                      <Switch checked={acc.active} onCheckedChange={() => handleToggle(acc)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(acc)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(acc)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da Conta</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Conta Itaú"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Banco / Instituição</Label>
              <Input
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
                placeholder="Ex: Itaú, Bradesco, Nubank"
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.initial_balance}
                onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              {editingId ? 'Atualizar Conta' : 'Criar Conta'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
