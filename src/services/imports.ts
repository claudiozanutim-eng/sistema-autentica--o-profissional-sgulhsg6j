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
  auto_created_count?: number
}

export interface PdfProcessResponse {
  status: 'completed' | 'error'
  error?: string
  transactions: CategorizeResult[]
  import_id: string
  matched_count: number
  unmatched_count: number
  auto_created_count?: number
  created_count?: number
  duplicates_skipped?: number
  errors?: Array<{ index: number; error: string }>
}

export interface BatchCreateResult {
  created: number
  errors: Array<{ index: number; error: string }>
  total: number
  auto_created_count?: number
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

export const processPdf = (
  file: File,
  bankSource: string,
  accountId?: string,
  creditCardId?: string,
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bank_source', bankSource)
  if (accountId) formData.append('account_id', accountId)
  if (creditCardId) formData.append('credit_card_id', creditCardId)
  return pb.send<PdfProcessResponse>('/backend/v1/import-pdf', {
    method: 'POST',
    body: formData,
  })
}

export const updateImportStatus = (
  id: string,
  status: 'processing' | 'completed' | 'error',
  errorMessage?: string,
) =>
  pb.collection<ImportRecord>('imports').update(id, {
    status,
    error_message: errorMessage || '',
  })

export const batchCreateTransactions = (transactions: Record<string, any>[]) =>
  pb.send<BatchCreateResult>('/backend/v1/transactions/batch', {
    method: 'POST',
    body: JSON.stringify({ transactions }),
    headers: { 'Content-Type': 'application/json' },
  })
