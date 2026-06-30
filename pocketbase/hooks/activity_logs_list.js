routerAdd(
  'GET',
  '/backend/v1/activity-logs',
  (e) => {
    try {
      var authRole = e.auth ? e.auth.getString('role') || 'admin' : ''
      if (authRole !== 'admin') {
        return e.forbiddenError('Acesso restrito a administradores')
      }

      var query = e.requestInfo().query || {}
      var filter = "id != ''"
      var dateRegex = /^\d{4}-\d{2}-\d{2}$/

      if (query.start_date && dateRegex.test(query.start_date)) {
        filter += " && created >= '" + query.start_date + " 00:00:00'"
      }
      if (query.end_date && dateRegex.test(query.end_date)) {
        filter += " && created <= '" + query.end_date + " 23:59:59'"
      }

      if (query.user_name && query.user_name.trim()) {
        var safeName = query.user_name.trim().replace(/'/g, '')
        var matchingUsers = $app.findRecordsByFilter(
          'users',
          "name ~ '" + safeName + "'",
          'name',
          0,
          0,
        )
        if (matchingUsers.length === 0) {
          return e.json(200, [])
        }
        var conditions = matchingUsers
          .map(function (u) {
            return "user_id = '" + u.id + "'"
          })
          .join(' || ')
        filter += ' && (' + conditions + ')'
      }

      var limit = 200
      if (query.limit) {
        limit = parseInt(query.limit, 10) || 200
      }

      var records = $app.findRecordsByFilter('activity_logs', filter, '-created', limit, 0)

      var logs = records.map(function (r) {
        var userName = 'Sistema'
        try {
          var user = $app.findRecordById('users', r.getString('user_id'))
          userName = user.getString('name')
        } catch (_) {}

        var rawDetails = r.get('details')
        var details
        if (rawDetails && typeof rawDetails === 'object') {
          details = rawDetails
        } else if (typeof rawDetails === 'string') {
          try {
            details = JSON.parse(rawDetails)
          } catch (_) {
            details = { raw: rawDetails }
          }
        } else {
          details = {}
        }

        return {
          id: r.id,
          user_id: r.getString('user_id'),
          user_name: userName,
          action: r.getString('action'),
          resource: r.getString('resource'),
          details: details,
          created: r.getCreated().toISOString(),
        }
      })

      return e.json(200, logs)
    } catch (err) {
      return e.json(500, { error: 'failed to list activity logs' })
    }
  },
  $apis.requireAuth(),
)
