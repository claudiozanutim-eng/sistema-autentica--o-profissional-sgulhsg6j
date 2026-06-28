migrate(
  (app) => {
    var coa = app.findCollectionByNameOrId('chart_of_accounts')

    var entries = [
      {
        group: 'Tarifas Bancárias',
        category: 'Manutenção de Conta',
        type: 'expense',
        ocr_terms: 'tarifa,manutencao,administracao,mensalidade,pacote servicos',
      },
      {
        group: 'Investimentos',
        category: 'Rendimentos',
        type: 'income',
        ocr_terms: 'rendimento,juros cred,aplicacao,cdb,rentabilidade',
      },
      {
        group: 'Transferências',
        category: 'PIX Enviado',
        type: 'expense',
        ocr_terms: 'pix env,ted env,doc env,transferencia enviada',
      },
      {
        group: 'Transferências',
        category: 'PIX Recebido',
        type: 'income',
        ocr_terms: 'pix rec,ted rec,doc rec,transferencia recebida,deposito',
      },
      {
        group: 'Saques',
        category: 'Saque',
        type: 'expense',
        ocr_terms: 'saque,retirada',
      },
    ]

    entries.forEach(function (entry) {
      try {
        app.findFirstRecordByData('chart_of_accounts', 'category', entry.category)
      } catch (_) {
        var record = new Record(coa)
        record.set('group', entry.group)
        record.set('category', entry.category)
        record.set('type', entry.type)
        record.set('ocr_terms', entry.ocr_terms)
        record.set('code', '')
        record.set('active', true)
        app.save(record)
      }
    })

    var importsCol = app.findCollectionByNameOrId('imports')
    importsCol.addIndex('idx_imports_status', false, 'status', '')
    app.save(importsCol)
  },
  (app) => {
    var toRemove = ['Manutenção de Conta', 'Rendimentos', 'PIX Enviado', 'PIX Recebido', 'Saque']
    toRemove.forEach(function (cat) {
      try {
        var r = app.findFirstRecordByData('chart_of_accounts', 'category', cat)
        app.delete(r)
      } catch (_) {}
    })
    try {
      var importsCol = app.findCollectionByNameOrId('imports')
      importsCol.removeIndex('idx_imports_status')
      app.save(importsCol)
    } catch (_) {}
  },
)
