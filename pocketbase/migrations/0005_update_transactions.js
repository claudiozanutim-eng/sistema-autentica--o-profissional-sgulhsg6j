migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('transactions')
    const accountsId = app.findCollectionByNameOrId('accounts').id

    if (!col.fields.getByName('account_id')) {
      col.fields.add(
        new RelationField({ name: 'account_id', collectionId: accountsId, maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('year')) {
      col.fields.add(new NumberField({ name: 'year' }))
    }
    if (!col.fields.getByName('month_year')) {
      col.fields.add(new TextField({ name: 'month_year' }))
    }
    if (!col.fields.getByName('group')) {
      col.fields.add(new TextField({ name: 'group' }))
    }
    if (!col.fields.getByName('source')) {
      col.fields.add(new TextField({ name: 'source' }))
    }
    if (!col.fields.getByName('created_by')) {
      col.fields.add(
        new RelationField({ name: 'created_by', collectionId: '_pb_users_auth_', maxSelect: 1 }),
      )
    }
    if (!col.fields.getByName('origin')) {
      col.fields.add(
        new SelectField({ name: 'origin', values: ['manual', 'import'], maxSelect: 1 }),
      )
    }

    app.save(col)
  },
  (app) => {},
)
