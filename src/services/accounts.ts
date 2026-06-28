import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface Account extends RecordModel {
  name: string
  type: string
  bank: string
  initial_balance: number
  active: boolean
}

export const getAccounts = () => pb.collection<Account>('accounts').getFullList({ sort: 'name' })

export const createAccount = (data: Partial<Account>) =>
  pb.collection<Account>('accounts').create(data)

export const updateAccount = (id: string, data: Partial<Account>) =>
  pb.collection<Account>('accounts').update(id, data)

export const deleteAccount = (id: string) => pb.collection<Account>('accounts').delete(id)
