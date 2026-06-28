import pb from '@/lib/pocketbase/client'
import { displayableMessages, type DisplayMessage } from '@/lib/skipAi'

export interface ChatResult {
  conversation_id: string
  content: string
  citations?: unknown[]
  message_id: string
}

export const chatWithAdvisor = (message: string, conversationId: string | null) =>
  pb.send<ChatResult>('/backend/v1/ai-agent/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
    headers: { 'Content-Type': 'application/json' },
  })

export interface Conversation {
  id: string
  title: string
  created: string
  updated: string
}

export const listConversations = () =>
  pb.send<Conversation[]>('/backend/v1/ai-agent/chats', { method: 'GET' })

export const loadMessages = async (conversationId: string): Promise<DisplayMessage[]> => {
  const payload = await pb.send<{ messages: any[] }>(
    `/backend/v1/ai-agent/chats/${conversationId}/messages`,
    { method: 'GET' },
  )
  return displayableMessages(payload.messages || [])
}
