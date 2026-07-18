/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Access from './pages/Access';
import AllData from './pages/AllData';
import AllTransfers2082 from './pages/AllTransfers2082';
import Approvals from './pages/Approvals';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import EmailSchedule from './pages/EmailSchedule';
import History from './pages/History';
import Home from './pages/Home';
import Insights from './pages/Insights';
import Insights2 from './pages/Insights2';
import MoegaAnterior from './pages/MoegaAnterior';
import Monitor from './pages/Monitor';
import NewScheduling from './pages/NewScheduling';
import Notifications from './pages/Notifications';
import PileQuality from './pages/PileQuality';
import PowerBIGuide from './pages/PowerBIGuide';
import Projects from './pages/Projects';
import ProjectsDashboard from './pages/ProjectsDashboard';
import Quality from './pages/Quality';
import ReleaseManagement from './pages/ReleaseManagement';
import Reports from './pages/Reports';
import SaldoContratos from './pages/SaldoContratos';
import Settings from './pages/Settings';
import Splash from './pages/Splash';
import Suppliers from './pages/Suppliers';
import Transactions from './pages/Transactions';
import Transfer2082 from './pages/Transfer2082';
import TransferDeposits from './pages/TransferDeposits';
import UserGuide from './pages/UserGuide';
import UserManagement from './pages/UserManagement';
import Visao from './pages/Visao';
import Workflow from './pages/Workflow';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Access": Access,
    "AllData": AllData,
    "AllTransfers2082": AllTransfers2082,
    "Approvals": Approvals,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "EmailSchedule": EmailSchedule,
    "History": History,
    "Home": Home,
    "Insights": Insights,
    "Insights2": Insights2,
    "MoegaAnterior": MoegaAnterior,
    "Monitor": Monitor,
    "NewScheduling": NewScheduling,
    "Notifications": Notifications,
    "PileQuality": PileQuality,
    "PowerBIGuide": PowerBIGuide,
    "Projects": Projects,
    "ProjectsDashboard": ProjectsDashboard,
    "Quality": Quality,
    "ReleaseManagement": ReleaseManagement,
    "Reports": Reports,
    "SaldoContratos": SaldoContratos,
    "Settings": Settings,
    "Splash": Splash,
    "Suppliers": Suppliers,
    "Transactions": Transactions,
    "Transfer2082": Transfer2082,
    "TransferDeposits": TransferDeposits,
    "UserGuide": UserGuide,
    "UserManagement": UserManagement,
    "Visao": Visao,
    "Workflow": Workflow,
}

export const pagesConfig = {
    mainPage: "Splash",
    Pages: PAGES,
    Layout: __Layout,
};