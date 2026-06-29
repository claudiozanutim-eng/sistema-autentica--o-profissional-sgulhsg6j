routerAdd(
  'POST',
  '/backend/v1/transactions/batch',
  (e) => {
    var body = e.requestInfo().body || {}
    var transactions = body.transactions || []
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    if (transactions.length === 0) return e.badRequestError('No transactions provided')
    if (transactions.length > 500) return e.badRequestError('Too many transactions (max 500)')

    var txCol = $app.findCollectionByNameOrId('transactions')
    var created = []
    var errors = []

    $app.runInTransaction(function (txApp) {
      var col = txApp.findCollectionByNameOrId('transactions')
      transactions.forEach(function (tx, i) {
        try {
          var record = new Record(col)
          record.set('description', tx.description || '')
          record.set('amount', tx.amount || 0)
          record.set('type', tx.type || 'expense')
          record.set('date', tx.date || new Date().toISOString().slice(0, 10))
          record.set('category', tx.category || 'Não Classificado')
          record.set('status', tx.status || 'paid')
          record.set('user_id', userId)
          record.set('group', tx.group || 'Outros')
          record.set('origin', tx.origin || 'import')
          record.set('created_by', userId)
          if (tx.year) record.set('year', tx.year)
          if (tx.month_year) record.set('month_year', tx.month_year)
          if (tx.source) record.set('source', tx.source)
          if (tx.account_id) record.set('account_id', tx.account_id)
          if (tx.credit_card_id) record.set('credit_card_id', tx.credit_card_id)
          txApp.save(record)
          created.push({ index: i, id: record.id, success: true })
        } catch (err) {
          errors.push({ index: i, error: err.message || 'Failed to create transaction' })
        }
      })
    })

    return e.json(200, {
      created: created.length,
      errors: errors,
      total: transactions.length,
    })
  },
  $apis.requireAuth(),
)
