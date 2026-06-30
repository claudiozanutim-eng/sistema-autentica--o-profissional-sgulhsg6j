routerAdd(
  'POST',
  '/backend/v1/users',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      if (!body.name || !body.name.trim()) return e.badRequestError('name is required')
      if (!body.email || !body.email.trim()) return e.badRequestError('email is required')

      try {
        $app.findAuthRecordByEmail('_pb_users_auth_', body.email.trim())
        return e.badRequestError('email already registered')
      } catch (_) {}

      const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      const record = new Record(usersCol)
      record.setEmail(body.email.trim())
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', body.name.trim())
      $app.save(record)

      return e.json(201, {
        id: record.id,
        name: record.getString('name'),
        email: record.getEmail(),
        avatar: record.getString('avatar'),
      })
    } catch (err) {
      return e.json(500, { error: 'failed to create user' })
    }
  },
  $apis.requireAuth(),
)
