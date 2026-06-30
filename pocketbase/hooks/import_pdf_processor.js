routerAdd(
  'POST',
  '/backend/v1/import-pdf',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var uploadedFiles = []
    try {
      uploadedFiles = e.findUploadedFiles('file')
    } catch (_) {}
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return e.badRequestError('No PDF file uploaded')
    }

    var uploaded = uploadedFiles[0]
    var fileBytes = uploaded.bytes
    var fileName = uploaded.name || 'upload.pdf'

    if (fileBytes.length > 10485760) {
      return e.badRequestError('File too large (max 10MB)')
    }

    var bankSource = ''
    try {
      bankSource = (e.requestInfo().body || {}).bank_source || ''
    } catch (_) {}
    if (!bankSource) {
      try {
        bankSource = e.request.url.query().get('bank_source') || ''
      } catch (_) {}
    }

    var importsCol = $app.findCollectionByNameOrId('imports')
    var importRecord = new Record(importsCol)
    var fileObj = $filesystem.fileFromBytes(fileBytes, fileName)
    importRecord.set('file', fileObj)
    importRecord.set('file_type', 'pdf')
    importRecord.set('bank_source', bankSource)
    importRecord.set('status', 'processing')
    $app.save(importRecord)
    var importId = importRecord.id

    function updateImportStatus(status, errorMsg) {
      try {
        var rec = $app.findRecordById('imports', importId)
        rec.set('status', status)
        if (errorMsg) rec.set('error_message', errorMsg)
        $app.save(rec)
      } catch (_) {}
    }

    function unescapePdfString(s) {
      return s
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\(\d{1,3})/g, function (_, oct) {
          return String.fromCharCode(parseInt(oct, 8))
        })
    }

    function extractPdfText(bytes) {
      var raw = ''
      for (var i = 0; i < bytes.length; i++) {
        raw += String.fromCharCode(bytes[i])
      }

      var text = ''
      var match

      var tjRe = /\(([^)]{1,300})\)\s*Tj/g
      while ((match = tjRe.exec(raw)) !== null) {
        var t = match[1]
        if (/[a-zA-Z0-9\u00C0-\u017F\s\/\-\.,]/.test(t) && t.trim().length > 1) {
          text += unescapePdfString(t) + '\n'
        }
      }

      var tjArrRe = /\[([^\]]{1,1000})\]\s*TJ/g
      while ((match = tjArrRe.exec(raw)) !== null) {
        var inner = match[1]
        var parts = inner.match(/\(([^)]{1,300})\)/g)
        if (parts) {
          var line = ''
          for (var pi = 0; pi < parts.length; pi++) {
            var content = parts[pi].slice(1, -1)
            if (/[a-zA-Z0-9\u00C0-\u017F\s\/\-\.,]/.test(content)) {
              line += unescapePdfString(content) + ' '
            }
          }
          if (line.trim().length > 1) text += line + '\n'
        }
      }

      var hexRe = /<([0-9A-Fa-f]{4,400})>\s*Tj/g
      while ((match = hexRe.exec(raw)) !== null) {
        var hex = match[1]
        var decoded = ''
        for (var hi = 0; hi + 1 < hex.length; hi += 2) {
          var code = parseInt(hex.substr(hi, 2), 16)
          if (code >= 32 && code <= 126) {
            decoded += String.fromCharCode(code)
          }
        }
        if (decoded.trim().length > 1) text += decoded + '\n'
      }

      return text.trim()
    }

    try {
      var pdfText = extractPdfText(fileBytes)

      if (pdfText.length < 50) {
        updateImportStatus('error', 'Could not extract text from PDF')
        return e.json(200, {
          status: 'error',
          error:
            'Nao foi possivel extrair texto do PDF. O arquivo pode estar compactado ou digitalizado. Tente exportar como CSV.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
        })
      }

      var aiResult = $ai.chat({
        model: 'reasoning',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial document parser specialized in Brazilian bank statements. Extract all transactions from the provided text. Return a JSON array of objects with fields: description, amount (number, positive for income, negative for expense), type (income or expense), date (YYYY-MM-DD), category. Respond ONLY with valid JSON, no markdown.',
          },
          {
            role: 'user',
            content:
              'Extract transactions from this bank statement text:\n\n' + pdfText.slice(0, 50000),
          },
        ],
      })

      var content = aiResult.choices[0].message.content
      var transactions = []
      try {
        var cleaned = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        var jsonMatch = cleaned.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          transactions = JSON.parse(jsonMatch[0])
        } else {
          transactions = JSON.parse(cleaned)
        }
      } catch (_) {
        updateImportStatus('error', 'Failed to parse AI response')
        return e.json(200, {
          status: 'error',
          error: 'Falha ao processar resposta da IA.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
        })
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        updateImportStatus('error', 'No transactions found in PDF')
        return e.json(200, {
          status: 'error',
          error: 'Nenhuma transacao encontrada no PDF.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
        })
      }

      var coaRecords = $app.findRecordsByFilter(
        'chart_of_accounts',
        'active = true',
        'code',
        200,
        0,
      )
      var termMap = {}
      var coaList = []
      var existingCombos = {}
      coaRecords.forEach(function (r) {
        var terms = (r.getString('ocr_terms') || '')
          .toLowerCase()
          .split(',')
          .map(function (t) {
            return t.trim()
          })
          .filter(Boolean)
        var entry = {
          group: r.getString('group'),
          category: r.getString('category'),
          type: r.getString('type'),
        }
        coaList.push(entry)
        existingCombos[entry.group + '|||' + entry.category] = true
        terms.forEach(function (term) {
          termMap[term] = entry
        })
      })
      var termKeys = Object.keys(termMap).sort(function (a, b) {
        return b.length - a.length
      })

      var matched = []
      var unmatched = []
      transactions.forEach(function (tx, idx) {
        var desc = (tx.description || '').toLowerCase()
        var found = null
        for (var i = 0; i < termKeys.length; i++) {
          if (desc.indexOf(termKeys[i]) !== -1) {
            found = termMap[termKeys[i]]
            break
          }
        }
        if (found) {
          matched.push({
            index: idx,
            date: tx.date || new Date().toISOString().slice(0, 10),
            description: tx.description || '',
            amount: Number(tx.amount) || 0,
            group: found.group,
            category: found.category,
            type: found.type,
            confidence: 'high',
          })
        } else {
          var signType = (Number(tx.amount) || 0) >= 0 ? 'income' : 'expense'
          unmatched.push({
            index: idx,
            date: tx.date || new Date().toISOString().slice(0, 10),
            description: tx.description || '',
            amount: Number(tx.amount) || 0,
            group: 'Outros',
            category: 'Nao Classificado',
            type: tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : signType,
            confidence: 'low',
          })
        }
      })

      if (unmatched.length > 0 && coaList.length > 0) {
        var batchSize = 50
        for (var bStart = 0; bStart < unmatched.length; bStart += batchSize) {
          var batch = unmatched.slice(bStart, bStart + batchSize)
          var coaText = coaList
            .map(function (c) {
              return c.group + ' > ' + c.category + ' (' + c.type + ')'
            })
            .join('\n')
          var txText = batch
            .map(function (u, i) {
              return bStart + i + 1 + '. ' + u.description + ' | ' + u.amount
            })
            .join('\n')
          try {
            var reply = $ai.chat({
              model: 'fast',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a financial categorization assistant. Given the chart of accounts and transactions, assign group, category, and type. You may suggest NEW groups and categories if none fit. Respond ONLY with a JSON array. Each element: {"index": N (1-based within this batch), "group": "", "category": "", "type": "income|expense"}.',
                },
                {
                  role: 'user',
                  content: 'Chart of Accounts:\n' + coaText + '\n\nTransactions:\n' + txText,
                },
              ],
            })
            var catContent = reply.choices[0].message.content
            var catJsonMatch = catContent.match(/\[[\s\S]*\]/)
            if (catJsonMatch) {
              var aiResults = JSON.parse(catJsonMatch[0])
              aiResults.forEach(function (r) {
                var idx = (typeof r.index === 'number' ? r.index : parseInt(r.index, 10)) - 1
                if (batch[idx]) {
                  batch[idx].group = r.group || 'Outros'
                  batch[idx].category = r.category || 'Nao Classificado'
                  batch[idx].type = r.type || batch[idx].type
                  batch[idx].confidence = 'medium'
                }
              })
            }
          } catch (err) {
            $app
              .logger()
              .error('AI categorization failed for batch ' + bStart, 'error', err.message || '')
          }
        }
      }

      var all = matched.concat(unmatched).sort(function (a, b) {
        return a.index - b.index
      })

      var coaCol = $app.findCollectionByNameOrId('chart_of_accounts')
      var uniqueCombos = {}
      all.forEach(function (t) {
        var key = t.group + '|||' + t.category
        if (!uniqueCombos[key])
          uniqueCombos[key] = { group: t.group, category: t.category, type: t.type }
      })
      var autoCreatedCount = 0
      Object.keys(uniqueCombos).forEach(function (key) {
        if (!existingCombos[key]) {
          try {
            var newCoa = new Record(coaCol)
            newCoa.set('group', uniqueCombos[key].group)
            newCoa.set('category', uniqueCombos[key].category)
            newCoa.set('type', uniqueCombos[key].type)
            newCoa.set('ocr_terms', '')
            newCoa.set('code', '')
            newCoa.set('active', true)
            $app.save(newCoa)
            autoCreatedCount++
          } catch (err) {
            $app.logger().error('Failed to auto-create COA', 'error', err.message || '')
          }
        }
      })

      var recentTx = []
      try {
        recentTx = $app.findRecordsByFilter(
          'transactions',
          "user_id = '" + userId + "'",
          '-created',
          500,
          0,
        )
      } catch (_) {}
      var dupSet = {}
      recentTx.forEach(function (t) {
        var key =
          t.getString('date') +
          '|' +
          String(t.getNumber('amount')) +
          '|' +
          t.getString('description').toLowerCase().trim()
        dupSet[key] = true
      })
      var nonDupes = []
      var dupeCount = 0
      all.forEach(function (t) {
        var dupKey =
          t.date + '|' + String(t.amount) + '|' + (t.description || '').toLowerCase().trim()
        if (dupSet[dupKey]) {
          dupeCount++
        } else {
          nonDupes.push(t)
        }
      })

      nonDupes.forEach(function (t, i) {
        t.index = i
      })

      try {
        var finalRec = $app.findRecordById('imports', importId)
        finalRec.set('status', 'completed')
        finalRec.set('transactions_json', JSON.stringify(nonDupes))
        $app.save(finalRec)
      } catch (_) {}

      return e.json(200, {
        status: 'completed',
        import_id: importId,
        transactions: nonDupes,
        matched_count: matched.length,
        unmatched_count: unmatched.length,
        auto_created_count: autoCreatedCount,
        duplicates_skipped: dupeCount,
      })
    } catch (err) {
      updateImportStatus('error', err.message || 'Processing failed')
      if (err instanceof SkipAiError || err instanceof SkipAiConfigError) {
        return e.json(503, {
          status: 'error',
          error: 'AI temporarily unavailable',
          import_id: importId,
          transactions: [],
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
