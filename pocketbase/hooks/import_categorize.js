routerAdd(
  'POST',
  '/backend/v1/imports/categorize',
  (e) => {
    var body = e.requestInfo().body || {}
    var rows = body.rows || []
    if (rows.length === 0) return e.badRequestError('No rows provided')
    if (rows.length > 500) return e.badRequestError('Too many rows (max 500)')

    var coaRecords = $app.findRecordsByFilter('chart_of_accounts', 'active = true', 'code', 200, 0)
    var coaList = []
    var termMap = {}
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
      terms.forEach(function (term) {
        termMap[term] = entry
      })
    })

    var matched = []
    var unmatched = []

    rows.forEach(function (row, idx) {
      var desc = (row.description || '').toLowerCase()
      var found = null
      for (var key in termMap) {
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
      var coaText = coaList
        .map(function (c) {
          return c.group + ' > ' + c.category + ' (' + c.type + ')'
        })
        .join('\n')
      var txText = unmatched
        .map(function (u, i) {
          return i + 1 + '. ' + u.description + ' | ' + u.amount
        })
        .join('\n')
      try {
        var reply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'You are a financial categorization assistant. Given the chart of accounts and transactions, assign group, category, and type. Respond ONLY with a JSON array. Each element: {"index": N (1-based), "group": "", "category": "", "type": "income|expense"}.',
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
            if (unmatched[idx]) {
              unmatched[idx].group = r.group || 'Outros'
              unmatched[idx].category = r.category || 'Não Classificado'
              unmatched[idx].type = r.type || unmatched[idx].type
              unmatched[idx].confidence = 'medium'
            }
          })
        }
      } catch (err) {
        $app.logger().error('AI categorization failed', 'error', err.message || '')
      }
    }

    var all = matched.concat(unmatched).sort(function (a, b) {
      return a.index - b.index
    })
    return e.json(200, { transactions: all })
  },
  $apis.requireAuth(),
)
