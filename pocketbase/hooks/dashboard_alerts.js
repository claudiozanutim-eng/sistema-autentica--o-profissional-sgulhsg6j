routerAdd(
  'GET',
  '/backend/v1/dashboard/alerts',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')

      var now = new Date()
      var sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      var sm = sixMonthsAgo.getMonth() + 1
      var startStr = sixMonthsAgo.getFullYear() + '-' + (sm < 10 ? '0' + sm : '' + sm) + '-01'

      var txns = []
      try {
        txns = $app.findRecordsByFilter(
          'transactions',
          'date >= "' + startStr + '"',
          '-date',
          2000,
          0,
        )
      } catch (_) {}

      var consolidatedBalance = 0
      try {
        var accounts = $app.findRecordsByFilter('accounts', '', 'name', 100, 0)
        for (var j = 0; j < accounts.length; j++) {
          consolidatedBalance += accounts[j].get('initial_balance') || 0
        }
      } catch (_) {}

      var monthlyData = {}
      for (var i = 0; i < txns.length; i++) {
        var t = txns[i]
        var d = t.get('date') || ''
        var parts = d.split(' ')[0].split('-')
        var mk = parts[0] + '-' + parts[1]
        if (!monthlyData[mk]) monthlyData[mk] = { income: 0, expense: 0, categories: {} }
        var amt = t.get('amount') || 0
        if (t.get('type') === 'income') {
          monthlyData[mk].income += amt
        } else {
          monthlyData[mk].expense += amt
          var cat = t.get('category') || 'Outros'
          monthlyData[mk].categories[cat] = (monthlyData[mk].categories[cat] || 0) + amt
        }
      }

      var months = Object.keys(monthlyData).sort()
      if (months.length === 0) return e.json(200, { alerts: [] })

      var avgIncome = 0,
        avgExpense = 0,
        monthCount = 0
      var avgCatExpense = {}
      for (var mi = 0; mi < months.length; mi++) {
        var md = monthlyData[months[mi]]
        avgIncome += md.income
        avgExpense += md.expense
        var catKeys = Object.keys(md.categories)
        for (var ci = 0; ci < catKeys.length; ci++) {
          avgCatExpense[catKeys[ci]] =
            (avgCatExpense[catKeys[ci]] || 0) + md.categories[catKeys[ci]]
        }
        monthCount++
      }
      if (monthCount > 0) {
        avgIncome /= monthCount
        avgExpense /= monthCount
        var ack = Object.keys(avgCatExpense)
        for (var ai = 0; ai < ack.length; ai++) {
          avgCatExpense[ack[ai]] /= monthCount
        }
      }

      var alerts = []
      var currentMonth = months[months.length - 1]
      var currentData = monthlyData[currentMonth]

      if (currentData) {
        var catKeys = Object.keys(currentData.categories)
        for (var ci2 = 0; ci2 < catKeys.length; ci2++) {
          var cat = catKeys[ci2]
          var avg = avgCatExpense[cat] || 0
          if (avg > 0 && currentData.categories[cat] > avg * 1.2) {
            var pct = Math.round((currentData.categories[cat] / avg) * 100)
            alerts.push({
              type: 'budget_overrun',
              severity: 'red',
              title: 'Estouro de Orcamento',
              message: 'Categoria "' + cat + '" esta em ' + pct + '% da media mensal',
            })
          }
        }
      }

      for (var ti = 0; ti < txns.length; ti++) {
        var tx = txns[ti]
        if (tx.get('type') === 'expense') {
          var tcat = tx.get('category') || 'Outros'
          var tavg = avgCatExpense[tcat] || 0
          if (tavg > 0 && (tx.get('amount') || 0) > tavg * 2) {
            var td = tx.get('date') || ''
            var tparts = td.split(' ')[0].split('-')
            var tmk = tparts[0] + '-' + tparts[1]
            if (tmk === currentMonth) {
              alerts.push({
                type: 'atypical_expense',
                severity: 'orange',
                title: 'Despesa Atipica',
                message:
                  'Despesa de ' +
                  (tx.get('amount') || 0).toFixed(2) +
                  ' em "' +
                  tcat +
                  '" excede 200% da media',
              })
            }
          }
        }
      }

      if (avgExpense > 0 && consolidatedBalance > avgExpense * 6) {
        alerts.push({
          type: 'investment_opportunity',
          severity: 'green',
          title: 'Oportunidade de Investimento',
          message:
            'Caixa disponivel (' +
            consolidatedBalance.toFixed(2) +
            ') e ' +
            Math.round(consolidatedBalance / avgExpense) +
            'x a despesa mensal media',
        })
      }

      if (currentData && avgIncome > 0 && currentData.income < avgIncome * 0.7) {
        var rpct = Math.round((currentData.income / avgIncome) * 100)
        alerts.push({
          type: 'revenue_drop',
          severity: 'red',
          title: 'Queda de Receita',
          message: 'Receita atual em ' + rpct + '% da media mensal',
        })
      }

      return e.json(200, { alerts: alerts })
    } catch (err) {
      throw err
    }
  },
  $apis.requireAuth(),
)
