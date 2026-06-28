import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface Transaction extends RecordModel {
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
  category: string
  status: 'paid' | 'pending' | 'overdue'
  user_id: string
  account_id: string
  year: number
  month_year: string
  group: string
  source: string
  created_by: string
  origin: 'manual' | 'import'
  expand?: {
    user_id: RecordModel
    account_id: RecordModel
    created_by: RecordModel
  }
}

export const getTransactions = (year?: number) => {
  const params: Record<string, any> = {
    sort: '-date',
    expand: 'account_id,created_by,user_id',
  }
  if (year) params.filter = `year = ${year}`
  return pb.collection<Transaction>('transactions').getFullList(params)
}

export const createTransaction = (data: Partial<Transaction>) =>
  pb.collection<Transaction>('transactions').create(data)

export const updateTransaction = (id: string, data: Partial<Transaction>) =>
  pb.collection<Transaction>('transactions').update(id, data)

export const deleteTransaction = (id: string) =>
  pb.collection<Transaction>('transactions').delete(id)
