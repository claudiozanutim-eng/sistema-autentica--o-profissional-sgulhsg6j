migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'reader'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    var activityLogs = new Collection({
      name: 'activity_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'resource', type: 'text', required: true },
        { name: 'details', type: 'json', maxSize: 5242880 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_activity_logs_user ON activity_logs (user_id)',
        'CREATE INDEX idx_activity_logs_created ON activity_logs (created DESC)',
        'CREATE INDEX idx_activity_logs_resource ON activity_logs (resource)',
      ],
    })
    app.save(activityLogs)

    var allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'created', 0, 0)
    allUsers.forEach(function (record) {
      if (!record.getString('role')) {
        record.set('role', 'admin')
        app.save(record)
      }
    })
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.remove(roleField)
      app.save(usersCol)
    }
    try {
      app.delete(app.findCollectionByNameOrId('activity_logs'))
    } catch (_) {}
  },
)
