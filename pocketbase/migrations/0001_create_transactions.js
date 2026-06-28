migrate(
  (app) => {
    const collection = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'type',
          type: 'select',
          values: ['income', 'expense'],
          required: true,
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'category', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['paid', 'pending', 'overdue'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_date ON transactions (date DESC)',
        'CREATE INDEX idx_transactions_user ON transactions (user_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('transactions')
    app.delete(collection)
  },
)
