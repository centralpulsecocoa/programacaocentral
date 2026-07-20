import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Search, Mail, Phone, Building, Shield, UserPlus, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_PROFILES, getProfileLabel } from "@/lib/profileConstants";

const profileColors = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  supervisor: "bg-blue-100 text-blue-800 border-blue-200",
  operador: "bg-green-100 text-green-800 border-green-200",
  comprador: "bg-orange-100 text-orange-800 border-orange-200",
  motorista: "bg-gray-100 text-gray-800 border-gray-200",
  transportadora: "bg-yellow-100 text-yellow-800 border-yellow-200",
  op_balanca: "bg-amber-100 text-amber-800 border-amber-200",
  analista_qualidade: "bg-teal-100 text-teal-800 border-teal-200",
  qualidade: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gerente_originacao: "bg-indigo-100 text-indigo-800 border-indigo-200",
  controladoria: "bg-pink-100 text-pink-800 border-pink-200",
  producao: "bg-cyan-100 text-cyan-800 border-cyan-200",
  originacao: "bg-lime-100 text-lime-800 border-lime-200",
  gerente_sustentabilidade: "bg-green-100 text-green-800 border-green-200",
  tecnico_agricola: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

// Função para verificar se usuário está "online" (ativo nos últimos 15 minutos)
const isUserOnline = (user) => {
  if (!user.updated_date) return false;
  const lastActivity = new Date(user.updated_date);
  const now = new Date();
  const diffMinutes = (now - lastActivity) / (1000 * 60);
  return diffMinutes <= 15;
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteProfile, setInviteProfile] = useState("");
  const [sending, setSending] = useState(false);

  // Estados para edição de perfil
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newProfile, setNewProfile] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: ({ userId, profile }) => base44.entities.User.update(userId, { profile }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditDialog(false);
      setEditingUser(null);
      setNewProfile("");
      toast.success('✅ Perfil atualizado com sucesso!', {
        description: `O usuário agora é ${getProfileLabel(variables.profile)}`,
        duration: 4000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar perfil', {
        description: error.message || 'Tente novamente.',
        duration: 3000,
      });
    }
  });

  const resetForm = () => {
    setInviteEmail("");
    setInviteName("");
    setInviteProfile("");
  };

  const handleOpenEditDialog = (user) => {
    setEditingUser(user);
    setNewProfile(user.profile || "");
    setShowEditDialog(true);
  };

  const handleUpdateProfile = () => {
    if (!newProfile) {
      toast.error('❌ Selecione um perfil', {
        duration: 3000,
      });
      return;
    }

    if (newProfile === editingUser.profile) {
      toast.error('❌ O perfil selecionado é o mesmo atual', {
        duration: 3000,
      });
      return;
    }

    updateUserProfileMutation.mutate({
      userId: editingUser.id,
      profile: newProfile
    });
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteName || !inviteProfile) {
      toast.error('❌ Preencha todos os campos', {
        duration: 3000,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error('❌ Email inválido', {
        description: 'Por favor, insira um email válido.',
        duration: 3000,
      });
      return;
    }

    const existingUser = users.find(u => u.email.toLowerCase() === inviteEmail.toLowerCase());
    if (existingUser) {
      toast.error('❌ Usuário já existe', {
        description: 'Este email já está cadastrado no sistema.',
        duration: 3000,
      });
      return;
    }

    setSending(true);

    try {
      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #860063 0%, #6b004f 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { width: 80px; height: 80px; background: white; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 32px; color: #860063; font-weight: 700; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 20px; }
            .text-body { color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
            .profile-badge { display: inline-block; background: linear-gradient(135deg, #860063 0%, #F88D2A 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #860063 0%, #6b004f 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
            .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
            .instructions { background: #f9fafb; border-left: 4px solid #860063; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .instructions h3 { margin: 0 0 10px; color: #860063; }
            .instructions ol { margin: 10px 0; padding-left: 20px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">OFI</div>
              <h1 style="margin: 0; font-size: 28px;">Convite para Sistema de Agendamento</h1>
            </div>
            <div class="content">
              <div class="greeting">Olá, ${inviteName}!</div>
              <div class="text-body">
              <p>Você foi convidado(a) para fazer parte do <strong>Sistema de Agendamento de Veículos OFI</strong>.</p>
              <p>Seu perfil sugerido é: <span class="profile-badge">${getProfileLabel(inviteProfile)}</span></p>
              </div>
              <div class="button-container">
                <a href="${window.location.origin}" class="button">🚀 Acessar Sistema</a>
              </div>
              <div class="instructions">
                <h3>📋 Primeiros Passos:</h3>
                <ol>
                  <li>Clique no botão acima para acessar o sistema</li>
                  <li>Faça login com seu email: <strong>${inviteEmail}</strong></li>
                  <li>No primeiro acesso, selecione seu perfil de usuário</li>
                  <li>Pronto! Você já pode começar a usar o sistema</li>
                </ol>
              </div>
              <div class="text-body" style="font-size: 14px;">
                <p>Este sistema permite agendar, gerenciar e acompanhar descargas de veículos nos armazéns da OFI.</p>
              </div>
            </div>
            <div class="footer">
              <p>🚛 Sistema de Agendamento de Veículos OFI</p>
              <p>Se você não esperava este convite, pode ignorar este email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: 'Convite - Sistema de Agendamento OFI',
        body: emailContent
      });

      toast.success('✅ Convite enviado com sucesso!', {
        description: `Email enviado para ${inviteEmail}`,
        duration: 4000,
      });

      setShowInviteDialog(false);
      resetForm();
      } catch (error) {
      toast.error('❌ Erro ao enviar convite', {
        description: error.message || 'Tente novamente.',
        duration: 3000,
      });
      } finally {
      setSending(false);
      }
      };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.company?.toLowerCase().includes(search) ||
      user.profile?.toLowerCase().includes(search)
    );
  });

  const usersByProfile = filteredUsers.reduce((acc, user) => {
    const profile = user.profile || 'sem_perfil';
    if (!acc[profile]) acc[profile] = [];
    acc[profile].push(user);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 flex items-center gap-3">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Administração de Usuários
              </h1>
              <p className="text-sm md:text-base text-gray-600">Visualize e gerencie os usuários do sistema</p>
            </div>
            <Dialog open={showInviteDialog} onOpenChange={(open) => {
              setShowInviteDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convidar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#860063]" />
                    Convidar Novo Usuário
                  </DialogTitle>
                  <DialogDescription>
                    Enviaremos um email de convite com instruções de acesso
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Nome Completo *</Label>
                    <Input
                      id="invite-name"
                      type="text"
                      placeholder="Ex: João Silva"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="exemplo@ofi.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-profile">Perfil Sugerido *</Label>
                    <Select 
                      value={inviteProfile} 
                      onValueChange={setInviteProfile}
                      disabled={sending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_PROFILES.map(profile => (
                          <SelectItem key={profile.value} value={profile.value}>
                            <div className="flex items-center gap-2">
                              <span>{profile.icon}</span>
                              <span>{profile.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      O usuário poderá escolher seu perfil no primeiro acesso
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>📧 O que acontecerá:</strong>
                    </p>
                    <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                      <li>Email de convite será enviado</li>
                      <li>Link direto para o sistema</li>
                      <li>Instruções de primeiro acesso</li>
                      <li>Perfil sugerido informado</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowInviteDialog(false);
                        resetForm();
                      }}
                      className="flex-1"
                      disabled={sending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSendInvitation}
                      disabled={!inviteEmail || !inviteName || !inviteProfile || sending}
                      className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                    >
                      {sending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Enviar Convite
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Card className="shadow-md border-none mb-4">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por nome, email, empresa ou perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {Object.entries(usersByProfile).map(([profile, profileUsers]) => (
            <Card key={profile} className="shadow-md border-none">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{profileUsers.length}</p>
                <p className="text-xs text-gray-600 mt-1 capitalize">
                  {getProfileLabel(profile) || 'Sem Perfil'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-xl font-bold">
                Usuários Cadastrados
              </CardTitle>
              <Badge variant="outline" className="bg-white">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-3 rounded-lg border-2 border-gray-200 hover:border-[#860063]/30 transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            {user.full_name}
                            {isUserOnline(user) ? (
                              <span className="relative flex h-2.5 w-2.5" title="Online (ativo nos últimos 15 min)">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                              </span>
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" title="Offline"></span>
                            )}
                          </h3>
                          {user.profile && (
                            <Badge className={`${profileColors[user.profile]} border text-xs`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {getProfileLabel(user.profile)}
                            </Badge>
                          )}
                          {user.role === 'admin' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              Admin do Sistema
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3 h-3 text-[#860063]" />
                            <span className="truncate text-xs">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-3 h-3 text-[#F88D2A]" />
                              <span className="text-xs">{user.phone}</span>
                            </div>
                          )}
                          {user.company && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Building className="w-3 h-3 text-blue-500" />
                              <span className="text-xs">{user.company}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          Último login: {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
                        </div>
                      </div>

                      {/* Botão de Editar Perfil */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(user)}
                        className="hover:bg-[#860063]/10 hover:border-[#860063] transition-colors"
                        title="Alterar perfil do usuário"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar Perfil
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edição de Perfil */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#860063]" />
              Alterar Perfil do Usuário
            </DialogTitle>
            <DialogDescription>
              Altere o perfil de acesso do usuário no sistema
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">{editingUser.full_name}</p>
                    <p className="text-sm text-gray-600 mb-2">{editingUser.email}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-gray-600">Perfil atual:</span>
                       {editingUser.profile ? (
                         <Badge className={`${profileColors[editingUser.profile]} border text-xs`}>
                           {getProfileLabel(editingUser.profile)}
                         </Badge>
                       ) : (
                         <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                           Sem perfil
                         </Badge>
                       )}
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-profile">Novo Perfil *</Label>
                <Select value={newProfile} onValueChange={setNewProfile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o novo perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PROFILES.map(profile => (
                      <SelectItem key={profile.value} value={profile.value}>
                        <div className="flex items-center gap-2">
                          <span>{profile.icon}</span>
                          <span>{profile.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-900 font-semibold mb-1">
                  ⚠️ Atenção:
                </p>
                <ul className="text-xs text-orange-800 space-y-1 ml-4 list-disc">
                  <li>O usuário terá acesso às funcionalidades do novo perfil imediatamente</li>
                  <li>A mudança é permanente e pode ser revertida a qualquer momento</li>
                  <li>O usuário será notificado na próxima vez que acessar o sistema</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingUser(null);
                    setNewProfile("");
                  }}
                  className="flex-1"
                  disabled={updateUserProfileMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={!newProfile || updateUserProfileMutation.isPending || newProfile === editingUser.profile}
                  className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                >
                  {updateUserProfileMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Alterar Perfil
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}