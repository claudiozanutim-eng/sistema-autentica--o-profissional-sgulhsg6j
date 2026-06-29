import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface CreditCard extends RecordModel {
  name: string
  bank: string
  limit: number
  due_day: number
  user_id: string
  active: boolean
}

export const getCreditCards = () =>
  pb.collection<CreditCard>('credit_cards').getFullList({ sort: 'name' })

export const createCreditCard = (data: Partial<CreditCard>) =>
  pb.collection<CreditCard>('credit_cards').create(data)

export const updateCreditCard = (id: string, data: Partial<CreditCard>) =>
  pb.collection<CreditCard>('credit_cards').update(id, data)

export const deleteCreditCard = (id: string) => pb.collection<CreditCard>('credit_cards').delete(id)
