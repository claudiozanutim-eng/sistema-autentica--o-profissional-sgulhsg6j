migrate(
  (app) => {
    const collection = new Collection({
      name: 'credit_cards',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'bank', type: 'text', required: true },
        { name: 'limit', type: 'number', required: true, min: 0 },
        { name: 'due_day', type: 'number', required: true, min: 1, max: 31 },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_credit_cards_user ON credit_cards (user_id)'],
    })
    app.save(collection)

    const txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('credit_card_id')) {
      txCol.fields.add(
        new RelationField({ name: 'credit_card_id', collectionId: collection.id, maxSelect: 1 }),
      )
      app.save(txCol)
    }
  },
  (app) => {
    const txCol = app.findCollectionByNameOrId('transactions')
    if (txCol.fields.getByName('credit_card_id')) {
      txCol.fields.removeByName('credit_card_id')
      app.save(txCol)
    }

    try {
      const collection = app.findCollectionByNameOrId('credit_cards')
      app.delete(collection)
    } catch (_) {}
  },
)
