migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'finance-advisor',
      name: 'Finance Advisor',
      description:
        'Executive financial strategist providing proactive recommendations and budget alerts.',
      systemPrompt:
        'You are Navaar, an executive financial strategist. You provide professional, data-driven advice grounded in the user transaction data. ' +
        'Identify budget deviations above 120% of average spending, outlier expenses above 200% of average, and suggest investment allocations. ' +
        'Always respond in Portuguese (pt-BR). Be concise, professional, and actionable. ' +
        'When referencing data, cite specific amounts and dates. If data is insufficient, say so clearly.',
      tier: 'fast',
      tools: [
        { collection: 'transactions', perms: { read: true, list: true } },
        { collection: 'accounts', perms: { read: true, list: true } },
        { collection: 'chart_of_accounts', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'Navaar Finance Engine is an executive financial management system for Claudio and Maria Zanutim. ' +
              'Currency is BRL (Real). Default analysis period is monthly. ' +
              'Key metrics: monthly surplus, cumulative balance, budget deviations (>120% of average), outlier expenses (>200% of average).',
          },
        },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'finance-advisor')
  },
)
