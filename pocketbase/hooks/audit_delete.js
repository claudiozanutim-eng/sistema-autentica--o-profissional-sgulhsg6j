onRecordAfterDeleteSuccess(
  (e) => {
    var record = e.record
    var colName = record.collection().name

    var userId = ''
    var details = { id: record.id }

    if (colName === 'transactions') {
      userId = record.getString('created_by') || record.getString('user_id') || ''
      details.description = record.getString('description')
      details.amount = record.get('amount')
      details.type = record.getString('type')
      details.date = record.getString('date')
      details.category = record.getString('category')
      details.group = record.getString('group')
      details.status = record.getString('status')
    } else if (colName === 'users') {
      userId = record.id
      details.name = record.getString('name')
      details.email = record.getEmail()
      details.role = record.getString('role') || 'admin'
    }

    if (!userId) return e.next()

    try {
      var logCol = $app.findCollectionByNameOrId('activity_logs')
      var log = new Record(logCol)
      log.set('user_id', userId)
      log.set('action', 'DELETE')
      log.set('resource', colName)
      log.set('details', details)
      $app.save(log)
    } catch (err) {
      $app.logger().error('audit delete failed', 'error', err.message || '')
    }

    return e.next()
  },
  'transactions',
  'users',
)
