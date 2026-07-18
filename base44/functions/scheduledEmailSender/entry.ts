import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Obter hora atual em GMT-3 (Brasília)
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();

    console.log(`[${brasiliaTime.toISOString()}] Scheduled check - Current time: ${currentHour}:${String(currentMinute).padStart(2, '0')}`);

    // Verificar se é 16h (entre 16:00 e 16:59)
    if (currentHour !== 16) {
      console.log(`⏰ Not 4 PM yet (current: ${currentHour}h) - skipping`);
      return Response.json({ 
        success: true, 
        skipped: true,
        message: `Not 4 PM yet - current time: ${currentHour}:${String(currentMinute).padStart(2, '0')}`,
        currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`
      });
    }

    // Verificar dia da semana (0 = domingo, 6 = sábado)
    const dayOfWeek = brasiliaTime.getDay();
    
    // Só envia de segunda a sexta (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('📅 Weekend - skipping email send');
      return Response.json({ 
        success: true, 
        skipped: true,
        message: 'Weekend - email not sent' 
      });
    }

    console.log('✅ It is 4 PM on a weekday - sending emails...');

    // Buscar todos os agendamentos
    const schedulings = await base44.asServiceRole.entities.Scheduling.list('-date');

    // Buscar todos os usuários
    const users = await base44.asServiceRole.entities.User.list();

    // Buscar configurações de email
    const emailConfigs = await base44.asServiceRole.entities.AppConfig.filter({ 
      config_type: 'email_group' 
    });

    // Data de amanhã
    const tomorrow = new Date(brasiliaTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Filtrar agendamentos de amanhã (excluir cancelados)
    const tomorrowSchedulings = schedulings.filter(s => s.date === tomorrowStr && s.status !== 'cancelado');

    if (tomorrowSchedulings.length === 0) {
      console.log('📭 No schedulings for tomorrow');
      return Response.json({ 
        success: true, 
        skipped: true,
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

    // Gerar HTML do email
    const emailHTML = generateEmailHTML(tomorrowSchedulings, groupedSchedulings, tomorrow);

    // Coletar destinatários
    const recipients = new Set();

    // Lista de emails a serem excluídos
    const excludedEmails = [
      'eduardo.andrade@ofi.com',
      'vitor.trinca@ofi.com',
      'gagandeep.rehal@ofi.com'
    ];

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
          subject: `📅 Programação de Descargas - ${tomorrow.toLocaleDateString('pt-BR')}`,
          body: emailHTML,
          from_name: 'Central Pulse - OFI'
        });
        sentCount++;
        console.log(`✅ Email sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error);
      }
    }

    console.log(`📧 Sent ${sentCount} emails out of ${recipientArray.length} recipients`);

    return Response.json({
      success: true,
      sent: sentCount,
      total: recipientArray.length,
      schedulings: tomorrowSchedulings.length,
      sentAt: brasiliaTime.toLocaleString('pt-BR'),
      recipients: recipientArray
    });

  } catch (error) {
    console.error('❌ Error in scheduledEmailSender:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

function generateEmailHTML(schedulings, groupedSchedulings, tomorrow) {
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
            <td style="background: linear-gradient(135deg, #860063 0%, #6b004f 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="width: 120px; height: 120px; background: #ffffff; border-radius: 20px; display: inline-block; margin-bottom: 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
                      <table role="presentation" width="120" height="120" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle">
                            <span style="font-size: 48px; font-weight: 900; color: #860063; letter-spacing: -2px;">OFI</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                      📅 Agendamento de Descargas
                    </h1>
                    <p style="margin: 15px 0 0; font-size: 18px; color: #ffffff; opacity: 0.95;">
                      ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #860063 0%, #F88D2A 100%); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <h2 style="margin: 0 0 10px; font-size: 28px; font-weight: 800; color: #ffffff;">
                      ${schedulings.length} ${schedulings.length === 1 ? 'Agendamento' : 'Agendamentos'}
                    </h2>
                    <p style="margin: 0; font-size: 16px; color: #ffffff; opacity: 0.95;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px; border-radius: 12px; overflow: hidden; border: 2px solid #e5e7eb;">
                
                <!-- Line Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #860063 0%, #9d1876 100%); padding: 18px 24px; color: #ffffff; font-size: 17px; font-weight: 700;">
                    <span style="font-size: 20px; margin-right: 10px;">📍</span>
                    ${group.warehouse === 'central' ? 'Armazém Central' : group.warehouse === 'fabrica' ? 'Armazém Fábrica' : 'Armazém Barra'} - Linha ${group.line}
                  </td>
                </tr>

                <!-- Table -->
                <tr>
                  <td style="padding: 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      
                      <!-- Table Header -->
                      <tr style="background: linear-gradient(135deg, #F88D2A 0%, #d97722 100%);">
                        <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Horário</th>
                        <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Fornecedor</th>
                        <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Quantidade</th>
                        <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Rastreio</th>
                        <th style="padding: 14px; text-align: left; color: #ffffff; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                      </tr>

                      <!-- Table Rows -->
                      ${group.schedules.map((schedule, idx) => `
                      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 14px; font-size: 14px; color: #111827; font-weight: 600;">${schedule.start_time}</td>
                        <td style="padding: 14px; font-size: 14px; color: #111827; font-weight: 600;">${schedule.supplier}</td>
                        <td style="padding: 14px; font-size: 14px; color: #4b5563;">${schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</td>
                        <td style="padding: 14px; font-size: 14px; color: #4b5563;">${schedule.tracking_code || '-'}</td>
                        <td style="padding: 14px;">
                          <span style="display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; ${
                            schedule.status === 'agendado' ? 'background-color: #dbeafe; color: #1e40af;' :
                            schedule.status === 'em_descarga' ? 'background-color: #fed7aa; color: #c2410c;' :
                            schedule.status === 'concluido' ? 'background-color: #d1fae5; color: #065f46;' :
                            'background-color: #fee2e2; color: #dc2626;'
                          }">
                            ${schedule.status === 'agendado' ? 'Agendado' :
                              schedule.status === 'em_descarga' ? 'Em Descarga' :
                              schedule.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                          </span>
                        </td>
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
            <td style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 30px; text-align: center; border-top: 3px solid #860063;">
              <p style="margin: 0 0 8px; font-weight: 700; color: #111827; font-size: 15px;">
                🚛 Sistema Central Pulse - OFI
              </p>
              <p style="margin: 0 0 15px; font-weight: 700; font-size: 15px; color: #860063;">
                ⏰ Programação enviada automaticamente às 16h
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Este é um email automático. Por favor, não responda.
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