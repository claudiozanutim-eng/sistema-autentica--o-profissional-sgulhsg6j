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

    var coaRecords = $app.findRecordsByFilter('chart_of_accounts', 'active = true', 'code', 200, 0)
    var existingCombos = {}
    coaRecords.forEach(function (r) {
      existingCombos[r.getString('group') + '|||' + r.getString('category')] = true
    })

    var coaCol = $app.findCollectionByNameOrId('chart_of_accounts')
    var uniqueCombos = {}
    transactions.forEach(function (tx) {
      var g = tx.group || 'Outros'
      var c = tx.category || 'Não Classificado'
      var key = g + '|||' + c
      if (!uniqueCombos[key]) {
        uniqueCombos[key] = { group: g, category: c, type: tx.type || 'expense' }
      }
    })
    var autoCreatedCount = 0
    Object.keys(uniqueCombos).forEach(function (key) {
      if (!existingCombos[key]) {
        var combo = uniqueCombos[key]
        try {
          var newCoa = new Record(coaCol)
          newCoa.set('group', combo.group)
          newCoa.set('category', combo.category)
          newCoa.set('type', combo.type)
          newCoa.set('ocr_terms', '')
          newCoa.set('code', '')
          newCoa.set('active', true)
          $app.save(newCoa)
          autoCreatedCount++
        } catch (err) {
          $app
            .logger()
            .error(
              'Failed to auto-create COA entry in batch',
              'group',
              combo.group,
              'category',
              combo.category,
              'error',
              err.message || '',
            )
        }
      }
    })

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
          if (tx.import_id) record.set('import_id', tx.import_id)
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
      auto_created_count: autoCreatedCount,
    })
  },
  $apis.requireAuth(),
)
