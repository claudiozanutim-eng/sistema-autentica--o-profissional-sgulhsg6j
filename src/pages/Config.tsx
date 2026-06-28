import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { User, Lock, Settings } from 'lucide-react'

export default function Config() {
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast({ title: 'Configurações atualizadas com sucesso.' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm">Gerencie seu perfil e preferências de sistema.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100 border border-slate-200">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white">
            <User className="w-4 h-4 mr-2" /> Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Lock className="w-4 h-4 mr-2" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-white">
            <Settings className="w-4 h-4 mr-2" /> Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize os dados da sua conta de acesso.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input defaultValue={user?.name || ''} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Corporativo</Label>
                  <Input disabled defaultValue={user?.email || ''} className="bg-slate-50" />
                  <p className="text-xs text-slate-500">
                    Para alterar seu e-mail contate o administrador do sistema.
                  </p>
                </div>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
              <form onSubmit={handleSave} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" />
                </div>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
