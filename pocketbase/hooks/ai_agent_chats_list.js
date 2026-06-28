routerAdd(
  'GET',
  '/backend/v1/ai-agent/chats',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      var limit = parseInt((e.requestInfo().query && e.requestInfo().query.limit) || '20', 10) || 20
      var result = $ai.agent('finance-advisor').listConversations({ user_id: userId, limit: limit })
      return e.json(200, result)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'falha ao listar conversas' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
