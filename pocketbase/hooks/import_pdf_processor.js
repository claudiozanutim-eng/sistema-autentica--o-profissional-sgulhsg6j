routerAdd(
  'POST',
  '/backend/v1/import-pdf',
  (e) => {
    const body = e.requestInfo().body || {}
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const fileField = 'file'
    let uploadedFiles = []
    try {
      uploadedFiles = e.findUploadedFiles(fileField)
    } catch (_) {}
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return e.badRequestError('No PDF file uploaded')
    }

    const uploaded = uploadedFiles[0]
    const fileBytes = uploaded.bytes

    try {
      const result = $ai.chat({
        model: 'reasoning',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial document parser. Extract all transactions from the provided text. Return a JSON array of objects with fields: description, amount (number), type (income or expense), date (YYYY-MM-DD), category. Respond ONLY with valid JSON, no markdown.',
          },
          {
            role: 'user',
            content:
              'Extract transactions from this document text:\n\n' +
              new TextDecoder().decode(fileBytes).slice(0, 50000),
          },
        ],
      })

      const content = result.choices[0].message.content
      let transactions = []
      try {
        const cleaned = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        transactions = JSON.parse(cleaned)
      } catch (_) {
        return e.json(200, { status: 'error', error: 'Failed to parse AI response', raw: content })
      }

      const txCol = $app.findCollectionByNameOrId('transactions')
      const saved = []
      for (const tx of transactions) {
        const record = new Record(txCol)
        record.set('description', tx.description || '')
        record.set('amount', Number(tx.amount) || 0)
        record.set('type', tx.type === 'income' ? 'income' : 'expense')
        record.set('date', tx.date || new Date().toISOString().slice(0, 10))
        record.set('category', tx.category || 'Other')
        record.set('status', 'pending')
        record.set('user_id', userId)
        record.set('origin', 'import')
        record.set('source', 'PDF Import')
        $app.saveNoValidate(record)
        saved.push(record.id)
      }

      return e.json(200, { status: 'completed', count: saved.length, transactions: saved })
    } catch (err) {
      if (err instanceof SkipAiError || err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'AI temporarily unavailable' })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
