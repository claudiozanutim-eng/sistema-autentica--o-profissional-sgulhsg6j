import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Landmark,
  CreditCard as CreditCardIcon,
  Zap,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  categorizeTransactions,
  processPdf,
  batchCreateTransactions,
  createImportRecord,
  updateImportStatus,
  type CategorizeResult,
} from '@/services/imports'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { getAccounts } from '@/services/accounts'
import { getCreditCards } from '@/services/credit-cards'
import { prepareTransactionData, formatCurrency } from '@/lib/finance-utils'
import type { Account } from '@/services/accounts'
import type { CreditCard } from '@/services/credit-cards'

interface DestinationItem {
  id: string
  name: string
  bank: string
  type: 'account' | 'credit_card'
}

export default function Importar() {
  const [step, setStep] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [results, setResults] = useState<CategorizeResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [matchedCount, setMatchedCount] = useState(0)
  const [unmatchedCount, setUnmatchedCount] = useState(0)
  const [autoCreatedCount, setAutoCreatedCount] = useState(0)
  const [destinations, setDestinations] = useState<DestinationItem[]>([])
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('')
  const [currentImportId, setCurrentImportId] = useState<string>('')
  const [isPdfImport, setIsPdfImport] = useState(false)
  const [importStatus, setImportStatus] = useState<string>('')
  const [createdCount, setCreatedCount] = useState(0)
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfImportIdRef = useRef<string>('')
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const [accounts, cards] = await Promise.all([getAccounts(), getCreditCards()])
        const accountItems: DestinationItem[] = accounts
          .filter((a: Account) => a.active)
          .map((a: Account) => ({
            id: a.id,
            name: a.name,
            bank: a.bank || '',
            type: 'account' as const,
          }))
        const cardItems: DestinationItem[] = cards
          .filter((c: CreditCard) => c.active)
          .map((c: CreditCard) => ({
            id: c.id,
            name: c.name,
            bank: c.bank || '',
            type: 'credit_card' as const,
          }))
        const all = [...accountItems, ...cardItems]
        setDestinations(all)
        if (all.length > 0) setSelectedDestinationId(all[0].id)
      } catch {
        toast({ title: 'Erro ao carregar contas e cartões', variant: 'destructive' })
      }
    }
    loadDestinations()
  }, [])

  const selectedDestination = destinations.find((d) => d.id === selectedDestinationId) || null

  useRealtime('imports', (e) => {
    if (e.action === 'update' && e.record.id === currentImportId) {
      const status = (e.record as any).status
      setImportStatus(status)
      if (status === 'completed') {
        setProgressLabel('Importação concluída com sucesso!')
        setProgress(100)
        toast({ title: 'Importação processada com sucesso!' })
      } else if (status === 'error') {
        toast({
          title: 'Erro no processamento',
          description: (e.record as any).error_message || 'Falha ao processar o arquivo.',
          variant: 'destructive',
        })
      } else if (status === 'processing') {
        try {
          const progressInfo = JSON.parse((e.record as any).transactions_json || '{}')
          if (progressInfo.stage === 'text_extracted') {
            setProgress(40)
            setProgressLabel('Texto extraído do PDF. Analisando com IA...')
          } else if (progressInfo.stage === 'ai_parsed') {
            setProgress(60)
            setProgressLabel(`${progressInfo.count || 0} transações encontradas. Categorizando...`)
          } else if (progressInfo.stage === 'categorized') {
            setProgress(80)
            setProgressLabel('Categorização concluída. Salvando transações...')
          } else if (progressInfo.stage === 'saving') {
            setProgress(90)
            setProgressLabel(`Salvando ${progressInfo.count || 0} transações no banco...`)
          }
        } catch {
          /* intentionally ignored */
        }
      }
    }
  })

  const resetState = () => {
    setResults([])
    setStep(1)
    setProgress(0)
    setProgressLabel('')
    setMatchedCount(0)
    setUnmatchedCount(0)
    setAutoCreatedCount(0)
    setCurrentImportId('')
    setCreatedCount(0)
    setDuplicatesSkipped(0)
    setIsPdfImport(false)
    setImportStatus('')
    pdfImportIdRef.current = ''
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true)
    else if (e.type === 'dragleave') setIsDragging(false)
  }

  const parseCSV = (text: string): { date: string; description: string; amount: number }[] => {
    const lines = text.split('\n').filter((l) => l.trim())
    const rows: { date: string; description: string; amount: number }[] = []
    lines.slice(1).forEach((line) => {
      const parts = line.split(/[;,]/).map((p) => p.trim().replace(/"/g, ''))
      if (parts.length >= 3) {
        const dateStr =
          parts[0].split('/').length === 3 ? parts[0].split('/').reverse().join('-') : parts[0]
        rows.push({
          date: dateStr,
          description: parts[1],
          amount: parseFloat(parts[2].replace(/\./g, '').replace(',', '.')) || 0,
        })
      }
    })
    return rows
  }

  const processFile = async (file: File) => {
    if (!selectedDestination) {
      toast({ title: 'Selecione uma conta ou cartão', variant: 'destructive' })
      return
    }
    setIsProcessing(true)
    setStep(2)
    setProgress(15)
    setProgressLabel('Analisando arquivo...')

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setIsPdfImport(true)
        setProgress(15)
        setProgressLabel('Criando registro de importação...')
        const accountId = selectedDestination.type === 'account' ? selectedDestination.id : ''
        const creditCardId =
          selectedDestination.type === 'credit_card' ? selectedDestination.id : ''
        const importRecord = await createImportRecord({
          file_type: 'pdf',
          bank_source: selectedDestination.bank,
          status: 'processing',
        })
        setCurrentImportId(importRecord.id)
        pdfImportIdRef.current = importRecord.id
        setImportStatus('processing')
        setProgress(30)
        setProgressLabel('Extraindo texto do PDF e processando com IA...')
        const response = await processPdf(
          file,
          selectedDestination.bank,
          accountId,
          creditCardId,
          importRecord.id,
        )
        if (
          response.status === 'error' ||
          !response.transactions ||
          response.transactions.length === 0
        ) {
          throw new Error(response.error || 'Nenhuma transação encontrada no PDF.')
        }
        setCurrentImportId(response.import_id || '')
        setProgress(80)
        setProgressLabel('Transações criadas automaticamente!')
        setResults(response.transactions)
        setMatchedCount(response.matched_count || 0)
        setUnmatchedCount(response.unmatched_count || 0)
        setAutoCreatedCount(response.auto_created_count || 0)
        setCreatedCount(response.created_count || 0)
        setDuplicatesSkipped(response.duplicates_skipped || 0)
      } else {
        setIsPdfImport(false)
        setProgress(25)
        setProgressLabel('Lendo arquivo CSV...')
        const text = await file.text()
        const rows = parseCSV(text)
        if (rows.length === 0) {
          toast({ title: 'Nenhuma linha válida encontrada', variant: 'destructive' })
          setIsProcessing(false)
          setStep(1)
          return
        }
        setProgress(40)
        setProgressLabel('Categorizando com OCR local + IA...')
        const response = await categorizeTransactions(rows)
        setProgress(85)
        setProgressLabel('Categorização concluída!')
        setResults(response.transactions)
        setMatchedCount(response.matched_count || 0)
        setUnmatchedCount(response.unmatched_count || 0)
        setAutoCreatedCount(response.auto_created_count || 0)
      }
      setProgress(100)
      setTimeout(() => setStep(3), 300)
    } catch (err: any) {
      let errorDesc = getErrorMessage(err)
      if (err?.response?.error) errorDesc = err.response.error
      if (pdfImportIdRef.current) {
        updateImportStatus(pdfImportIdRef.current, 'error', errorDesc).catch(() => {})
        pdfImportIdRef.current = ''
      }
      const statusCode = err?.status || 0
      const isNotFound = statusCode === 404
      const isServerError = statusCode >= 500
      const isAuthError = statusCode === 401
      toast({
        title: isAuthError
          ? 'Falha de autenticação'
          : isServerError
            ? 'Erro no servidor'
            : isNotFound
              ? 'Endpoint não encontrado'
              : 'Erro ao processar arquivo',
        description: isAuthError
          ? 'Sua sessão expirou. Faça login novamente.'
          : isNotFound
            ? `Serviço indisponível (${statusCode}). ${errorDesc}`
            : errorDesc,
        variant: 'destructive',
      })
      resetState()
    }
    setIsProcessing(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0])
  }

  const finalizeCsv = async () => {
    if (!user || !selectedDestination) return
    setIsSaving(true)
    try {
      const txBatch = results.map((r) => {
        const baseData: Record<string, any> = {
          description: r.description,
          amount: r.amount,
          type: r.type as any,
          date: r.date,
          category: r.category,
          group: r.group,
          status: 'paid',
          user_id: user.id,
          source: `CSV Import - ${selectedDestination.name}`,
        }
        if (selectedDestination.type === 'credit_card')
          baseData.credit_card_id = selectedDestination.id
        else baseData.account_id = selectedDestination.id
        return prepareTransactionData(baseData, user.id, 'import')
      })
      const BATCH_SIZE = 50
      let totalCreated = 0
      const allErrors: Array<{ index: number; error: string }> = []
      for (let i = 0; i < txBatch.length; i += BATCH_SIZE) {
        const chunk = txBatch.slice(i, i + BATCH_SIZE)
        const result = await batchCreateTransactions(chunk)
        totalCreated += result.created
        if (result.errors.length > 0) allErrors.push(...result.errors)
      }
      if (allErrors.length > 0 && totalCreated === 0) {
        throw new Error(allErrors[0]?.error || 'Falha ao criar transações')
      }
      toast({ title: `${totalCreated} transações importadas!` })
      resetState()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' })
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importação Inteligente</h1>
        <p className="text-slate-500 text-sm">
          Extração automática com IA e categorização por OCR local de alta velocidade.
        </p>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <Select value={selectedDestinationId} onValueChange={setSelectedDestinationId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione uma conta ou cartão" />
          </SelectTrigger>
          <SelectContent>
            {destinations.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                Nenhuma conta ou cartão encontrado.
                <br />
                Cadastre um nas Configurações.
              </div>
            ) : (
              destinations.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center gap-2">
                    {d.type === 'credit_card' ? (
                      <CreditCardIcon className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Landmark className="w-4 h-4 text-slate-400" />
                    )}
                    {d.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between items-center mb-8 px-4 relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-200 -z-10 transform -translate-y-1/2" />
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}
          >
            {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
          </div>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        {step === 1 && (
          <CardContent className="p-12">
            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <UploadCloud className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Arraste e solte o arquivo CSV ou PDF aqui
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm">
                Suporte para arquivos .csv e .pdf. PDFs são processados automaticamente — transações
                são criadas sem intervenção manual.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => fileRef.current?.click()}
                disabled={!selectedDestination}
              >
                Selecionar Arquivo
              </Button>
              {selectedDestination && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Destino: {selectedDestination.name} — processamento otimizado ativo</span>
                </div>
              )}
            </div>
          </CardContent>
        )}

        {(step === 2 || isProcessing) && (
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              {importStatus === 'processing' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Processando no servidor
                </span>
              )}
              {importStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                  <AlertCircle className="w-3 h-3" />
                  Erro no processamento
                </span>
              )}
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-900">
                {progressLabel || 'Processando...'}
              </h3>
              <p className="text-slate-500 text-sm">
                OCR local primeiro, IA apenas quando necessário. Muito mais rápido.
              </p>
              <div className="w-full max-w-md">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-slate-400 mt-1.5">{progress}% concluído</p>
              </div>
            </div>
          </CardContent>
        )}

        {step === 3 && !isProcessing && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPdfImport ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                )}
                {isPdfImport
                  ? `Importação concluída — ${createdCount} transações criadas`
                  : `Pré-visualização (${results.length} transações)`}
              </CardTitle>
              <CardDescription className="flex items-center gap-3 flex-wrap">
                {isPdfImport ? (
                  <span>
                    {createdCount} transações inseridas no banco de dados
                    {duplicatesSkipped > 0 && ` · ${duplicatesSkipped} duplicatas ignoradas`}
                    {autoCreatedCount > 0 && ` · ${autoCreatedCount} categorias criadas`}
                  </span>
                ) : (
                  <span>
                    Verifique os dados antes de confirmar. Verde = alta confiança, Amarelo =
                    incerto.
                  </span>
                )}
                {matchedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    {matchedCount} por OCR local · {unmatchedCount} por IA
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow
                        key={i}
                        className={
                          r.confidence === 'high'
                            ? 'bg-emerald-50'
                            : r.confidence === 'medium'
                              ? 'bg-amber-50'
                              : ''
                        }
                      >
                        <TableCell className="text-slate-600 text-sm">{r.date}</TableCell>
                        <TableCell className="font-medium text-slate-900 text-sm">
                          {r.description}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{r.group}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{r.category}</TableCell>
                        <TableCell className="text-sm">
                          {r.type === 'income' ? (
                            <span className="text-emerald-600">Receita</span>
                          ) : (
                            <span className="text-red-600">Despesa</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold text-sm ${r.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {formatCurrency(r.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                <AlertCircle className="w-4 h-4" />
                <span className="bg-emerald-50 px-2 py-0.5 rounded">
                  Verde: OCR local (instantâneo)
                </span>
                <span className="bg-amber-50 px-2 py-0.5 rounded">
                  Amarelo: categorizado por IA
                </span>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                {isPdfImport ? (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={resetState}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Importar Outro Arquivo
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={resetState}>
                      Cancelar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={finalizeCsv}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando em lote...
                        </>
                      ) : (
                        `Confirmar Importação (${results.length})`
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
