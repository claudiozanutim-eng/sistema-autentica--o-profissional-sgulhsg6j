import { useState, useRef } from 'react'
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
import { UploadCloud, CheckCircle2, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { categorizeTransactions, processPdf, type CategorizeResult } from '@/services/imports'
import { createTransaction } from '@/services/transactions'
import { getAccounts } from '@/services/accounts'
import { prepareTransactionData, formatCurrency } from '@/lib/finance-utils'
import type { Account } from '@/services/accounts'

export default function Importar() {
  const [step, setStep] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [bankSource, setBankSource] = useState('itau')
  const [results, setResults] = useState<CategorizeResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()

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
    setIsProcessing(true)
    try {
      const accs = await getAccounts()
      setAccounts(accs)
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const { transactions: categorized } = await processPdf(file, bankSource)
        setResults(categorized)
      } else {
        const text = await file.text()
        const rows = parseCSV(text)
        if (rows.length === 0) {
          toast({ title: 'Nenhuma linha válida encontrada', variant: 'destructive' })
          setIsProcessing(false)
          return
        }
        const { transactions: categorized } = await categorizeTransactions(rows)
        setResults(categorized)
      }
      setStep(3)
    } catch (e: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: e?.response?.error || e?.message || undefined,
        variant: 'destructive',
      })
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
    if (e.target.files?.[0]) {
      setStep(2)
      processFile(e.target.files[0])
    }
  }

  const finalize = async () => {
    if (!user) return
    try {
      for (const r of results) {
        await createTransaction(
          prepareTransactionData(
            {
              description: r.description,
              amount: r.amount,
              type: r.type as any,
              date: r.date,
              category: r.category,
              group: r.group,
              status: 'paid',
              user_id: user.id,
              account_id: accounts[0]?.id || '',
            },
            user.id,
            'import',
          ),
        )
      }
      toast({ title: `${results.length} transações importadas!` })
      setResults([])
      setStep(1)
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importação Inteligente</h1>
        <p className="text-slate-500 text-sm">
          Extração automática com IA e categorização por OCR.
        </p>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <Select value={bankSource} onValueChange={setBankSource}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="itau">Banco Itaú</SelectItem>
            <SelectItem value="safra">Banco Safra</SelectItem>
            <SelectItem value="nubank">Nubank</SelectItem>
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
                Suporte para arquivos .csv e .pdf. A IA extrairá e categorizará automaticamente.
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
              >
                Selecionar Arquivo
              </Button>
            </div>
          </CardContent>
        )}

        {(step === 2 || isProcessing) && (
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">Processando com IA...</h3>
            <p className="text-slate-500 text-sm">Extraindo e categorizando transações com IA.</p>
          </CardContent>
        )}

        {step === 3 && !isProcessing && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Pré-visualização ({results.length} transações)
              </CardTitle>
              <CardDescription>
                Verifique os dados antes de confirmar. Verde = alta confiança, Amarelo = incerto.
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
                <span className="bg-emerald-50 px-2 py-0.5 rounded">Verde: auto-categorizado</span>
                <span className="bg-amber-50 px-2 py-0.5 rounded">Amarelo: incerto</span>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setResults([])
                  }}
                >
                  Cancelar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={finalize}>
                  Confirmar Importação
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
