import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// ── Paleta OFI ──────────────────────────────────────────────────────────────
const ROXO = "#860063";
const LARANJA = "#F88D2A";
const VERDE = "#16a34a";
const CINZA = "#374151";

// ── Helpers de desenho ───────────────────────────────────────────────────────
function slide(ctx, W, H, title, subtitle, bgColor = "#f9fafb") {
  // fundo
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);
  // barra lateral esquerda
  ctx.fillStyle = ROXO;
  ctx.fillRect(0, 0, 8, H);
  // header strip
  ctx.fillStyle = ROXO;
  ctx.fillRect(0, 0, W, 64);
  // logo text
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("Central Pulse  ·  OFI", 24, 40);
  // title
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Arial";
  ctx.fillText(title, W - 24, 40);
  ctx.textAlign = "right";
  ctx.fillText(title, W - 24, 40);
  ctx.textAlign = "left";
  // subtitle bar
  if (subtitle) {
    ctx.fillStyle = LARANJA;
    ctx.fillRect(0, 64, W, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px Arial";
    ctx.fillText(subtitle, 24, 88);
  }
}

function badge(ctx, x, y, text, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, ctx.measureText(text).width + 20, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px Arial";
  ctx.fillText(text, x + 10, y + 16);
}

function box(ctx, x, y, w, h, label, desc, borderColor = ROXO, bg = "#fff") {
  // sombra
  ctx.shadowColor = "rgba(0,0,0,0.10)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  // borda colorida esquerda
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.roundRect(x, y, 4, h, [8, 0, 0, 8]);
  ctx.fill();
  // textos
  ctx.fillStyle = CINZA;
  ctx.font = "bold 12px Arial";
  ctx.fillText(label, x + 14, y + 20);
  if (desc) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px Arial";
    wrapText(ctx, desc, x + 14, y + 36, w - 20, 15);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      ctx.fillText(line, x, cy);
      line = word + " ";
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}

function stepCircle(ctx, cx, cy, num, done = false) {
  ctx.fillStyle = done ? VERDE : ROXO;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(String(num), cx, cy + 4);
  ctx.textAlign = "left";
}

function mockButton(ctx, x, y, label, color = VERDE, w = 130) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 30, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 19);
  ctx.textAlign = "left";
}

function mockCard(ctx, x, y, w, nome, municipio, pct, status) {
  const h = 80;
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();

  ctx.fillStyle = CINZA;
  ctx.font = "bold 12px Arial";
  ctx.fillText(nome, x + 12, y + 20);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "10px Arial";
  ctx.fillText(municipio, x + 12, y + 36);

  // barra de progresso
  ctx.fillStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 46, w - 80, 8, 4);
  ctx.fill();
  ctx.fillStyle = pct === 100 ? VERDE : LARANJA;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 46, (w - 80) * pct / 100, 8, 4);
  ctx.fill();

  ctx.fillStyle = "#6b7280";
  ctx.font = "bold 10px Arial";
  ctx.fillText(pct + "% concluído", x + 12, y + 68);

  const sc = status === "concluido" ? VERDE : status === "em_andamento" ? "#3b82f6" : "#9ca3af";
  const sl = status === "concluido" ? "Concluído" : status === "em_andamento" ? "Em Andamento" : "Pendente";
  mockButton(ctx, x + w - 95, y + 24, sl, sc, 85);
}

function sectionTitle(ctx, y, text) {
  ctx.fillStyle = ROXO;
  ctx.font = "bold 15px Arial";
  ctx.fillText(text, 24, y);
  ctx.fillStyle = LARANJA;
  ctx.fillRect(24, y + 4, 40, 3);
}

function callout(ctx, x, y, w, text, color = ROXO) {
  ctx.fillStyle = color + "18";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 36, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 11px Arial";
  wrapText(ctx, text, x + 10, y + 14, w - 20, 14);
}

