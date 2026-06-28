migrate(
  (app) => {
    var col = new Collection({
      name: 'agente_conversas',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'pergunta', type: 'text', required: true },
        { name: 'resposta', type: 'text', required: true },
        { name: 'contexto_json', type: 'json', maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_agente_conversas_user ON agente_conversas (user_id)'],
    })
    app.save(col)

    $ai.agents.define(app, {
      slug: 'ohana-advisor',
      name: 'OHANA Advisor',
      description:
        'Consultor financeiro executivo pessoal que fornece analise em tempo real, alertas e projecoes baseadas em dados reais de fluxo de caixa familiar.',
      systemPrompt:
        'Voce e o OHANA Advisor, um consultor financeiro executivo. ' +
        'PERSONA: Profissional, direto, executivo. Tom de voz claro e acessivel, sem jargoes desnecessarios. ' +
        'ESTILO DE RESPOSTA: Toda resposta deve iniciar com um resumo executivo de 1-2 linhas. ' +
        'Use nomes reais de grupos e categorias dos dados. Nunca invente dados. ' +
        'Sempre responda em portugues (pt-BR). ' +
        'PROJECAO FINANCEIRA: Quando solicitado a projetar patrimonio, aplique a formula: ' +
        'VF = VI * (1 + i)^n + SOMATORIO(k=1 a n) [AP * (1 + i)^(n-k)] ' +
        'onde VF = Valor Futuro, VI = Valor Inicial, i = taxa de juros mensal, n = numero de meses, AP = Aporte Periodico. ' +
        'Apresente sempre "Delta" comparando o caminho atual vs mudancas propostas (ex: cortar despesas). ' +
        'Projecoes para horizontes de 1, 5 e 10 anos quando relevante. ' +
        'DADOS: Baseie-se estritamente nos dados fornecidos no contexto. Cite valores e datas especificos. ' +
        'Se os dados forem insuficientes, diga claramente.',
      tier: 'fast',
      tools: [
        { collection: 'transactions', perms: { read: true, list: true } },
        { collection: 'chart_of_accounts', perms: { read: true, list: true } },
        { collection: 'accounts', perms: { read: true, list: true } },
        { collection: 'users', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'OHANA e um sistema de gestao financeira executiva para Claudio e Maria Zanutim. ' +
              'Moeda: BRL (Real). Periodo de analise padrao: mensal. ' +
              'Metricas-chave: superavit mensal, saldo acumulado, desvios orcamentarios (>120% da media), ' +
              'despesas atipicas (>200% da media), oportunidades de investimento (caixa > 6x despesas mensais), ' +
              'queda de receita (<70% da media).',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('agente_conversas'))
    } catch (_) {}
    $ai.agents.delete(app, 'ohana-advisor')
  },
)
