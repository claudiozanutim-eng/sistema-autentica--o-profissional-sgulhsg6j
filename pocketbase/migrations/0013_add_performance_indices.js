migrate(
  (app) => {
    var coaCol = app.findCollectionByNameOrId('chart_of_accounts')
    coaCol.addIndex('idx_coa_ocr_terms', false, 'ocr_terms', '')
    coaCol.addIndex('idx_coa_group', false, 'group', '')
    coaCol.addIndex('idx_coa_category', false, 'category', '')
    coaCol.addIndex('idx_coa_group_category', false, 'group,category', '')
    app.save(coaCol)

    var txCol = app.findCollectionByNameOrId('transactions')
    txCol.addIndex('idx_transactions_group', false, 'group', '')
    txCol.addIndex('idx_transactions_category', false, 'category', '')
    txCol.addIndex('idx_transactions_group_category', false, 'group,category', '')
    txCol.addIndex('idx_transactions_type_date', false, 'type,date', '')
    txCol.addIndex('idx_transactions_year_month', false, 'year,month_year', '')
    app.save(txCol)
  },
  (app) => {
    var coaCol = app.findCollectionByNameOrId('chart_of_accounts')
    coaCol.removeIndex('idx_coa_ocr_terms')
    coaCol.removeIndex('idx_coa_group')
    coaCol.removeIndex('idx_coa_category')
    coaCol.removeIndex('idx_coa_group_category')
    app.save(coaCol)

    var txCol = app.findCollectionByNameOrId('transactions')
    txCol.removeIndex('idx_transactions_group')
    txCol.removeIndex('idx_transactions_category')
    txCol.removeIndex('idx_transactions_group_category')
    txCol.removeIndex('idx_transactions_type_date')
    txCol.removeIndex('idx_transactions_year_month')
    app.save(txCol)
  },
)
