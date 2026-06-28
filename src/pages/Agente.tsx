import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { chatWithAdvisor } from '@/services/ai-agent'
import { getConversas, type AgenteConversa } from '@/services/agente-conversas'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Send, MessageSquare, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Onde estou gastando mais?' },
  { icon: Sparkles, text: 'Quanto terei em 5 anos?' },
  { icon: AlertTriangle, text: 'Há alguma despesa atípica?' },
  { icon: Bot, text: 'Como posso melhorar meu saldo?' },
]

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function Agente() {
  const { user } = useAuth()
  const [conversas, setConversas] = useState<AgenteConversa[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      setConversas(await getConversas())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('agente_conversas', () => {
    loadData()
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text?: string) => {
    const message = (text || input).trim()
    if (!message || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setLoading(true)
    try {
      const result = await chatWithAdvisor(message, conversationId)
      setConversationId(result.conversation_id)
      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro ao processar sua solicitação. Tente novamente.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = (c: AgenteConversa) => {
    setMessages([
      { role: 'user', content: c.pergunta },
      { role: 'assistant', content: c.resposta },
    ])
    try {
      const ctx = JSON.parse(c.contexto_json || '{}')
      if (ctx.conversation_id) setConversationId(ctx.conversation_id)
    } catch {
      /* noop */
    }
  }

  const startNewChat = () => {
    setMessages([])
    setConversationId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">OHANA Advisor</h1>
        <p className="text-slate-500 text-sm">Seu consultor financeiro executivo pessoal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 h-[calc(100vh-220px)]">
        <Card className="border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <Button onClick={startNewChat} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversas.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma conversa ainda</p>
            ) : (
              conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadHistory(c)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-700 truncate">{c.pergunta}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(c.created).toLocaleDateString('pt-BR')}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">OHANA Advisor</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Online
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Bot className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-slate-500 text-center max-w-md">
                  Olá! Sou o OHANA Advisor. Posso analisar suas finanças e fornecer insights
                  executivos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                    >
                      <s.icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user' ? 'bg-slate-700' : 'bg-emerald-600',
                  )}
                >
                  {msg.role === 'user' ? (
                    <span className="text-white text-xs font-bold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg px-4 py-3 max-w-[80%]',
                    msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-800',
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