// ── Gerador de slides ────────────────────────────────────────────────────────
function drawSlide1(ctx, W, H) {
  // Capa
  ctx.fillStyle = ROXO;
  ctx.fillRect(0, 0, W, H);
  // Degrade diagonal
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, ROXO);
  grad.addColorStop(1, "#3b0028");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Círculos decorativos
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(W - 80, 80, 120, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(60, H - 60, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Logo
  ctx.fillStyle = LARANJA;
  ctx.font = "bold 28px Arial";
  ctx.fillText("Central Pulse", 60, 120);
  ctx.fillStyle = "#ffffff90";
  ctx.font = "14px Arial";
  ctx.fillText("OFI · Módulo de Sustentabilidade", 60, 145);

  // Linha divisória
  ctx.fillStyle = LARANJA;
  ctx.fillRect(60, 165, 80, 4);

  // Título principal
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial";
  ctx.fillText("Manual de", 60, 230);
  ctx.fillText("Treinamento", 60, 272);
  ctx.fillStyle = LARANJA;
  ctx.fillText("Técnicos Agrícolas", 60, 314);

  // Subtítulo
  ctx.fillStyle = "#ffffff80";
  ctx.font = "14px Arial";
  ctx.fillText("Guia passo a passo para uso do sistema de visitas", 60, 350);

  // Badges
  const tags = ["📱 Acesso mobile", "✅ Checklist de fazendas", "📊 Acompanhamento de performance"];
  tags.forEach((t, i) => {
    ctx.fillStyle = "#ffffff18";
    ctx.beginPath();
    ctx.roundRect(60, 390 + i * 40, 320, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(t, 76, 390 + i * 40 + 18);
  });

  // Rodapé
  ctx.fillStyle = "#ffffff40";
  ctx.font = "11px Arial";
  ctx.fillText("2025 · Uso interno OFI", 60, H - 30);
  ctx.textAlign = "right";
  ctx.fillText("Slide 1 / 7", W - 40, H - 30);
  ctx.textAlign = "left";
}

function drawSlide2(ctx, W, H) {
  slide(ctx, W, H, "Slide 2 / 7", "PASSO 1 — Como acessar o sistema");
  sectionTitle(ctx, 130, "Criando sua conta e fazendo login");

  const steps = [
    { n: 1, text: "Acesse o link do sistema no seu celular ou computador" },
    { n: 2, text: 'Clique em "Criar conta" e insira seu e-mail e senha' },
    { n: 3, text: "Ao entrar pela 1ª vez, seu perfil Técnico Agrícola é configurado automaticamente" },
    { n: 4, text: 'No menu lateral, você verá "Checklist Técnicos" e "Minha Performance"' },
  ];

  steps.forEach((s, i) => {
    const y = 155 + i * 78;
    stepCircle(ctx, 40, y + 18, s.n);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.07)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(64, y, W - 100, 52, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#374151";
    ctx.font = "bold 13px Arial";
    ctx.fillText(s.text, 80, y + 22);

    // linha conectora
    if (i < steps.length - 1) {
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(40, y + 36);
      ctx.lineTo(40, y + 78);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  callout(ctx, 24, H - 80, W - 48,
    "💡  Dica: Salve o link nos favoritos do celular para acessar rapidamente a qualquer momento.",
    "#2563eb");
}

function drawSlide3(ctx, W, H) {
  slide(ctx, W, H, "Slide 3 / 7", "PASSO 2 — Tela de Checklist de Fazendas");
  sectionTitle(ctx, 128, "O que você verá ao entrar no Checklist");

  // Mock da lista de fazendas
  mockCard(ctx, 24, 152, W - 48, "FAZENDA SÃO JOÃO — José Augusto", "Ilhéus · BA", 100, "concluido");
  mockCard(ctx, 24, 246, W - 48, "SITIO NOVA ESPERANÇA — Maria Silva", "Uruçuca · BA", 45, "em_andamento");
  mockCard(ctx, 24, 340, W - 48, "FAZENDA BOA VISTA — Carlos Pereira", "Itabuna · BA", 0, "pendente");

  // Anotações com setas
  ctx.fillStyle = ROXO;
  ctx.font = "bold 11px Arial";

  // Seta p/ barra de progresso
  ctx.strokeStyle = LARANJA;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W - 24, 300);
  ctx.lineTo(W - 24, 263);
  ctx.stroke();
  callout(ctx, W - 220, 302, 196,
    "Barra de progresso mostra % dos itens concluídos",
    LARANJA);

  // Seta p/ botão status
  callout(ctx, W - 220, 380, 196,
    "Botão muda de cor conforme o status da visita",
    "#3b82f6");

  callout(ctx, 24, H - 76, W - 48,
    "🔍  Use a barra de busca no topo para encontrar uma fazenda pelo nome, município ou ID do produtor.",
    CINZA);
}

function drawSlide4(ctx, W, H) {
  slide(ctx, W, H, "Slide 4 / 7", "PASSO 3 — Dentro da fazenda: o que fazer");
  sectionTitle(ctx, 128, "Abrindo o card e registrando a visita");

  // Mock itens checklist
  const items = [
    { label: "Polígono", status: "fazer", done: true },
    { label: "Coord. Geoespacial", status: "fazer", done: true },
    { label: "Termo de Adesão", status: "fazer", done: false },
    { label: "Doc. Pessoal", status: "nao_fazer", done: false },
    { label: "Pesquisa Anual", status: "fazer", done: false },
    { label: "Drive", status: "fazer", done: false },
  ];

  const cols = 3;
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 24 + col * ((W - 48) / cols + 6);
    const y = 155 + row * 50;
    const w = (W - 60) / cols;

    if (item.status === "nao_fazer") {
      ctx.fillStyle = "#fef2f2";
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 36, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.font = "11px Arial";
      ctx.fillText("✗  " + item.label, x + 8, y + 22);
    } else if (item.done) {
      ctx.fillStyle = VERDE;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 36, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Arial";
      ctx.fillText("☑  " + item.label, x + 8, y + 22);
    } else {
      ctx.fillStyle = "#f3f4f6";
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 36, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px Arial";
      ctx.fillText("☐  " + item.label, x + 8, y + 22);
    }
  });

  // Seção reporte
  const ry = 270;
  ctx.fillStyle = "#f9fafb";
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(24, ry, W - 48, 70, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CINZA;
  ctx.font = "bold 12px Arial";
  ctx.fillText("Reporte da Visita", 36, ry + 20);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "10px Arial";
  ctx.fillText("Selecione o resultado encontrado na fazenda", 36, ry + 36);

  const reporteOpts = ["1 - APTO", "2 - NÃO APTO c/ Adequação", "3 - RECUSA"];
  reporteOpts.forEach((r, i) => {
    ctx.fillStyle = i === 0 ? VERDE : "#e5e7eb";
    ctx.beginPath();
    ctx.roundRect(36 + i * 130, ry + 44, 120, 20, 4);
    ctx.fill();
    ctx.fillStyle = i === 0 ? "#fff" : "#6b7280";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(r, 36 + i * 130 + 60, ry + 58);
    ctx.textAlign = "left";
  });

  // Botões finais
  const by = 360;
  mockButton(ctx, 24, by, "Enviar Documentos", "#2563eb", 150);
  mockButton(ctx, 184, by, "Salvar", "#2563eb", 90);
  mockButton(ctx, 284, by, "Concluir", VERDE, 90);

  // Anotação
  ctx.strokeStyle = LARANJA;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(284 + 45, by - 2);
  ctx.lineTo(284 + 45, by - 20);
  ctx.stroke();
  callout(ctx, 24, H - 76, W - 48,
    '⚠️  Para habilitar o botão "Concluir": todos os itens FAZER devem estar marcados e o Reporte preenchido.',
    "#d97706");
}

function drawSlide5(ctx, W, H) {
  slide(ctx, W, H, "Slide 5 / 7", "PASSO 4 — Concluindo a visita");
  sectionTitle(ctx, 128, "Confirmação de envio de documentação");

  // Modal mockup
  const mx = 40, my = 155, mw = W - 80, mh = 200;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 100, W, H - 100);
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = VERDE;
  ctx.font = "bold 15px Arial";
  ctx.fillText("📄  Confirmação de Conclusão", mx + 20, my + 32);

  ctx.fillStyle = "#2563eb";
  ctx.fillStyle = "#eff6ff";
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx + 16, my + 48, mw - 32, 60, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1d4ed8";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Você enviou a documentação desta visita?", mx + 28, my + 72);
  ctx.fillStyle = "#3b82f6";
  ctx.font = "10px Arial";
  ctx.fillText("Informe se a documentação foi enviada antes de concluir.", mx + 28, my + 90);

  mockButton(ctx, mx + 16, my + 126, "Cancelar", "#9ca3af", 100);
  mockButton(ctx, mx + 126, my + 126, "Não", "#f59e0b", 100);
  mockButton(ctx, mx + 236, my + 126, "Sim, enviei ✓", VERDE, 120);

  callout(ctx, 24, H - 76, W - 48,
    "✅  Ao clicar em \"Sim, enviei\", a visita é marcada como concluída com documentação. Escolha \"Não\" se ainda não enviou.",
    VERDE);
}

function drawSlide6(ctx, W, H) {
  slide(ctx, W, H, "Slide 6 / 7", "PASSO 5 — Minha Performance (dashboard do técnico)");
  sectionTitle(ctx, 128, "Acompanhe seus resultados em tempo real");

  // Anel central
  const cx = 80, cy = 240, r = 54;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const pct = 0.68;
  ctx.strokeStyle = ROXO;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = ROXO;
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("68%", cx, cy + 6);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "10px Arial";
  ctx.fillText("Atingimento", cx, cy + 20);
  ctx.textAlign = "left";

  // Cards de stats
  const cards = [
    { label: "Total Atribuídas", val: "25", color: "from-[#860063]", bg: ROXO },
    { label: "Concluídas", val: "17", color: "", bg: VERDE },
    { label: "Pendentes", val: "6", color: "", bg: LARANJA },
    { label: "Atrasadas >30d", val: "2", color: "", bg: "#ef4444" },
  ];

  cards.forEach((c, i) => {
    const cx2 = 160 + (i % 2) * 120;
    const cy2 = 165 + Math.floor(i / 2) * 70;
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    ctx.roundRect(cx2, cy2, 110, 55, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial";
    ctx.fillText(c.val, cx2 + 10, cy2 + 32);
    ctx.font = "10px Arial";
    ctx.fillText(c.label, cx2 + 10, cy2 + 48);
  });

  // Tabela urgências
  const ty = 330;
  ctx.fillStyle = "#f3f4f6";
  ctx.beginPath();
  ctx.roundRect(24, ty, W - 48, 28, [6, 6, 0, 0]);
  ctx.fill();
  ["Produtor", "Programa", "Status", "Urgência"].forEach((h, i) => {
    ctx.fillStyle = "#374151";
    ctx.font = "bold 10px Arial";
    ctx.fillText(h, 36 + i * 100, ty + 18);
  });

  const rows = [
    ["Fazenda Boa Vista", "Nestlé/AtSource", "Pendente", "🔴 Alta"],
    ["Sítio Nova Estrela", "Mondelez", "Em Andamento", "🟡 Média"],
  ];
  rows.forEach((row, ri) => {
    const ry2 = ty + 30 + ri * 28;
    ctx.fillStyle = ri % 2 === 0 ? "#fff" : "#f9fafb";
    ctx.fillRect(24, ry2, W - 48, 28);
    row.forEach((cell, ci) => {
      ctx.fillStyle = "#374151";
      ctx.font = "10px Arial";
      ctx.fillText(cell, 36 + ci * 100, ry2 + 18);
    });
  });

  callout(ctx, 24, H - 72, W - 48,
    "📊  Visitas com mais de 30 dias em aberto aparecem em vermelho — priorize-as!",
    "#dc2626");
}

function drawSlide7(ctx, W, H) {
  slide(ctx, W, H, "Slide 7 / 7", "VISÃO DO GERENTE — O que o gerente monitora");
  sectionTitle(ctx, 128, "Painel de acompanhamento da equipe");

  const items = [
    { icon: "📋", title: "Checklist de Fazendas", desc: "Filtra por técnico, programa, filial. Vê % de conclusão e data agendada de cada fazenda.", color: ROXO },
    { icon: "👥", title: "Atribuição de Visitas", desc: "Designa fazendas para cada técnico com perfil de visita (Adesão, Revisita ou Monitoramento).", color: "#2563eb" },
    { icon: "📊", title: "Dashboard Sustentabilidade", desc: "Gráficos de progresso por técnico, programa e status. Visão consolidada de toda a equipe.", color: LARANJA },
    { icon: "📁", title: "Dados Sustentabilidade", desc: "Tabela completa com histórico, filtros avançados e exportação de todos os registros.", color: VERDE },
    { icon: "⚙️", title: "Config. Sustentabilidade", desc: "Define o link de upload de documentos que aparece no checklist dos técnicos.", color: "#7c3aed" },
  ];

  items.forEach((item, i) => {
    const y = 155 + i * 66;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.07)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(24, y, W - 48, 54, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(24, y, 5, 54, [8, 0, 0, 8]);
    ctx.fill();

    ctx.font = "18px Arial";
    ctx.fillText(item.icon, 38, y + 30);
    ctx.fillStyle = CINZA;
    ctx.font = "bold 12px Arial";
    ctx.fillText(item.title, 66, y + 20);
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px Arial";
    wrapText(ctx, item.desc, 66, y + 36, W - 110, 14);
  });

  // Rodapé final
  ctx.fillStyle = ROXO;
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Em caso de dúvidas, contate o gerente responsável  ·  Central Pulse · OFI", W / 2, H - 20);
  ctx.textAlign = "left";
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ManualTecnico() {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

      const W = 595, H = 520; // A4 landscape-ish
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: [W, H] });

      const drawFns = [
        drawSlide1, drawSlide2, drawSlide3, drawSlide4,
        drawSlide5, drawSlide6, drawSlide7,
      ];

      for (let i = 0; i < drawFns.length; i++) {
        ctx.clearRect(0, 0, W, H);
        drawFns[i](ctx, W, H);
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) doc.addPage();
        doc.addImage(imgData, "PNG", 0, 0, W, H);
      }

      doc.save("Manual_Tecnico_OFI.pdf");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PDF: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-[#860063]/10 rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-[#860063]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manual de Treinamento</h1>
          <p className="text-sm text-gray-500 mt-1">Técnicos Agrícolas · OFI Sustentabilidade</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">O PDF contém 7 slides:</p>
          {[
            "Capa — apresentação do sistema",
            "Passo 1 — Como criar conta e acessar",
            "Passo 2 — Tela de Checklist de Fazendas",
            "Passo 3 — Registrando a visita e marcando itens",
            "Passo 4 — Concluindo a visita",
            "Passo 5 — Dashboard Minha Performance",
            "Visão do Gerente — o que ele monitora",
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#860063]/10 text-[#860063] text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-gray-700">{s}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={generatePDF}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:opacity-90 h-12 text-base font-bold"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando PDF...</>
          ) : (
            <><Download className="w-5 h-5 mr-2" /> Baixar PDF de Treinamento</>
          )}
        </Button>
        <p className="text-xs text-gray-400">O download iniciará automaticamente após a geração.</p>
      </div>
    </div>
  );
}