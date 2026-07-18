import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  BarChart3,
  LogOut,
  Menu,
  Package,
  Settings,
  Mail,
  Users,
  Bell,
  Shield,
  History as HistoryIcon,
  FileText,
  Monitor,
  Lightbulb,
  TreePine,
  ClipboardList,
  UserCheck,
  Activity,
  SlidersHorizontal,
  DollarSign,
  BookOpen
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CalledVehiclesPopup from "@/components/calendar/CalledVehiclesPopup";
import VisitaConcluidaAlertPopup from "@/components/sustentabilidade/VisitaConcluídaAlertPopup";
import MoistureAlertPopup from "@/components/quality/MoistureAlertPopup";
import ReleaseAlertPopup from "@/components/release/ReleaseAlertPopup";
import QualityResultsAlertPopup from "@/components/quality/QualityResultsAlertPopup";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { AVAILABLE_PROFILES, getProfileLabel as getProfileLabelUtil } from "@/lib/profileConstants";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";

// Lista de emails com acesso especial (administradores externos)
const ADMIN_WHITELIST = ['jjancem@gmail.com', 'dep.central@olam.onmicrosoft.com'];

// Lista de emails de técnicos agrícolas externos (não @ofi.com)
const TECNICO_AGRICOLA_WHITELIST = [
  'vasques2001234@gmail.com',
  'joao.carlos@laborrural.com',
  'goncalves.aog@gmail.com',
  'casadoprodutorrural16@gmail.com',
  'crescer.gestaoeconsultoria@gmail.com',
  'nandoasc@gmail.com',
  'fredson96@live.com',
  'gabrielsilvaa.agro@gmail.com',
  'gilvansouza.393@gmail.com',
  'osibat@gmail.com',
  'jicleciaalmeida@gmail.com',
  'ananiasjr23@gmail.com',
  'lazarodejesussantoslazaro9@gmail.com',
  'p.a26moreira@hotmail.com',
  'ronaldy-ssantos007@hotmail.com',
  'vtxsamuel.santana@gmail.com',
  'silvasirlane226@gmail.com',
  'rjuniortecnicoagricola@gmail.com',
  'raianeduartt@gmail.com',
];

