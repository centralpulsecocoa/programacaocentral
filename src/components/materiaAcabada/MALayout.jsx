import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Truck, Calendar as CalendarIcon, ShieldCheck, Layers } from "lucide-react";

const OFI_LOGO_URL = "https://ofiturkey.com.tr/Content/images/ofi-logo-reverse.svg";

const navItems = [
  { title: "Dashboard", path: "/materiaacabada", icon: LayoutDashboard },
  { title: "Prog. Expedição", path: "/materiaacabadaexpedicao", icon: Truck },
  { title: "Cal. Expedição", path: "/materiaacabadacalendarioexpedicao", icon: CalendarIcon },
  { title: "Liberação Embarques", path: "/materiaacabadaliberacaoembarques", icon: ShieldCheck },
  { title: "Gestão de Lotes", path: "/materiaacabadalotes", icon: Layers },
];

const pageTitles = {
  "/materiaacabada": "Painel de Controle",
  "/materiaacabadaexpedicao": "Programação de Expedição",
  "/materiaacabadacalendarioexpedicao": "Calendário de Expedição",
  "/materiaacabadaliberacaoembarques": "Liberação de Embarques",
  "/materiaacabadalotes": "Gestão de Lotes",
};

export default function MALayout({ children, headerRight }) {
  const location = useLocation();
  const subtitle = pageTitles[location.pathname] || "";

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-52 bg-white border-r border-gray-200 shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#860063] to-[#6b004f]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg" alt="OFI" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Matéria</p>
              <p className="text-white/80 text-xs">Acabada</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === item.path
                  ? "bg-[#860063]/10 text-[#860063] font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#860063]"
              }`}
            >
              <item.icon className={`w-4 h-4 ${location.pathname === item.path ? "text-[#F88D2A]" : ""}`} />
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">OFI — Matéria Acabada</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tricolor top banner */}
        <div className="relative overflow-hidden shadow-xl flex-shrink-0">
          <div className="bg-gradient-to-r from-[#860063] via-[#a0007d] to-[#860063] absolute top-0 left-0 right-0" style={{ height: "90%" }} />
          <div className="bg-gradient-to-r from-white via-gray-100 to-white absolute left-0 right-0" style={{ top: "90%", height: "6%" }} />
          <div className="bg-gradient-to-r from-[#F88D2A] via-[#ff9d3d] to-[#F88D2A] absolute bottom-0 left-0 right-0" style={{ height: "4%" }} />

          <div className="relative z-10 px-4 md:px-6 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-12 md:w-20 md:h-14 flex items-center justify-center">
                <img src={OFI_LOGO_URL} alt="OFI Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-black text-white tracking-tight drop-shadow-lg">
                  Matéria Acabada
                </h1>
                <p className="text-xs text-white/90 font-medium drop-shadow-md">{subtitle}</p>
              </div>
            </div>
            {headerRight && (
              <div className="flex items-center">
                {headerRight}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}