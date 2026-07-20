import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const OFI_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";

const slides = [
  {
    title: "Central Pulse",
    subtitle: "Sistema de Gestão de Descargas",
    type: "cover",
    content: "Manual do Usuário · OFI Brasil · 2026",
  },
  {
    title: "Visão Geral do Sistema",
    subtitle: "O que é o Central Pulse?",
    type: "text",
    items: [
      "Sistema digital para gestão e rastreamento de descargas de cacau na OFI Brasil.",
      "Centraliza agendamentos, qualidade, liberação de cargas e relatórios em um único lugar.",
      "Acesso seguro restrito a colaboradores com email @ofi.com.",
      "Disponível em desktop e dispositivos móveis.",
      "Diferentes perfis de acesso: Supervisor, Operador, Comprador, Qualidade, Gerente, entre outros.",
    ],
  },
  {
    title: "Login e Acesso",
    subtitle: "Como acessar o sistema",
    type: "text",
    items: [
      "Acesse pelo link fornecido pela equipe de TI.",
      "Faça login com seu email corporativo @ofi.com.",
      "Na primeira vez, selecione seu perfil de acesso (ex: Operador, Comprador, Supervisor...).",
      "O sistema encerra a sessão automaticamente após 15 minutos de inatividade (segurança).",
      "Para alterar seu perfil, use o botão 'Perfil' no rodapé do menu lateral (apenas admins).",
    ],
  },
  {
    title: "Dashboard",
    subtitle: "Painel principal de operações",
    type: "text",
    color: "#3b82f6",
    items: [
      "Visão geral do dia: agendamentos de hoje e amanhã.",
      "Cards com métricas: % recebido, volume total, tempo médio de descarga.",
      "Status das linhas por armazém em tempo real.",
      "Resumo diário por armazém com totais consolidados.",
      "Atualização automática a cada minuto.",
    ],
  },
  {
    title: "Monitor",
    subtitle: "Acompanhamento em tempo real",
    type: "text",
    color: "#8b5cf6",
    items: [
      "Visualização em tempo real de todas as descargas ativas.",
      "Ideal para exibir em telas de operação no armazém.",
      "Mostra status, linha, fornecedor e quantidades em andamento.",
      "Atualização automática contínua.",
    ],
  },
  {
    title: "Novo Agendamento",
    subtitle: "Como criar um agendamento",
    type: "text",
    color: "#22c55e",
    items: [
      "Disponível para: Comprador, Supervisor, Gerente Originação e Admin.",
      "Informe: fornecedor, data, horário, armazém, linha, quantidade e tipo de contrato.",
      "O sistema valida conflitos de horário e disponibilidade de linha automaticamente.",
      "Após criação, o agendamento aparece imediatamente no Calendário e no Monitor.",
      "Um email de confirmação pode ser enviado ao fornecedor.",
    ],
  },
  {
    title: "Calendário",
    subtitle: "Visualização e gestão dos agendamentos",
    type: "text",
    color: "#f59e0b",
    items: [
      "Exibe todos os agendamentos organizados por data e linha.",
      "Clique em um agendamento para ver detalhes ou editar.",
      "Operadores podem registrar chegada, início e fim de descarga.",
      "Op. Balança recebe alerta quando um veículo é chamado.",
      "Filtros por armazém, status e data disponíveis.",
    ],
  },
  {
    title: "Qualidade",
    subtitle: "Análise e liberação de amostras",
    type: "text",
    color: "#06b6d4",
    items: [
      "Classificadores registram análises de qualidade (umidade, FFA, contagem de grãos, etc.).",
      "Parecer da Qualidade: favorável ou desfavorável.",
      "Gerente de Originação aprova ou devolve cargas com umidade fora do padrão.",
      "Alertas automáticos por email quando umidade excede limites.",
      "Histórico completo de análises por carga.",
    ],
  },
  {
    title: "Qualidade por Pilha",
    subtitle: "Rastreamento do estoque por lote",
    type: "text",
    color: "#10b981",
    items: [
      "Controle de qualidade de cada pilha/lote em estoque.",
      "Registra umidade e FFA na formação e a cada novo teste.",
      "Acompanha variações e saldo atual de cada pilha.",
      "Cálculo de blend sugerido com base nos parâmetros desejados.",
      "Importação em lote via Excel ou colagem de dados do MB52.",
    ],
  },
  {
    title: "Transferência 2082",
    subtitle: "Controle de transferências entre armazéns",
    type: "text",
    color: "#f97316",
    items: [
      "Registra operações de carga e descarga entre unidades.",
      "Controle de notas fiscais, WBs, pesos e lotes.",
      "Fluxo de liberação: Supervisor solicita → Analista de Qualidade libera.",
      "Histórico completo de todas as transferências.",
    ],
  },
  {
    title: "Liberação de Cargas",
    subtitle: "Workflow de aprovação",
    type: "text",
    color: "#ef4444",
    items: [
      "Cargas que precisam de liberação formal seguem um fluxo de aprovação.",
      "Supervisor solicita liberação após descarga concluída.",
      "Analista de Qualidade revisa e libera (ou rejeita).",
      "Registro automático de quem liberou e quando.",
      "Visível para Supervisores, Analistas de Qualidade, Gerente e Admin.",
    ],
  },
  {
    title: "Relatórios",
    subtitle: "Análises e exportação de dados",
    type: "text",
    color: "#6366f1",
    items: [
      "Relatórios por período, fornecedor, armazém e tipo de contrato.",
      "Gráficos de volume, tempo médio e desempenho de fornecedores.",
      "Exportação para Excel com um clique.",
      "Disponível para: Admin, Supervisor, Gerente, Controladoria, Produção e Originação.",
    ],
  },
  {
    title: "Gestão de Projetos",
    subtitle: "Acompanhamento de projetos internos",
    type: "text",
    color: "#860063",
    items: [
      "Cadastro de projetos com orçamento, datas, responsável e área.",
      "Suporte a hierarquia: Projetos Macro agrupam Subprojetos.",
      "Acompanhamento de progresso, gastos e status em tempo real.",
      "Dashboard com gráficos de status, prioridade, orçamento vs. gasto.",
      "Alertas de projetos atrasados automaticamente.",
    ],
  },
  {
    title: "Perfis de Acesso",
    subtitle: "Quem pode fazer o quê",
    type: "table",
    headers: ["Perfil", "Principais Permissões"],
    rows: [
      ["Administrador", "Acesso total a todas as funcionalidades"],
      ["Supervisor", "Agendamentos, operações, histórico, relatórios"],
      ["Gerente Originação", "Dashboard, qualidade, projetos, aprovações"],
      ["Operador", "Calendário, controle de descarga, monitor"],
      ["Op. Balança", "Registro de chegada, alertas de chamada"],
      ["Comprador", "Criar agendamentos, visualizar calendário"],
      ["Classificador", "Análises de qualidade, liberação de amostras"],
      ["Qualidade", "Qualidade, pilhas, relatórios, aprovações"],
      ["Controladoria / Produção / Originação", "Visualização e relatórios (somente leitura)"],
    ],
  },
  {
    title: "Dúvidas e Suporte",
    subtitle: "Contato e ajuda",
    type: "text",
    items: [
      "Em caso de problemas de acesso, entre em contato com o departamento de TI.",
      "Para dúvidas sobre funcionalidades, consulte seu supervisor ou gerente.",
      "Reportar bugs ou sugestões: jose.j.santos@ofi.com",
      "O sistema é atualizado continuamente com melhorias baseadas no feedback dos usuários.",
    ],
  },
];

