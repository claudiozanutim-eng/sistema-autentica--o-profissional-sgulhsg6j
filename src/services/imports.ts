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
