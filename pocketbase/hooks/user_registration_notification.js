onRecordAfterCreateSuccess((e) => {
  var email = e.record.getEmail()
  if (!email) return e.next()

  try {
    var siteUrl = $secrets.get('SITE_URL') || 'https://fluxozanutims.goskip.app'
    var htmlBody =
      '<h1>Bem-vindo ao OHANA!</h1>' +
      '<p>Seu cadastro foi realizado com sucesso no sistema OHAMA Fluxo Residencial.</p>' +
      '<p><strong>Senha padrão:</strong> Skip@Pass</p>' +
      '<p>Recomendamos que você faça login e altere sua senha imediatamente.</p>' +
      '<p>Acesse o sistema: <a href="' +
      siteUrl +
      '">' +
      siteUrl +
      '</a></p>' +
      '<p>Após o login, vá em <strong>Configurações &gt; Segurança</strong> para alterar sua senha.</p>'
    var textBody =
      'Bem-vindo ao OHANA!\n\n' +
      'Seu cadastro foi realizado com sucesso.\n\n' +
      'Senha padrao: Skip@Pass\n\n' +
      'Acesse o sistema: ' +
      siteUrl +
      '\n\n' +
      'Apos o login, va em Configuracoes > Seguranca para alterar sua senha.'

    var message = new MailMessage({
      from: { address: 'noreply@ohana.com', name: 'OHANA Sistema' },
      to: [{ address: email }],
      subject: 'Bem-vindo ao OHANA - Suas credenciais de acesso',
      html: htmlBody,
      text: textBody,
    })
    $app.mailClient().send(message)
  } catch (err) {
    $app.logger().error('Failed to send registration email to ' + email, 'error', err.message || '')
  }

  return e.next()
}, 'users')
