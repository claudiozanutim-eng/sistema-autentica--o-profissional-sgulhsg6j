import pb from '@/lib/pocketbase/client'

export interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  action: string
  resource: string
  details: Record<string, any>
  created: string
}

export const getActivityLogs = (params?: {
  user_name?: string
  start_date?: string
  end_date?: string
}): Promise<ActivityLog[]> => {
  const query = new URLSearchParams()
  if (params?.user_name) query.set('user_name', params.user_name)
  if (params?.start_date) query.set('start_date', params.start_date)
  if (params?.end_date) query.set('end_date', params.end_date)
  const qs = query.toString()
  return pb.send(`/backend/v1/activity-logs${qs ? `?${qs}` : ''}`, { method: 'GET' })
}
