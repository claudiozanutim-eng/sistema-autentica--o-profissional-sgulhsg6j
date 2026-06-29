routerAdd(
  'POST',
  '/backend/v1/imports/pdf-process',
  (e) => {
    var body = e.requestInfo().body || {}
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')
    if (!body.file_data) return e.badRequestError('No file data provided')

    var fileName = body.file_name || 'statement.pdf'
    var bankSource = body.bank_source || 'itau'

    function b64ToBytes(b64) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var lookup = {}
      for (var i = 0; i < 64; i++) lookup[chars[i]] = i
      var clean = b64.replace(/[^A-Za-z0-9+/=]/g, '')
      var bytes = []
      for (var i = 0; i < clean.length; i += 4) {
        var a = lookup[clean[i]] || 0
        var b = lookup[clean[i + 1]] || 0
        var c = clean[i + 2]
        var d = clean[i + 3]
        bytes.push((a << 2) | (b >> 4))
        if (c && c !== '=') bytes.push(((b & 15) << 4) | ((lookup[c] || 0) >> 2))
        if (d && d !== '=') bytes.push(((lookup[c] & 3) << 6) | (lookup[d] || 0))
      }
      return bytes
    }

    function extractPdfText(bytes) {
      var raw = ''
      for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i])
      var text = ''
      var streamRegex = /stream\r?\n([\s\S]*?)endstream/g
      var match
      while ((match = streamRegex.exec(raw)) !== null) {
        var streamData = match[1]
        var decoded = streamData
        var tjMatches = decoded.match(/\(([^)]*)\)\s*Tj/g)
        if (tjMatches)
          tjMatches.forEach(function (m) {
            text += m.replace(/\)\s*Tj$/, '').replace(/^\(/, '') + ' '
          })
        var tjArrays = decoded.match(/\[([^\]]*)\]\s*TJ/g)
        if (tjArrays)
          tjArrays.forEach(function (m) {
            var parts = m.match(/\(([^)]*)\)/g)
            if (parts)
              parts.forEach(function (p) {
                text += p.replace(/[()]/g, '') + ' '
              })
          })
      }
      return text.trim()
    }

    var importsCol = $app.findCollectionByNameOrId('imports')
    var importRecord = new Record(importsCol)
    var fileBytes = b64ToBytes(body.file_data)

    importRecord.set('file_type', 'pdf')
    importRecord.set('bank_source', bankSource)
    importRecord.set('status', 'processing')
    $app.save(importRecord)

    try {
      try {
        importRecord.set('file', $filesystem.fileFromBytes(new Uint8Array(fileBytes), fileName))
        $app.save(importRecord)
      } catch (_) {}

      var pdfText = extractPdfText(fileBytes)
      if (!pdfText || pdfText.length < 10) {
        throw new Error(
          'Não foi possível extrair texto do PDF. O arquivo pode estar criptografado ou inválido.',
        )
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
        terms.forEach(function (term) {
          termMap[term] = entry
        })
      })
      var termKeys = Object.keys(termMap).sort(function (a, b) {
        return b.length - a.length
      })

      var bankHints = {
        itau: 'Itaú statements: dates may be DD/MM, credits marked C, debits D.',
        safra: 'Safra statements: dates typically DD/MM/YYYY.',
        nubank: 'Nubank statements: dates DD/MM/YYYY, amounts may have R$ prefix.',
      }

      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial PDF parser for Brazilian bank statements. Extract ALL transactions. Return ONLY a JSON array. Each element: {"date":"YYYY-MM-DD","description":"","amount":0.00,"type":"income|expense","group":"","category":""}. Credits=income, Debits=expense. Amount always positive. If year missing use 2025. Do NOT categorize - leave group and category empty. ' +
              (bankHints[bankSource] || ''),
          },
          {
            role: 'user',
            content: 'Bank Statement Text:\n' + pdfText.substring(0, 30000),
          },
        ],
      })

      var content = reply.choices[0].message.content
      var jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('AI não retornou transações válidas')
      var transactions = JSON.parse(jsonMatch[0])

      var matchedCount = 0
      var unmatchedForAI = []

      transactions.forEach(function (t, i) {
        t.index = i
        t.confidence = 'low'
        if (typeof t.amount === 'string') {
          t.amount = parseFloat(String(t.amount).replace(/[^\d.-]/g, '')) || 0
        }
        t.group = ''
        t.category = ''

        var desc = (t.description || '').toLowerCase()
        var found = null
        for (var j = 0; j < termKeys.length; j++) {
          var key = termKeys[j]
          if (desc.indexOf(key) !== -1) {
            found = termMap[key]
            break
          }
        }
        if (found) {
          t.group = found.group
          t.category = found.category
          t.type = found.type
          t.confidence = 'high'
          matchedCount++
        } else {
          unmatchedForAI.push({ ref: t, description: t.description, amount: t.amount })
        }
      })

      if (unmatchedForAI.length > 0 && coaList.length > 0) {
        var batchSize = 50
        for (var bStart = 0; bStart < unmatchedForAI.length; bStart += batchSize) {
          var batch = unmatchedForAI.slice(bStart, bStart + batchSize)
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
            var aiReply = $ai.chat({
              model: 'fast',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a financial categorization assistant. Given the chart of accounts and transactions, assign group, category, and type. Respond ONLY with a JSON array. Each element: {"index": N (1-based within this batch), "group": "", "category": "", "type": "income|expense"}.',
                },
                {
                  role: 'user',
                  content: 'Chart of Accounts:\n' + coaText + '\n\nTransactions:\n' + txText,
                },
              ],
            })
            var aiContent = aiReply.choices[0].message.content
            var aiJsonMatch = aiContent.match(/\[[\s\S]*\]/)
            if (aiJsonMatch) {
              var aiResults = JSON.parse(aiJsonMatch[0])
              aiResults.forEach(function (r) {
                var idx = (typeof r.index === 'number' ? r.index : parseInt(r.index, 10)) - 1
                if (batch[idx]) {
                  batch[idx].ref.group = r.group || 'Outros'
                  batch[idx].ref.category = r.category || 'Não Classificado'
                  batch[idx].ref.type = r.type || batch[idx].ref.type
                  batch[idx].ref.confidence = 'medium'
                }
              })
            }
          } catch (err) {
            $app
              .logger()
              .error(
                'AI categorization failed for PDF batch starting at ' + bStart,
                'error',
                err.message || '',
              )
          }
        }
      }

      transactions.forEach(function (t) {
        if (!t.group) t.group = 'Outros'
        if (!t.category) t.category = 'Não Classificado'
      })

      importRecord.set('status', 'completed')
      importRecord.set('transactions_json', JSON.stringify(transactions))
      $app.save(importRecord)

      return e.json(200, {
        transactions: transactions,
        import_id: importRecord.id,
        matched_count: matchedCount,
        unmatched_count: transactions.length - matchedCount,
      })
    } catch (err) {
      importRecord.set('status', 'error')
      importRecord.set('error_message', err.message || 'Erro ao processar PDF')
      $app.saveNoValidate(importRecord)
      return e.json(500, { error: err.message || 'Erro ao processar PDF' })
    }
  },
  $apis.requireAuth(),
  $apis.bodyLimit(15728640),
)
