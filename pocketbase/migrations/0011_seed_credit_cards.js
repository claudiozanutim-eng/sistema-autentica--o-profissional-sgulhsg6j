migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'claudio.zanutim@iceduc.com.br')
      const ccCol = app.findCollectionByNameOrId('credit_cards')

      const cards = [
        {
          name: 'Nubank UV',
          bank: 'Nubank',
          limit: 25000,
          due_day: 10,
          user_id: user.id,
          active: true,
        },
        {
          name: 'Itaú Click',
          bank: 'Itaú',
          limit: 15000,
          due_day: 25,
          user_id: user.id,
          active: true,
        },
      ]

      let seededCards = []

      for (const c of cards) {
        try {
          const existing = app.findFirstRecordByData('credit_cards', 'name', c.name)
          seededCards.push(existing)
        } catch (_) {
          const rec = new Record(ccCol)
          rec.set('name', c.name)
          rec.set('bank', c.bank)
          rec.set('limit', c.limit)
          rec.set('due_day', c.due_day)
          rec.set('user_id', c.user_id)
          rec.set('active', c.active)
          app.save(rec)
          seededCards.push(rec)
        }
      }

      // Associate a few existing expenses with the new cards to demonstrate the calculated totals
      if (seededCards.length > 0) {
        const txRecords = app.findRecordsByFilter(
          'transactions',
          `user_id = '${user.id}' && type = 'expense'`,
          '-date',
          5,
          0,
        )
        txRecords.forEach((tx, i) => {
          if (!tx.getString('credit_card_id')) {
            tx.set('credit_card_id', seededCards[i % seededCards.length].id)
            app.save(tx)
          }
        })
      }
    } catch (_) {}
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM credit_cards').execute()
    } catch (_) {}
  },
)
