import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadCloud, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Importar() {
  const [step, setStep] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true)
    else if (e.type === 'dragleave') setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile()
    }
  }

  const processFile = () => {
    setStep(2)
    setTimeout(() => setStep(3), 1500)
  }

  const finalize = () => {
    toast({ title: 'Importação concluída com sucesso!' })
    setStep(1)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importação de Dados</h1>
        <p className="text-slate-500 text-sm">
          Importe extratos bancários e faturas em formato CSV ou Excel.
        </p>
      </div>

      <div className="flex justify-between items-center mb-8 px-4 relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-200 -z-10 transform -translate-y-1/2"></div>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}
          >
            {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
          </div>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        {step === 1 && (
          <CardContent className="p-12">
            <div
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <UploadCloud className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Arraste e solte o arquivo aqui
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm">
                Suporte para arquivos .csv, .xls e .xlsx. Tamanho máximo 10MB.
              </p>
              <Button variant="outline" className="bg-white" onClick={processFile}>
                Selecionar do Computador
              </Button>
            </div>
          </CardContent>
        )}

        {step === 2 && (
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900">
              Processando e mapeando campos...
            </h3>
            <p className="text-slate-500 text-sm">
              Aguarde enquanto analisamos as colunas do arquivo.
            </p>
          </CardContent>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Resumo da Importação
              </CardTitle>
              <CardDescription>
                Arquivo processado com sucesso. Verifique os dados abaixo antes de finalizar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-6 flex justify-around mb-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-slate-900">142</div>
                  <div className="text-sm text-slate-500">Linhas Identificadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">89</div>
                  <div className="text-sm text-slate-500">Receitas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">53</div>
                  <div className="text-sm text-slate-500">Despesas</div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Cancelar
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={finalize}>
                  Importar Dados
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
