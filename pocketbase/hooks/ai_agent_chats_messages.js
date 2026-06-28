routerAdd(
  'GET',
  '/backend/v1/ai-agent/chats/{conversationId}/messages',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      var conversationId = e.request.pathValue('conversationId')
      if (!conversationId) return e.badRequestError('conversationId is required')
      var result = $ai.agent('ohana-advisor').listMessages({
        conversation_id: conversationId,
        user_id: userId,
      })
      return e.json(200, result)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'falha ao carregar mensagens' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
