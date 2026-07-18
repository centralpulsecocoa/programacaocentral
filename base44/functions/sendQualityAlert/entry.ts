import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { recordId, sample, moisture, fumaca, mould, supplier, warehouse, line, quantity } = await req.json();

    // Verificar se o email já foi enviado para esta carga
    const qualityRecord = await base44.asServiceRole.entities.Quality.filter({ id: recordId });
    if (qualityRecord.length > 0 && qualityRecord[0].alert_email_sent) {
      console.log(`Email já enviado para a carga ${sample} - pulando`);
      return Response.json({ 
        success: true, 
        message: 'Email já foi enviado anteriormente para esta carga' 
      });
    }

    // Determinar quais alertas estão ativos
    const alerts = [];
    if (moisture > 12.1) alerts.push(`Umidade: ${moisture}% (> 12.1%)`);
    if (parseFloat(fumaca) > 6.0) alerts.push(`Fumaça: ${fumaca}% (> 6.0%)`);
    if (mould > 25) alerts.push(`Mofo: ${mould}% (> 25%)`);

    const isHighMould = mould > 25;
    const alertsHtml = alerts.map(a => `<li style="color: #c53030; font-weight: bold;">${a}</li>`).join('');

    // URLs para ação via email - endpoint público (não requer autenticação)
    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://app.base44.com/api/functions/${appId}`;
    const approveUrl = `${baseUrl}/qualityEmailAction?action=approve&recordId=${recordId}&token=${encodeURIComponent(btoa(recordId + ':approve'))}`;
    const rejectUrl = `${baseUrl}/qualityEmailAction?action=reject&recordId=${recordId}&token=${encodeURIComponent(btoa(recordId + ':reject'))}`;
    const qualityFavorUrl = `${baseUrl}/qualityEmailAction?action=quality_favoravel&recordId=${recordId}&token=${encodeURIComponent(btoa(recordId + ':quality_favoravel'))}`;
    const qualityDesfavorUrl = `${baseUrl}/qualityEmailAction?action=quality_desfavoravel&recordId=${recordId}&token=${encodeURIComponent(btoa(recordId + ':quality_desfavoravel'))}`;

    // Email para Qualidade (parecer informativo)
    const qualityEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #860063, #F88D2A); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ Alerta de Qualidade</h1>
        </div>
        
        <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">Carga com Desvio de Qualidade</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Sample/Carga:</strong> ${sample}</p>
            <p><strong>Fornecedor:</strong> ${supplier || 'N/A'}</p>
            <p><strong>Local:</strong> ${warehouse || 'N/A'} - Linha ${line || 'N/A'}</p>
            <p><strong>Quantidade:</strong> ${quantity ? quantity.toLocaleString('pt-BR') : 'N/A'} sacos</p>
          </div>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border: 1px solid #f5c6cb;">
            <h3 style="color: #721c24; margin-top: 0;">🚨 Alertas Detectados:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${alertsHtml}
            </ul>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #666; font-size: 14px;">Seu parecer é informativo. A decisão final será do Gerente de Originação.</p>
            
            <div style="margin-top: 15px;">
              <a href="${qualityFavorUrl}" style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                ✓ Parecer FAVORÁVEL
              </a>
              <a href="${qualityDesfavorUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
                ✗ Parecer DESFAVORÁVEL
              </a>
            </div>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>OFI - Sistema de Agendamento de Veículos</p>
        </div>
      </div>
    `;

    // Email para Gerente Originação (decisão final)
    const originacaoEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #860063, #F88D2A); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ Alerta de Qualidade - DECISÃO NECESSÁRIA</h1>
        </div>
        
        <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">Carga Aguardando Sua Aprovação</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Sample/Carga:</strong> ${sample}</p>
            <p><strong>Fornecedor:</strong> ${supplier || 'N/A'}</p>
            <p><strong>Local:</strong> ${warehouse || 'N/A'} - Linha ${line || 'N/A'}</p>
            <p><strong>Quantidade:</strong> ${quantity ? quantity.toLocaleString('pt-BR') : 'N/A'} sacos</p>
          </div>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border: 1px solid #f5c6cb;">
            <h3 style="color: #721c24; margin-top: 0;">🚨 Alertas Detectados:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${alertsHtml}
            </ul>
          </div>
          
          ${isHighMould ? `
            <div style="background: #721c24; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
              <p style="margin: 0; font-weight: bold; font-size: 16px;">⚠️ LEGISLAÇÃO IMPEDE O RECEBIMENTO</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Mofo acima de 25% - Carga deve ser devolvida</p>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${rejectUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                ✗ DEVOLVER CARGA
              </a>
            </div>
          ` : `
            <div style="margin-top: 20px; text-align: center;">
              <p style="color: #860063; font-weight: bold; font-size: 14px;">DECISÃO FINAL - Gerente Originação:</p>
              
              <div style="margin-top: 15px;">
                <a href="${approveUrl}" style="display: inline-block; background: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold; font-size: 16px;">
                  ✓ APROVAR RECEBIMENTO
                </a>
                <a href="${rejectUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold; font-size: 16px;">
                  ✗ DEVOLVER CARGA
                </a>
              </div>
            </div>
          `}
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>OFI - Sistema de Agendamento de Veículos</p>
        </div>
      </div>
    `;

    // Destinatários separados
    const qualidadeEmail = 'jose.j.santos@ofi.com';
    const originacaoEmail = 'jose.j.santos@ofi.com';

    // Destinatários da equipe de Qualidade
    const qualidadeTeam = [
      'graziella.rocha@ofi.com',
      'vanessa.silva2@ofi.com',
      'raissa.santos@ofi.com',
      'emilly.t.marques@ofi.com'
    ];

    // Enviar email para cada membro da equipe de Qualidade (parecer)
    for (const email of qualidadeTeam) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `⚠️ [QUALIDADE] Alerta de Desvio - Carga ${sample}`,
        body: qualityEmailHtml
      });
    }

    // Enviar 1 email para Gerente Originação (decisão)
    if (true) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: originacaoEmail,
        subject: `🚨 [DECISÃO] Alerta de Qualidade - Carga ${sample}`,
        body: originacaoEmailHtml
      });
    }

    // Marcar que o email foi enviado para esta carga
    await base44.asServiceRole.entities.Quality.update(recordId, {
      alert_email_sent: true
    });

    return Response.json({ 
      success: true, 
      message: 'Emails de alerta enviados com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});