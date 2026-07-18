import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Calendar, ArrowLeft, Zap, Clock, Users, Plus, Trash2, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

export default function EmailSchedulePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const TODAY = new Date();
  const todayStr = format(TODAY, 'yyyy-MM-dd');
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [externalEmails, setExternalEmails] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState(["supervisor", "comprador"]);
  const [sendingEmails, setSendingEmails] = useState(false); // Renamed from isSending
  const [sendingTest, setSendingTest] = useState(false);     // Renamed from isSendingTest

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: emailConfigs = [] } = useQuery({
    queryKey: ['email-configs'],
    queryFn: () => base44.entities.AppConfig.filter({ config_type: 'email_group' }),
    initialData: [],
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Derived state for the email config
  const emailConfig = emailConfigs.length > 0 ? emailConfigs[0] : null;

  const saveEmailGroupMutation = useMutation({
    mutationFn: (data) => {
      if (emailConfig) { // Use emailConfig here
        return base44.entities.AppConfig.update(emailConfig.id, data);
      } else {
        return base44.entities.AppConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-configs'] }); // Invalidate original key
      toast.success('✅ Grupo de destinatários salvo!', {
        description: 'As configurações de email foram atualizadas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao salvar grupo', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  useEffect(() => {
    if (emailConfigs.length > 0) {
      const config = emailConfigs[0];
      if (config.settings?.external_emails) {
        setExternalEmails(config.settings.external_emails);
      }
      if (config.settings?.profiles) {
        setSelectedProfiles(config.settings.profiles);
      }
    }
  }, [emailConfigs]);

  const filteredSchedulings = schedulings.filter(s => s.date === selectedDate && s.status !== 'cancelado');

  const groupByLine = () => {
    const grouped = {};
    
    filteredSchedulings.forEach(schedule => {
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

  const generateEmailHTML = (isUpdate = false) => {
    const groupedSchedulings = groupByLine();
    const formattedDate = format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

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
            <td style="background-color: #860063; padding: 20px 20px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <div style="margin-bottom: 12px;">
                      <span style="font-size: 48px; font-weight: 900; color: #ffffff; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">OFI</span>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                      Agendamento de Descargas
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #ffffff; opacity: 0.95;">
                      ${formattedDate}
                    </p>
                    ${isUpdate ? `
                    <div style="display: inline-block; background-color: #F88D2A; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px;">
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
            <td style="padding: 20px;">
              
              <!-- Summary -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #860063; border-radius: 8px; margin-bottom: 15px;">
                <tr>
                  <td style="padding: 15px; text-align: center;">
                    <h2 style="margin: 0 0 5px; font-size: 20px; font-weight: 800; color: #ffffff;">
                      ${filteredSchedulings.length} ${filteredSchedulings.length === 1 ? 'Agendamento' : 'Agendamentos'}
                    </h2>
                    <p style="margin: 0; font-size: 13px; color: #ffffff; opacity: 0.95;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                
                <!-- Line Header -->
                <tr>
                  <td style="background-color: #860063; padding: 10px 14px; color: #ffffff; font-size: 14px; font-weight: 700;">
                    <span style="font-size: 16px; margin-right: 6px;">📍</span>
                    ${group.warehouse === 'central' ? 'Armazém Central' : group.warehouse === 'fabrica' ? 'Armazém Fábrica' : group.warehouse === 'ferraz' ? 'Armazém Ferraz' : 'Armazém Barra'} - Linha ${group.line}
                  </td>
                </tr>

                <!-- Table -->
                <tr>
                  <td style="padding: 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      
                      <!-- Table Header -->
                      <tr style="background-color: #F88D2A;">
                        <th style="padding: 8px 10px; text-align: left; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Horário</th>
                        <th style="padding: 8px 10px; text-align: left; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Fornecedor</th>
                        <th style="padding: 8px 10px; text-align: left; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Quantidade</th>
                        <th style="padding: 8px 10px; text-align: left; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Rastreio</th>
                        <th style="padding: 8px 10px; text-align: left; color: #860063; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Certificação</th>
                        <th style="padding: 8px 10px; text-align: left; color: #860063; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Frete</th>
                      </tr>

                      <!-- Table Rows -->
                      ${group.schedules.map((schedule, idx) => `
                      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-bottom: 1px solid #f3f4f6;">
                        <td style="padding: 10px; font-size: 13px; color: #111827; font-weight: 600;">${schedule.start_time}</td>
                        <td style="padding: 10px; font-size: 13px; color: #111827; font-weight: 600;">${schedule.supplier}</td>
                        <td style="padding: 10px; font-size: 13px; color: #4b5563;">${schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</td>
                        <td style="padding: 10px; font-size: 12px; color: #4b5563;">${schedule.tracking_code || '-'}</td>
                        <td style="padding: 10px; font-size: 13px; font-weight: 600; color: #F88D2A;">${schedule.eudr_cvn || 'EUDR'}</td>
                        <td style="padding: 10px; font-size: 13px; font-weight: 600; color: #F88D2A;">${schedule.apanha_status || 'NA'}</td>
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
            <td style="background-color: #f9fafb; padding: 18px; text-align: center; border-top: 2px solid #860063;">
              <p style="margin: 0 0 5px; font-weight: 700; color: #111827; font-size: 13px;">
                🚛 Sistema de Agendamento de Veículos OFI
              </p>
              <p style="margin: 0 0 10px; font-weight: 700; font-size: 13px; color: ${isUpdate ? '#F88D2A' : '#860063'};">
                ${isUpdate ? '⏰ Atualização enviada às 18h' : '📅 Programação enviada às 16h'}
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                Este é um email automático. Por favor, não responda.
              </p>
              <p style="margin: 8px 0 0; font-size: 8px; color: #d1d5db;">
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
  };

  const getRecipientEmails = () => {
    const internalEmails = users
      .filter(u => selectedProfiles.includes(u.profile) && u.email)
      .map(u => u.email);
    
    const external = externalEmails
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));
    
    return [...new Set([...internalEmails, ...external])];
  };

  const handleSaveGroup = () => {
    saveEmailGroupMutation.mutate({
      config_type: 'email_group',
      name: 'Default Email Group',
      enabled: true,
      settings: {
        profiles: selectedProfiles,
        external_emails: externalEmails
      }
    });
  };

  const handleSendEmails = async () => { // Renamed from handleSendEmail
    setSendingEmails(true);
    
    const recipients = getRecipientEmails();
    if (recipients.length === 0) {
      toast.error('❌ Nenhum destinatário configurado', {
        description: 'Adicione emails ou selecione perfis.',
        duration: 3000,
      });
      setSendingEmails(false);
      return;
    }

    const emailContent = generateEmailHTML();
    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `Programação de Descargas - ${format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
          body: emailContent
        });
        successCount++;
      } catch (error) {
        console.error('Error sending email to', recipient, error);
        errorCount++;
      }
    }

    setSendingEmails(false);
    
    if (errorCount === 0) {
      toast.success(`✅ Emails enviados com sucesso!`, {
        description: `${successCount} email(s) enviado(s)`,
        duration: 4000,
      });
    } else {
      toast.warning(`⚠️ Envio parcialmente concluído`, {
        description: `${successCount} enviado(s), ${errorCount} falha(s)`,
        duration: 4000,
      });
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true); // Renamed from setIsSendingTest
    
    const recipients = getRecipientEmails();
    if (recipients.length === 0) {
      toast.error('❌ Nenhum destinatário configurado', {
        description: 'Adicione emails ou selecione perfis.',
        duration: 3000,
      });
      setSendingTest(false);
      return;
    }

    const emailContent = generateEmailHTML();

    try {
      await base44.integrations.Core.SendEmail({
        to: recipients[0],
        subject: `[TESTE] Programação de Descargas - ${format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        body: emailContent
      });

      toast.success('✅ Email de teste enviado!', {
        description: `Enviado para ${recipients[0]}`,
        duration: 4000,
      });
    } catch (error) {
      toast.error('❌ Erro ao enviar teste', {
        description: error.message,
        duration: 3000,
      });
    }

    setSendingTest(false);
  };

  const handleProfileToggle = (profile) => {
    if (selectedProfiles.includes(profile)) {
      setSelectedProfiles(selectedProfiles.filter(p => p !== profile));
    } else {
      setSelectedProfiles([...selectedProfiles, profile]);
    }
  };

  const profileLabels = {
    supervisor: "Supervisores",
    comprador: "Compradores",
    operador: "Operadores",
    admin: "Administradores"
  };

  const recipientCount = getRecipientEmails().length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="mb-4 hover:bg-[#860063]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Mail className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
            Enviar Agendamentos por Email
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Envie a programação de descargas por email
          </p>
        </motion.div>

        {/* Info Card */}
        <Card className="shadow-lg border-none mb-6 border-l-4 border-l-[#F88D2A]">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-[#F88D2A] mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Envios Automáticos Programados</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#860063] rounded-full"></span>
                    <strong>16:00</strong> - Programação do dia seguinte enviada
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#F88D2A] rounded-full"></span>
                    <strong>18:00</strong> - Atualização da programação enviada
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Destinatários */}
          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#860063]" />
                Destinatários
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <Label>Grupos Internos</Label>
                <div className="space-y-2 border rounded-lg p-3">
                  {['supervisor', 'comprador', 'operador', 'admin'].map(profile => {
                    const count = users.filter(u => u.profile === profile && u.email).length;
                    return (
                      <div key={profile} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={profile}
                            checked={selectedProfiles.includes(profile)}
                            onCheckedChange={() => handleProfileToggle(profile)}
                          />
                          <label htmlFor={profile} className="text-sm cursor-pointer">
                            {profileLabels[profile]}
                          </label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {count} {count === 1 ? 'usuário' : 'usuários'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external">Emails Externos</Label>
                <Textarea
                  id="external"
                  value={externalEmails}
                  onChange={(e) => setExternalEmails(e.target.value)}
                  rows={4}
                  placeholder="exemplo1@email.com, exemplo2@email.com&#10;ou um email por linha"
                  className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                />
                <p className="text-xs text-gray-500">
                  Separe os emails por vírgula, ponto-e-vírgula ou quebra de linha
                </p>
              </div>

              <Button
                onClick={handleSaveGroup}
                disabled={saveEmailGroupMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Grupo de Destinatários
              </Button>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  📧 Total: {recipientCount} destinatário(s)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Envio */}
          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#860063]" />
                Envio Manual / Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date">Data dos Agendamentos</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">Resumo do Email</p>
                    <p className="text-sm text-blue-800">
                      {filteredSchedulings.length} {filteredSchedulings.length === 1 ? 'agendamento' : 'agendamentos'} para {selectedDate ? format(new Date(selectedDate + 'T12:00:00'), "dd/MM/yyyy") : '-'}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {groupByLine().length} {groupByLine().length === 1 ? 'linha ativa' : 'linhas ativas'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || recipientCount === 0 || filteredSchedulings.length === 0}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {sendingTest ? 'Enviando...' : 'Enviar Teste (1º destinatário)'}
                </Button>
                <Button
                  onClick={handleSendEmails} // Updated function name
                  disabled={sendingEmails || recipientCount === 0 || filteredSchedulings.length === 0}
                  className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingEmails ? 'Enviando...' : `Enviar para ${recipientCount} destinatário(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview com Tabela */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle>Preview - Formato Tabela por Linha</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredSchedulings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum agendamento para esta data</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupByLine().map((group, idx) => (
                  <div key={idx} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-[#860063] to-[#9d1876] text-white px-4 py-3 font-semibold">
                      📍 {group.warehouse === 'central' ? 'Armazém Central' : group.warehouse === 'fabrica' ? 'Armazém Fábrica' : group.warehouse === 'ferraz' ? 'Armazém Ferraz' : 'Armazém Barra'} - Linha {group.line}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#F88D2A]">
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-white">Horário</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-white">Fornecedor</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-white">Quantidade</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-white">Rastreio</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-[#860063]">Certificação</th>
                            <th className="px-4 py-2.5 text-left text-sm font-semibold text-[#860063]">Frete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.schedules.map((schedule, sIdx) => (
                            <tr key={sIdx} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-bold text-[#860063]">{schedule.start_time}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{schedule.supplier}</td>
                              <td className="px-4 py-3 text-gray-600">
                                {schedule.quantity_bags?.toLocaleString('pt-BR')} sacos
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {schedule.tracking_code || '-'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#F88D2A]">
                                {schedule.eudr_cvn || 'EUDR'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#F88D2A]">
                                {schedule.apanha_status || 'NA'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}