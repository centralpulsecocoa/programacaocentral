import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Access from '@/pages/Access';

// Layout e páginas são carregados dinamicamente do pages.config.js
// (copiado do projeto original conforme o README). Se ainda não foi copiado,
// o app continua funcionando para o fluxo de login.
function usePagesConfig() {
  const [cfg, setCfg] = useState({ Layout: null, Pages: {}, mainPage: null, loaded: false });
  useEffect(() => {
    import(/* @vite-ignore */ '@/pages.config.js')
      .then((m) => {
        const pc = m.pagesConfig || {};
        setCfg({ Layout: pc.Layout || null, Pages: pc.Pages || {}, mainPage: pc.mainPage || null, loaded: true });
      })
      .catch(() => setCfg((c) => ({ ...c, loaded: true })));
  }, []);
  return cfg;
}

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#860063] to-[#F88D2A]">
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function ProtectedApp() {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  const cfg = usePagesConfig();

  if (isLoadingAuth || !cfg.loaded) return <Spinner />;

  // Não autenticado → sempre redireciona para a tela de login (/access)
  if (!isAuthenticated) {
    return <Navigate to="/access" state={{ from: location }} replace />;
  }

  // Autenticado: monta o Layout (se copiado) + página atual.
  const Layout = cfg.Layout;
  // Resolução case-insensitive: createPageUrl lowercases o path, mas as chaves
  // do pagesConfig são capitalizadas ("Dashboard"). Normaliza para casar.
  const pageKeys = Object.keys(cfg.Pages);
  const requested = (location.pathname.replace(/^\//, '') || cfg.mainPage || '').toLowerCase().replace(/-/g, '');
  let CurrentPage = null;
  for (const k of pageKeys) {
    if (k.toLowerCase().replace(/ /g, '-').replace(/-/g, '') === requested) { CurrentPage = cfg.Pages[k]; break; }
  }
  if (!CurrentPage && cfg.mainPage) CurrentPage = cfg.Pages[cfg.mainPage];

  // Sem páginas copiadas ainda: mostra placeholder dentro do Layout (se houver).
  if (!CurrentPage) {
    const placeholder = (
      <div className="p-8 text-center text-gray-600">
        <h1 className="text-xl font-bold mb-2">Central Pulse — Migração</h1>
        <p>Login realizado com sucesso. Copie as páginas do projeto original para <code className="bg-gray-100 px-1 rounded">src/pages/</code> e o <code className="bg-gray-100 px-1 rounded">src/pages.config.js</code> para ver o app completo.</p>
      </div>
    );
    return Layout ? <Layout>{placeholder}</Layout> : placeholder;
  }

  return Layout ? <Layout>{<CurrentPage />}</Layout> : <CurrentPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/access" element={<Access />} />
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
