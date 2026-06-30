import pb from '@/lib/pocketbase/client'

export interface UserRecord {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  created?: string
}

export const getUsers = (): Promise<UserRecord[]> => pb.send('/backend/v1/users', { method: 'GET' })

export const createUser = (data: {
  name: string
  email: string
  role?: string
}): Promise<UserRecord> =>
  pb.send('/backend/v1/users', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateUser = (
  id: string,
  data: { name?: string; email?: string; role?: string },
): Promise<UserRecord> =>
  pb.send(`/backend/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })

export const getAvatarUrl = (user: Pick<UserRecord, 'id' | 'avatar'>): string =>
  `${import.meta.env.VITE_POCKETBASE_URL}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`
