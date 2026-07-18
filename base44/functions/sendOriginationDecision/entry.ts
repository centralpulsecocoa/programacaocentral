import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sample, decision, approvedBy, approvalDate, moisturePercent, ffa, origin } = await req.json();

        const decisionText = decision === 'aprovado' ? 'APROVADA' : 'DEVOLVIDA';
        const decisionColor = decision === 'aprovado' ? '#22c55e' : '#ef4444';
        const decisionIcon = decision === 'aprovado' ? '✅' : '❌';

        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #860063 0%, #F88D2A 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .decision-badge { display: inline-block; background: ${decisionColor}; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; font-size: 18px; margin: 20px 0; }
        .info-box { background: white; border-left: 4px solid #860063; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: bold; color: #860063; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">${decisionIcon} Decisão de Originação</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Central Pulse - Sistema de Descargas</p>
        </div>
        <div class="content">
            <div style="text-align: center;">
                <div class="decision-badge">Carga ${decisionText}</div>
            </div>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #860063;">📋 Informações da Carga</h3>
                <div class="info-row">
                    <span class="info-label">Amostra/Carga:</span>
                    <span>${sample}</span>
                </div>
                ${origin ? `
                <div class="info-row">
                    <span class="info-label">Origem:</span>
                    <span>${origin}</span>
                </div>
                ` : ''}
                ${moisturePercent != null ? `
                <div class="info-row">
                    <span class="info-label">Umidade:</span>
                    <span>${moisturePercent}%</span>
                </div>
                ` : ''}
                ${ffa != null ? `
                <div class="info-row">
                    <span class="info-label">FFA:</span>
                    <span>${ffa}</span>
                </div>
                ` : ''}
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #860063;">👤 Decisão Registrada</h3>
                <div class="info-row">
                    <span class="info-label">Aprovado por:</span>
                    <span>${approvedBy}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Data/Hora:</span>
                    <span>${new Date(approvalDate).toLocaleString('pt-BR')}</span>
                </div>
            </div>

            <div class="footer">
                <p>Este é um email automático gerado pelo sistema Central Pulse.</p>
                <p style="color: #860063; font-weight: bold;">OFI - Olam Food Ingredients</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        const recipients = [
            'jose.j.santos@ofi.com'
        ];

        const emailPromises = recipients.map(recipient =>
            base44.asServiceRole.integrations.Core.SendEmail({
                to: recipient,
                subject: `${decisionIcon} Carga ${decisionText} - ${sample}`,
                body: emailBody,
                from_name: 'Central Pulse'
            })
        );

        await Promise.all(emailPromises);

        return Response.json({ 
            success: true,
            message: 'Emails enviados com sucesso'
        });

    } catch (error) {
        console.error('Error sending origination decision email:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});