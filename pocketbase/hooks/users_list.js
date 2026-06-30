routerAdd(
  'GET',
  '/backend/v1/users',
  (e) => {
    try {
      const records = $app.findRecordsByFilter('users', "id != ''", 'name', 0, 0)
      const users = records.map((r) => ({
        id: r.id,
        name: r.getString('name'),
        email: r.getEmail(),
        avatar: r.getString('avatar'),
        role: r.getString('role') || 'admin',
        created: r.getCreated().toISOString(),
      }))
      return e.json(200, users)
    } catch (err) {
      return e.json(500, { error: 'failed to list users' })
    }
  },
  $apis.requireAuth(),
)
