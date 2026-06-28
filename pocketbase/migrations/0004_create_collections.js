migrate(
  (app) => {
    const coa = new Collection({
      name: 'chart_of_accounts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'group', type: 'text', required: true },
        { name: 'category', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          values: ['income', 'expense'],
          required: true,
          maxSelect: 1,
        },
        { name: 'ocr_terms', type: 'text' },
        { name: 'code', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(coa)

    const accounts = new Collection({
      name: 'accounts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'type', type: 'text', required: true },
        { name: 'bank', type: 'text' },
        { name: 'initial_balance', type: 'number' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(accounts)

    const imports = new Collection({
      name: 'imports',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/pdf',
          ],
        },
        { name: 'file_type', type: 'text' },
        { name: 'bank_source', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['processing', 'completed', 'error'],
          required: true,
          maxSelect: 1,
        },
        { name: 'transactions_json', type: 'json', maxSize: 5242880 },
        { name: 'error_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(imports)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('chart_of_accounts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('accounts'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('imports'))
    } catch (_) {}
  },
)
