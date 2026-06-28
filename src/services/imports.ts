import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface ImportRecord extends RecordModel {
  file: string
  file_type: string
  bank_source: string
  status: 'processing' | 'completed' | 'error'
  transactions_json: string
  error_message: string
}

export interface CategorizeRow {
  date: string
  description: string
  amount: number
}

export interface CategorizeResult {
  index: number
  date: string
  description: string
  amount: number
  group: string
  category: string
  type: 'income' | 'expense'
  confidence: 'high' | 'medium' | 'low'
}

export const categorizeTransactions = (rows: CategorizeRow[]) =>
  pb.send<{ transactions: CategorizeResult[] }>('/backend/v1/imports/categorize', {
    method: 'POST',
    body: JSON.stringify({ rows }),
    headers: { 'Content-Type': 'application/json' },
  })

export const createImport = (data: FormData) => pb.collection<ImportRecord>('imports').create(data)

export const getImports = () =>
  pb.collection<ImportRecord>('imports').getFullList({ sort: '-created' })

export const processPdf = (file: File, bankSource: string) =>
  new Promise<{ transactions: CategorizeResult[]; import_id: string }>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      pb.send<{ transactions: CategorizeResult[]; import_id: string }>(
        '/backend/v1/imports/pdf-process',
        {
          method: 'POST',
          body: JSON.stringify({
            file_data: base64,
            file_name: file.name,
            bank_source: bankSource,
          }),
          headers: { 'Content-Type': 'application/json' },
        },
      )
        .then(resolve)
        .catch(reject)
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
