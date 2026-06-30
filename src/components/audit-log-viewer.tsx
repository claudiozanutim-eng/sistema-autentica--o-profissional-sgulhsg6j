import { useEffect, useState, useCallback, useRef } from 'react'
import { getActivityLogs, type ActivityLog } from '@/services/activity-logs'
import { useRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks/use-debounce'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  UPDATE: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  DELETE: 'bg-red-100 text-red-800 hover:bg-red-100',
}

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '{}'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const reqIdRef = useRef(0)
  const debouncedSearch = useDebounce(search, 400)

  const loadData = useCallback(async () => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    try {
      const result = await getActivityLogs({
        user_name: debouncedSearch || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      if (reqId === reqIdRef.current) {
        setLogs(Array.isArray(result) ? result : [])
      }
    } catch (err) {
      if (reqId === reqIdRef.current) {
        toast({ title: getErrorMessage(err), variant: 'destructive' })
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false)
      }
    }
  }, [debouncedSearch, startDate, endDate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('activity_logs', () => loadData())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50"
          />
        </div>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40 bg-slate-50"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40 bg-slate-50"
        />
      </div>
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-600">
                      {log.created ? new Date(log.created).toLocaleString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {log.user_name || 'Sistema'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-800'}
                        variant="outline"
                      >
                        {log.action || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{log.resource || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          <pre className="bg-slate-50 p-4 rounded-md text-xs overflow-auto max-h-[400px] font-mono">
            {selectedLog ? safeStringify(selectedLog.details) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
