import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Copy, Check, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PowerBIGuidePage() {
  const [copied, setCopied] = useState(false);

  const functionUrl = "https://[SUA-FUNCAO].deno.dev";

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadWordGuide = () => {
    const content = generateWordContent();
    const blob = new Blob([content], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Guia_Conexao_PowerBI_OFI.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Guia baixado com sucesso!");
  };

  const generateWordContent = () => {
    return `
GUIA COMPLETO: CONECTAR POWER BI AO SISTEMA OFI
================================================

Data: ${new Date().toLocaleDateString('pt-BR')}
Sistema: OFI - Agendamento de Veículos
Versão: 1.0

================================================
ÍNDICE
================================================

1. Introdução
2. Pré-requisitos
3. Obter URL da API
4. Conectar no Power BI Desktop
5. Campos Disponíveis (81 colunas)
6. Criar Medidas DAX
7. Configurar Atualização Automática
8. Exemplos de Visualizações
9. Dicas Avançadas
10. Troubleshooting

================================================
1. INTRODUÇÃO
================================================

Este guia fornece instruções completas para conectar o Microsoft Power BI 
ao Sistema OFI de Agendamento de Veículos. A conexão é feita através de 
uma API REST que expõe todos os dados de agendamentos, incluindo:

• Dados de agendamento (datas, horários, status)
• Informações de fornecedores
• Quantidades (sacos, toneladas)
• Pesagem (peso bruto, tara, peso líquido)
• Durações e tempos calculados
• Métricas de eficiência e pontualidade

================================================
2. PRÉ-REQUISITOS
================================================

✓ Power BI Desktop instalado (versão atualizada)
✓ Acesso ao Dashboard Base44 do sistema OFI
✓ Conexão à internet estável
✓ Permissões de acesso ao sistema

================================================
3. OBTER URL DA API
================================================

PASSO 1: Acessar o Dashboard Base44
   • Ir para: https://base44.com/dashboard
   • Fazer login com suas credenciais

PASSO 2: Localizar a Função
   • Menu lateral: Code → Functions
   • Procurar por: "powerBIDataExport"

PASSO 3: Copiar URL
   • Clicar na função "powerBIDataExport"
   • Copiar a URL completa (formato: https://[sua-funcao].deno.dev)
   • Guardar esta URL - será usada no Power BI

EXEMPLO DE URL:
https://ofi-powerbi-export.deno.dev

================================================
4. CONECTAR NO POWER BI DESKTOP
================================================

MÉTODO: Conector Web (Recomendado)

PASSO 1: Abrir Power BI Desktop

PASSO 2: Obter Dados
   • Clicar em "Home" (na faixa de opções)
   • Clicar em "Obter Dados"
   • Selecionar "Web"
   • Clicar em "Conectar"

PASSO 3: Inserir URL
   • Colar a URL da API (copiada no Passo 3)
   • Clicar em "OK"

PASSO 4: Autenticação
   • Selecionar "Anônimo"
   • Clicar em "Conectar"

PASSO 5: Power Query Editor
   • O Power Query Editor será aberto
   • Você verá um objeto JSON com os dados
   
   IMPORTANTE - Expandir os Dados:
   a) Clicar na coluna "data"
   b) Clicar no ícone de expansão (setas duplas)
   c) Marcar "Expandir para novas linhas"
   d) Selecionar todas as colunas
   e) Desmarcar "Usar nome da coluna original como prefixo"
   f) Clicar em "OK"

PASSO 6: Renomear Query (Opcional)
   • Clicar com botão direito em "Query1"
   • Selecionar "Renomear"
   • Digitar: "Agendamentos_OFI"

PASSO 7: Fechar e Aplicar
   • Clicar em "Fechar e Aplicar"
   • Os dados agora estão carregados no modelo

================================================
5. CAMPOS DISPONÍVEIS (81 COLUNAS)
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 IDENTIFICADORES (4 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• id - ID único do agendamento
• created_date - Data de criação
• created_by - Email do usuário criador
• updated_date - Data da última atualização

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 DATA E STATUS (9 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• date - Data do agendamento (YYYY-MM-DD)
• status - Status atual (agendado/aguardando/em_descarga/concluido/cancelado)
• status_label - Status em português
• date_year - Ano (numérico)
• date_month - Mês (numérico 1-12)
• date_day - Dia (numérico 1-31)
• date_week - Semana do ano (1-52)
• date_quarter - Trimestre (1-4)
• time_period - Período do dia (Manhã/Tarde/Noite/Madrugada)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 LOCAL (5 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• warehouse - Armazém (central/fabrica)
• warehouse_label - Armazém em português (Central/Fábrica)
• line - Número da linha (01/02/03/04)
• line_full - Descrição completa (ex: "Central - Linha 01")
• supplier - Nome do fornecedor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ HORÁRIOS AGENDADOS (4 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• start_time_scheduled - Horário de início agendado (HH:MM)
• end_time_predicted - Horário previsto de término (HH:MM)
• duration_predicted_minutes - Duração prevista (minutos)
• duration_predicted_formatted - Duração prevista (HH:MM)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ HORÁRIOS REAIS - BALANÇA (6 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• arrival_time - Horário de chegada do veículo (HH:MM)
• call_time - Horário em que foi chamado (HH:MM)
• waiting_time_minutes - Tempo de espera (minutos)
• waiting_time_formatted - Tempo de espera (HH:MM)
• time_to_call_minutes - Tempo até ser chamado (minutos)
• time_to_call_formatted - Tempo até ser chamado (HH:MM)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏳ HORÁRIOS REAIS - OPERADOR (4 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• start_time_actual - Início real da descarga (HH:MM)
• end_time_actual - Fim real da descarga (HH:MM)
• duration_actual_minutes - Duração real (minutos)
• duration_actual_formatted - Duração real (HH:MM)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏲️ ATRASOS E DIFERENÇAS (3 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• delay_start_minutes - Atraso no início (minutos)
• delay_start_formatted - Atraso no início (HH:MM)
• duration_difference_minutes - Diferença previsto vs real (minutos)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 QUANTIDADES (4 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• quantity_bags_planned - Sacos planejados
• quantity_tons_planned - Toneladas planejadas
• quantity_bags_actual - Sacos reais descarregados
• quantity_difference_bags - Diferença (real - planejado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ PESAGEM - BALANÇA (5 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• gross_weight_kg - PESO BRUTO (kg)
• tare_weight_kg - PESO TARA (kg)
• net_weight_kg - PESO LÍQUIDO (kg) = bruto - tara ✓
• net_weight_tons - Peso líquido (toneladas)
• balancinha_kg - Peso da balancinha (kg)
• balancinha_difference_kg - Diferença balancinha vs peso líquido

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 DOCUMENTOS (4 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• wb_number - Número WB
• load_number - Número da carga
• tracking_code - Código de rastreio
• invoice_number - Número da nota fiscal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CONTRATO E CERTIFICAÇÃO (6 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• contract - Tipo de contrato (RFP/PTBF/DIF/TRANSFERÊNCIA)
• contract_label - Label do contrato
• eudr_cvn - Certificação (EUDR/CVN)
• eudr_cvn_label - Label da certificação
• apanha_status - Status de apanha (Apanha/NA)
• freight_label - Label do frete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚛 VEÍCULO E MOTORISTA (3 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• vehicle_plate - Placa do veículo
• driver_name - Nome do motorista
• driver_phone - Telefone do motorista

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 OUTROS (1 campo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• notes - Observações

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 MÉTRICAS CALCULADAS (3 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• efficiency_percent - Eficiência (previsto/real * 100)
• on_time - Pontualidade (Sim/Não - considera atraso <= 15 min)
• weight_accuracy_percent - Precisão de peso

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 FLAGS BOOLEANAS (8 campos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Valores: 0 (falso) ou 1 (verdadeiro)

• is_completed - Está concluído?
• is_in_progress - Está em descarga?
• is_waiting - Está aguardando?
• is_scheduled - Está agendado?
• is_cancelled - Foi cancelado?
• has_delay - Teve atraso?
• has_weighing - Tem dados de pesagem?
• has_balancinha - Tem dados de balancinha?

================================================
6. CRIAR MEDIDAS DAX
================================================

As medidas DAX permitem criar cálculos personalizados.
Abaixo estão exemplos prontos para usar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRIAR UMA MEDIDA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. No painel lateral direito, clicar com botão direito em "Agendamentos_OFI"
2. Selecionar "Nova Medida"
3. Copiar e colar o código DAX
4. Pressionar Enter
5. Renomear se necessário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 1: Tempo Médio de Descarga
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tempo Médio Real = 
CALCULATE(
    AVERAGE('Agendamentos_OFI'[duration_actual_minutes]),
    'Agendamentos_OFI'[is_completed] = 1
)

Descrição: Calcula o tempo médio de descarga apenas dos agendamentos 
concluídos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 2: Total Recebido em Toneladas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Recebido (t) = 
CALCULATE(
    SUM('Agendamentos_OFI'[net_weight_tons]),
    'Agendamentos_OFI'[is_completed] = 1
)

Descrição: Soma do peso líquido recebido (apenas concluídos).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 3: Taxa de Pontualidade
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pontualidade % = 
DIVIDE(
    CALCULATE(
        COUNT('Agendamentos_OFI'[id]), 
        'Agendamentos_OFI'[on_time] = "Sim"
    ),
    COUNT('Agendamentos_OFI'[id]),
    0
) * 100

Descrição: Percentual de agendamentos que começaram no horário.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 4: Diferença Peso Planejado vs Real
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Diferença Peso (t) = 
SUM('Agendamentos_OFI'[net_weight_tons]) - 
SUM('Agendamentos_OFI'[quantity_tons_planned])

Descrição: Diferença entre peso real e planejado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 5: Eficiência Média
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Eficiência Média % = 
CALCULATE(
    AVERAGE('Agendamentos_OFI'[efficiency_percent]),
    'Agendamentos_OFI'[is_completed] = 1
)

Descrição: Eficiência média das descargas concluídas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 6: Tempo Médio de Espera
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Espera Média (min) = 
CALCULATE(
    AVERAGE('Agendamentos_OFI'[waiting_time_minutes]),
    'Agendamentos_OFI'[waiting_time_minutes] <> BLANK()
)

Descrição: Tempo médio que veículos aguardam antes de descarregar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 7: Total de Veículos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Veículos = COUNT('Agendamentos_OFI'[id])

Descrição: Conta total de agendamentos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIDA 8: Taxa de Conclusão
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Taxa Conclusão % = 
DIVIDE(
    CALCULATE(
        COUNT('Agendamentos_OFI'[id]),
        'Agendamentos_OFI'[is_completed] = 1
    ),
    COUNT('Agendamentos_OFI'[id]),
    0
) * 100

Descrição: Percentual de agendamentos concluídos.

================================================
7. CONFIGURAR ATUALIZAÇÃO AUTOMÁTICA
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPÇÃO A: Power BI Desktop (Local)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Arquivo → Opções e Configurações → Opções
2. Navegação: "Carregamento de Dados"
3. Seção "Atualização em Segundo Plano"
4. Marcar: "Permitir download de visualização de dados em segundo plano"
5. Definir intervalo de atualização automática

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPÇÃO B: Power BI Service (Cloud) - RECOMENDADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSO 1: Publicar Relatório
   • No Power BI Desktop: Arquivo → Publicar
   • Selecionar workspace
   • Aguardar conclusão

PASSO 2: Configurar Atualização
   • Acessar: https://app.powerbi.com
   • Navegar até seu workspace
   • Encontrar o dataset publicado
   • Clicar nos "..." ao lado do dataset
   • Selecionar "Configurações"

PASSO 3: Atualização Agendada
   • Expandir "Atualização agendada"
   • Ativar: "Manter seus dados atualizados"
   • Frequência: Diariamente
   • Horários: Definir (ex: 8:00, 14:00, 18:00)
   • Fuso horário: America/Sao_Paulo
   • Notificações: Ativar alertas de falha
   • Clicar em "Aplicar"

PASSO 4: Testar Atualização
   • Clicar em "Atualizar agora"
   • Verificar se atualiza sem erros

IMPORTANTE:
• Atualização depende de conexão com a internet
• Verificar logs em caso de falha
• Configurar Gateway se usar VPN/rede privada

================================================
8. EXEMPLOS DE VISUALIZAÇÕES
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DASHBOARD EXECUTIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL 1: Cartões (KPIs)
──────────────────────────
• Total Recebido (t)
• Pontualidade %
• Eficiência Média %
• Tempo Médio Real

Configuração:
1. Inserir → Cartão
2. Arraste a medida DAX para "Campos"
3. Formatar: Tamanho fonte grande, cor destaque

VISUAL 2: Gráfico de Linha (Volume Diário)
────────────────────────────────────────────
Eixo X: date
Valores: net_weight_tons
Legenda: warehouse_label

VISUAL 3: Gráfico de Pizza (Distribuição por Armazém)
───────────────────────────────────────────────────────
Valores: quantity_bags_planned
Legenda: warehouse_label

VISUAL 4: Tabela de Agendamentos
──────────────────────────────────
Colunas:
• date (formato dd/MM/yyyy)
• supplier
• warehouse_label
• line
• start_time_scheduled
• duration_actual_formatted
• net_weight_kg
• status_label

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISE OPERACIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL 1: Gráfico de Barras (Volume por Linha)
─────────────────────────────────────────────────
Eixo Y: line_full
Valores: quantity_bags_actual

VISUAL 2: Gráfico de Dispersão (Eficiência)
─────────────────────────────────────────────
Eixo X: duration_predicted_minutes
Eixo Y: duration_actual_minutes
Detalhes: supplier
Tamanho: net_weight_kg
Cor: warehouse_label

VISUAL 3: Gráfico de Gantt (Timeline)
───────────────────────────────────────
Tarefa: supplier
Início: start_time_actual
Duração: duration_actual_minutes
Grupo: line_full

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISE DE PESO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL 1: Cartão de Peso Líquido Total
────────────────────────────────────────
Medida:
Peso Líquido Total = SUM('Agendamentos_OFI'[net_weight_kg])

Formato: Mostrar em toneladas (÷ 1000)

VISUAL 2: Gráfico de Cascata (Peso: Bruto → Líquido)
───────────────────────────────────────────────────────
Categoria: ["Peso Bruto", "Peso Tara", "Peso Líquido"]
Valores:
• SUM(gross_weight_kg)
• -SUM(tare_weight_kg)
• SUM(net_weight_kg)

VISUAL 3: Comparação Planejado vs Real
────────────────────────────────────────
Gráfico de Colunas Agrupadas
Eixo X: date
Valores:
• quantity_tons_planned (Planejado)
• net_weight_tons (Real)

================================================
9. DICAS AVANÇADAS
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DICA 1: Criar Tabela Calendário
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Permite análises temporais mais avançadas.

DAX:
────
Calendário = 
CALENDAR(
    MIN('Agendamentos_OFI'[date]),
    MAX('Agendamentos_OFI'[date])
)

Adicionar colunas à tabela Calendário:
───────────────────────────────────────
Ano = YEAR(Calendário[Date])
Mês = MONTH(Calendário[Date])
NomeMês = FORMAT(Calendário[Date], "MMMM", "pt-BR")
Trimestre = QUARTER(Calendário[Date])
DiaSemana = WEEKDAY(Calendário[Date], 2)
NomeDiaSemana = FORMAT(Calendário[Date], "dddd", "pt-BR")

Relacionamento:
───────────────
Calendário[Date] (1) → Agendamentos_OFI[date] (*)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DICA 2: Criar Hierarquias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Facilita drill-down em análises.

HIERARQUIA TEMPO:
─────────────────
Calendário
└─ Ano
   └─ Trimestre
      └─ Mês
         └─ Semana
            └─ Data

Como criar:
1. Selecionar coluna "Ano"
2. Botão direito → "Criar hierarquia"
3. Arrastar demais colunas para a hierarquia

HIERARQUIA LOCAL:
─────────────────
Local
└─ Armazém (warehouse_label)
   └─ Linha (line)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DICA 3: Medidas com Contexto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Volume Apenas Central = 
CALCULATE(
    SUM('Agendamentos_OFI'[net_weight_tons]),
    'Agendamentos_OFI'[warehouse] = "central"
)

Volume Apenas Fábrica = 
CALCULATE(
    SUM('Agendamentos_OFI'[net_weight_tons]),
    'Agendamentos_OFI'[warehouse] = "fabrica"
)

Concluídos Este Mês = 
CALCULATE(
    COUNT('Agendamentos_OFI'[id]),
    'Agendamentos_OFI'[is_completed] = 1,
    MONTH('Agendamentos_OFI'[date]) = MONTH(TODAY())
)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DICA 4: Formatação Condicional
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Em tabelas, adicionar cores baseadas em valores:

1. Selecionar coluna "efficiency_percent"
2. Formato → Formatação condicional → Cores de fundo
3. Configurar:
   • Verde: >= 95%
   • Amarelo: 85% - 95%
   • Vermelho: < 85%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DICA 5: Slicers (Filtros Interativos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adicionar filtros interativos ao dashboard:

SLICER 1: Período
─────────────────
Campo: Calendário[Date]
Tipo: Intervalo de datas

SLICER 2: Armazém
─────────────────
Campo: warehouse_label
Tipo: Lista

SLICER 3: Status
────────────────
Campo: status_label
Tipo: Botões

SLICER 4: Fornecedor
────────────────────
Campo: supplier
Tipo: Dropdown (se muitos valores)

================================================
10. TROUBLESHOOTING
================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 1: Erro ao Conectar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERRO: "Não foi possível conectar à fonte de dados"

SOLUÇÕES:
─────────
✓ Verificar se a URL está correta
✓ Testar URL no navegador primeiro
   (Deve retornar JSON com dados)
✓ Verificar conexão com internet
✓ Usar autenticação "Anônimo"
✓ Verificar se há firewall bloqueando

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 2: Dados Não Aparecem
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERRO: "Query retorna vazio"

SOLUÇÕES:
─────────
✓ Verificar se expandiu a coluna "data" no Power Query
✓ Verificar filtros aplicados inadvertidamente
✓ Verificar se há dados no sistema OFI
✓ Clicar em "Atualizar" para recarregar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 3: Atualização Falha
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERRO: "Falha ao atualizar dataset"

SOLUÇÕES:
─────────
✓ Verificar credenciais no Power BI Service
✓ Testar atualização manual primeiro
✓ Ver logs de erro detalhados
✓ Verificar se Gateway está configurado (se aplicável)
✓ Verificar permissões da conta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 4: Campos com Erro
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ERRO: "Não foi possível converter valor"

SOLUÇÕES:
─────────
✓ Verificar tipo de dados da coluna
✓ No Power Query: Transformar → Detectar Tipo de Dados
✓ Corrigir manualmente tipos incorretos
✓ Remover valores nulos se necessário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 5: Performance Lenta
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SINTOMA: Dashboard demora para carregar

SOLUÇÕES:
─────────
✓ Usar agregações em medidas DAX
✓ Evitar colunas calculadas desnecessárias
✓ Remover visuais não utilizados
✓ Otimizar relacionamentos
✓ Usar DirectQuery apenas se necessário

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROBLEMA 6: Peso Líquido Não Calcula
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SINTOMA: net_weight_kg está vazio ou incorreto

SOLUÇÕES:
─────────
✓ Verificar se gross_weight e tare_weight existem
✓ O cálculo é feito automaticamente na API
✓ Se vazio, dados de pesagem não foram registrados
✓ Filtrar apenas registros com pesagem:
   has_weighing = 1

================================================
SUPORTE TÉCNICO
================================================

TESTAR API NO NAVEGADOR:
────────────────────────
1. Abrir navegador
2. Colar URL da função
3. Verificar se retorna JSON com:
   {
     "success": true,
     "timestamp": "...",
     "total_records": 123,
     "data": [...]
   }

CONTATOS:
─────────
Sistema OFI - Base44 Dashboard
Documentação API: Dashboard → Functions → powerBIDataExport

LOGS DA FUNÇÃO:
───────────────
Para ver erros da função:
Dashboard Base44 → Code → Functions → powerBIDataExport → Logs

================================================
RESUMO RÁPIDO
================================================

PASSO 1: Copiar URL da função no Dashboard Base44
PASSO 2: Power BI → Obter Dados → Web
PASSO 3: Colar URL, autenticação "Anônimo"
PASSO 4: Expandir coluna "data" no Power Query
PASSO 5: Fechar e Aplicar
PASSO 6: Criar medidas DAX conforme necessário
PASSO 7: Construir visualizações
PASSO 8: Publicar no Power BI Service
PASSO 9: Configurar atualização agendada
PASSO 10: Compartilhar dashboard

================================================
DADOS PRINCIPAIS
================================================

✓ 81 colunas disponíveis
✓ Peso líquido calculado automaticamente (bruto - tara)
✓ Todas as durações em minutos e formato HH:MM
✓ Flags booleanas (0/1) para filtros fáceis
✓ Métricas de eficiência e pontualidade incluídas
✓ Campos separados por ano, mês, dia, trimestre, semana
✓ Status e labels em português
✓ Dados de balancinha e comparações de peso

================================================
FIM DO GUIA
================================================

Documento gerado automaticamente
Sistema: OFI - Agendamento de Veículos
Data: ${new Date().toLocaleDateString('pt-BR')}

Para suporte, consulte o Dashboard Base44 ou a equipe de TI.

© ${new Date().getFullYear()} OFI - Todos os direitos reservados
`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
            Guia de Conexão Power BI
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Manual completo para conectar o Microsoft Power BI ao Sistema OFI
          </p>
        </motion.div>

        <div className="grid gap-4">
          {/* Card Principal */}
          <Card className="shadow-xl border-2 border-[#860063]/30">
            <CardHeader className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Baixar Guia Completo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>📄 O guia inclui:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                  <li>• Instruções passo a passo com screenshots</li>
                  <li>• Lista completa de 81 campos disponíveis</li>
                  <li>• Exemplos de medidas DAX prontas para usar</li>
                  <li>• Configuração de atualização automática</li>
                  <li>• Exemplos de visualizações e dashboards</li>
                  <li>• Seção de troubleshooting</li>
                </ul>
              </div>

              <Button
                onClick={downloadWordGuide}
                size="lg"
                className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white"
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar Guia em Word
              </Button>
            </CardContent>
          </Card>

          {/* URL da API */}
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                URL da API
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-3">
                Cole esta URL no Power BI ao conectar à fonte de dados:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 p-3 rounded-lg text-sm break-all">
                  {functionUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(functionUrl)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Substitua [SUA-FUNCAO] pela URL real disponível no Dashboard Base44
              </p>
            </CardContent>
          </Card>

          {/* Passos Rápidos */}
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-lg">⚡ Passos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#860063] text-white flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <strong className="text-gray-900">Obter URL da API</strong>
                    <p className="text-sm text-gray-600">Dashboard Base44 → Code → Functions → powerBIDataExport</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#860063] text-white flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <strong className="text-gray-900">Conectar no Power BI</strong>
                    <p className="text-sm text-gray-600">Obter Dados → Web → Colar URL → Anônimo</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#860063] text-white flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <strong className="text-gray-900">Expandir Dados</strong>
                    <p className="text-sm text-gray-600">Power Query → Expandir coluna "data" → Fechar e Aplicar</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#860063] text-white flex items-center justify-center text-sm font-bold">4</span>
                  <div>
                    <strong className="text-gray-900">Criar Visualizações</strong>
                    <p className="text-sm text-gray-600">Usar os 81 campos disponíveis + medidas DAX</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#860063] text-white flex items-center justify-center text-sm font-bold">5</span>
                  <div>
                    <strong className="text-gray-900">Publicar e Agendar</strong>
                    <p className="text-sm text-gray-600">Power BI Service → Atualização agendada</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Campos Principais */}
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
              <CardTitle className="text-lg">📊 Campos Principais (81 colunas)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">⚖️ Pesagem</h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• gross_weight_kg (Peso Bruto)</li>
                    <li>• tare_weight_kg (Peso Tara)</li>
                    <li className="font-bold text-green-600">• net_weight_kg (Peso Líquido)</li>
                    <li>• net_weight_tons (Toneladas)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">⏱️ Tempos</h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• arrival_time (Chegada)</li>
                    <li>• call_time (Chamada)</li>
                    <li>• start_time_actual (Início Real)</li>
                    <li>• duration_actual_minutes (Duração)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">📦 Quantidades</h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• quantity_bags_planned (Sacos)</li>
                    <li>• quantity_tons_planned (Toneladas)</li>
                    <li>• quantity_bags_actual (Real)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">📊 Métricas</h4>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• efficiency_percent (Eficiência)</li>
                    <li>• on_time (Pontualidade)</li>
                    <li>• weight_accuracy_percent (Precisão)</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                + 65 campos adicionais incluindo status, local, motorista, documentos, etc.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}