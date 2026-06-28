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
  expand?: {
    user_id: RecordModel
  }
}

export const getTransactions = () =>
  pb.collection<Transaction>('transactions').getFullList({ sort: '-date', expand: 'user_id' })

export const createTransaction = (data: Partial<Transaction>) =>
  pb.collection<Transaction>('transactions').create(data)

export const updateTransaction = (id: string, data: Partial<Transaction>) =>
  pb.collection<Transaction>('transactions').update(id, data)

export const deleteTransaction = (id: string) =>
  pb.collection<Transaction>('transactions').delete(id)
