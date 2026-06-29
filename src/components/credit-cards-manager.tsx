import { useEffect, useState } from 'react'
import {
  getCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  type CreditCard,
} from '@/services/credit-cards'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/stores/main'
import pb from '@/lib/pocketbase/client'
import type { Transaction } from '@/services/transactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, CreditCard as CreditCardIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatMonthYear, MONTH_NAMES_PT } from '@/lib/finance-utils'

const EMPTY_FORM = { name: '', bank: '', limit: '0', due_day: '10' }

export function CreditCardsManager() {
  const { user } = useAuth()
  const { selectedYear, selectedMonth } = useAppStore()
  const [cards, setCards] = useState<CreditCard[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const { toast } = useToast()

  // Determinar o mês/ano atual para faturas, baseado na seleção global ou no mês atual se nulo
  const monthIdx = selectedMonth !== null ? selectedMonth : new Date().getMonth()
  const year = selectedYear || new Date().getFullYear()
  const filterMonthYear = `${MONTH_NAMES_PT[monthIdx]}/${String(year).slice(2)}`

  const loadData = async () => {
    try {
      const [fetchedCards, fetchedTransactions] = await Promise.all([
        getCreditCards(),
        pb.collection<Transaction>('transactions').getFullList({
          filter: `credit_card_id != "" && month_year = "${filterMonthYear}"`,
        }),
      ])
      setCards(fetchedCards)
      setTransactions(fetchedTransactions)
    } catch {
      toast({ title: 'Erro ao carregar cartões de crédito', variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [filterMonthYear])

  useRealtime('credit_cards', () => loadData())
  useRealtime('transactions', () => loadData())

  const getCardInvoiceTotal = (cardId: string) => {
    return transactions
      .filter((t) => t.credit_card_id === cardId)
      .reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : -t.amount), 0)
  }

  const totalInvoices = cards.reduce((acc, card) => acc + getCardInvoiceTotal(card.id), 0)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setIsOpen(true)
  }

  const openEdit = (card: CreditCard) => {
    setForm({
      name: card.name,
      bank: card.bank,
      limit: String(card.limit ?? 0),
      due_day: String(card.due_day ?? 10),
    })
    setEditingId(card.id)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    try {
      const data = {
        name: form.name,
        bank: form.bank,
        limit: Number(form.limit),
        due_day: Number(form.due_day),
        user_id: user.id,
      }
      if (editingId) {
        await updateCreditCard(editingId, data)
        toast({ title: 'Cartão atualizado com sucesso.' })
      } else {
        await createCreditCard({ ...data, active: true })
        toast({ title: 'Cartão criado com sucesso.' })
      }
      setIsOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar cartão', variant: 'destructive' })
    }
  }

  const handleToggle = async (card: CreditCard) => {
    try {
      await updateCreditCard(card.id, { active: !card.active })
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const handleDelete = async (card: CreditCard) => {
    try {
      if (!confirm('Deseja realmente excluir este cartão de crédito?')) return
      await deleteCreditCard(card.id)
      toast({ title: 'Cartão excluído com sucesso.' })
    } catch {
      toast({ title: 'Erro ao excluir cartão', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50/50 border-blue-100">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4" />
              Total de Faturas a Pagar no Mês ({filterMonthYear})
            </p>
            <h3 className="text-3xl font-bold text-blue-900">{formatCurrency(totalInvoices)}</h3>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Cartão
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-md border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Limite Disponível</TableHead>
              <TableHead className="text-center">Dia de Vencimento</TableHead>
              <TableHead className="text-right">Valor Total da Fatura</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Nenhum cartão cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              cards.map((card) => {
                const invoiceTotal = getCardInvoiceTotal(card.id)
                return (
                  <TableRow key={card.id} className="hover:bg-slate-50 even:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">{card.name}</TableCell>
                    <TableCell className="text-slate-600">{card.bank}</TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatCurrency(card.limit || 0)}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">{card.due_day}</TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {formatCurrency(invoiceTotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Switch checked={card.active} onCheckedChange={() => handleToggle(card)} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(card)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(card)}
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
            <DialogTitle>{editingId ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Nubank Ultravioleta"
              />
            </div>
            <div className="space-y-2">
              <Label>Banco / Instituição</Label>
              <Input
                required
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
                placeholder="Ex: Nubank"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite Disponível (R$)</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.limit}
                  onChange={(e) => setForm({ ...form, limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={form.due_day}
                  onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2">
              {editingId ? 'Atualizar Cartão' : 'Criar Cartão'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
