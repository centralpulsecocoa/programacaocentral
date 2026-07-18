import './App.css'
import React from 'react';
import MateriaAcabada from './pages/MateriaAcabada';
import MateriaAcabadaUsuarios from './pages/MateriaAcabadaUsuarios';
import MateriaAcabadaBalanca from './pages/MateriaAcabadaBalanca';
import MateriaAcabadaExpedicao from './pages/MateriaAcabadaExpedicao';
import MateriaAcabadaCalendarioExpedicao from './pages/MateriaAcabadaCalendarioExpedicao';
import MateriaAcabadaLiberacaoEmbarques from './pages/MateriaAcabadaLiberacaoEmbarques';
import MateriaAcabadaLotes from './pages/MateriaAcabadaLotes';
import ExtractorPDF from './pages/ExtractorPDF';
import Sugestoes from './pages/Sugestoes';
import SugestoesQR from './pages/SugestoesQR';
import SugestoesAdmin from './pages/SugestoesAdmin';
import DocumentationExport from './pages/DocumentationExport';
import InfograficoProjetos from './pages/InfograficoProjetos';
import Produtores from './pages/Produtores';
import GestaoFazendas from './pages/GestaoFazendas';
import Tecnicos from './pages/Tecnicos';
import ChecklistFazendas from './pages/ChecklistFazendas.jsx';
import SustentabilidadeDados from './pages/SustentabilidadeDados.jsx';
import ChecklistConfiguracao from './pages/ChecklistConfiguracao.jsx';
import GestaoFazendas2 from './pages/GestaoFazendas2.jsx';
import ChecklistFazendas2 from './pages/ChecklistFazendas2.jsx';
import Meeiros from './pages/Meeiros.jsx';
import DashboardSustentabilidade from './pages/DashboardSustentabilidade.jsx';
import DashboardTecnico from './pages/DashboardTecnico.jsx';
import ConfigGerais from './pages/ConfigGerais.jsx';
import ConfigSustentabilidade from './pages/ConfigSustentabilidade.jsx';
import Inventory from './pages/Inventory.jsx';
import ControleIndiretos from './pages/ControleIndiretos.jsx';
import ManualTecnico from './pages/ManualTecnico.jsx';
import DownloadProject from './pages/DownloadProject.jsx';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Rota que exige autenticação explícita independente das configurações do app
const ProtectedRoute = ({ element }) => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, navigateToLogin } = useAuth();
  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }
  return element;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/materiaacabada" element={<ProtectedRoute element={<MateriaAcabada />} />} />
      <Route path="/materiaacabadausuarios" element={<ProtectedRoute element={<MateriaAcabadaUsuarios />} />} />
      <Route path="/materiaacabadabalanca" element={<ProtectedRoute element={<MateriaAcabadaBalanca />} />} />
      <Route path="/materiaacabadaexpedicao" element={<ProtectedRoute element={<MateriaAcabadaExpedicao />} />} />
      <Route path="/materiaacabadacalendarioexpedicao" element={<ProtectedRoute element={<MateriaAcabadaCalendarioExpedicao />} />} />
      <Route path="/materiaacabadaliberacaoembarques" element={<ProtectedRoute element={<MateriaAcabadaLiberacaoEmbarques />} />} />
      <Route path="/materiaacabadalotes" element={<ProtectedRoute element={<MateriaAcabadaLotes />} />} />
      <Route path="/extractorpdf" element={<ProtectedRoute element={<ExtractorPDF />} />} />
      <Route path="/sugestoesqr" element={<ProtectedRoute element={<SugestoesQR />} />} />
      <Route path="/sugestoes" element={<ProtectedRoute element={<Sugestoes />} />} />
      <Route path="/sugestoesadmin" element={<ProtectedRoute element={<LayoutWrapper currentPageName="SugestoesAdmin"><SugestoesAdmin /></LayoutWrapper>} />} />
      <Route path="/documentationexport" element={<ProtectedRoute element={<LayoutWrapper currentPageName="DocumentationExport"><DocumentationExport /></LayoutWrapper>} />} />
      <Route path="/infograficoprojetos" element={<ProtectedRoute element={<LayoutWrapper currentPageName="InfograficoProjetos"><InfograficoProjetos /></LayoutWrapper>} />} />
      <Route path="/produtores" element={<ProtectedRoute element={<LayoutWrapper currentPageName="Produtores"><Produtores /></LayoutWrapper>} />} />
      <Route path="/gestaofazendas" element={<ProtectedRoute element={<LayoutWrapper currentPageName="GestaoFazendas"><GestaoFazendas /></LayoutWrapper>} />} />
      <Route path="/tecnicos" element={<ProtectedRoute element={<LayoutWrapper currentPageName="Tecnicos"><Tecnicos /></LayoutWrapper>} />} />
      <Route path="/checklistfazendas" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ChecklistFazendas"><ChecklistFazendas /></LayoutWrapper>} />} />
      <Route path="/sustentabilidadedados" element={<ProtectedRoute element={<LayoutWrapper currentPageName="SustentabilidadeDados"><SustentabilidadeDados /></LayoutWrapper>} />} />
      <Route path="/checklistconfiguracao" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ChecklistConfiguracao"><ChecklistConfiguracao /></LayoutWrapper>} />} />
      <Route path="/gestaofazendas2" element={<ProtectedRoute element={<LayoutWrapper currentPageName="GestaoFazendas2"><GestaoFazendas2 /></LayoutWrapper>} />} />
      <Route path="/checklistfazendas2" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ChecklistFazendas2"><ChecklistFazendas2 /></LayoutWrapper>} />} />
      <Route path="/meeiros" element={<ProtectedRoute element={<LayoutWrapper currentPageName="Meeiros"><Meeiros /></LayoutWrapper>} />} />
      <Route path="/dashboardsustentabilidade" element={<ProtectedRoute element={<LayoutWrapper currentPageName="DashboardSustentabilidade"><DashboardSustentabilidade /></LayoutWrapper>} />} />
      <Route path="/dashboardtecnico" element={<ProtectedRoute element={<LayoutWrapper currentPageName="DashboardTecnico"><DashboardTecnico /></LayoutWrapper>} />} />
      <Route path="/configgerais" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ConfigGerais"><ConfigGerais /></LayoutWrapper>} />} />
      <Route path="/configsustentabilidade" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ConfigSustentabilidade"><ConfigSustentabilidade /></LayoutWrapper>} />} />
      <Route path="/inventory" element={<ProtectedRoute element={<LayoutWrapper currentPageName="Inventory"><Inventory /></LayoutWrapper>} />} />
      <Route path="/controleindiretos" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ControleIndiretos"><ControleIndiretos /></LayoutWrapper>} />} />
      <Route path="/manualtecnico" element={<ProtectedRoute element={<LayoutWrapper currentPageName="ManualTecnico"><ManualTecnico /></LayoutWrapper>} />} />
      <Route path="/downloadproject" element={<ProtectedRoute element={<LayoutWrapper currentPageName="DownloadProject"><DownloadProject /></LayoutWrapper>} />} />
      <Route path="/*" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route key={path} path={`/${path}`} element={<Page />} />
            ))}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </LayoutWrapper>
      } />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App