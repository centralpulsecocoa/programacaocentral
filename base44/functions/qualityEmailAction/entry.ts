import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Usar service role diretamente (endpoint público via link de email)
    const base44 = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    });
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const recordId = url.searchParams.get('recordId');
    const token = url.searchParams.get('token');
    const confirmed = url.searchParams.get('confirmed');

    // Validação básica do token
    if (!token || !recordId || !action) {
      return new Response(generateHtmlResponse('error', 'Parâmetros inválidos'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Verificar token simples
    const expectedToken = btoa(recordId + ':' + action);
    if (token !== expectedToken) {
      return new Response(generateHtmlResponse('error', 'Token inválido'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Determinar labels para confirmação
    let actionLabel = '';
    let actionColor = '';
    let actionDescription = '';

    switch (action) {
      case 'approve':
        actionLabel = 'APROVAR CARGA';
        actionColor = '#28a745';
        actionDescription = 'Você está prestes a APROVAR o recebimento desta carga.';
        break;
      case 'reject':
        actionLabel = 'DEVOLVER CARGA';
        actionColor = '#dc3545';
        actionDescription = 'Você está prestes a DEVOLVER esta carga.';
        break;
      case 'quality_favoravel':
        actionLabel = 'PARECER FAVORÁVEL';
        actionColor = '#28a745';
        actionDescription = 'Você está prestes a registrar um PARECER FAVORÁVEL.';
        break;
      case 'quality_desfavoravel':
        actionLabel = 'PARECER DESFAVORÁVEL';
        actionColor = '#dc3545';
        actionDescription = 'Você está prestes a registrar um PARECER DESFAVORÁVEL.';
        break;
      default:
        return new Response(generateHtmlResponse('error', 'Ação inválida'), {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }

    // Se não confirmado, mostrar página de confirmação (aguarda clique do usuário)
    if (confirmed !== 'yes') {
      const confirmUrl = `${url.origin}${url.pathname}?action=${action}&recordId=${recordId}&token=${encodeURIComponent(token)}&confirmed=yes`;
      return new Response(generateConfirmationPage(action, actionLabel, actionColor, actionDescription, confirmUrl), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Usuário confirmou - executar ação
    const now = new Date().toISOString();
    let updateData = {};

    switch (action) {
      case 'approve':
        updateData = {
          moisture_approval_status: 'aprovado',
          moisture_approved_by: 'jose.j.santos@ofi.com (via email)',
          moisture_approval_date: now
        };
        actionLabel = 'APROVADA';
        break;
      case 'reject':
        updateData = {
          moisture_approval_status: 'devolvido',
          moisture_approved_by: 'jose.j.santos@ofi.com (via email)',
          moisture_approval_date: now
        };
        actionLabel = 'DEVOLVIDA';
        break;
      case 'quality_favoravel':
        updateData = {
          quality_opinion: 'favoravel',
          quality_opinion_by: 'jose.j.santos@ofi.com (via email)',
          quality_opinion_date: now
        };
        actionLabel = 'PARECER FAVORÁVEL REGISTRADO';
        break;
      case 'quality_desfavoravel':
        updateData = {
          quality_opinion: 'desfavoravel',
          quality_opinion_by: 'jose.j.santos@ofi.com (via email)',
          quality_opinion_date: now
        };
        actionLabel = 'PARECER DESFAVORÁVEL REGISTRADO';
        break;
    }

    // Atualizar registro
    await base44.entities.Quality.update(recordId, updateData);

    // Retornar página de sucesso
    return new Response(generateHtmlResponse('success', actionLabel, actionColor), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Erro ao processar ação:', error);
    return new Response(generateHtmlResponse('error', 'Erro ao processar: ' + error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function generateConfirmationPage(action, actionLabel, actionColor, actionDescription, confirmUrl) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OFI - Confirmação Necessária</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          padding: 40px;
          text-align: center;
          max-width: 500px;
          margin: 20px;
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 40px;
          background: #ffc107;
          color: white;
        }
        h1 {
          color: #333;
          margin-bottom: 15px;
          font-size: 24px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .action-badge {
          display: inline-block;
          background: ${actionColor};
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: bold;
          margin: 15px 0;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
          font-size: 14px;
        }
        .confirm-btn {
          display: inline-block;
          background: ${actionColor};
          color: white;
          padding: 15px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 18px;
          margin-top: 20px;
          transition: opacity 0.2s;
        }
        .confirm-btn:hover {
          opacity: 0.9;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #999;
          font-size: 12px;
        }
        .logo {
          background: linear-gradient(135deg, #860063, #F88D2A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: bold;
          font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Confirmação Necessária</h1>
        <p>${actionDescription}</p>
        <div class="action-badge">${actionLabel}</div>
        
        <div class="warning">
          ⚠️ <strong>Atenção:</strong> Esta ação será registrada no sistema e não poderá ser desfeita automaticamente.
        </div>
        
        <a href="${confirmUrl}" class="confirm-btn">
          ✓ CONFIRMAR ${actionLabel}
        </a>
        
        <p style="margin-top: 20px; font-size: 14px; color: #999;">
          Se não deseja prosseguir, feche esta janela.
        </p>
        
        <div class="footer">
          <span class="logo">OFI</span>
          <p>Sistema de Agendamento de Veículos</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateHtmlResponse(type, message, color = '#860063') {
  const isSuccess = type === 'success';
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OFI - ${isSuccess ? 'Ação Registrada' : 'Erro'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          padding: 40px;
          text-align: center;
          max-width: 500px;
          margin: 20px;
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 40px;
          background: ${isSuccess ? color : '#dc3545'};
        }
        h1 {
          color: ${isSuccess ? color : '#dc3545'};
          margin-bottom: 15px;
          font-size: 24px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
        }
        .badge {
          display: inline-block;
          background: ${isSuccess ? color : '#dc3545'};
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 20px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #999;
          font-size: 12px;
        }
        .logo {
          background: linear-gradient(135deg, #860063, #F88D2A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: bold;
          font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          ${isSuccess ? '✓' : '✗'}
        </div>
        <h1>${isSuccess ? 'Ação Registrada!' : 'Erro'}</h1>
        <p>${isSuccess 
          ? 'Sua decisão foi registrada com sucesso no sistema.' 
          : message}</p>
        <div class="badge">${message}</div>
        <div class="footer">
          <span class="logo">OFI</span>
          <p>Sistema de Agendamento de Veículos</p>
          <p style="margin-top: 10px;">Você pode fechar esta janela.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}