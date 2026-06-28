migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'claudio.zanutim@iceduc.com.br')
    } catch (_) {
      return // User not found, skip seeding data
    }

    const transactions = app.findCollectionByNameOrId('transactions')
    const now = new Date()

    const formatDate = (daysOffset) => {
      const d = new Date(now)
      d.setDate(d.getDate() + daysOffset)
      return d.toISOString().replace('T', ' ').replace('Z', '')
    }

    const data = [
      {
        description: 'Licença Software Premium',
        amount: 1500,
        type: 'expense',
        date: formatDate(-2),
        category: 'Software',
        status: 'paid',
      },
      {
        description: 'Consultoria Estratégica',
        amount: 12000,
        type: 'income',
        date: formatDate(-5),
        category: 'Consulting',
        status: 'paid',
      },
      {
        description: 'Aluguel do Escritório',
        amount: 4500,
        type: 'expense',
        date: formatDate(0),
        category: 'Office',
        status: 'pending',
      },
      {
        description: 'Venda de Produto A',
        amount: 8500,
        type: 'income',
        date: formatDate(-1),
        category: 'Sales',
        status: 'paid',
      },
      {
        description: 'Manutenção Servidores',
        amount: 800,
        type: 'expense',
        date: formatDate(-10),
        category: 'IT',
        status: 'paid',
      },
      {
        description: 'Marketing Digital',
        amount: 3200,
        type: 'expense',
        date: formatDate(-7),
        category: 'Marketing',
        status: 'overdue',
      },
      {
        description: 'Projeto Cliente Especial',
        amount: 25000,
        type: 'income',
        date: formatDate(2),
        category: 'Consulting',
        status: 'pending',
      },
      {
        description: 'Materiais de Escritório',
        amount: 350,
        type: 'expense',
        date: formatDate(-3),
        category: 'Office',
        status: 'paid',
      },
      {
        description: 'Venda de Produto B',
        amount: 6400,
        type: 'income',
        date: formatDate(-15),
        category: 'Sales',
        status: 'paid',
      },
      {
        description: 'Assinaturas Cloud',
        amount: 1200,
        type: 'expense',
        date: formatDate(5),
        category: 'IT',
        status: 'pending',
      },
    ]

    for (const item of data) {
      try {
        app.findFirstRecordByData('transactions', 'description', item.description)
      } catch (_) {
        const record = new Record(transactions)
        record.set('description', item.description)
        record.set('amount', item.amount)
        record.set('type', item.type)
        record.set('date', item.date)
        record.set('category', item.category)
        record.set('status', item.status)
        record.set('user_id', user.id)
        app.save(record)
      }
    }
  },
  (app) => {
    app.db().newQuery('DELETE FROM transactions').execute()
  },
)
