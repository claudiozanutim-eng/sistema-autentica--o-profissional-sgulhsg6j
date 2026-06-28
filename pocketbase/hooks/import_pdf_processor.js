// @deps pako@2.1.0
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
      var pako = null
      try {
        pako = require('pako')
      } catch (_) {}
      var streamRegex = /stream\r?\n([\s\S]*?)endstream/g
      var match
      while ((match = streamRegex.exec(raw)) !== null) {
        var streamData = match[1]
        var decoded = streamData
        if (pako) {
          try {
            var compressed = new Uint8Array(streamData.length)
            for (var j = 0; j < streamData.length; j++)
              compressed[j] = streamData.charCodeAt(j) & 0xff
            var inflated = pako.inflate(compressed)
            decoded = ''
            for (var k = 0; k < inflated.length; k++) decoded += String.fromCharCode(inflated[k])
          } catch (_) {}
        }
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
      var coaLines = []
      coaRecords.forEach(function (r) {
        coaLines.push(
          r.getString('group') + ' > ' + r.getString('category') + ' (' + r.getString('type') + ')',
        )
      })
      var coaText = coaLines.join('\n')

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
              'You are a financial PDF parser for Brazilian bank statements. Extract ALL transactions. Return ONLY a JSON array. Each element: {"date":"YYYY-MM-DD","description":"","amount":0.00,"type":"income|expense","group":"","category":""}. Credits=income, Debits=expense. Amount always positive. If year missing use 2025. Categorize using the chart of accounts. ' +
              (bankHints[bankSource] || ''),
          },
          {
            role: 'user',
            content:
              'Chart of Accounts:\n' +
              coaText +
              '\n\nBank Statement Text:\n' +
              pdfText.substring(0, 30000),
          },
        ],
      })

      var content = reply.choices[0].message.content
      var jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('AI não retornou transações válidas')
      var transactions = JSON.parse(jsonMatch[0])

      transactions.forEach(function (t, i) {
        t.index = i
        t.confidence = 'medium'
        if (typeof t.amount === 'string') {
          t.amount = parseFloat(String(t.amount).replace(/[^\d.-]/g, '')) || 0
        }
        if (!t.group) t.group = 'Outros'
        if (!t.category) t.category = 'Não Classificado'
      })

      importRecord.set('status', 'completed')
      importRecord.set('transactions_json', JSON.stringify(transactions))
      $app.save(importRecord)

      return e.json(200, { transactions: transactions, import_id: importRecord.id })
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
