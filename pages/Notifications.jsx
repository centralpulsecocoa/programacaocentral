
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Clock, Save, Plus, Edit, Trash2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    config_type: "alert",
    name: "",
    value: "",
    enabled: true,
    settings: {
      type: "email",
      trigger: "scheduling_created",
      target_profiles: ["supervisor"],
      message: ""
    }
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.AppConfig.filter({ config_type: 'alert' }),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      resetForm();
      setIsDialogOpen(false); // Changed from setShowDialog to setIsDialogOpen
      toast.success('✅ Notificação criada com sucesso!', {
        description: 'A notificação foi configurada no sistema.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar notificação', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      resetForm();
      setIsDialogOpen(false); // Changed from setShowDialog to setIsDialogOpen
      setEditingAlert(null);
      toast.success('✅ Notificação atualizada!', {
        description: 'As alterações foram salvas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar notificação', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('✅ Notificação excluída!', {
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir notificação', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (alert) => {
      const targetProfiles = alert.settings?.target_profiles || [];
      const eligibleUsers = users.filter(u =>
        targetProfiles.includes('all') || targetProfiles.includes(u.profile)
      );
      const recipientEmails = eligibleUsers
        .filter(u => u.email)
        .map(u => u.email);

      if (recipientEmails.length === 0) {
        throw new Error('Nenhum destinatário com e-mail encontrado para este alerta.');
      }

      // As per outline, send to the first found recipient only for test
      await base44.integrations.Core.SendEmail({
        to: recipientEmails[0],
        subject: `[TESTE] ${alert.name}`,
        body: `<p>Este é um email de teste da notificação: <strong>${alert.name}</strong></p>`
      });

      return recipientEmails[0];
    },
    onSuccess: (recipient) => {
      toast.success('✅ Email de teste enviado!', {
        description: `Enviado para ${recipient}`,
        duration: 4000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao enviar teste', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const resetForm = () => {
    setFormData({
      config_type: "alert",
      name: "",
      value: "",
      enabled: true,
      settings: {
        type: "email",
        trigger: "scheduling_created",
        target_profiles: ["supervisor"],
        message: ""
      }
    });
    setEditingAlert(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAlert) {
      updateMutation.mutate({ id: editingAlert.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (alert) => {
    setEditingAlert(alert);
    setFormData({
      config_type: alert.config_type,
      name: alert.name,
      value: alert.value || "",
      enabled: alert.enabled,
      settings: alert.settings || {
        type: "email",
        trigger: "scheduling_created",
        target_profiles: ["supervisor"],
        message: ""
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este alerta?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleProfileToggle = (profile) => {
    const current = formData.settings.target_profiles || [];
    if (current.includes(profile)) {
      setFormData({
        ...formData,
        settings: {
          ...formData.settings,
          target_profiles: current.filter(p => p !== profile)
        }
      });
    } else {
      setFormData({
        ...formData,
        settings: {
          ...formData.settings,
          target_profiles: [...current, profile]
        }
      });
    }
  };

  const triggerLabels = {
    scheduling_created: "Agendamento criado",
    scheduling_started: "Descarga iniciada",
    scheduling_completed: "Descarga concluída",
    scheduling_cancelled: "Agendamento cancelado",
    daily_schedule: "Programação diária (16h)",
    daily_update: "Atualização diária (18h)"
  };

  const typeIcons = {
    email: Mail,
    whatsapp: MessageSquare,
    system: Bell
  };

  const profileLabels = {
    supervisor: "Supervisores",
    comprador: "Compradores",
    operador: "Operadores",
    all: "Todos"
  };

  const getRecipientCount = (alert) => {
    const targetProfiles = alert.settings?.target_profiles || [];
    if (targetProfiles.includes('all')) return users.length;
    return users.filter(u => targetProfiles.includes(u.profile)).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Bell className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Alertas e Notificações
              </h1>
              <p className="text-sm md:text-base text-gray-600">Configure alertas automáticos do sistema</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-[#860063]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Alerta
            </Button>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-md border-none border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Alertas Email</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {alerts.filter(a => a.settings?.type === 'email').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Alertas WhatsApp</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {alerts.filter(a => a.settings?.type === 'whatsapp').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Alertas Sistema</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {alerts.filter(a => a.settings?.type === 'system').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">Alertas Configurados</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum alerta configurado</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {alerts.map((alert) => {
                    const Icon = typeIcons[alert.settings?.type] || Bell;
                    const recipientCount = getRecipientCount(alert);
                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#860063]/30 transition-all bg-white"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-gray-100">
                              <Icon className="w-5 h-5 text-[#860063]" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {alert.name}
                                </h3>
                                <Switch checked={alert.enabled} disabled />
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <span className="font-medium">Gatilho:</span>{' '}
                                  {triggerLabels[alert.settings?.trigger] || alert.settings?.trigger}
                                </p>
                                <p>
                                  <span className="font-medium">Destinatários:</span>{' '}
                                  {alert.settings?.target_profiles?.map(p => profileLabels[p] || p).join(', ')} ({recipientCount} usuários)
                                </p>
                                {alert.settings?.message && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    {alert.settings.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => testMutation.mutate(alert)} // Changed to testMutation
                              disabled={testMutation.isPending} // Changed to testMutation
                              className="hover:bg-green-50 hover:border-green-300"
                              title="Testar alerta"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(alert)}
                              className="hover:bg-[#860063]/10 hover:border-[#860063]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(alert.id)}
                              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAlert ? 'Editar Alerta' : 'Novo Alerta'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Alerta *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Notificar agendamento criado"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Alerta *</Label>
                  <Select
                    value={formData.settings.type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings, type: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger">Gatilho *</Label>
                  <Select
                    value={formData.settings.trigger}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      settings: { ...formData.settings, trigger: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(triggerLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enviar para: *</Label>
                <div className="space-y-2 border rounded-lg p-3">
                  {['supervisor', 'comprador', 'operador', 'all'].map(profile => (
                    <div key={profile} className="flex items-center space-x-2">
                      <Checkbox
                        id={profile}
                        checked={formData.settings.target_profiles?.includes(profile)}
                        onCheckedChange={() => handleProfileToggle(profile)}
                      />
                      <label htmlFor={profile} className="text-sm cursor-pointer">
                        {profileLabels[profile]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  required
                  value={formData.settings.message}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    settings: { ...formData.settings, message: e.target.value }
                  })}
                  rows={3}
                  placeholder="Mensagem que será enviada"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Alerta ativo</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingAlert ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
