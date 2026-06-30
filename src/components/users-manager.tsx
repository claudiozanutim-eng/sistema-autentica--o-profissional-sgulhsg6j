import { useEffect, useState } from 'react'
import { getUsers, createUser, updateUser, getAvatarUrl, type UserRecord } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const EMPTY_FORM = { name: '', email: '' }

export function UsersManager() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setUsers(await getUsers())
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('users', () => loadData())

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setIsOpen(true)
  }

  const openEdit = (u: UserRecord) => {
    setForm({ name: u.name, email: u.email })
    setEditingId(u.id)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateUser(editingId, form)
        toast({ title: 'Usuário atualizado com sucesso.' })
      } else {
        await createUser(form)
        toast({ title: 'Usuário criado com sucesso. Senha padrão: Skip@Pass' })
      }
      setIsOpen(false)
    } catch (err) {
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>
      <div className="rounded-md border border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        {u.avatar && <AvatarImage src={getAvatarUrl(u)} alt={u.name} />}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-900">{u.name || 'Sem nome'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(u)}
                      className="h-8 w-8 text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@empresa.com"
              />
            </div>
            {!editingId && (
              <p className="text-xs text-slate-500">
                A senha padrão <code className="bg-slate-100 px-1 rounded">Skip@Pass</code> será
                atribuída automaticamente.
              </p>
            )}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              {editingId ? 'Atualizar Usuário' : 'Criar Usuário'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
