import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface AgenteConversa extends RecordModel {
  user_id: string
  pergunta: string
  resposta: string
  contexto_json: string
}

export const getConversas = () =>
  pb.collection<AgenteConversa>('agente_conversas').getFullList({ sort: '-created' })