// Tempo de inatividade em milissegundos (15 minutos)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
// Tempo para mostrar aviso antes do logout (2 minutos)
const WARNING_TIME = 2 * 60 * 1000;

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [showAccessDeniedDialog, setShowAccessDeniedDialog] = useState(false);
  const [alertsReady, setAlertsReady] = useState(false);
  const queryClient = useQueryClient();
  
  // Estados para controle de inatividade
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(120); // 2 minutos em segundos
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    loadUser();
    // Atrasa o carregamento dos popups de alerta para não bloquear as queries principais
    const timer = setTimeout(() => setAlertsReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Remover favicons existentes
    const existingFavicons = document.querySelectorAll("link[rel*='icon']");
    existingFavicons.forEach(favicon => favicon.remove());

    // Adicionar múltiplos formatos de favicon para compatibilidade
    const head = document.getElementsByTagName('head')[0];

    // Favicon ICO (padrão)
    const faviconIco = document.createElement('link');
    faviconIco.type = 'image/x-icon';
    faviconIco.rel = 'shortcut icon';
    faviconIco.href = 'https://www.ofi.com/favicon.ico';
    head.appendChild(faviconIco);

    // Favicon PNG 16x16
    const favicon16 = document.createElement('link');
    favicon16.type = 'image/png';
    favicon16.rel = 'icon';
    favicon16.sizes = '16x16';
    favicon16.href = 'https://www.ofi.com/favicon-16x16.png';
    head.appendChild(favicon16);

    // Favicon PNG 32x32
    const favicon32 = document.createElement('link');
    favicon32.type = 'image/png';
    favicon32.rel = 'icon';
    favicon32.sizes = '32x32';
    favicon32.href = 'https://www.ofi.com/favicon-32x32.png';
    head.appendChild(favicon32);

    // Apple Touch Icon
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.sizes = '180x180';
    appleTouchIcon.href = 'https://www.ofi.com/apple-touch-icon.png';
    head.appendChild(appleTouchIcon);

    // Adicionar título da página
              document.title = 'Central Pulse - Sistema de Descargas';
  }, []);

  // Sistema de detecção de inatividade
  useEffect(() => {
    if (!user) return;

    // Exceção para usuários específicos - não deslogar entre 07h e 19h
    const noLogoutUsers = ['dep.central@olam.onmicrosoft.com', 'jose.j.santos@ofi.com'];
    if (noLogoutUsers.includes(user.email)) {
      const now = new Date();
      const currentHour = now.getHours();

      // Entre 7h e 19h, não aplicar sistema de inatividade
      if (currentHour >= 7 && currentHour < 19) {
        return;
      }
    }

    const resetInactivityTimer = () => {
      // Limpar timers existentes
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      // Fechar diálogo de aviso se estiver aberto
      setShowInactivityWarning(false);
      setWarningCountdown(120);

      // Timer para mostrar aviso (13 minutos)
      warningTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
        setWarningCountdown(120);

        // Countdown de 2 minutos
        countdownIntervalRef.current = setInterval(() => {
          setWarningCountdown((prev) => {
            if (prev <= 1) {
              handleInactivityLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      // Timer final para logout (15 minutos)
      inactivityTimerRef.current = setTimeout(() => {
        handleInactivityLogout();
      }, INACTIVITY_TIMEOUT);
    };

    const handleInactivityLogout = async () => {
      console.log('🔒 Logout automático por inatividade');
      
      // Limpar todos os timers
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      toast.info('⏱️ Sessão encerrada por inatividade', {
        description: 'Você ficou 15 minutos sem interagir com o sistema.',
        duration: 4000,
      });

      await base44.auth.logout();
      navigate(createPageUrl("Access"));
    };

    // Eventos que resetam o timer de inatividade
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Iniciar o timer pela primeira vez
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, navigate]);

  const handleStayActive = () => {
    // Resetar todos os timers
    setShowInactivityWarning(false);
    setWarningCountdown(120);
    
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Recriar os timers (será feito pelo useEffect através de qualquer evento)
    document.dispatchEvent(new Event('mousedown'));
    
    toast.success('✅ Sessão renovada!', {
      description: 'Você continuará conectado.',
      duration: 2000,
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // ===================================
      // 🔒 VALIDAÇÃO CRÍTICA DE SEGURANÇA
      // ===================================
      // Bloqueia IMEDIATAMENTE após qualquer autenticação
      // Garante que APENAS @ofi.com ou whitelist tenham acesso
      
      if (currentUser && currentUser.email) {
        const userEmail = currentUser.email.toLowerCase();
        const emailDomain = currentUser.email.split('@')[1]?.toLowerCase();
        
        // Permitir acesso APENAS se:
        // 1. Email do domínio @ofi.com OU
        // 2. Email está na whitelist de administradores
        const isOfiDomain = emailDomain === 'ofi.com';
        const isWhitelisted = ADMIN_WHITELIST.includes(userEmail);
        const isTecnicoWhitelisted = TECNICO_AGRICOLA_WHITELIST.includes(userEmail);
        
        if (!isOfiDomain && !isWhitelisted && !isTecnicoWhitelisted) {
          // ⛔ BLOQUEIO CRÍTICO
          console.warn('⛔ SEGURANÇA: Acesso negado para:', userEmail);
          console.warn('⛔ SEGURANÇA: Domínio detectado:', emailDomain);
          console.warn('⛔ SEGURANÇA: Redirecionando para tela de acesso negado...');
          
          // Limpar qualquer localStorage do auth pendente
          localStorage.removeItem('ofi_pending_auth_email');
          localStorage.removeItem('ofi_auth_mode');
          
          setUser(currentUser); // Define user para mostrar email na mensagem
          setShowAccessDeniedDialog(true);
          setLoading(false);
          return;
        }
        
        // ✅ Domínio válido - log de sucesso
        console.log('✅ SEGURANÇA: Acesso autorizado para:', userEmail);
        if (isWhitelisted) {
          console.log('👑 SEGURANÇA: Usuário admin whitelist detectado');
        }
        if (isTecnicoWhitelisted) {
          console.log('🌱 SEGURANÇA: Técnico agrícola externo detectado');
          // Auto-atribuir perfil tecnico_agricola se ainda não tiver perfil
          if (!currentUser?.profile) {
            base44.auth.updateMe({ profile: 'tecnico_agricola' }).catch(() => {});
          }
        }
      }
      
      setUser(currentUser);

      // Prefetch dos dados principais para garantir carregamento imediato nas páginas
      queryClient.prefetchQuery({
        queryKey: ['schedulings'],
        queryFn: () => base44.entities.Scheduling.list('-date'),
        staleTime: 60000,
      }).catch(() => {});
      queryClient.prefetchQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list(),
        staleTime: 60000,
      }).catch(() => {});

      // Registrar último login
      base44.auth.updateMe({ last_login: new Date().toISOString() }).catch(() => {});

      // Mostrar dialog de perfil para qualquer usuário sem perfil definido
      // Checar diretamente no currentUser (não no user state que pode estar desatualizado)
      const isCurrentUserAdmin = 
        currentUser?.role === 'admin' || 
        currentUser?.email?.toLowerCase()?.includes('jjance') ||
        ADMIN_WHITELIST.includes(currentUser?.email?.toLowerCase());
      
      const isCurrentUserTecnico = TECNICO_AGRICOLA_WHITELIST.includes(currentUser?.email?.toLowerCase());
      
      if (!currentUser?.profile && !isCurrentUserAdmin && !isCurrentUserTecnico) {
        setShowProfileDialog(true);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar usuário:", error);
      // Se erro ao carregar usuário, redirecionar para login
      navigate(createPageUrl("Access"));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await base44.auth.updateMe({ profile: selectedProfile });
      await loadUser();
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setShowProfileDialog(false);
      toast.success(`Perfil alterado para ${getProfileLabel(selectedProfile)}`);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao alterar perfil");
    }
  };

  const handleLogout = async () => {
    // Limpar localStorage
    localStorage.removeItem('ofi_pending_auth_email');
    localStorage.removeItem('ofi_auth_mode');
    
    await base44.auth.logout();
    navigate(createPageUrl("Access"));
  };

  // Verifica se é admin pelo role (imutável) OU pelo email especial OU pela whitelist
  const isAdmin = () => {
    if (!user) return false;
    const userEmail = user.email?.toLowerCase();
    return (
      user.role === 'admin' || 
      userEmail?.includes('jjance') ||
      ADMIN_WHITELIST.includes(userEmail)
    );
  };

  const getNavigationItems = () => {
    if (!user?.profile) return [];

    const allItems = [
      {
                    title: "Dashboard",
                    url: createPageUrl("Dashboard"),
                    icon: LayoutDashboard,
                    profiles: ["admin", "supervisor", "operador", "comprador", "op_balanca", "gerente_originacao", "controladoria", "producao", "originacao", "qualidade"]
                  },
      {
        title: "Métricas",
        url: createPageUrl("Visao"),
        icon: BarChart3,
        profiles: ["admin", "gerente_originacao", "qualidade"]
      },
      {
        title: "Monitor",
        url: createPageUrl("Monitor"),
        icon: Monitor,
        profiles: ["admin", "supervisor", "operador", "gerente_originacao", "controladoria", "producao", "originacao", "op_balanca"]
      },
      {
        title: "Novo Agendamento",
        url: createPageUrl("NewScheduling"),
        icon: PlusCircle,
        profiles: ["admin", "comprador", "supervisor", "gerente_originacao"]
      },
      {
        title: "Calendário",
        url: createPageUrl("Calendar"),
        icon: Calendar,
        profiles: ["admin", "supervisor", "operador", "comprador", "op_balanca", "gerente_originacao", "controladoria", "producao", "originacao", "qualidade"]
      },
      {
        title: "Controle de Indiretos",
        url: createPageUrl("ControleIndiretos"),
        icon: DollarSign,
        profiles: ["admin", "supervisor", "gerente_originacao", "comprador"]
      },
      {
        title: "Transferência 2082",
        url: createPageUrl("Transfer2082"),
        icon: Package,
        profiles: ["admin", "supervisor", "operador", "controladoria", "producao", "originacao", "op_balanca"]
      },
      {
        title: "Qualidade",
        url: createPageUrl("Quality"),
        icon: Shield,
        profiles: ["admin", "supervisor", "analista_qualidade", "qualidade", "gerente_originacao", "classificador"]
      },
      {
        title: "Moega Dia Anterior",
        url: createPageUrl("MoegaAnterior"),
        icon: Package,
        profiles: ["admin", "analista_qualidade", "qualidade", "classificador", "gerente_originacao"]
      },
      {
        title: "Transferência Depósitos",
        url: createPageUrl("TransferDeposits"),
        icon: Package,
        profiles: ["admin", "analista_qualidade", "qualidade", "classificador", "supervisor"]
      },
      {
        title: "Qualidade por Pilha",
        url: createPageUrl("PileQuality"),
        icon: Package,
        profiles: ["admin", "supervisor", "analista_qualidade", "qualidade", "gerente_originacao"]
      },
      {
        title: "Hub de Inovação",
        url: createPageUrl("SugestoesAdmin"),
        icon: Lightbulb,
        profiles: ["admin", "gerente_originacao"]
      },
      {
        title: "Documentação Técnica",
        url: createPageUrl("DocumentationExport"),
        icon: FileText,
        profiles: ["admin"]
      },
      {
        title: "Gestão de Fazendas",
        url: createPageUrl("GestaoFazendas2"),
        icon: TreePine,
        profiles: ["admin", "gerente_sustentabilidade"]
      },
      {
        title: "Checklist de Fazendas",
        url: createPageUrl("ChecklistFazendas2"),
        icon: ClipboardList,
        profiles: ["admin", "gerente_sustentabilidade"]
      },
      {
        title: "Checklist Técnicos",
        url: createPageUrl("ChecklistFazendas"),
        icon: ClipboardList,
        profiles: ["admin", "tecnico_agricola", "gerente_sustentabilidade"]
      },
      {
        title: "Manual do Sistema",
        url: createPageUrl("ManualTecnico"),
        icon: BookOpen,
        profiles: ["admin", "tecnico_agricola", "gerente_sustentabilidade"]
      },
      {
        title: "Meeiros",
        url: createPageUrl("Meeiros"),
        icon: UserCheck,
        profiles: ["admin", "gerente_sustentabilidade"]
      },
      {
        title: "Dashboard Sustentabilidade",
        url: createPageUrl("DashboardSustentabilidade"),
        icon: Activity,
        profiles: ["admin", "gerente_sustentabilidade", "comprador"]
      },
      {
        title: "Minha Performance",
        url: createPageUrl("DashboardTecnico"),
        icon: Activity,
        profiles: ["admin", "tecnico_agricola"]
      },
      {
        title: "Atribuição de Visitas",
        url: createPageUrl("ConfigGerais"),
        icon: SlidersHorizontal,
        profiles: ["admin", "gerente_sustentabilidade"]
      },
      {
        title: "Dados Sustentabilidade",
        url: createPageUrl("SustentabilidadeDados"),
        icon: Activity,
        profiles: ["admin", "gerente_sustentabilidade", "comprador"]
      },
      {
        title: "Config. Sustentabilidade",
        url: createPageUrl("ConfigSustentabilidade"),
        icon: Settings,
        profiles: ["admin", "gerente_sustentabilidade"]
      },
      {
        title: "Técnicos Agrícolas",
        url: createPageUrl("Tecnicos"),
        icon: Users,
        profiles: ["admin", "gerente_sustentabilidade"],
      },

      {
        title: "Saldo de Contratos",
        url: createPageUrl("SaldoContratos"),
        icon: FileText,
        profiles: ["admin"]
      },
      {
        title: "Projetos",
        url: createPageUrl("Projects"),
        icon: BarChart3,
        profiles: ["admin", "gerente_originacao"]
      },
      {
        title: "Aprovações",
        url: createPageUrl("Approvals"),
        icon: Bell,
        profiles: ["admin", "gerente_originacao", "qualidade", "analista_qualidade", "supervisor", "classificador"]
      },
      {
        title: "Histórico",
        url: createPageUrl("History"),
        icon: HistoryIcon,
        profiles: ["admin", "supervisor", "operador", "comprador", "op_balanca", "gerente_originacao", "controladoria", "producao", "originacao"]
      },
      {
        title: "Relatórios",
        url: createPageUrl("Reports"),
        icon: BarChart3,
        profiles: ["admin", "supervisor", "gerente_originacao", "controladoria", "producao", "originacao", "qualidade"]
      },
      {
        title: "Todos os Dados",
        url: createPageUrl("AllData"),
        icon: FileText,
        profiles: ["admin"]
      },
      {
        title: "Dados Transferências 2082",
        url: createPageUrl("AllTransfers2082"),
        icon: FileText,
        profiles: ["admin"]
      },

      {
        title: "Fornecedores",
        url: createPageUrl("Suppliers"),
        icon: Package,
        profiles: ["admin", "supervisor", "comprador"]
      },
      {
        title: "Enviar Email",
        url: createPageUrl("EmailSchedule"),
        icon: Mail,
        profiles: ["admin", "supervisor"]
      },
      {
                    title: "Liberação de Cargas",
                    url: createPageUrl("ReleaseManagement"),
                    icon: Package,
                    profiles: ["admin", "supervisor", "analista_qualidade", "qualidade", "operador", "gerente_originacao", "classificador"]
                  }
    ];

    // Transações e Workflow - para todos os admins
    if (isAdmin()) {
      allItems.push({
        title: "Transações",
        url: createPageUrl("Transactions"),
        icon: HistoryIcon,
        profiles: ["admin"],
        adminOnly: true
      });
      allItems.push({
        title: "Workflow",
        url: createPageUrl("Workflow"),
        icon: HistoryIcon,
        profiles: ["admin"],
        adminOnly: true
      });
    }

    // Insights - apenas para jjancem@gmail.com e jose.j.santos@ofi.com
    if (user?.email === 'jjancem@gmail.com' || user?.email === 'jose.j.santos@ofi.com' || user?.email === 'murilo.nascimento@ofi.com') {
      allItems.push({
        title: "Insights",
        url: createPageUrl("Insights"),
        icon: BarChart3,
        profiles: ["admin"],
        adminOnly: true
      });
    }

    if (isAdmin()) {
      allItems.push(
        {
          title: "Configurações",
          url: createPageUrl("Settings"),
          icon: Settings,
          profiles: ["admin"],
          divider: true,
          adminOnly: true
        },
        {
          title: "Usuários",
          url: createPageUrl("UserManagement"),
          icon: Users,
          profiles: ["admin"],
          adminOnly: true
        },
        {
          title: "Notificações",
          url: createPageUrl("Notifications"),
          icon: Bell,
          profiles: ["admin"],
          adminOnly: true
        }
      );
    }

    return allItems.filter(item => {
      if (item.adminOnly && !isAdmin()) return false;
      if (item.restrictedEmails && !item.restrictedEmails.includes(user.email?.toLowerCase())) return false;
      return item.profiles.includes(user.profile);
    });
    };

  const getProfileLabel = getProfileLabelUtil;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#860063] to-[#F88D2A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
      </div>
    );
  }

  // Se acesso negado, mostrar apenas o dialog (SEM mencionar whitelist)
  if (showAccessDeniedDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Dialog open={showAccessDeniedDialog} onOpenChange={() => {}}>
          <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Shield className="w-6 h-6" />
                Acesso Negado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-semibold mb-3">
                  🚫 Este sistema é restrito a colaboradores OFI
                </p>
                <div className="space-y-3">
                  <div className="bg-white border border-red-300 rounded-lg p-3">
                    <p className="text-sm text-red-700 mb-2">
                      <strong>Email detectado:</strong>
                    </p>
                    <code className="bg-red-100 px-2 py-1 rounded text-xs block">
                      {user?.email || 'não autorizado'}
                    </code>
                  </div>
                  <div className="bg-white border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-700 mb-2">
                      <strong>✅ Domínio autorizado:</strong>
                    </p>
                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs block">
                      @ofi.com
                    </code>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Colaborador OFI?</strong><br />
                      Entre em contato com o departamento de TI para obter acesso com seu email corporativo @ofi.com
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-800">
                      <strong>⚠️ Conta criada por engano?</strong><br />
                      Sua conta será automaticamente desativada. Use um email @ofi.com para criar uma nova conta válida.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={async () => {
                  console.log('🚪 Usuário clicou em Sair - executando logout forçado');
                  await base44.auth.logout();
                  navigate(createPageUrl("Access"));
                }}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair do Sistema
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: #860063;
          --primary-dark: #6b004f;
          --secondary: #F88D2A;
          --secondary-light: #ffa347;
        }
      `}</style>

      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-3 bg-gradient-to-r from-[#860063] to-[#6b004f]">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img
                  src={OFI_LOGO_URL}
                  alt="OFI Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "https://www.ofi.com/favicon.ico";
                  }}
                />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">Central</h2>
                                      <p className="text-xs text-white/80">Pulse</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-1.5">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {getNavigationItems().map((item) => (
                    <React.Fragment key={item.title}>
                      {item.divider && (
                        <div className="my-2">
                          <div className="border-t border-gray-300 mb-1.5" />
                          {isAdmin() && (
                            <div className="px-2 py-1.5 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                                Administração
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-[#860063]/10 hover:text-[#860063] transition-all duration-200 rounded-lg mb-0.5 group ${
                            location.pathname === item.url ? 'bg-[#860063]/10 text-[#860063] font-semibold' : ''
                          } ${item.adminOnly ? 'bg-purple-50/50' : ''}`}
                        >
                          <Link to={item.url} className="flex items-center gap-2.5 px-2.5 py-1.5">
                            <item.icon className={`w-4 h-4 transition-colors ${
                              location.pathname === item.url
                                ? item.adminOnly ? 'text-purple-600' : 'text-[#F88D2A]'
                                : item.adminOnly ? 'text-purple-500 group-hover:text-purple-600' : 'group-hover:text-[#F88D2A]'
                            }`} />
                            <span className="font-medium text-sm">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </React.Fragment>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className={`w-8 h-8 ${isAdmin() ? 'bg-gradient-to-br from-purple-600 to-purple-800' : 'bg-gradient-to-br from-[#860063] to-[#F88D2A]'}`}>
                  <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-xs truncate">{user?.full_name}</p>
                  <div className="flex items-center gap-1">
                    {isAdmin() && (
                      <Shield className="w-2.5 h-2.5 text-purple-600" />
                    )}
                    <p className={`text-xs text-white rounded-full px-1.5 py-0.5 inline-block ${
                      isAdmin() ? 'bg-purple-600' : 'bg-[#860063]'
                    }`}>
                      {isAdmin() ? 'Admin' : getProfileLabel(user?.profile)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                {isAdmin() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProfile(user?.profile || "");
                      setShowProfileDialog(true);
                    }}
                    className="flex-1 hover:bg-[#860063]/10 hover:border-[#860063] h-7 text-xs"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Perfil
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className={`${isAdmin() ? 'flex-1' : 'w-full'} hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors h-7 text-xs`}
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sair
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 md:hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 flex-1">
                <SidebarTrigger asChild>
                  <button className="p-2.5 hover:bg-gradient-to-r hover:from-[#860063]/10 hover:to-[#F88D2A]/10 rounded-xl transition-all duration-200 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center border-2 border-gray-200 hover:border-[#860063]/30">
                    <Menu className="w-6 h-6 text-[#860063]" />
                  </button>
                </SidebarTrigger>
                <div className="flex-1">
                  <h2 className="font-bold text-[#860063] text-base">Central Pulse</h2>
                                          <p className="text-xs text-gray-600">Sistema de Descargas</p>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-50 rounded-xl flex items-center justify-center p-2 shadow-md border-2 border-[#860063]/20 min-w-[56px] min-h-[56px]">
                <img
                  src={OFI_LOGO_URL}
                  alt="OFI Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "https://www.ofi.com/favicon.ico";
                  }}
                />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Alert Popups - carregados após 5s para não competir com queries da página */}
      {alertsReady && (
        <>
          {user?.profile === "op_balanca" && <CalledVehiclesPopup />}
          {(user?.profile === "gerente_originacao" || user?.profile === "admin" || user?.profile === "qualidade") && (
            <MoistureAlertPopup user={user} />
          )}
          {(user?.profile === "analista_qualidade" || user?.profile === "admin" || user?.profile === "classificador") && (
            <ReleaseAlertPopup user={user} />
          )}
          {(user?.profile === "operador" || user?.profile === "op_balanca" || user?.profile === "supervisor") && (
            <QualityResultsAlertPopup user={user} />
          )}
          {(user?.profile === "gerente_sustentabilidade" || user?.role === "admin") && (
            <VisitaConcluidaAlertPopup user={user} />
          )}
        </>
      )}

      {/* Inactivity Warning Dialog */}
      <Dialog open={showInactivityWarning} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Bell className="w-6 h-6 animate-pulse" />
              Aviso de Inatividade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 font-semibold mb-3 text-center">
                ⏱️ Você está inativo há algum tempo
              </p>
              
              <div className="bg-white rounded-lg p-4 border-2 border-orange-300 mb-4">
                <p className="text-center mb-2 text-sm text-gray-700">
                  Sua sessão será encerrada automaticamente em:
                </p>
                <div className="text-center">
                  <span className="text-4xl font-bold text-orange-600 tabular-nums">
                    {formatTime(warningCountdown)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>🔒 Segurança:</strong><br />
                  Por motivos de segurança, o sistema encerra automaticamente sessões após 15 minutos sem atividade.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleStayActive}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
              >
                ✓ Continuar Conectado
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                Sair Agora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showProfileDialog} 
        onOpenChange={(open) => {
          // Admin pode fechar livremente; usuário sem perfil NÃO pode fechar sem selecionar
          if (isAdmin() || user?.profile) setShowProfileDialog(open);
        }}
      >
        <DialogContent
            onPointerDownOutside={(e) => { if (!isAdmin() && !user?.profile) e.preventDefault(); }}
            onEscapeKeyDown={(e) => { if (!isAdmin() && !user?.profile) e.preventDefault(); }}
          >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#860063]" />
              {isAdmin() ? 'Alterar Perfil (Admin)' : 'Selecione seu Perfil'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isAdmin() ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                  <strong>👑 Modo Admin:</strong> Você pode alternar entre perfis para testar diferentes funcionalidades.
                  Seu status de admin é permanente e não será perdido.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>👋 Bem-vindo!</strong> Selecione o perfil que corresponde à sua função no sistema.
                  Esta configuração define quais funcionalidades você terá acesso.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="profile">Perfil de Acesso</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PROFILES.map(profile => {
                    // Filtrar admin para usuários admin apenas
                    if (profile.value === 'admin' && !isAdmin()) return null;
                    
                    return (
                      <SelectItem key={profile.value} value={profile.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-semibold flex items-center gap-2">
                            <span>{profile.icon}</span>
                            {profile.label}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {isAdmin() && selectedProfile && selectedProfile !== 'admin' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Dica:</strong> Você ainda poderá voltar ao perfil Admin a qualquer momento usando o botão "Perfil" no menu.
                </p>
              </div>
            )}

            <Button
              onClick={handleProfileUpdate}
              disabled={!selectedProfile}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
            >
              {isAdmin() ? 'Alterar Perfil' : 'Confirmar Perfil'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}