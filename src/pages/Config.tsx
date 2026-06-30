import { useState, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { AuditLogViewer } from '@/components/audit-log-viewer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { User, Lock, Settings, Wallet, CreditCard, Users, Camera, ScrollText } from 'lucide-react'
import { AccountsManager } from '@/components/accounts-manager'
import { CreditCardsManager } from '@/components/credit-cards-manager'
import { UsersManager } from '@/components/users-manager'
import { getAvatarUrl } from '@/services/users'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Config() {
  const { user, updateProfile, updatePassword, isAdmin } = useAuth()

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const avatarUrl = user?.avatar
    ? getAvatarUrl({ id: user.id, avatar: user.avatar as string })
    : null

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await updateProfile({ name, avatar: avatarFile || undefined })
    if (error) {
      toast({ title: getErrorMessage(error), variant: 'destructive' })
      return
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    toast({ title: 'Perfil atualizado com sucesso.' })
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPass.length < 8) {
      toast({ title: 'A senha deve ter no mínimo 8 caracteres.', variant: 'destructive' })
      return
    }
    if (newPass !== confirmPass) {
      toast({ title: 'As senhas não conferem.', variant: 'destructive' })
      return
    }
    const { error } = await updatePassword(newPass, confirmPass)
    if (error) {
      toast({ title: getErrorMessage(error), variant: 'destructive' })
      return
    }
    setNewPass('')
    setConfirmPass('')
    toast({ title: 'Senha atualizada com sucesso.' })
  }

  const tabCls = 'data-[state=active]:bg-white data-[state=active]:text-blue-600'
  const btnCls = 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm">Gerencie seu perfil e preferências de sistema.</p>
      </div>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200 flex-wrap h-auto">
          <TabsTrigger value="profile" className={tabCls}>
            <User className="w-4 h-4 mr-2" /> Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className={tabCls}>
            <Lock className="w-4 h-4 mr-2" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="preferences" className={tabCls}>
            <Settings className="w-4 h-4 mr-2" /> Preferências
          </TabsTrigger>
          <TabsTrigger value="contas" className={tabCls}>
            <Wallet className="w-4 h-4 mr-2" /> Contas
          </TabsTrigger>
          <TabsTrigger value="cartoes" className={tabCls}>
            <CreditCard className="w-4 h-4 mr-2" /> Cartões
          </TabsTrigger>
          <TabsTrigger value="usuarios" className={tabCls}>
            <Users className="w-4 h-4 mr-2" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="auditoria" className={tabCls}>
            <ScrollText className="w-4 h-4 mr-2" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados e foto de perfil.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4 max-w-md">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-slate-200">
                    {avatarPreview && <AvatarImage src={avatarPreview} alt="Preview" />}
                    {!avatarPreview && avatarUrl && (
                      <AvatarImage src={avatarUrl} alt={user?.name} />
                    )}
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Alterar Foto
                    </Button>
                    {avatarFile && <p className="text-xs text-slate-500 mt-1">{avatarFile.name}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Corporativo</Label>
                  <Input disabled defaultValue={user?.email || ''} className="bg-slate-50" />
                  <p className="text-xs text-slate-500">
                    Para alterar seu e-mail contate o administrador do sistema.
                  </p>
                </div>
                <Button type="submit" className={btnCls}>
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Recomendamos o uso de senhas fortes e exclusivas.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />
                </div>
                <Button type="submit" className={btnCls}>
                  Atualizar Senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>Personalize como o sistema se comporta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-slate-500">Receba resumos semanais do caixa.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro (Em breve)</Label>
                  <p className="text-sm text-slate-500">Alternar tema da interface.</p>
                </div>
                <Switch disabled />
              </div>
              <Button
                onClick={() => toast({ title: 'Preferências atualizadas com sucesso.' })}
                className={btnCls}
              >
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contas">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Gestão de Contas</CardTitle>
              <CardDescription>
                Cadastre e gerencie suas contas bancárias e formas de pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountsManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cartoes">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Cartões de Crédito</CardTitle>
              <CardDescription>
                Gerencie seus cartões de crédito, limites de uso e visualize os totais de suas
                faturas no mês.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreditCardsManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="usuarios">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                Cadastre e gerencie os usuários do sistema. Novos usuários recebem a senha padrão
                Skip@Pass.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManager />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="auditoria">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Auditoria do Sistema</CardTitle>
              <CardDescription>
                Registro de todas as criações, atualizações e exclusões no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
