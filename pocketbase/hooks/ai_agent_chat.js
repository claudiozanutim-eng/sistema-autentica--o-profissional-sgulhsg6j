routerAdd(
  'POST',
  '/backend/v1/ai-agent/chat',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message || !body.message.trim()) return e.badRequestError('message is required')

      var now = new Date()
      var monthNames = [
        'JAN',
        'FEV',
        'MAR',
        'ABR',
        'MAI',
        'JUN',
        'JUL',
        'AGO',
        'SET',
        'OUT',
        'NOV',
        'DEZ',
      ]
      var mesAtual = monthNames[now.getMonth()] + '/' + String(now.getFullYear()).slice(2)

      var threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      var sm = threeMonthsAgo.getMonth() + 1
      var startStr = threeMonthsAgo.getFullYear() + '-' + (sm < 10 ? '0' + sm : '' + sm) + '-01'

      var txns = []
      try {
        txns = $app.findRecordsByFilter(
          'transactions',
          'date >= "' + startStr + '"',
          '-date',
          1000,
          0,
        )
      } catch (_) {}

      var totalIncome = 0,
        totalExpense = 0
      var topExpenses = {}
      for (var i = 0; i < txns.length; i++) {
        var t = txns[i]
        var amt = t.get('amount') || 0
        if (t.get('type') === 'income') {
          totalIncome += amt
        } else {
          totalExpense += amt
          var grp = t.get('group') || 'Outros'
          topExpenses[grp] = (topExpenses[grp] || 0) + amt
        }
      }

      var consolidatedBalance = 0
      try {
        var accounts = $app.findRecordsByFilter('accounts', '', 'name', 100, 0)
        for (var j = 0; j < accounts.length; j++) {
          consolidatedBalance += accounts[j].get('initial_balance') || 0
        }
      } catch (_) {}

      var saldoLiquido = totalIncome - totalExpense
      var taxaPoupanca =
        totalIncome > 0 ? Math.round((saldoLiquido / totalIncome) * 10000) / 100 : 0

      var userName = 'Usuario'
      try {
        var userRecord = $app.findRecordById('users', userId)
        userName = userRecord.get('name') || 'Usuario'
      } catch (_) {}

      var contexto = {
        usuario: { nome: userName, ano_atual: now.getFullYear(), mes_atual: mesAtual },
        resumo_3_meses: {
          total_receitas: totalIncome,
          total_despesas: totalExpense,
          saldo_liquido: saldoLiquido,
          taxa_poupanca_percent: taxaPoupanca,
        },
        saldo_atual: {
          saldo_consolidado: consolidatedBalance + saldoLiquido,
          dinheiro_disponivel: consolidatedBalance,
        },
        top_despesas: topExpenses,
      }

      var enhancedMessage =
        body.message + '\n\n[CONTEXTO FINANCEIRO ATUAL]\n' + JSON.stringify(contexto)

      var result = $ai.agent('ohana-advisor').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: enhancedMessage,
      })

      contexto.conversation_id = result.conversation_id
      var contextoStr = JSON.stringify(contexto)

      var convCol = $app.findCollectionByNameOrId('agente_conversas')
      var convRecord = new Record(convCol)
      convRecord.set('user_id', userId)
      convRecord.set('pergunta', body.message)
      convRecord.set('resposta', result.content)
      convRecord.set('contexto_json', contextoStr)
      $app.save(convRecord)

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponivel' })
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'Falha no agente' : err.message })
      }
      if (err instanceof SkipAiError) {
        var s2 = err.status || 502
        return e.json(s2, { error: s2 >= 500 ? 'AI temporariamente indisponivel' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
