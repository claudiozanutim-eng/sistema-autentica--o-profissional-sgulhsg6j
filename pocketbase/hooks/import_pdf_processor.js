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
    if (!uploadedFiles || uploadedFiles.length === 0)
      return e.badRequestError('No PDF file uploaded')

    var uploaded = uploadedFiles[0]
    var fileBytes = uploaded.bytes
    var fileName = uploaded.name || 'upload.pdf'
    if (fileBytes.length > 10485760) return e.badRequestError('File too large (max 10MB)')

    var body = e.requestInfo().body || {}
    var bankSource = body.bank_source || ''
    var accountId = body.account_id || ''
    var creditCardId = body.credit_card_id || ''

    var importId = body.import_id || ''
    if (importId) {
      try {
        var existingImport = $app.findRecordById('imports', importId)
        existingImport.set('file', $filesystem.fileFromBytes(fileBytes, fileName))
        existingImport.set('file_type', 'pdf')
        existingImport.set('bank_source', bankSource)
        existingImport.set('status', 'processing')
        $app.save(existingImport)
      } catch (_) {
        return e.badRequestError('Invalid import_id')
      }
    } else {
      var importsCol = $app.findCollectionByNameOrId('imports')
      var importRecord = new Record(importsCol)
      importRecord.set('file', $filesystem.fileFromBytes(fileBytes, fileName))
      importRecord.set('file_type', 'pdf')
      importRecord.set('bank_source', bankSource)
      importRecord.set('status', 'processing')
      $app.save(importRecord)
      importId = importRecord.id
    }

    function inflateRaw(data) {
      var rf = new Inflate()
      rf.reset(data)
      var out = rf.run()
      return out
    }

    function Inflate() {
      this.data = null
      this.pos = 0
      this.bitPos = 0
      this.bitBuf = 0
      this.out = []
      this.finalBlock = false
    }

    Inflate.prototype.reset = function (data) {
      this.data = data
      this.pos = 0
      this.bitPos = 0
      this.bitBuf = 0
      this.out = []
      this.finalBlock = false
    }

    Inflate.prototype.readBits = function (n) {
      while (this.bitPos < n) {
        if (this.pos >= this.data.length) throw new Error('unexpected end of data')
        this.bitBuf |= this.data[this.pos++] << this.bitPos
        this.bitPos += 8
      }
      var val = this.bitBuf & ((1 << n) - 1)
      this.bitBuf >>= n
      this.bitPos -= n
      return val
    }

    Inflate.prototype.run = function () {
      while (!this.finalBlock) {
        var bfinal = this.readBits(1)
        var btype = this.readBits(2)
        this.finalBlock = bfinal === 1
        if (btype === 0) {
          this.bitBuf = 0
          this.bitPos = 0
          var len = (this.data[this.pos + 1] << 8) | this.data[this.pos]
          this.pos += 4
          for (var i = 0; i < len; i++) {
            if (this.pos >= this.data.length) throw new Error('unexpected end')
            this.out.push(this.data[this.pos++])
          }
        } else if (btype === 2) {
          this.decodeDynamic()
        } else if (btype === 1) {
          this.decodeFixed()
        } else {
          throw new Error('invalid block type')
        }
      }
      return new Uint8Array(this.out)
    }

    Inflate.prototype.makeHuffman = function (lens) {
      var maxBits = 0
      for (var i = 0; i < lens.length; i++) {
        if (lens[i] > maxBits) maxBits = lens[i]
      }
      var blCount = new Array(maxBits + 1).fill(0)
      for (var i = 0; i < lens.length; i++) {
        if (lens[i] > 0) blCount[lens[i]]++
      }
      var nextCode = new Array(maxBits + 1).fill(0)
      var code = 0
      for (var b = 1; b <= maxBits; b++) {
        code = (code + blCount[b - 1]) << 1
        nextCode[b] = code
      }
      var codes = {}
      for (var i = 0; i < lens.length; i++) {
        if (lens[i] > 0) {
          codes[i] = { len: lens[i], code: nextCode[lens[i]]++ }
        }
      }
      return { codes: codes, maxBits: maxBits }
    }

    Inflate.prototype.decodeSymbol = function (huff) {
      var code = 0
      var first = 0
      var index = 0
      for (var len = 1; len <= huff.maxBits; len++) {
        code |= this.readBits(1)
        var count = 0
        for (var sym in huff.codes) {
          if (huff.codes[sym].len === len && huff.codes[sym].code === code) {
            return parseInt(sym, 10)
          }
          count++
        }
        code <<= 1
      }
      throw new Error('invalid huffman code')
    }

    Inflate.prototype.decodeFixed = function () {
      var litLens = new Array(288)
      for (var i = 0; i <= 143; i++) litLens[i] = 8
      for (var i = 144; i <= 255; i++) litLens[i] = 9
      for (var i = 256; i <= 279; i++) litLens[i] = 7
      for (var i = 280; i <= 287; i++) litLens[i] = 8
      var distLens = new Array(30).fill(5)
      var litHuff = this.makeHuffman(litLens)
      var distHuff = this.makeHuffman(distLens)
      this.decodeBlock(litHuff, distHuff)
    }

    Inflate.prototype.decodeDynamic = function () {
      var hlit = this.readBits(5) + 257
      var hdist = this.readBits(5) + 1
      var hclen = this.readBits(4) + 4
      var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
      var clLens = new Array(19).fill(0)
      for (var i = 0; i < hclen; i++) clLens[order[i]] = this.readBits(3)
      var clHuff = this.makeHuffman(clLens)
      var lens = []
      while (lens.length < hlit + hdist) {
        var sym = this.decodeSymbol(clHuff)
        if (sym < 16) {
          lens.push(sym)
        } else if (sym === 16) {
          var rep = this.readBits(2) + 3
          var prev = lens[lens.length - 1]
          for (var r = 0; r < rep; r++) lens.push(prev)
        } else if (sym === 17) {
          var rep = this.readBits(3) + 3
          for (var r = 0; r < rep; r++) lens.push(0)
        } else if (sym === 18) {
          var rep = this.readBits(7) + 11
          for (var r = 0; r < rep; r++) lens.push(0)
        }
      }
      var litLens = lens.slice(0, hlit)
      var distLens = lens.slice(hlit, hlit + hdist)
      var litHuff = this.makeHuffman(litLens)
      var distHuff = this.makeHuffman(distLens)
      this.decodeBlock(litHuff, distHuff)
    }

    Inflate.prototype.decodeBlock = function (litHuff, distHuff) {
      var lengthBase = [
        3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115,
        131, 163, 195, 227, 258,
      ]
      var lengthExtra = [
        0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
      ]
      var distBase = [
        1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537,
        2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
      ]
      var distExtra = [
        0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12,
        13, 13,
      ]
      while (true) {
        var sym = this.decodeSymbol(litHuff)
        if (sym < 256) {
          this.out.push(sym)
        } else if (sym === 256) {
          break
        } else {
          sym -= 257
          var length = lengthBase[sym] + this.readBits(lengthExtra[sym])
          var dsym = this.decodeSymbol(distHuff)
          var dist = distBase[dsym] + this.readBits(distExtra[dsym])
          var start = this.out.length - dist
          for (var k = 0; k < length; k++) {
            this.out.push(this.out[start + k])
          }
        }
      }
    }

    function updateImport(status, errorMsg) {
      try {
        var r = $app.findRecordById('imports', importId)
        r.set('status', status)
        if (errorMsg) r.set('error_message', errorMsg)
        $app.save(r)
      } catch (_) {}
    }

    function updateImportProgress(stage, extra) {
      try {
        var r = $app.findRecordById('imports', importId)
        var info = { stage: stage, timestamp: new Date().toISOString() }
        if (extra) {
          var keys = Object.keys(extra)
          for (var k = 0; k < keys.length; k++) info[keys[k]] = extra[keys[k]]
        }
        r.set('transactions_json', JSON.stringify(info))
        $app.save(r)
      } catch (_) {}
    }

    function unescapePdf(s) {
      return s
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\\(\d{1,3})/g, function (_, o) {
          return String.fromCharCode(parseInt(o, 8))
        })
    }

    function extractTextPatterns(raw) {
      var text = '',
        match
      var tjRe = /\(([^)]{1,300})\)\s*Tj/g
      while ((match = tjRe.exec(raw)) !== null) {
        if (/[a-zA-Z0-9\u00C0-\u017F\s\/\-\.,]/.test(match[1]) && match[1].trim().length > 1)
          text += unescapePdf(match[1]) + '\n'
      }
      var tjArrRe = /\[([^\]]{1,1000})\]\s*TJ/g
      while ((match = tjArrRe.exec(raw)) !== null) {
        var parts = match[1].match(/\(([^)]{1,300})\)/g)
        if (parts) {
          var line = ''
          for (var pi = 0; pi < parts.length; pi++) {
            var c = parts[pi].slice(1, -1)
            if (/[a-zA-Z0-9\u00C0-\u017F\s\/\-\.,]/.test(c)) line += unescapePdf(c) + ' '
          }
          if (line.trim().length > 1) text += line + '\n'
        }
      }
      var hexRe = /<([0-9A-Fa-f]{4,400})>\s*Tj/g
      while ((match = hexRe.exec(raw)) !== null) {
        var d = ''
        for (var hi = 0; hi + 1 < match[1].length; hi += 2) {
          var code = parseInt(match[1].substr(hi, 2), 16)
          if (code >= 32 && code <= 126) d += String.fromCharCode(code)
        }
        if (d.trim().length > 1) text += d + '\n'
      }
      return text
    }

    function extractPdfText(bytes) {
      var raw = ''
      for (var i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i])
      var text = extractTextPatterns(raw)
      var streamRe = /stream\r?\n([\s\S]*?)endstream/g
      var match
      while ((match = streamRe.exec(raw)) !== null) {
        var before = raw.substring(Math.max(0, match.index - 300), match.index)
        if (before.indexOf('FlateDecode') !== -1) {
          try {
            var compressed = new Uint8Array(match[1].length)
            for (var j = 0; j < match[1].length; j++) compressed[j] = match[1].charCodeAt(j) & 0xff
            var decompressed = inflateRaw(compressed)
            var decoded = ''
            for (var k = 0; k < decompressed.length; k++)
              decoded += String.fromCharCode(decompressed[k])
            text += extractTextPatterns(decoded)
          } catch (_) {}
        }
      }
      return text.trim()
    }

    try {
      var pdfText = extractPdfText(fileBytes)

      if (pdfText.length < 50) {
        updateImport('error', 'Could not extract text from PDF')
        return e.json(200, {
          status: 'error',
          error:
            'Não foi possível extrair texto do PDF. O arquivo pode estar protegido ou digitalizado (imagem). Tente exportar como CSV.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
          created_count: 0,
          duplicates_skipped: 0,
        })
      }

      updateImportProgress('text_extracted', { chars: pdfText.length })

      var aiResult = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial document parser specialized in Brazilian bank statements. Extract all transactions. Return a JSON array of objects: description, amount (number, positive=income, negative=expense), type (income|expense), date (YYYY-MM-DD), category. Respond ONLY with valid JSON, no markdown.',
          },
          { role: 'user', content: 'Extract transactions:\n\n' + pdfText.slice(0, 50000) },
        ],
      })

      var content = aiResult.choices[0].message.content
      var transactions = []
      try {
        var cleaned = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        var jm = cleaned.match(/\[[\s\S]*\]/)
        transactions = JSON.parse(jm ? jm[0] : cleaned)
      } catch (_) {
        updateImport('error', 'Failed to parse AI response')
        return e.json(200, {
          status: 'error',
          error: 'Falha ao processar resposta da IA.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
          created_count: 0,
          duplicates_skipped: 0,
        })
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        updateImport('error', 'No transactions found in PDF')
        return e.json(200, {
          status: 'error',
          error: 'Nenhuma transação encontrada no PDF.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
          created_count: 0,
          duplicates_skipped: 0,
        })
      }

      updateImportProgress('ai_parsed', { count: transactions.length })

      var coaRecords = $app.findRecordsByFilter(
        'chart_of_accounts',
        'active = true',
        'code',
        200,
        0,
      )
      var termMap = {},
        coaList = [],
        existingCombos = {}
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
        terms.forEach(function (t) {
          termMap[t] = entry
        })
      })
      var termKeys = Object.keys(termMap).sort(function (a, b) {
        return b.length - a.length
      })

      var matched = [],
        unmatched = []
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
          var st = (Number(tx.amount) || 0) >= 0 ? 'income' : 'expense'
          unmatched.push({
            index: idx,
            date: tx.date || new Date().toISOString().slice(0, 10),
            description: tx.description || '',
            amount: Number(tx.amount) || 0,
            group: 'Outros',
            category: 'Não Classificado',
            type: tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : st,
            confidence: 'low',
          })
        }
      })

      if (unmatched.length > 0 && coaList.length > 0) {
        var bs = 50
        for (var bs0 = 0; bs0 < unmatched.length; bs0 += bs) {
          var batch = unmatched.slice(bs0, bs0 + bs)
          var coaText = coaList
            .map(function (c) {
              return c.group + ' > ' + c.category + ' (' + c.type + ')'
            })
            .join('\n')
          var txText = batch
            .map(function (u, i) {
              return bs0 + i + 1 + '. ' + u.description + ' | ' + u.amount
            })
            .join('\n')
          try {
            var reply = $ai.chat({
              model: 'fast',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a financial categorization assistant. Assign group, category, and type. You may suggest NEW groups and categories. Respond ONLY with JSON array: [{"index": N, "group": "", "category": "", "type": "income|expense"}].',
                },
                {
                  role: 'user',
                  content: 'Chart of Accounts:\n' + coaText + '\n\nTransactions:\n' + txText,
                },
              ],
            })
            var cm = reply.choices[0].message.content.match(/\[[\s\S]*\]/)
            if (cm) {
              JSON.parse(cm[0]).forEach(function (r) {
                var idx = (typeof r.index === 'number' ? r.index : parseInt(r.index, 10)) - 1
                if (batch[idx]) {
                  batch[idx].group = r.group || 'Outros'
                  batch[idx].category = r.category || 'Não Classificado'
                  batch[idx].type = r.type || batch[idx].type
                  batch[idx].confidence = 'medium'
                }
              })
            }
          } catch (err) {
            $app.logger().error('AI categorization failed', 'error', err.message || '')
          }
        }
      }

      var all = matched.concat(unmatched).sort(function (a, b) {
        return a.index - b.index
      })

      updateImportProgress('categorized', { matched: matched.length, unmatched: unmatched.length })

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
        dupSet[
          t.getString('date') +
            '|' +
            String(t.getNumber('amount')) +
            '|' +
            t.getString('description').toLowerCase().trim()
        ] = true
      })
      var nonDupes = [],
        dupeCount = 0
      all.forEach(function (t) {
        var dk = t.date + '|' + String(t.amount) + '|' + (t.description || '').toLowerCase().trim()
        if (dupSet[dk]) {
          dupeCount++
        } else {
          nonDupes.push(t)
        }
      })

      var txCol = $app.findCollectionByNameOrId('transactions')
      var createdCount = 0,
        createErrors = []

      updateImportProgress('saving', { count: nonDupes.length })

      nonDupes.forEach(function (t, i) {
        t.index = i
        try {
          var rec = new Record(txCol)
          rec.set('description', t.description || '')
          rec.set('amount', t.amount || 0)
          rec.set('type', t.type || 'expense')
          rec.set('date', t.date || new Date().toISOString().slice(0, 10))
          rec.set('category', t.category || 'Não Classificado')
          rec.set('status', 'paid')
          rec.set('user_id', userId)
          rec.set('group', t.group || 'Outros')
          rec.set('origin', 'import')
          rec.set('created_by', userId)
          rec.set('source', 'PDF Import' + (bankSource ? ' - ' + bankSource : ''))
          var dp = (t.date || '').split('-')
          rec.set('year', parseInt(dp[0], 10) || new Date().getFullYear())
          rec.set('month_year', (dp[0] || '') + '-' + (dp[1] || '01'))
          if (accountId) rec.set('account_id', accountId)
          if (creditCardId) rec.set('credit_card_id', creditCardId)
          $app.save(rec)
          createdCount++
        } catch (err) {
          createErrors.push({ index: i, error: err.message || 'Failed' })
        }
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
        created_count: createdCount,
        duplicates_skipped: dupeCount,
        errors: createErrors,
      })
    } catch (err) {
      var errMsg = err.message || 'Processing failed'
      updateImport('error', errMsg)
      if (err instanceof SkipAiConfigError) {
        return e.json(503, {
          status: 'error',
          error: 'Serviço de IA não configurado. Contate o suporte técnico.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
          created_count: 0,
          duplicates_skipped: 0,
        })
      }
      if (err instanceof SkipAiError) {
        return e.json(503, {
          status: 'error',
          error: 'Serviço de IA temporariamente indisponível. Tente novamente em alguns instantes.',
          import_id: importId,
          transactions: [],
          matched_count: 0,
          unmatched_count: 0,
          auto_created_count: 0,
          created_count: 0,
          duplicates_skipped: 0,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
