import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AppStoreProvider } from '@/stores/main'

import Layout from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import Index from '@/pages/Index'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Lancamentos from '@/pages/Lancamentos'
import Importar from '@/pages/Importar'
import Analises from '@/pages/Analises'
import Config from '@/pages/Config'
import Agente from '@/pages/Agente'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lancamentos" element={<Lancamentos />} />
                <Route path="/importar" element={<Importar />} />
                <Route path="/analises" element={<Analises />} />
                <Route path="/agente" element={<Agente />} />
                <Route path="/config" element={<Config />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AppStoreProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
