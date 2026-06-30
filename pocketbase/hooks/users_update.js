routerAdd(
  'PUT',
  '/backend/v1/users/{id}',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const body = e.requestInfo().body || {}

      const record = $app.findRecordById('users', id)

      if (body.name !== undefined) record.set('name', body.name)
      if (body.email !== undefined) record.setEmail(body.email)
      if (body.role !== undefined) record.set('role', body.role)

      $app.save(record)

      return e.json(200, {
        id: record.id,
        name: record.getString('name'),
        email: record.getEmail(),
        avatar: record.getString('avatar'),
        role: record.getString('role') || 'admin',
      })
    } catch (err) {
      return e.json(500, { error: 'failed to update user' })
    }
  },
  $apis.requireAuth(),
)
