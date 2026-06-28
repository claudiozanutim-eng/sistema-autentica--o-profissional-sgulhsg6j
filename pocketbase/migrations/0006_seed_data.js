migrate(
  (app) => {
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

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'maria.zanutim@iceduc.com.br')
    } catch (_) {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      var wife = new Record(usersCol)
      wife.setEmail('maria.zanutim@iceduc.com.br')
      wife.setPassword('Skip@Pass')
      wife.setVerified(true)
      wife.set('name', 'Maria Zanutim')
      app.save(wife)
    }

    var mainUser
    try {
      mainUser = app.findAuthRecordByEmail('_pb_users_auth_', 'claudio.zanutim@iceduc.com.br')
    } catch (_) {
      return
    }

    var coaCol = app.findCollectionByNameOrId('chart_of_accounts')
    var coaData = [
      {
        code: '1.01',
        group: 'Receitas Operacionais',
        category: 'Salários',
        type: 'income',
        ocr_terms: 'salario,salarios,folha,pagamento',
      },
      {
        code: '1.02',
        group: 'Receitas Operacionais',
        category: 'Consultoria',
        type: 'income',
        ocr_terms: 'consultoria,consultor,honorarios,servicos',
      },
      {
        code: '1.03',
        group: 'Receitas Operacionais',
        category: 'Vendas',
        type: 'income',
        ocr_terms: 'venda,produto,vendas',
      },
      {
        code: '1.04',
        group: 'Receitas Não Operacionais',
        category: 'Investimentos',
        type: 'income',
        ocr_terms: 'dividendo,juros,rendimento,cdb,tesouro',
      },
      {
        code: '2.01',
        group: 'Moradia',
        category: 'Aluguel',
        type: 'expense',
        ocr_terms: 'aluguel,locacao,condominio',
      },
      {
        code: '2.02',
        group: 'Moradia',
        category: 'Energia',
        type: 'expense',
        ocr_terms: 'energia,eletrica,light,enel,cpfl',
      },
      {
        code: '2.03',
        group: 'Moradia',
        category: 'Internet',
        type: 'expense',
        ocr_terms: 'internet,vivo,claro,net',
      },
      {
        code: '3.01',
        group: 'Alimentação',
        category: 'Supermercado',
        type: 'expense',
        ocr_terms: 'supermercado,mercado,pao de acucar,carrefour',
      },
      {
        code: '3.02',
        group: 'Alimentação',
        category: 'Restaurantes',
        type: 'expense',
        ocr_terms: 'restaurante,ifood,bar,lanchonete',
      },
      {
        code: '4.01',
        group: 'Transporte',
        category: 'Combustível',
        type: 'expense',
        ocr_terms: 'combustivel,gasolina,shell,ipiranga',
      },
      {
        code: '5.01',
        group: 'Saúde',
        category: 'Plano de Saúde',
        type: 'expense',
        ocr_terms: 'plano de saude,unimed,bradesco saude',
      },
      {
        code: '5.02',
        group: 'Saúde',
        category: 'Farmácia',
        type: 'expense',
        ocr_terms: 'farmacia,drogasil,medicamento',
      },
      {
        code: '6.01',
        group: 'Educação',
        category: 'Mensalidades',
        type: 'expense',
        ocr_terms: 'mensalidade,escola,faculdade,curso',
      },
      {
        code: '7.01',
        group: 'Negócios',
        category: 'Software',
        type: 'expense',
        ocr_terms: 'software,licenca,assinatura,adobe,microsoft',
      },
      {
        code: '7.02',
        group: 'Negócios',
        category: 'Marketing',
        type: 'expense',
        ocr_terms: 'marketing,publicidade,anuncio,google ads',
      },
      {
        code: '7.03',
        group: 'Negócios',
        category: 'Escritório',
        type: 'expense',
        ocr_terms: 'escritorio,material,mobiliario',
      },
      {
        code: '7.04',
        group: 'Negócios',
        category: 'TI',
        type: 'expense',
        ocr_terms: 'servidor,cloud,aws,azure,hosting,dominio',
      },
      {
        code: '7.05',
        group: 'Negócios',
        category: 'Impostos',
        type: 'expense',
        ocr_terms: 'imposto,tributo,darf,gps,irpj',
      },
    ]

    coaData.forEach(function (item) {
      try {
        app.findFirstRecordByData('chart_of_accounts', 'code', item.code)
      } catch (_) {
        var rec = new Record(coaCol)
        rec.set('code', item.code)
        rec.set('group', item.group)
        rec.set('category', item.category)
        rec.set('type', item.type)
        rec.set('ocr_terms', item.ocr_terms)
        rec.set('active', true)
        app.save(rec)
      }
    })

    var accCol = app.findCollectionByNameOrId('accounts')
    var accData = [
      { name: 'Conta Corrente Itaú', type: 'Conta Corrente', bank: 'Itaú', initial_balance: 50000 },
      {
        name: 'Conta Corrente Safra',
        type: 'Conta Corrente',
        bank: 'Safra',
        initial_balance: 25000,
      },
      { name: 'Conta Nubank', type: 'Conta Corrente', bank: 'Nubank', initial_balance: 10000 },
      { name: 'Investimentos Safra', type: 'Investimento', bank: 'Safra', initial_balance: 150000 },
    ]

    var firstAccountId = ''
    accData.forEach(function (item) {
      try {
        app.findFirstRecordByData('accounts', 'name', item.name)
      } catch (_) {
        var rec = new Record(accCol)
        rec.set('name', item.name)
        rec.set('type', item.type)
        rec.set('bank', item.bank)
        rec.set('initial_balance', item.initial_balance)
        rec.set('active', true)
        app.save(rec)
        if (!firstAccountId) firstAccountId = rec.id
      }
    })

    if (!firstAccountId) {
      try {
        firstAccountId = app.findFirstRecordByData('accounts', 'name', 'Conta Corrente Itaú').id
      } catch (_) {}
    }

    var catGroupMap = {
      Software: 'Negócios',
      Consulting: 'Receitas Operacionais',
      Office: 'Negócios',
      Sales: 'Receitas Operacionais',
      IT: 'Negócios',
      Marketing: 'Negócios',
    }

    try {
      var txRecords = app.findRecordsByFilter('transactions', '', '-created', 1000, 0)
      txRecords.forEach(function (record) {
        var dateStr = record.getString('date')
        var date = new Date(dateStr)
        if (!record.get('year')) record.set('year', date.getFullYear())
        if (!record.get('month_year'))
          record.set(
            'month_year',
            monthNames[date.getMonth()] + '/' + String(date.getFullYear()).slice(2),
          )
        if (!record.get('group')) {
          var cat = record.getString('category')
          record.set('group', catGroupMap[cat] || 'Outros')
        }
        if (!record.get('origin')) record.set('origin', 'manual')
        if (!record.get('created_by')) record.set('created_by', mainUser.id)
        if (!record.get('source')) record.set('source', 'Manual')
        if (!record.get('account_id') && firstAccountId) record.set('account_id', firstAccountId)
        app.save(record)
      })
    } catch (_) {}
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM chart_of_accounts').execute()
    } catch (_) {}
    try {
      app.db().newQuery('DELETE FROM accounts').execute()
    } catch (_) {}
    try {
      var wife = app.findAuthRecordByEmail('_pb_users_auth_', 'maria.zanutim@iceduc.com.br')
      app.delete(wife)
    } catch (_) {}
  },
)
