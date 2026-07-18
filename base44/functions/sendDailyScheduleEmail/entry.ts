import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar se é um request válido (pode ser um cron job)
    console.log('Starting daily schedule email job...');

    // Verificar dia da semana (0 = domingo, 6 = sábado)
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Só envia de segunda a sexta (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping email send');
      return Response.json({ 
        success: true, 
        message: 'Weekend - email not sent' 
      });
    }

    // Buscar todos os agendamentos
    const schedulings = await base44.asServiceRole.entities.Scheduling.list('-date');

    // Buscar todos os usuários
    const users = await base44.asServiceRole.entities.User.list();

    // Buscar configurações de email
    const emailConfigs = await base44.asServiceRole.entities.AppConfig.filter({ 
      config_type: 'email_group' 
    });

    // Data de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Filtrar agendamentos de amanhã (excluir cancelados)
    const tomorrowSchedulings = schedulings.filter(s => s.date === tomorrowStr && s.status !== 'cancelado');

    if (tomorrowSchedulings.length === 0) {
      console.log('No schedulings for tomorrow');
      return Response.json({ 
        success: true, 
        message: 'No schedulings for tomorrow' 
      });
    }

    // Agrupar por linha
    const groupByLine = () => {
      const grouped = {};
      
      tomorrowSchedulings.forEach(schedule => {
        const key = `${schedule.warehouse}-${schedule.line}`;
        if (!grouped[key]) {
          grouped[key] = {
            warehouse: schedule.warehouse,
            line: schedule.line,
            schedules: []
          };
        }
        grouped[key].schedules.push(schedule);
      });

      Object.values(grouped).forEach(group => {
        group.schedules.sort((a, b) => a.start_time.localeCompare(b.start_time));
      });

      return Object.values(grouped).sort((a, b) => {
        if (a.warehouse !== b.warehouse) {
          return a.warehouse.localeCompare(b.warehouse);
        }
        return a.line.localeCompare(b.line);
      });
    };

    const groupedSchedulings = groupByLine();

    // Gerar HTML do email (simplificado e inline)
    const emailHTML = generateEmailHTML(tomorrowSchedulings, groupedSchedulings, false);

    // Coletar destinatários
    const recipients = new Set();

    // Lista de emails a serem excluídos
    const excludedEmails = [
      'eduardo.andrade@ofi.com',
      'vitor.trinca@ofi.com',
      'gagandeep.rehal@ofi.com'
    ];
    
    // Sempre incluir jose.j.santos@ofi.com
    recipients.add('jose.j.santos@ofi.com');

    // Adicionar supervisores e compradores
    users.forEach(user => {
      if ((user.profile === 'supervisor' || user.profile === 'comprador') && user.email) {
        if (!excludedEmails.includes(user.email.toLowerCase())) {
          recipients.add(user.email);
        }
      }
    });

    // Adicionar emails da configuração
    if (emailConfigs.length > 0) {
      const config = emailConfigs[0];
      if (config.settings?.external_emails) {
        const externalEmails = config.settings.external_emails
          .split(/[,;\n]/)
          .map(e => e.trim())
          .filter(e => e && e.includes('@'));
        externalEmails.forEach(email => {
          if (!excludedEmails.includes(email.toLowerCase())) {
            recipients.add(email);
          }
        });
      }
      if (config.settings?.profiles) {
        users.forEach(user => {
          if (config.settings.profiles.includes(user.profile) && user.email) {
            if (!excludedEmails.includes(user.email.toLowerCase())) {
              recipients.add(user.email);
            }
          }
        });
      }
    }

    // Enviar emails
    const recipientArray = Array.from(recipients);
    let sentCount = 0;

    for (const email of recipientArray) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Programação de Descargas - ${tomorrow.toLocaleDateString('pt-BR')}`,
          body: emailHTML
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${email}:`, error);
      }
    }

    console.log(`Sent ${sentCount} emails out of ${recipientArray.length} recipients`);

    return Response.json({
      success: true,
      sent: sentCount,
      total: recipientArray.length,
      schedulings: tomorrowSchedulings.length
    });

  } catch (error) {
    console.error('Error in sendDailyScheduleEmail:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function generateEmailHTML(schedulings, groupedSchedulings, isUpdate) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedDate = tomorrow.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Main Container -->
        <table role="presentation" width="700" cellspacing="0" cellpadding="0" border="0" style="max-width: 700px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #860063; padding: 30px 20px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="width: 100px; height: 100px; background: #ffffff; border-radius: 16px; display: inline-block; margin-bottom: 16px; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
                      <table role="presentation" width="100" height="100" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle">
                            <span style="font-size: 40px; font-weight: 900; color: #860063; letter-spacing: -2px;">OFI</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff;">
                      Agendamento de Descargas
                    </h1>
                    <p style="margin: 10px 0 0; font-size: 16px; color: #ffffff; opacity: 0.95;">
                      ${formattedDate}
                    </p>
                    ${isUpdate ? `
                    <div style="display: inline-block; background-color: #F88D2A; color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-top: 12px;">
                      🔄 Atualização de Programação
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              
              <!-- Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #860063; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <h2 style="margin: 0 0 6px; font-size: 24px; font-weight: 800; color: #ffffff;">
                      ${schedulings.length} ${schedulings.length === 1 ? 'Agendamento' : 'Agendamentos'}
                    </h2>
                    <p style="margin: 0; font-size: 14px; color: #F88D2A; font-weight: 600;">
                      ${groupedSchedulings.length} ${groupedSchedulings.length === 1 ? 'linha ativa' : 'linhas ativas'}
                    </p>
                  </td>
                </tr>
              </table>

              ${groupedSchedulings.length === 0 ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 60px 30px; text-align: center; color: #6b7280; font-size: 16px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📅</div>
                    <p style="margin: 0; font-weight: 600;">Nenhum agendamento para esta data.</p>
                  </td>
                </tr>
              </table>
              ` : groupedSchedulings.map(group => `
              
              <!-- Line Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px; border-radius: 10px; overflow: hidden; border: 2px solid #860063;">
                
                <!-- Line Header -->
                <tr>
                  <td style="background-color: #860063; padding: 12px 16px; color: #ffffff; font-size: 15px; font-weight: 700;">
                    <span style="font-size: 16px; margin-right: 8px;">📍</span>
                    ${group.warehouse === 'central' ? 'Armazém Central' : group.warehouse === 'fabrica' ? 'Armazém Fábrica' : group.warehouse === 'ferraz' ? 'Armazém Ferraz' : 'Armazém Barra'} - Linha ${group.line}
                  </td>
                </tr>

                <!-- Table -->
                <tr>
                  <td style="padding: 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      
                      <!-- Table Header -->
                      <tr style="background-color: #F88D2A;">
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Horário</th>
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Fornecedor</th>
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Quantidade</th>
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Rastreio</th>
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Certificação</th>
                        <th style="padding: 10px 12px; text-align: left; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;">Frete</th>
                      </tr>

                      <!-- Table Rows -->
                      ${group.schedules.map((schedule, idx) => `
                      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#fdf4ff'}; border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 12px; font-size: 13px; color: #860063; font-weight: 700;">${schedule.start_time}</td>
                        <td style="padding: 12px; font-size: 13px; color: #111827; font-weight: 600;">${schedule.supplier}</td>
                        <td style="padding: 12px; font-size: 13px; color: #4b5563;">${schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</td>
                        <td style="padding: 12px; font-size: 12px; color: #4b5563;">${schedule.tracking_code || '-'}</td>
                        <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #F88D2A;">${schedule.eudr_cvn || 'EUDR'}</td>
                        <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #F88D2A;">${schedule.apanha_status || 'NA'}</td>
                      </tr>
                      `).join('')}
                      
                    </table>
                  </td>
                </tr>
              </table>
              
              `).join('')}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 3px solid #860063;">
              <p style="margin: 0 0 6px; font-weight: 700; color: #111827; font-size: 14px;">
                🚛 Sistema de Agendamento de Veículos OFI
              </p>
              <p style="margin: 0 0 12px; font-weight: 700; font-size: 14px; color: ${isUpdate ? '#F88D2A' : '#860063'};">
                ${isUpdate ? '⏰ Atualização enviada às 18h' : '📅 Programação enviada às 16h'}
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Este é um email automático. Por favor, não responda.
              </p>
              <p style="margin: 8px 0 0; font-size: 10px; color: #d1d5db;">
                Para cancelar o recebimento destes emails, entre em contato com o administrador do sistema.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}