export default function UserGuidePage() {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print button - hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b shadow-sm p-3 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-800">Guia do Usuário — Central Pulse</h1>
          <p className="text-xs text-gray-500">Clique em Imprimir para gerar o PDF</p>
        </div>
        <Button onClick={handlePrint} className="bg-[#860063] hover:bg-[#6b004f]">
          <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .slide { page-break-after: always; page-break-inside: avoid; }
          .slide:last-child { page-break-after: auto; }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>

      {/* Slides */}
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="slide bg-white rounded-2xl shadow-lg overflow-hidden"
            style={{ minHeight: "480px", display: "flex", flexDirection: "column" }}
          >
            {/* Slide Header */}
            <div
              className="p-6 text-white"
              style={{
                background: slide.type === "cover"
                  ? "linear-gradient(135deg, #860063, #F88D2A)"
                  : `linear-gradient(135deg, ${slide.color || "#860063"}, ${slide.color || "#860063"}cc)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium uppercase tracking-wider mb-1">
                    {slide.type === "cover" ? "OFI Brasil" : `Módulo ${i}`}
                  </p>
                  <h2 className={`font-bold text-white ${slide.type === "cover" ? "text-4xl" : "text-2xl"}`}>
                    {slide.title}
                  </h2>
                  <p className={`text-white/80 mt-1 ${slide.type === "cover" ? "text-xl" : "text-base"}`}>
                    {slide.subtitle}
                  </p>
                </div>
                <img src={OFI_LOGO} alt="OFI" className="w-14 h-14 object-contain bg-white rounded-xl p-1 opacity-90" />
              </div>
            </div>

            {/* Slide Content */}
            <div className="p-8 flex-1 flex flex-col justify-center">
              {slide.type === "cover" && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#860063] to-[#F88D2A] rounded-2xl flex items-center justify-center">
                    <img src={OFI_LOGO} alt="OFI" className="w-16 h-16 object-contain" />
                  </div>
                  <p className="text-gray-600 text-lg">{slide.content}</p>
                  <div className="flex justify-center gap-4">
                    <span className="bg-[#860063]/10 text-[#860063] text-sm font-semibold px-4 py-2 rounded-full">Sistema Web</span>
                    <span className="bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-2 rounded-full">Versão 2026</span>
                    <span className="bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-full">Mobile Ready</span>
                  </div>
                </div>
              )}

              {slide.type === "text" && (
                <ul className="space-y-4">
                  {slide.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: slide.color || "#860063" }}
                      >
                        {j + 1}
                      </span>
                      <p className="text-gray-700 text-base leading-relaxed">{item}</p>
                    </li>
                  ))}
                </ul>
              )}

              {slide.type === "table" && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {slide.headers.map((h, j) => (
                        <th key={j} className="text-left p-3 text-sm font-bold text-white rounded"
                          style={{ backgroundColor: "#860063" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slide.rows.map((row, j) => (
                      <tr key={j} className={j % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        {row.map((cell, k) => (
                          <td key={k} className="p-3 text-sm text-gray-700 border-b border-gray-100">
                            {k === 0 ? <strong>{cell}</strong> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Slide Footer */}
            <div className="px-8 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-400">Central Pulse · OFI Brasil · 2026</p>
              <p className="text-xs text-gray-400">{i + 1} / {slides.length}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}