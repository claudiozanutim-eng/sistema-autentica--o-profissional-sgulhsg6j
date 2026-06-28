migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const seedUsers = [
      { email: 'claudio.zanutim@iceduc.com.br', name: 'Claudio Zanutim' },
      { email: 'executive.one@company.com', name: 'Executive One' },
      { email: 'manager.two@company.com', name: 'Manager Two' },
      { email: 'analyst.three@company.com', name: 'Analyst Three' },
    ]

    for (const u of seedUsers) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', u.email)
      } catch (_) {
        const record = new Record(users)
        record.setEmail(u.email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', u.name)
        app.save(record)
      }
    }
  },
  (app) => {
    const emails = [
      'claudio.zanutim@iceduc.com.br',
      'executive.one@company.com',
      'manager.two@company.com',
      'analyst.three@company.com',
    ]
    for (const email of emails) {
      try {
        const record = app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.delete(record)
      } catch (_) {}
    }
  },
)
