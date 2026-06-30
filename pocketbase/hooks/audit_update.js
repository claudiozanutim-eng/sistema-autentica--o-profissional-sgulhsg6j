onRecordAfterUpdateSuccess(
  (e) => {
    var record = e.record
    var colName = record.collection().name

    var userId = ''
    var details = { id: record.id, changes: {} }

    if (colName === 'transactions') {
      userId = record.getString('created_by') || record.getString('user_id') || ''
      var txFields = ['description', 'amount', 'type', 'date', 'category', 'status', 'group']
      txFields.forEach(function (fn) {
        var newVal = String(record.get(fn) || '')
        var oldVal = String(record.original().get(fn) || '')
        if (newVal !== oldVal) {
          details.changes[fn] = { old: oldVal, new: newVal }
        }
      })
    } else if (colName === 'users') {
      userId = record.id
      var uFields = ['name', 'role']
      uFields.forEach(function (fn) {
        var newVal = String(record.get(fn) || '')
        var oldVal = String(record.original().get(fn) || '')
        if (newVal !== oldVal) {
          details.changes[fn] = { old: oldVal, new: newVal }
        }
      })
      var newEmail = record.getEmail()
      var oldEmail = record.original().getEmail()
      if (newEmail !== oldEmail) {
        details.changes.email = { old: oldEmail, new: newEmail }
      }
    }

    if (!userId) return e.next()

    try {
      var logCol = $app.findCollectionByNameOrId('activity_logs')
      var log = new Record(logCol)
      log.set('user_id', userId)
      log.set('action', 'UPDATE')
      log.set('resource', colName)
      log.set('details', details)
      $app.save(log)
    } catch (err) {
      $app.logger().error('audit update failed', 'error', err.message || '')
    }

    return e.next()
  },
  'transactions',
  'users',
)
