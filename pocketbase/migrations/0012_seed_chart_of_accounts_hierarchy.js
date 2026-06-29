migrate(
  (app) => {
    var coaCol = app.findCollectionByNameOrId('chart_of_accounts')

    var data = [
      {
        code: 'GE01',
        group: 'GRUPO DE ENTRADAS',
        category: 'Salário',
        type: 'income',
        ocr_terms: 'salario,salarios,folha,pagamento',
      },
      {
        code: 'GE02',
        group: 'GRUPO DE ENTRADAS',
        category: 'Freelance',
        type: 'income',
        ocr_terms: 'freelance,consultoria,honorarios',
      },
      {
        code: 'GE03',
        group: 'GRUPO DE ENTRADAS',
        category: 'Reembolso',
        type: 'income',
        ocr_terms: 'reembolso,estorno',
      },
      {
        code: 'GE04',
        group: 'GRUPO DE ENTRADAS',
        category: 'Venda de Livros',
        type: 'income',
        ocr_terms: 'venda,livros,livro',
      },
      {
        code: 'GE05',
        group: 'GRUPO DE ENTRADAS',
        category: 'Receita Katia',
        type: 'income',
        ocr_terms: 'katia,receita',
      },
      {
        code: 'GE06',
        group: 'GRUPO DE ENTRADAS',
        category: 'Empréstimo',
        type: 'income',
        ocr_terms: 'emprestimo,emprestimos',
      },
      {
        code: 'ES01',
        group: 'ESSENCIAL',
        category: 'Aluguel',
        type: 'expense',
        ocr_terms: 'aluguel,locacao',
      },
      {
        code: 'ES02',
        group: 'ESSENCIAL',
        category: 'Condomínio',
        type: 'expense',
        ocr_terms: 'condominio,cond',
      },
      {
        code: 'ES03',
        group: 'ESSENCIAL',
        category: 'Energia Elétrica',
        type: 'expense',
        ocr_terms: 'energia,eletrica,light,enel,cpfl',
      },
      {
        code: 'ES04',
        group: 'ESSENCIAL',
        category: 'Água e Esgoto',
        type: 'expense',
        ocr_terms: 'agua,esgoto,sabesp',
      },
      {
        code: 'ES05',
        group: 'ESSENCIAL',
        category: 'Internet',
        type: 'expense',
        ocr_terms: 'internet,vivo,claro,net',
      },
      {
        code: 'ES06',
        group: 'ESSENCIAL',
        category: 'Seguro',
        type: 'expense',
        ocr_terms: 'seguro,seguros',
      },
      {
        code: 'ES07',
        group: 'ESSENCIAL',
        category: 'Manutenção',
        type: 'expense',
        ocr_terms: 'manutencao,reparo,reparos',
      },
      {
        code: 'EV01',
        group: 'ESTILO DE VIDA',
        category: 'Restaurante',
        type: 'expense',
        ocr_terms: 'restaurante,ifood,bar,lanchonete',
      },
      {
        code: 'EV02',
        group: 'ESTILO DE VIDA',
        category: 'Lazer',
        type: 'expense',
        ocr_terms: 'lazer,diversao,cinema',
      },
      {
        code: 'EV03',
        group: 'ESTILO DE VIDA',
        category: 'Streaming',
        type: 'expense',
        ocr_terms: 'streaming,netflix,spotify,prime',
      },
      {
        code: 'EV04',
        group: 'ESTILO DE VIDA',
        category: 'Viagens',
        type: 'expense',
        ocr_terms: 'viagem,viagens,passagem,hotel',
      },
      {
        code: 'EV05',
        group: 'ESTILO DE VIDA',
        category: 'Compras Pessoais',
        type: 'expense',
        ocr_terms: 'compras,shopping,pessoal',
      },
      {
        code: 'PR01',
        group: 'PROJETOS',
        category: 'IC EDUC USA',
        type: 'expense',
        ocr_terms: 'ic educ,iceduc',
      },
      {
        code: 'PR02',
        group: 'PROJETOS',
        category: 'Maza Vendas',
        type: 'expense',
        ocr_terms: 'maza,vendas',
      },
      {
        code: 'PR03',
        group: 'PROJETOS',
        category: 'TIS Mentoria',
        type: 'expense',
        ocr_terms: 'tis,mentoria',
      },
      {
        code: 'PR04',
        group: 'PROJETOS',
        category: 'TIS Rituais',
        type: 'expense',
        ocr_terms: 'tis,rituais',
      },
      {
        code: 'PR05',
        group: 'PROJETOS',
        category: 'UNIMED',
        type: 'expense',
        ocr_terms: 'unimed,plano de saude',
      },
      { code: 'PR06', group: 'PROJETOS', category: 'HSM', type: 'expense', ocr_terms: 'hsm' },
      {
        code: 'PR07',
        group: 'PROJETOS',
        category: 'SESCOOP',
        type: 'expense',
        ocr_terms: 'sescoop',
      },
      { code: 'PR08', group: 'PROJETOS', category: 'Tesla', type: 'expense', ocr_terms: 'tesla' },
      {
        code: 'IN01',
        group: 'INVESTIMENTOS',
        category: 'Aporte Safra',
        type: 'expense',
        ocr_terms: 'aporte,safra,investimento',
      },
      {
        code: 'IN02',
        group: 'INVESTIMENTOS',
        category: 'Previdência',
        type: 'expense',
        ocr_terms: 'previdencia,apg,plan',
      },
      {
        code: 'IN03',
        group: 'INVESTIMENTOS',
        category: 'Ações',
        type: 'expense',
        ocr_terms: 'acoes,acao,bolsa',
      },
      {
        code: 'IN04',
        group: 'INVESTIMENTOS',
        category: 'FIIs',
        type: 'expense',
        ocr_terms: 'fii,fiis,fundo imobiliario',
      },
    ]

    data.forEach(function (item) {
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
  },
  (app) => {
    var codes = [
      'GE01',
      'GE02',
      'GE03',
      'GE04',
      'GE05',
      'GE06',
      'ES01',
      'ES02',
      'ES03',
      'ES04',
      'ES05',
      'ES06',
      'ES07',
      'EV01',
      'EV02',
      'EV03',
      'EV04',
      'EV05',
      'PR01',
      'PR02',
      'PR03',
      'PR04',
      'PR05',
      'PR06',
      'PR07',
      'PR08',
      'IN01',
      'IN02',
      'IN03',
      'IN04',
    ]
    codes.forEach(function (code) {
      try {
        var rec = app.findFirstRecordByData('chart_of_accounts', 'code', code)
        app.delete(rec)
      } catch (_) {}
    })
  },
)
