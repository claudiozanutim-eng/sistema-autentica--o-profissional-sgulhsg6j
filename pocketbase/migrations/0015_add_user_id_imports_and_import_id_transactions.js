migrate(
  (app) => {
    var importsCol = app.findCollectionByNameOrId('imports')

    if (!importsCol.fields.getByName('user_id')) {
      importsCol.fields.add(
        new RelationField({
          name: 'user_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }

    importsCol.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    importsCol.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    importsCol.createRule = "@request.auth.id != ''"
    importsCol.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    importsCol.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"

    importsCol.addIndex('idx_imports_user', false, 'user_id', '')
    app.save(importsCol)

    var txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('import_id')) {
      txCol.fields.add(
        new RelationField({
          name: 'import_id',
          collectionId: importsCol.id,
          maxSelect: 1,
        }),
      )
    }
    txCol.addIndex('idx_transactions_import', false, 'import_id', '')
    app.save(txCol)
  },
  (app) => {
    var importsCol = app.findCollectionByNameOrId('imports')
    if (importsCol.fields.getByName('user_id')) {
      importsCol.fields.remove('user_id')
    }
    importsCol.listRule = "@request.auth.id != ''"
    importsCol.viewRule = "@request.auth.id != ''"
    importsCol.createRule = "@request.auth.id != ''"
    importsCol.updateRule = "@request.auth.id != ''"
    importsCol.deleteRule = "@request.auth.id != ''"
    try {
      importsCol.removeIndex('idx_imports_user')
    } catch (_) {}
    app.save(importsCol)

    var txCol = app.findCollectionByNameOrId('transactions')
    if (txCol.fields.getByName('import_id')) {
      txCol.fields.remove('import_id')
    }
    try {
      txCol.removeIndex('idx_transactions_import')
    } catch (_) {}
    app.save(txCol)
  },
)
