import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface ChartOfAccount extends RecordModel {
  group: string
  category: string
  type: 'income' | 'expense'
  ocr_terms: string
  code: string
  active: boolean
}

export const getChartOfAccounts = () =>
  pb.collection<ChartOfAccount>('chart_of_accounts').getFullList({ sort: 'code' })

export const createChartOfAccount = (data: Partial<ChartOfAccount>) =>
  pb.collection<ChartOfAccount>('chart_of_accounts').create(data)

export const updateChartOfAccount = (id: string, data: Partial<ChartOfAccount>) =>
  pb.collection<ChartOfAccount>('chart_of_accounts').update(id, data)

export const deleteChartOfAccount = (id: string) =>
  pb.collection<ChartOfAccount>('chart_of_accounts').delete(id)
