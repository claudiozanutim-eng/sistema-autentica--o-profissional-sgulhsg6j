routerAdd(
  'POST',
  '/backend/v1/imports/categorize',
  (e) => {
    var body = e.requestInfo().body || {}
    var rows = body.rows || []
    if (rows.length === 0) return e.badRequestError('No rows provided')
    if (rows.length > 500) return e.badRequestError('Too many rows (max 500)')

    var coaRecords = $app.findRecordsByFilter('chart_of_accounts', 'active = true', 'code', 200, 0)
    var termMap = {}
    var coaList = []
    var existingCombos = {}
    coaRecords.forEach(function (r) {
      var terms = (r.getString('ocr_terms') || '')
        .toLowerCase()
        .split(',')
        .map(function (t) {
          return t.trim()
        })
        .filter(Boolean)
      var entry = {
        group: r.getString('group'),
        category: r.getString('category'),
        type: r.getString('type'),
      }
      coaList.push(entry)
      existingCombos[entry.group + '|||' + entry.category] = true
      terms.forEach(function (term) {
        termMap[term] = entry
      })
    })

    var termKeys = Object.keys(termMap).sort(function (a, b) {
      return b.length - a.length
    })

    var matched = []
    var unmatched = []

    rows.forEach(function (row, idx) {
      var desc = (row.description || '').toLowerCase()
      var found = null
      for (var i = 0; i < termKeys.length; i++) {
        var key = termKeys[i]
        if (desc.indexOf(key) !== -1) {
          found = termMap[key]
          break
        }
      }
      if (found) {
        matched.push({
          index: idx,
          date: row.date,
          description: row.description,
          amount: row.amount,
          group: found.group,
          category: found.category,
          type: found.type,
          confidence: 'high',
        })
      } else {
        var signType = row.amount >= 0 ? 'income' : 'expense'
        unmatched.push({
          index: idx,
          date: row.date,
          description: row.description,
          amount: row.amount,
          group: 'Outros',
          category: 'Não Classificado',
          type: signType,
          confidence: 'low',
        })
      }
    })

    if (unmatched.length > 0 && coaList.length > 0) {
      var batchSize = 50
      for (var bStart = 0; bStart < unmatched.length; bStart += batchSize) {
        var batch = unmatched.slice(bStart, bStart + batchSize)
        var coaText = coaList
          .map(function (c) {
            return c.group + ' > ' + c.category + ' (' + c.type + ')'
          })
          .join('\n')
        var txText = batch
          .map(function (u, i) {
            return bStart + i + 1 + '. ' + u.description + ' | ' + u.amount
          })
          .join('\n')
        try {
          var reply = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'system',
                content:
                  'You are a financial categorization assistant. Given the chart of accounts and transactions, assign group, category, and type. You may suggest NEW groups and categories if none fit. Respond ONLY with a JSON array. Each element: {"index": N (1-based within this batch), "group": "", "category": "", "type": "income|expense"}.',
              },
              {
                role: 'user',
                content: 'Chart of Accounts:\n' + coaText + '\n\nTransactions:\n' + txText,
              },
            ],
          })
          var content = reply.choices[0].message.content
          var jsonMatch = content.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            var aiResults = JSON.parse(jsonMatch[0])
            aiResults.forEach(function (r) {
              var idx = (typeof r.index === 'number' ? r.index : parseInt(r.index, 10)) - 1
              if (batch[idx]) {
                batch[idx].group = r.group || 'Outros'
                batch[idx].category = r.category || 'Não Classificado'
                batch[idx].type = r.type || batch[idx].type
                batch[idx].confidence = 'medium'
              }
            })
          }
        } catch (err) {
          $app
            .logger()
            .error(
              'AI categorization failed for batch starting at ' + bStart,
              'error',
              err.message || '',
            )
        }
      }
    }

    var all = matched.concat(unmatched).sort(function (a, b) {
      return a.index - b.index
    })

    var coaCol = $app.findCollectionByNameOrId('chart_of_accounts')
    var uniqueCombos = {}
    all.forEach(function (t) {
      var key = t.group + '|||' + t.category
      if (!uniqueCombos[key]) {
        uniqueCombos[key] = { group: t.group, category: t.category, type: t.type }
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
              'Failed to auto-create COA entry',
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

    return e.json(200, {
      transactions: all,
      matched_count: matched.length,
      unmatched_count: unmatched.length,
      auto_created_count: autoCreatedCount,
    })
  },
  $apis.requireAuth(),
)
