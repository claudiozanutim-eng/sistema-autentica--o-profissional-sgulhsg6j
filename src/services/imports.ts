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

export interface CategorizeResponse {
  transactions: CategorizeResult[]
  matched_count: number
  unmatched_count: number
}

export interface PdfProcessResponse {
  transactions: CategorizeResult[]
  import_id: string
  matched_count: number
  unmatched_count: number
}

export interface BatchCreateResult {
  created: number
  errors: Array<{ index: number; error: string }>
  total: number
}

export const categorizeTransactions = (rows: CategorizeRow[]) =>
  pb.send<CategorizeResponse>('/backend/v1/imports/categorize', {
    method: 'POST',
    body: JSON.stringify({ rows }),
    headers: { 'Content-Type': 'application/json' },
  })

export const createImport = (data: FormData) => pb.collection<ImportRecord>('imports').create(data)

export const getImports = () =>
  pb.collection<ImportRecord>('imports').getFullList({ sort: '-created' })

export const processPdf = (file: File, bankSource: string) =>
  new Promise<PdfProcessResponse>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      pb.send<PdfProcessResponse>('/backend/v1/imports/pdf-process', {
        method: 'POST',
        body: JSON.stringify({
          file_data: base64,
          file_name: file.name,
          bank_source: bankSource,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then(resolve)
        .catch(reject)
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })

export const batchCreateTransactions = (transactions: Record<string, any>[]) =>
  pb.send<BatchCreateResult>('/backend/v1/transactions/batch', {
    method: 'POST',
    body: JSON.stringify({ transactions }),
    headers: { 'Content-Type': 'application/json' },
  })
