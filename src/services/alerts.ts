import pb from '@/lib/pocketbase/client'

export interface DashboardAlert {
  type: string
  severity: 'red' | 'orange' | 'green'
  title: string
  message: string
}

export const getDashboardAlerts = () =>
  pb.send<{ alerts: DashboardAlert[] }>('/backend/v1/dashboard/alerts', { method: 'GET' })
