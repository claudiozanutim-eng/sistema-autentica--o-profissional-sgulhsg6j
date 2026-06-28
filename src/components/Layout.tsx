import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Receipt,
  Upload,
  FileBarChart,
  LineChart,
  Bot,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Lançamentos', path: '/lancamentos', icon: Receipt },
  { name: 'Importar', path: '/importar', icon: Upload },
  { name: 'Relatórios', path: '/relatorios', icon: FileBarChart },
  { name: 'Análises', path: '/analises', icon: LineChart },
  { name: 'Agente IA', path: '/agente-ia', icon: Bot },
  { name: 'Configurações', path: '/config', icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  return (
    <nav className="flex-1 py-6 px-3 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
              isActive ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white',
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent() {
  return (
    <>
      <div className="h-16 flex items-center gap-2.5 px-6 bg-slate-950">
        <img
          src="https://img.usecurling.com/i?q=ohana&color=white&shape=fill"
          alt="OHANA"
          className="h-8 w-auto object-contain flex-shrink-0"
        />
        <span className="font-bold text-white text-xl tracking-tight">OHANA</span>
      </div>
      <NavLinks />
    </>
  )
}

export default function Layout() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentNav = navItems.find((item) => item.path === location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col transition-all duration-300 flex-shrink-0 hidden md:flex">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3 flex-1">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden p-2 text-slate-600 hover:text-slate-900">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-slate-900 text-slate-300 p-0 border-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h2 className="text-lg font-semibold text-slate-900">
              {currentNav?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative w-full max-w-xs hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-md text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="hidden md:flex flex-col items-end text-sm">
                    <span className="font-semibold text-slate-900">{user?.name || 'Usuário'}</span>
                    <span className="text-xs text-slate-500">Executivo</span>
                  </div>
                  <Avatar className="w-9 h-9 border border-slate-200">
                    {user?.avatar && (
                      <AvatarImage src={pb.files.getUrl(user, user.avatar)} alt={user?.name} />
                    )}
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/config">Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
