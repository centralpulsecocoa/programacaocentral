import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Database, Code, Shield, FileCode, Server, GitBranch, ArrowRight, Terminal } from "lucide-react";
import { toast } from "sonner";
import { CENTRAL_PULSE_SQL } from "@/lib/centralPulseSQL";
import { CENTRAL_PULSE_SQL_LOCAL } from "@/lib/centralPulseSQLLocal";
import {
  FULL_MIGRATION_DOC,
  FULL_SERVER_JS,
} from "@/lib/centralPulseFullMigration";
import MigrationScriptsDownload from "@/components/documentation/MigrationScriptsDownload";
import FullMigrationBundleDownload from "@/components/documentation/FullMigrationBundleDownload";
import ProjectZipDownload from "@/components/documentation/ProjectZipDownload";
import LoginFilesDownload from "@/components/documentation/LoginFilesDownload";

const ENTITIES = [
  {
    category: "Logística & Descargas",
    items: [
      {
        name: "Scheduling",
        description: "Agendamentos de descarga",
        fields: [
          { name: "date", type: "date", desc: "Data do agendamento", required: true },
          { name: "start_time", type: "string", desc: "Horário de início planejado (HH:MM)", required: true },
          { name: "start_time_actual", type: "string", desc: "Horário real de início da descarga" },
          { name: "arrival_time", type: "string", desc: "Horário de chegada do veículo" },
          { name: "call_time", type: "string", desc: "Horário em que o veículo foi chamado" },
          { name: "end_time_predicted", type: "string", desc: "Horário previsto de conclusão" },
          { name: "end_time_actual", type: "string", desc: "Horário real de conclusão" },
          { name: "supplier", type: "string", desc: "Nome do fornecedor", required: true },
          { name: "quantity_bags", type: "number", desc: "Quantidade em sacos", required: true },
          { name: "quantity_tons", type: "number", desc: "Quantidade em toneladas (calculado: sacos * 60kg)" },
          { name: "warehouse", type: "enum", desc: "central | fabrica | barra | ferraz", required: true },
          { name: "line", type: "string", desc: "Linha de descarga", required: true },
          { name: "status", type: "enum", desc: "agendado | aguardando | em_descarga | concluido | cancelado", default: "agendado" },
          { name: "contract", type: "enum", desc: "RFP | PTBF | DIF | TRANSFERÊNCIA" },
          { name: "wb_number", type: "string", desc: "Número da WB associada" },
          { name: "load_number", type: "string", desc: "Número da carga" },
          { name: "actual_bags", type: "number", desc: "Quantidade real de sacos descarregados" },
          { name: "vehicle_plate", type: "string", desc: "Placa do veículo" },
          { name: "driver_name", type: "string", desc: "Nome do motorista" },
          { name: "driver_phone", type: "string", desc: "Telefone do motorista" },
          { name: "invoice_number", type: "string", desc: "Número da nota fiscal" },
          { name: "gross_weight", type: "number", desc: "Peso bruto em kg" },
          { name: "tare_weight", type: "number", desc: "Peso tara em kg" },
          { name: "net_weight", type: "number", desc: "Peso líquido (calculado: bruto - tara)" },
          { name: "amostragem", type: "string", desc: "Resíduos Recebidos - Amostragem" },
          { name: "duplo", type: "string", desc: "Resíduos Recebidos - Duplo" },
          { name: "nibs", type: "string", desc: "Resíduos Recebidos - Nibs" },
          { name: "po", type: "string", desc: "Resíduos Recebidos - Pó" },
          { name: "batch", type: "string", desc: "Lote da carga" },
          { name: "gr", type: "string", desc: "GR (Guia de Recebimento)" },
          { name: "release_status", type: "enum", desc: "pendente | aguardando_liberacao | liberado", default: "pendente" },
          { name: "tracking_code", type: "string", desc: "Código de rastreio" },
          { name: "eudr_cvn", type: "enum", desc: "EUDR | CVN" },
          { name: "notes", type: "string", desc: "Observações" },
        ],
        rls: "Create: admin, supervisor, comprador, gerente_originacao | Read: público | Update: + operador, op_balanca, analista_qualidade, qualidade, classificador | Delete: admin, supervisor",
      },
      {
        name: "Transfer2082",
        description: "Transferências entre armazéns",
        fields: [
          { name: "date", type: "date", desc: "Data da transferência", required: true },
          { name: "transfer_group_id", type: "string", desc: "ID do grupo (mesmo ID para carga e descarga)", required: true },
          { name: "phase", type: "enum", desc: "carga | descarga", required: true },
          { name: "location", type: "enum", desc: "central | fabrica | ferraz", required: true },
          { name: "pallet_type", type: "enum", desc: "1MT | 1.5MT", required: true },
          { name: "batch", type: "string", desc: "Lote", required: true },
          { name: "origin", type: "enum", desc: "BAHIA | PARÁ | GHANA | MARFIM | ESPIRITO SANTO | RONDÔNIA | TOCANTINS", required: true },
          { name: "quantity_per_truck", type: "number", desc: "Quantidade por carreta", required: true },
          { name: "load_number", type: "string", desc: "Número de carga sequencial" },
          { name: "start_time", type: "string", desc: "Horário de início" },
          { name: "end_time", type: "string", desc: "Horário de fim" },
          { name: "status", type: "enum", desc: "aguardando | em_descarga | concluido", default: "aguardando" },
          { name: "release_status", type: "enum", desc: "pendente | aguardando_liberacao | liberado", default: "pendente" },
        ],
        rls: "Create: admin, supervisor | Read: público | Update: + operador, op_balanca, analista_qualidade, qualidade, gerente_originacao | Delete: admin, supervisor",
      },
      {
        name: "TransferDeposit",
        description: "Transferências entre depósitos",
        fields: [
          { name: "date", type: "date", desc: "Data", required: true },
          { name: "nf", type: "string", desc: "Número da Nota Fiscal", required: true },
          { name: "pile_lot", type: "string", desc: "Pile/Lot", required: true },
          { name: "origin", type: "enum", desc: "BAHIA | PARÁ | GHANA | ...", required: true },
          { name: "moisture_percent", type: "number", desc: "% Umidade" },
          { name: "ffa", type: "number", desc: "FFA" },
          { name: "deposito", type: "string", desc: "Depósito" },
          { name: "classificador", type: "enum", desc: "Andryo Borges | Vinicius Teles | Igor Moura" },
          { name: "status", type: "enum", desc: "Pendente | OK", default: "Pendente" },
        ],
        rls: "Create/Update: admin, qualidade, analista_qualidade, classificador, supervisor | Delete: admin, supervisor",
      },
      {
        name: "MoegaAnterior",
        description: "Moega do dia anterior",
        fields: [
          { name: "consuming_date", type: "date", desc: "Data de consumo", required: true },
          { name: "origin", type: "enum", desc: "BAHIA | PARÁ | GHANA | ...", required: true },
          { name: "ffa", type: "number", desc: "FFA" },
          { name: "moisture_percent", type: "number", desc: "% Umidade" },
          { name: "shell_percent", type: "number", desc: "% Shell" },
          { name: "consumo", type: "number", desc: "Consumo" },
          { name: "sacos", type: "enum", desc: "Sacos | Big Bags" },
          { name: "linha", type: "string", desc: "Linha" },
          { name: "classificador", type: "enum", desc: "Andryo Borges | Vinicius Teles | Igor Moura" },
          { name: "ffa_ponderado", type: "number", desc: "FFA Ponderado (FFA x Consumo)" },
        ],
        rls: "Create/Update/Delete: admin, analista_qualidade, qualidade, classificador",
      },
    ],
  },
  {
    category: "Qualidade",
    items: [
      {
        name: "Quality",
        description: "Análises de qualidade do cacau",
        fields: [
          { name: "date", type: "date", desc: "Data da análise", required: true },
          { name: "sample", type: "string", desc: "Número da amostra/carga (chave primária)", required: true },
          { name: "released_by", type: "string", desc: "Liberado por (nome)" },
          { name: "reception_time", type: "string", desc: "Hora de recebimento" },
          { name: "release_time", type: "string", desc: "Hora de liberação" },
          { name: "release_duration", type: "string", desc: "Tempo de liberação (calculado)" },
          { name: "origin", type: "enum", desc: "BAHIA | PARÁ | GHANA | MARFIM | ESPIRITO SANTO | RONDÔNIA | TOCANTINS" },
          { name: "germinated_percent", type: "number", desc: "% Germinated" },
          { name: "flat_percent", type: "number", desc: "% Flat" },
          { name: "insect_damaged_percent", type: "number", desc: "% Insect Damaged" },
          { name: "fumaca", type: "string", desc: "Fumaça" },
          { name: "slaty_percent", type: "number", desc: "% Slaty" },
          { name: "bean_count", type: "number", desc: "Bean count" },
          { name: "moisture_percent", type: "number", desc: "% Moisture" },
          { name: "mouldy_percent", type: "number", desc: "% Mouldy" },
          { name: "external_mould_percent", type: "number", desc: "% External Mould" },
          { name: "violet_percent", type: "number", desc: "% Violet" },
          { name: "ffa", type: "number", desc: "FFA" },
          { name: "shell_percent", type: "number", desc: "% Shell" },
          { name: "quality_opinion", type: "enum", desc: "pendente | favoravel | desfavoravel", default: "pendente" },
          { name: "quality_opinion_by", type: "string", desc: "Email de quem deu o parecer" },
          { name: "quality_opinion_date", type: "date-time", desc: "Data/hora do parecer" },
          { name: "moisture_approval_status", type: "enum", desc: "pendente | aprovado | devolvido", default: "pendente" },
          { name: "moisture_approved_by", type: "string", desc: "Email do Gerente que aprovou/devolveu" },
          { name: "alert_email_sent", type: "boolean", desc: "Indica se o email de alerta já foi enviado", default: "false" },
        ],
        rls: "Create: admin, qualidade, analista_qualidade, classificador | Read: público | Update: + gerente_originacao, supervisor | Delete: admin, qualidade, analista_qualidade, classificador",
      },
      {
        name: "PileQuality",
        description: "Qualidade por pilha/lote",
        fields: [
          { name: "month", type: "string", desc: "Mês de referência (YYYY-MM)", required: true },
          { name: "pile_lot", type: "string", desc: "Nome da Pilha/Lote", required: true },
          { name: "origin", type: "enum", desc: "BAHIA | PARÁ | GHANA | ...", required: true },
          { name: "formation_date", type: "date", desc: "Data de formação da pilha" },
          { name: "formation_moisture", type: "number", desc: "% Umidade na formação", required: true },
          { name: "formation_ffa", type: "number", desc: "FFA na formação", required: true },
          { name: "last_test_date", type: "date", desc: "Data do último teste" },
          { name: "last_moisture", type: "number", desc: "% Umidade no último teste" },
          { name: "last_ffa", type: "number", desc: "FFA no último teste" },
          { name: "moisture_variation", type: "number", desc: "Variação de umidade (calculado)" },
          { name: "ffa_variation", type: "number", desc: "Variação de FFA (calculado)" },
          { name: "quantity_tons", type: "number", desc: "Quantidade inicial em toneladas" },
          { name: "current_balance", type: "number", desc: "Saldo atual (toneladas)", default: "0" },
          { name: "status", type: "enum", desc: "ativa | finalizada", default: "ativa" },
        ],
        rls: "Create/Update: admin, qualidade, analista_qualidade, gerente_originacao | Read: + supervisor | Delete: admin, qualidade",
      },
    ],
  },
  {
    category: "Sustentabilidade & Fazendas",
    items: [
      {
        name: "Produtor",
        description: "Produtores de cacau",
        fields: [
          { name: "nome", type: "string", desc: "Nome do produtor", required: true },
          { name: "produtor_id", type: "string", desc: "ID / olam_farmer_id (ex: BR-0137-...)" },
          { name: "contato", type: "string", desc: "Telefone/contato" },
          { name: "cpf", type: "string", desc: "CPF" },
          { name: "fornecedor", type: "string", desc: "Nome do Parceiro/Fornecedor/Filial" },
          { name: "municipio", type: "string", desc: "Município/Cidade" },
          { name: "nome_fazenda", type: "string", desc: "Nome da fazenda" },
          { name: "programa", type: "enum", desc: "Nestlé/AtSource | Mondelez/Cocoa Life | Outro" },
          { name: "comprador_responsavel", type: "string", desc: "Comprador responsável" },
          { name: "filial_responsavel", type: "string", desc: "Filial responsável" },
          { name: "tecnico_responsavel", type: "string", desc: "Técnico responsável" },
          { name: "meeiro", type: "string", desc: "Nome do meeiro" },
          { name: "latitude", type: "number", desc: "Latitude" },
          { name: "longitude", type: "number", desc: "Longitude" },
          { name: "area_produtiva", type: "number", desc: "Área de cacau (hectares)" },
          { name: "ativo", type: "boolean", desc: "Produtor ativo", default: "true" },
        ],
        rls: "Create/Update: admin, gerente_sustentabilidade | Read: admin, gerente_sustentabilidade, ou por tecnico_responsavel/comprador_responsavel | Delete: admin",
      },
      {
        name: "FazendaAtribuicao",
        description: "Atribuição de visitas técnicas",
        fields: [
          { name: "produtor_id", type: "string", desc: "ID do registro Produtor", required: true },
          { name: "produtor_nome", type: "string", desc: "Nome do produtor (desnormalizado)" },
          { name: "tecnico_email", type: "string", desc: "Email do técnico responsável", required: true },
          { name: "tecnico_nome", type: "string", desc: "Nome do técnico" },
          { name: "perfil_visita", type: "enum", desc: "1-ADESAO | 2-REVISITA | 3-MONITORAMENTO", required: true },
          { name: "data_atendimento", type: "date", desc: "Data do atendimento" },
          { name: "data_agendamento_tecnico", type: "date", desc: "Data agendada pelo técnico" },
          { name: "status", type: "enum", desc: "pendente | em_andamento | concluido", default: "pendente" },
          { name: "doc_enviada", type: "boolean", desc: "Doc enviada ao concluir", default: "false" },
        ],
        rls: "Create: admin, gerente_sustentabilidade | Read/Update: admin, gerente_sustentabilidade, ou por tecnico_email | Delete: admin",
      },
      {
        name: "FazendaChecklist",
        description: "Checklist de fazendas",
        fields: [
          { name: "produtor_id", type: "string", desc: "ID do Produtor", required: true },
          { name: "atribuicao_id", type: "string", desc: "ID da FazendaAtribuicao" },
          { name: "tecnico_email", type: "string", desc: "Email do técnico" },
          { name: "poligono", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "coord_geoespacial", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "termo_adesao", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "codigo_fornecedor", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "ficha_recomendacao", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "clmrs_f1", type: "enum", desc: "FAZER | NÃO FAZER | PERFIL FAMILIAR" },
          { name: "clmrs_f2", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "treinamento_coaching", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "treinamento_agri", type: "enum", desc: "FAZER | NÃO FAZER" },
          { name: "longitude", type: "number", desc: "Longitude" },
          { name: "latitude", type: "number", desc: "Latitude" },
          { name: "itens_feitos", type: "array", desc: "Chaves dos itens marcados como feito" },
        ],
        rls: "Create: admin, gerente_sustentabilidade | Read/Update: admin, gerente_sustentabilidade, ou por tecnico_email | Delete: admin",
      },
      {
        name: "TecnicoSustentabilidade",
        description: "Técnicos agrícolas",
        fields: [
          { name: "nome", type: "string", desc: "Nome completo", required: true },
          { name: "email", type: "string", desc: "E-mail", required: true },
          { name: "telefone", type: "string", desc: "Telefone/WhatsApp" },
          { name: "cidade", type: "string", desc: "Cidade" },
          { name: "estado", type: "string", desc: "Estado (UF)" },
          { name: "ativo", type: "boolean", desc: "Técnico ativo", default: "true" },
        ],
        rls: "Create/Update/Delete: admin | Read: admin, gerente_sustentabilidade, tecnico_agricola, comprador, ou por email próprio",
      },
      {
        name: "SustentabilidadeConfig",
        description: "Configurações de sustentabilidade",
        fields: [
          { name: "config_key", type: "string", desc: "Chave única (ex: alerta_visita_concluida)", required: true },
          { name: "config_label", type: "string", desc: "Rótulo amigável" },
          { name: "enabled", type: "boolean", desc: "Configuração ativa", default: "true" },
          { name: "value", type: "string", desc: "Valor (URL, texto, etc)" },
          { name: "notes", type: "string", desc: "Observações" },
        ],
        rls: "Create/Update/Delete: admin | Read: admin, gerente_sustentabilidade, tecnico_agricola",
      },
    ],
  },
  {
    category: "Fornecedores & Contratos",
    items: [
      {
        name: "Supplier",
        description: "Fornecedores",
        fields: [
          { name: "name", type: "string", desc: "Nome do fornecedor", required: true },
          { name: "contact", type: "string", desc: "Contato" },
          { name: "active", type: "boolean", desc: "Fornecedor ativo", default: "true" },
          { name: "buyer_email", type: "string", desc: "Email do comprador responsável" },
        ],
        rls: "Create/Update: admin, supervisor, comprador | Read: admin, supervisor, operador, op_balanca, comprador, gerente_originacao, analista_qualidade, qualidade, controladoria, producao | Delete: admin",
      },
      {
        name: "ContractBalance",
        description: "Saldos de contratos",
        fields: [
          { name: "contract", type: "string", desc: "Tipo de contrato" },
          { name: "balance_tons", type: "number", desc: "Saldo em toneladas" },
        ],
        rls: "Admin only",
      },
    ],
  },
  {
    category: "Custos & Projetos",
    items: [
      {
        name: "IndiretosCost",
        description: "Controle de custos indiretos",
        fields: [
          { name: "item_name", type: "string", desc: "Nome do custo fixo ou compra", required: true },
          { name: "filial", type: "string", desc: "Filial (ex: BA - Ilhéus)", required: true },
          { name: "month", type: "string", desc: "Mês de referência (YYYY-MM)", required: true },
          { name: "is_custom", type: "boolean", desc: "Item customizado", default: "false" },
          { name: "origin_month", type: "string", desc: "Mês de origem (rollover)" },
          { name: "pr_number", type: "string", desc: "Número do PR (SAP)" },
          { name: "po_number", type: "string", desc: "Número do PO (SAP)" },
          { name: "completed_steps", type: "array", desc: "Índices dos steps concluídos (0-8)" },
          { name: "step_dates", type: "object", desc: "Datas de conclusão de cada step" },
          { name: "notes", type: "string", desc: "Observações" },
        ],
        rls: "Create/Read/Update: admin, supervisor, gerente_originacao, comprador | Delete: admin, supervisor, gerente_originacao",
      },
      {
        name: "Project",
        description: "Projetos",
        fields: [
          { name: "projeto", type: "string", desc: "Nome do projeto", required: true },
          { name: "numero_projeto", type: "string", desc: "Número do projeto" },
          { name: "filial", type: "string", desc: "Filial responsável" },
          { name: "descricao", type: "string", desc: "Descrição detalhada" },
          { name: "prioridade", type: "enum", desc: "Baixa | Média | Alta | Crítica", default: "Média" },
          { name: "responsavel", type: "string", desc: "Nome do responsável", required: true },
          { name: "area", type: "string", desc: "Área responsável" },
          { name: "tipo", type: "enum", desc: "Macro | Subprojeto | Individual", default: "Individual" },
          { name: "projeto_pai_id", type: "string", desc: "ID do projeto macro pai" },
          { name: "ano_budget", type: "number", desc: "Ano do budget" },
          { name: "valor_previsto", type: "number", desc: "Valor orçado" },
          { name: "valor_gasto", type: "number", desc: "Valor total gasto", default: "0" },
          { name: "data_inicio_planejada", type: "date", desc: "Data início planejada" },
          { name: "data_inicio_real", type: "date", desc: "Data início real" },
          { name: "data_fim_planejada", type: "date", desc: "Data fim planejada" },
          { name: "data_fim_real", type: "date", desc: "Data fim real" },
          { name: "status", type: "enum", desc: "Não Iniciado | Em Andamento | Pausado | Concluído | Cancelado", default: "Não Iniciado" },
          { name: "progresso", type: "number", desc: "Percentual (0-100)", default: "0" },
          { name: "gastos", type: "array", desc: "Lista de gastos [{descricao, valor, data, categoria}]" },
        ],
        rls: "Create/Update/Delete: admin | Read: admin, gerente_originacao, supervisor, ou por responsavel",
      },
      {
        name: "Sugestao",
        description: "Hub de inovação / sugestões",
        fields: [
          { name: "nome", type: "string", desc: "Nome do requisitante", required: true },
          { name: "departamento", type: "string", desc: "Departamento", required: true },
          { name: "tipo", type: "enum", desc: "Sugestão | Ideia | Requerimento", required: true },
          { name: "tipo_requerimento", type: "enum", desc: "Melhoria | Desenvolvimento" },
          { name: "nome_projeto", type: "string", desc: "Nome do projeto (para requerimentos)" },
          { name: "descricao", type: "string", desc: "Descrição", required: true },
          { name: "objetivo", type: "string", desc: "Objetivo" },
          { name: "impacto", type: "string", desc: "Impacto/benefícios" },
          { name: "prioridade", type: "number", desc: "Ordem (01 = mais prioritário)" },
          { name: "status", type: "enum", desc: "aguardando | em_analise | em_execucao | concluido", default: "aguardando" },
          { name: "criticidade", type: "enum", desc: "baixa (até 15d) | media (15-30d) | alta (>30d)" },
          { name: "tempo_processo_atual_horas", type: "number", desc: "Tempo gasto/ano no processo atual" },
          { name: "tempo_novo_fluxo_horas", type: "number", desc: "Tempo estimado/ano no novo fluxo" },
        ],
        rls: "Create: qualquer usuário (created_by) | Read: público | Update/Delete: criador ou admin",
      },
    ],
  },
  {
    category: "Matéria Acabada",
    items: [
      {
        name: "MALote",
        description: "Lotes de matéria acabada",
        fields: [
          { name: "lote", type: "string", desc: "Código/nome do lote", required: true },
          { name: "produto", type: "string", desc: "Descrição do produto" },
          { name: "material_sap", type: "string", desc: "Código do material SAP" },
          { name: "data_entrada", type: "date", desc: "Data de entrada", required: true },
          { name: "total_paletes", type: "number", desc: "Quantidade total de paletes" },
          { name: "lote_bloqueado", type: "boolean", desc: "Lote inteiro bloqueado", default: "false" },
          { name: "motivo_bloqueio_lote", type: "enum", desc: "Análise especial | Monitoramento | Reservado para cliente | Desvio de micro | Patógenos" },
          { name: "paletes", type: "array", desc: "Lista de paletes [{numero, bloqueado, motivo, observacao, cliente}]" },
        ],
        rls: "Create: operador, supervisor | Read: + op_balanca, analista_qualidade, qualidade, gerente_originacao, controladoria, producao, admin | Update: operador, supervisor, analista_qualidade, qualidade | Delete: supervisor",
      },
      {
        name: "MABalanca",
        description: "Registros de balança",
        fields: [
          { name: "date", type: "date", desc: "Data do registro", required: true },
          { name: "product", type: "string", desc: "Produto pesado", required: true },
          { name: "vehicle_plate", type: "string", desc: "Placa do veículo", required: true },
          { name: "driver_name", type: "string", desc: "Nome do motorista" },
          { name: "gross_weight", type: "number", desc: "Peso bruto (kg)", required: true },
          { name: "tare_weight", type: "number", desc: "Tara (kg)", required: true },
          { name: "net_weight", type: "number", desc: "Peso líquido (calculado)" },
          { name: "status", type: "enum", desc: "pendente | concluido | cancelado", default: "pendente" },
        ],
        rls: "Create/Update: op_balanca, operador, supervisor | Read: + controladoria, producao, admin | Delete: supervisor",
      },
    ],
  },
  {
    category: "Estoque & SAP",
    items: [
      {
        name: "MB52",
        description: "Estoque SAP",
        fields: [
          { name: "material", type: "string", desc: "Código do material", required: true },
          { name: "lote", type: "string", desc: "Lote" },
          { name: "texto_breve_material", type: "string", desc: "Texto breve" },
          { name: "deposito", type: "string", desc: "Depósito" },
          { name: "centro", type: "string", desc: "Centro" },
          { name: "unidade_medida", type: "string", desc: "Unidade de medida básica" },
          { name: "utilizacao_livre", type: "number", desc: "Utilização livre" },
          { name: "em_controle_qualidade", type: "number", desc: "Em controle de qualidade" },
          { name: "estoque_transito", type: "number", desc: "Estoque em trânsito" },
          { name: "bloqueado", type: "number", desc: "Bloqueado" },
          { name: "fonte", type: "enum", desc: "upload_excel | onedrive | sharepoint" },
          { name: "data_importacao", type: "date-time", desc: "Data/hora da última importação" },
        ],
        rls: "Read: admin, controladoria",
      },
    ],
  },
  {
    category: "Sistema & Configurações",
    items: [
      {
        name: "AppConfig",
        description: "Configurações do sistema",
        fields: [
          { name: "config_type", type: "enum", desc: "warehouse | line | alert", required: true },
          { name: "name", type: "string", desc: "Nome do item", required: true },
          { name: "warehouse_ref", type: "string", desc: "Referência ao armazém (para linhas)" },
          { name: "value", type: "string", desc: "Valor da configuração" },
          { name: "enabled", type: "boolean", desc: "Item ativo/inativo", default: "true" },
          { name: "has_crew", type: "boolean", desc: "Linha tem terno disponível", default: "true" },
          { name: "max_bags", type: "number", desc: "Limite máximo de sacos (0 = sem limite)" },
          { name: "visible", type: "boolean", desc: "Linha visível no sistema", default: "true" },
          { name: "settings", type: "object", desc: "Configurações adicionais (JSON)" },
        ],
        rls: "Create/Update/Delete: admin | Read: admin, + todos os perfis operacionais",
      },
      {
        name: "TransactionLog",
        description: "Log de transações (auditoria)",
        fields: [
          { name: "entity_type", type: "string", desc: "Tipo de entidade", required: true },
          { name: "entity_id", type: "string", desc: "ID do registro afetado", required: true },
          { name: "action", type: "enum", desc: "create | update | delete", required: true },
          { name: "data_before", type: "object", desc: "Dados antes (JSON)" },
          { name: "data_after", type: "object", desc: "Dados depois (JSON)" },
          { name: "changed_fields", type: "array", desc: "Lista de campos alterados" },
          { name: "user_email", type: "string", desc: "Email do usuário", required: true },
          { name: "user_name", type: "string", desc: "Nome do usuário" },
          { name: "timestamp", type: "date-time", desc: "Data/hora", required: true },
          { name: "ip_address", type: "string", desc: "Endereço IP" },
        ],
        rls: "Create: qualquer usuário | Read: admin, controladoria | Update/Delete: bloqueado",
      },
      {
        name: "User",
        description: "Usuários (built-in)",
        fields: [
          { name: "id", type: "string", desc: "ID único (built-in)" },
          { name: "full_name", type: "string", desc: "Nome completo (built-in)" },
          { name: "email", type: "string", desc: "Email (built-in)" },
          { name: "role", type: "enum", desc: "admin | user" },
          { name: "profile", type: "string", desc: "Perfil operacional (supervisor, operador, comprador, etc.)" },
        ],
        rls: "Apenas admins podem listar/atualizar/deletar outros usuários. Usuários não podem ser criados via API — são convidados via inviteUser().",
      },
    ],
  },
];

const BACKEND_FUNCTIONS = [
  { name: "createSchedulingRecord", description: "Cria registro de agendamento de descarga" },
  { name: "createQualityRecord", description: "Cria registro de análise de qualidade" },
  { name: "approveQualityRecord", description: "Aprova/rejeita registro de qualidade (Gerente Originação)" },
  { name: "qualityEmailAction", description: "Ações de email relacionadas à qualidade" },
  { name: "sendQualityAlert", description: "Envia alerta de desvio de qualidade (para Graziella, Vanessa, Raissa, Emilly)" },
  { name: "getIndiretosCosts", description: "Busca custos indiretos" },
  { name: "getLineConfigs", description: "Busca configurações de linhas de descarga" },
  { name: "getSuppliers", description: "Busca fornecedores (recursivo, 1000+)" },
  { name: "getTecnicoProdutores", description: "Busca produtores atribuídos a um técnico" },
  { name: "updateEntityRecord", description: "Atualiza registro de entidade genérico" },
  { name: "logTransaction", description: "Registra transação no TransactionLog (auditoria)" },
  { name: "scheduledEmailSender", description: "Envio agendado de emails" },
  { name: "sendDailyScheduleEmail", description: "Envia email diário de agendamentos" },
  { name: "sendDailyUpdateEmail", description: "Envia email diário de atualizações" },
  { name: "sendDataSquadEmail", description: "Envia email para o squad de dados" },
  { name: "sendOriginationDecision", description: "Envia decisão de originação" },
  { name: "extractDocumentData", description: "Extrai dados de documentos (PDF/Excel/CSV)" },
  { name: "powerBIDataExport", description: "Exporta dados para Power BI" },
  { name: "uploadInsightsImage", description: "Upload de imagem para insights" },
];

const CORE_INTEGRATIONS = [
  { name: "InvokeLLM", description: "Geração de texto via LLM (modelos: automatic, gpt_5_mini, gemini_3_flash, claude_sonnet_4_6, etc.)" },
  { name: "GenerateImage", description: "Geração de imagem via IA" },
  { name: "GenerateVideo", description: "Geração de vídeo via IA (Google Veo, 4/6/8s)" },
  { name: "GenerateSpeech", description: "Text-to-speech (vozes: river, honey, sunny, storm, spark)" },
  { name: "TranscribeAudio", description: "Transcrição de áudio (Whisper)" },
  { name: "UploadFile", description: "Upload de arquivo público" },
  { name: "UploadPrivateFile", description: "Upload de arquivo privado" },
  { name: "CreateFileSignedUrl", description: "URL assinada para arquivo privado" },
  { name: "ExtractDataFromUploadedFile", description: "Extrai dados estruturados de arquivos" },
  { name: "SendEmail", description: "Envio de email" },
];

export default function DocumentationExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = 20;

      const checkPageBreak = (needed = 10) => {
        if (y + needed > pageHeight - 14) {
          doc.addPage();
          y = 14;
        }
      };

      const addText = (text, fontSize, fontStyle, color) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle || "normal");
        if (color) doc.setTextColor(color[0], color[1], color[2]);
        else doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        lines.forEach((line) => {
          checkPageBreak(fontSize * 0.5);
          doc.text(line, margin, y);
          y += fontSize * 0.5;
        });
      };

      const addSectionTitle = (text) => {
        checkPageBreak(16);
        doc.setFillColor(134, 0, 99);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 9, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin + 3, y + 2);
        y += 10;
      };

      // ===== CAPA =====
      doc.setFillColor(134, 0, 99);
      doc.rect(0, 0, pageWidth, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Central Pulse", pageWidth / 2, 25, { align: "center" });
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Documentação de Schemas & APIs", pageWidth / 2, 36, { align: "center" });
      y = 60;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text("Sistema de gestão de descargas, qualidade, sustentabilidade e custos", pageWidth / 2, y, { align: "center" });
      y += 6;
      doc.text("OFI - Olam Food Ingredients", pageWidth / 2, y, { align: "center" });
      y += 14;

      // ===== ÍNDICE =====
      addSectionTitle("Índice de Entidades");
      ENTITIES.forEach((cat) => {
        addText(`▸ ${cat.category}`, 10, "bold", [134, 0, 99]);
        cat.items.forEach((entity) => {
          addText(`   • ${entity.name} — ${entity.description}`, 9);
        });
        y += 2;
      });

      y += 6;
      addSectionTitle("Índice de APIs");
      addText("▸ Backend Functions (20 funções)", 10, "bold", [134, 0, 99]);
      addText("▸ Core Integrations (10 endpoints)", 10, "bold", [134, 0, 99]);

      // ===== ENTIDADES DETALHADAS =====
      doc.addPage();
      y = 20;
      addText("Detalhamento de Entidades", 16, "bold", [134, 0, 99]);
      y += 6;

      ENTITIES.forEach((cat) => {
        addSectionTitle(cat.category);

        cat.items.forEach((entity) => {
          checkPageBreak(20);
          addText(`${entity.name}`, 11, "bold", [134, 0, 99]);
          addText(`${entity.description}`, 9, "italic", [100, 100, 100]);
          y += 2;

          // Tabela de campos
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(80, 80, 80);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 6, "F");
          doc.text("Campo", margin + 2, y);
          doc.text("Tipo", margin + 80, y);
          doc.text("Descrição", margin + 120, y);
          doc.text("Req.", pageWidth - margin - 14, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          entity.fields.forEach((field, idx) => {
            checkPageBreak(5);
            doc.setTextColor(idx % 2 === 0 ? 50 : 60, 50, 50);
            if (idx % 2 === 0) {
              doc.setFillColor(245, 240, 245);
              doc.rect(margin, y - 4, pageWidth - margin * 2, 5, "F");
            }
            doc.text(field.name, margin + 2, y);
            doc.text(field.type, margin + 80, y);
            const descLines = doc.splitTextToSize(field.desc, 60);
            doc.text(descLines[0], margin + 120, y);
            doc.text(field.required ? "✓" : "", pageWidth - margin - 14, y);
            y += 5;
            if (descLines.length > 1) {
              descLines.slice(1).forEach((dl) => {
                checkPageBreak(4);
                doc.text(dl, margin + 120, y);
                y += 4;
              });
            }
          });

          if (entity.rls) {
            y += 3;
            checkPageBreak(10);
            addText("RLS:", 8, "bold", [200, 100, 0]);
            addText(entity.rls, 8);
          }
          y += 6;
        });
      });

      // ===== BACKEND FUNCTIONS =====
      doc.addPage();
      y = 20;
      addText("Backend Functions (APIs)", 16, "bold", [134, 0, 99]);
      y += 4;
      addText("Invocação: base44.functions.invoke('functionName', { param: value })", 9, "italic", [100, 100, 100]);
      y += 6;

      BACKEND_FUNCTIONS.forEach((fn, idx) => {
        checkPageBreak(8);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(134, 0, 99);
        doc.text(`${idx + 1}. ${fn.name}`, margin, y);
        y += 5;
        addText(`   ${fn.description}`, 9);
        y += 3;
      });

      // ===== CORE INTEGRATIONS =====
      y += 6;
      addText("Core Integrations (Built-in)", 16, "bold", [134, 0, 99]);
      y += 4;
      addText("Invocação: base44.integrations.Core.<Endpoint>(data)", 9, "italic", [100, 100, 100]);
      y += 6;

      CORE_INTEGRATIONS.forEach((int, idx) => {
        checkPageBreak(8);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(248, 141, 42);
        doc.text(`${idx + 1}. ${int.name}`, margin, y);
        y += 5;
        addText(`   ${int.description}`, 9);
        y += 3;
      });

      // ===== GUIA DE MIGRAÇÃO PARA BANCO LOCAL =====
      doc.addPage();
      y = 20;
      addText("Migração para Banco Local — Passo a Passo", 16, "bold", [16, 185, 129]);
      y += 4;
      addText("Guia de como redirecionar a rota do app do Base44 SDK para um banco PostgreSQL local.", 9, "italic", [100, 100, 100]);
      y += 6;

      addText("Arquitetura:", 10, "bold", [16, 185, 129]);
      addText("Atual:  App React → Base44 SDK (BaaS)", 9);
      addText("O SDK não fala SQL puro — exige API REST intermediária.", 9, "italic", [200, 80, 80]);
      addText("Nova:   App React → API Express → PostgreSQL local", 9);
      y += 4;

      addText("Passo 1 — Criar API Backend (Node/Express + Prisma)", 10, "bold", [16, 185, 129]);
      addText("Criar endpoints REST para cada uma das 25 entidades:", 9);
      addText("  GET    /api/schedulings          → listar", 8);
      addText("  POST   /api/schedulings          → criar", 8);
      addText("  PUT    /api/schedulings/:id      → atualizar", 8);
      addText("  DELETE /api/schedulings/:id      → remover", 8);
      y += 4;

      addText("Passo 2 — Adicionar variável de ambiente no .env", 10, "bold", [16, 185, 129]);
      addText("  VITE_LOCAL_API_URL=http://localhost:3000/api", 8);
      y += 4;

      addText("Passo 3 — Criar cliente API customizado (api/apiClient.js)", 10, "bold", [16, 185, 129]);
      addText("Substituir o base44Client.js por um cliente HTTP fetch:", 9);
      addText("  const API_URL = import.meta.env.VITE_LOCAL_API_URL;", 8);
      addText("  export const api = {", 8);
      addText("    entities: {", 8);
      addText("      Scheduling: {", 8);
      addText("        list: async (sort, limit) => { ... fetch ... },", 8);
      addText("        get: async (id) => { ... },", 8);
      addText("        create: async (data) => { ... },", 8);
      addText("        update: async (id, data) => { ... },", 8);
      addText("        delete: async (id) => { ... },", 8);
      addText("        filter: async (query) => { ... },", 8);
      addText("      },", 8);
      addText("      // ... repetir para as 25 entidades", 8);
      addText("    }", 8);
      addText("  };", 8);
      y += 4;

      addText("Passo 4 — Trocar os imports em todas as páginas e componentes", 10, "bold", [16, 185, 129]);
      addText("Antes (Base44 SDK):", 9, "bold");
      addText("  import { base44 } from \"@/api/base44Client\";", 8);
      addText("  base44.entities.Scheduling.list()", 8);
      y += 2;
      addText("Depois (API local):", 9, "bold");
      addText("  import { api } from \"@/api/apiClient\";", 8);
      addText("  api.entities.Scheduling.list()", 8);
      y += 4;

      addText("Resumo dos arquivos a alterar:", 10, "bold", [16, 185, 129]);
      addText("  1. .env                     → Adicionar VITE_LOCAL_API_URL", 8);
      addText("  2. api/apiClient.js         → Criar cliente HTTP", 8);
      addText("  3. api/base44Client.js       → Substituir export", 8);
      addText("  4. Todas as páginas/components → Trocar base44.entities.X → api.entities.X", 8);

      // ===== RODAPÉ em todas as páginas =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Central Pulse — Documentação de Schemas & APIs  |  Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
      }

      doc.save("Central_Pulse_Documentacao_Schemas_APIs.pdf");
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    }
    setIsGenerating(false);
  };

  const downloadSQL = () => {
    try {
      const blob = new Blob([CENTRAL_PULSE_SQL], { type: "application/sql;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "central_pulse_postgresql.sql";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Script SQL baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao baixar o script SQL");
    }
  };

  const downloadSQLLocal = () => {
    try {
      const blob = new Blob([CENTRAL_PULSE_SQL_LOCAL], { type: "application/sql;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "central_pulse_localhost.sql";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Script SQL (Localhost) baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao baixar o script SQL Localhost");
    }
  };

  const downloadMigrationGuide = () => {
    try {
      const guide = `CENTRAL PULSE — Guia de Migração para Banco Local (PostgreSQL)
====================================================================

Data de geração: ${new Date().toLocaleDateString("pt-BR")}

ARQUITETURA
-----------
Atual:  App React → Base44 SDK (BaaS)
⚠️ O SDK não fala SQL puro — exige API REST intermediária.
Nova:   App React → API Express → PostgreSQL local


PASSO 1 — Criar API Backend (Node/Express + Prisma)
---------------------------------------------------
Camada intermediária entre o app React e o PostgreSQL.
Crie endpoints REST para cada uma das 25 entidades:

  GET    /api/schedulings          → listar
  POST   /api/schedulings          → criar
  PUT    /api/schedulings/:id      → atualizar
  DELETE /api/schedulings/:id      → remover


PASSO 2 — Adicionar variável de ambiente
----------------------------------------
No arquivo .env do projeto:

  VITE_LOCAL_API_URL=http://localhost:3000/api


PASSO 3 — Criar cliente API customizado (api/apiClient.js)
----------------------------------------------------------
Substituir o base44Client.js por um cliente HTTP fetch:

  // api/apiClient.js
  const API_URL = import.meta.env.VITE_LOCAL_API_URL;

  export const api = {
    entities: {
      Scheduling: {
        list: async (sort, limit) => {
          const res = await fetch(
            \`\${API_URL}/schedulings?sort=\${sort}&limit=\${limit}\`
          );
          return res.json();
        },
        get: async (id) => {
          const res = await fetch(\`\${API_URL}/schedulings/\${id}\`);
          return res.json();
        },
        create: async (data) => {
          const res = await fetch(\`\${API_URL}/schedulings\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          return res.json();
        },
        update: async (id, data) => { /* PUT */ },
        delete: async (id) => { /* DELETE */ },
        filter: async (query) => { /* GET com query params */ },
      },
      // ... repetir para as 25 entidades
    }
  };


PASSO 4 — Trocar os imports em todas as páginas e componentes
------------------------------------------------------------
Antes (Base44 SDK):
  import { base44 } from "@/api/base44Client";
  base44.entities.Scheduling.list()

Depois (API local):
  import { api } from "@/api/apiClient";
  api.entities.Scheduling.list()


RESUMO DOS ARQUIVOS A ALTERAR
-----------------------------
1. .env                      → Adicionar VITE_LOCAL_API_URL
2. api/apiClient.js          → Criar cliente HTTP
3. api/base44Client.js       → Substituir export
4. Todas as páginas/components → Trocar base44.entities.X → api.entities.X
`;
      const blob = new Blob([guide], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "central_pulse_migracao_banco_local.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Guia de migração baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao baixar o guia de migração");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText className="w-7 h-7 text-[#860063]" />
            Documentação do Banco de Dados & APIs
          </h1>
          <p className="text-sm text-gray-600">
            Gere um arquivo PDF completo com todos os schemas de entidades, campos, regras de segurança (RLS) e APIs disponíveis no sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-2 border-[#860063]/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Entidades</p>
                  <p className="text-3xl font-black text-[#860063]">
                    {ENTITIES.reduce((sum, c) => sum + c.items.length, 0)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#860063] to-purple-600 rounded-2xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-[#F88D2A]/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Backend Functions</p>
                  <p className="text-3xl font-black text-[#F88D2A]">{BACKEND_FUNCTIONS.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#F88D2A] to-orange-600 rounded-2xl">
                  <Code className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-400/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Core Integrations</p>
                  <p className="text-3xl font-black text-green-600">{CORE_INTEGRATIONS.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl border-2 border-[#860063]/30">
          <CardHeader className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="w-5 h-5 text-[#860063]" />
              Exportar Documentação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              O documento PDF conterá:
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Capa com identificação do sistema
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Índice de entidades organizadas por categoria
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Detalhamento de cada entidade: campos, tipos, descrições e campos obrigatórios
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Regras de RLS (Row Level Security) por entidade
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Lista completa de Backend Functions com descrições
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#860063] font-bold">▸</span>
                Lista de Core Integrations disponíveis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">▸</span>
                Guia de migração para banco local PostgreSQL (passo a passo)
              </li>
            </ul>

            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white font-semibold py-3"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Documentação em PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Script PostgreSQL */}
        <Card className="shadow-xl border-2 border-blue-500/30 mt-6">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCode className="w-5 h-5 text-blue-600" />
              Script PostgreSQL — Estrutura Completa do Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Script SQL completo para criação do banco <code className="px-1.5 py-0.5 bg-gray-100 rounded text-blue-700 font-mono text-xs">central_pulse</code> em PostgreSQL, contendo:
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                6 schemas (logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                25 tabelas com todos os campos, tipos e constraints
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                Tipos ENUM para todos os campos enumerados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                Índices de performance em campos de busca frequente
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                Triggers de auto-update do campo <code className="text-xs">updated_at</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">▸</span>
                Extensão <code className="text-xs">uuid-ossp</code> para chaves primárias UUID
              </li>
            </ul>
            <div className="bg-gray-900 rounded-lg p-3 mb-4 overflow-x-auto">
              <code className="text-xs text-green-400 font-mono">
                -- Banco: central_pulse<br />
                -- 25 tabelas | 6 schemas | 35+ tipos ENUM<br />
                -- Execute: psql -U postgres -d central_pulse -f central_pulse_postgresql.sql
              </code>
            </div>
            <Button
              onClick={downloadSQL}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3"
              size="lg"
            >
              <FileCode className="w-5 h-5 mr-2" />
              Baixar Script SQL (.sql)
            </Button>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700 font-semibold mb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                Versão Localhost (pronta para uso local)
              </p>
              <p className="text-xs text-gray-600 mb-3">
                Script completo que cria o banco, o usuário <code className="px-1 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono">central_pulse_user</code> com senha,
                concede todas as permissões e inclui a string de conexão para o <code className="px-1 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono">.env</code>.
              </p>
              <Button
                onClick={downloadSQLLocal}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3"
                size="lg"
              >
                <Server className="w-5 h-5 mr-2" />
                Baixar Script SQL — Localhost (.sql)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scripts das Páginas já Alterados (Localhost) */}
        <MigrationScriptsDownload />

        {/* Script COMPLETO — Todas as Páginas + Entidades → Local */}
        <Card className="shadow-xl border-2 border-purple-500/30 mt-6">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-purple-600" />
              Script COMPLETO — Todas as Páginas & Entidades → Servidor Local
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Documento consolidado listando <strong>todas as {FULL_MIGRATION_DOC ? "~57" : 0} páginas</strong> do app, as{" "}
              <strong>25 entidades</strong> mapeadas para endpoints locais e as funções/integrações que precisam
              ser reimplementadas no backend Express local.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">▸</span>
                Mapeamento página → entidades usadas (antes vs depois)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">▸</span>
                As 25 entidades → endpoints da API local (ex: Scheduling → /api/schedulings)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">▸</span>
                Lista das 19 backend functions que precisam de equivalentes locais
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">▸</span>
                Alternativas locais para as 10 integrações Core (LLM, email, upload, etc)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">▸</span>
                Checklist de migração passo a passo (12 itens)
              </li>
            </ul>
            <Button
              onClick={() => {
                const blob = new Blob([FULL_MIGRATION_DOC], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "central_pulse_migracao_completa.txt";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Script completo de migração baixado!");
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-semibold py-3"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Script COMPLETO de Migração (.txt)
            </Button>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-700 font-semibold mb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-600" />
                server.js COMPLETO (todas as 25 entidades)
              </p>
              <p className="text-xs text-gray-600 mb-3">
                API Express com <strong>todos os endpoints CRUD</strong> das 25 entidades já implementados
                (list, get, create, update, delete, bulk) + healthcheck + auth simulado. Pronto para{" "}
                <code className="px-1 py-0.5 bg-gray-100 rounded text-orange-700 font-mono">node server.js</code>.
              </p>
              <Button
                onClick={() => {
                  const blob = new Blob([FULL_SERVER_JS], { type: "text/javascript;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "server-completo.js";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success("server.js completo baixado!");
                }}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold py-3"
                size="lg"
              >
                <Server className="w-5 h-5 mr-2" />
                Baixar server.js COMPLETO (25 entidades) (.js)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guia de Migração para Banco Local */}
        <Card className="shadow-xl border-2 border-emerald-500/30 mt-6">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="w-5 h-5 text-emerald-600" />
              Migração para Banco Local — Passo a Passo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Guia de como redirecionar a rota do app do Base44 SDK para um banco PostgreSQL local recriado a partir do script acima.
            </p>

            {/* Arquitetura */}
            <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto">
              <code className="text-xs text-cyan-400 font-mono block text-center">
                App React (atual) <ArrowRight className="inline w-3 h-3 mx-1" /> Base44 SDK
              </code>
              <code className="text-xs text-gray-500 font-mono block text-center mb-2">
                ⚠️ O SDK não fala SQL puro — exige API REST intermediária
              </code>
              <code className="text-xs text-green-400 font-mono block text-center">
                App React (novo) <ArrowRight className="inline w-3 h-3 mx-1" /> API Express <ArrowRight className="inline w-3 h-3 mx-1" /> PostgreSQL local
              </code>
            </div>

            {/* Passo 1 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm">1</span>
                <h3 className="font-bold text-gray-800 text-sm">Criar API Backend (Node/Express + Prisma)</h3>
              </div>
              <p className="text-sm text-gray-600 ml-9 mb-2">
                Camada intermediária entre o app React e o PostgreSQL. Crie endpoints REST para cada entidade:
              </p>
              <div className="bg-gray-900 rounded-lg p-3 ml-9 overflow-x-auto">
                <code className="text-xs text-green-400 font-mono">
                  GET    /api/schedulings          → listar agendamentos<br />
                  POST   /api/schedulings          → criar agendamento<br />
                  PUT    /api/schedulings/:id      → atualizar<br />
                  DELETE /api/schedulations/:id    → remover<br />
                  <span className="text-gray-500">// repetir para cada uma das 25 entidades</span>
                </code>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm">2</span>
                <h3 className="font-bold text-gray-800 text-sm">Adicionar variável de ambiente</h3>
              </div>
              <p className="text-sm text-gray-600 ml-9 mb-2">
                No arquivo <code className="px-1.5 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono text-xs">.env</code> do projeto:
              </p>
              <div className="bg-gray-900 rounded-lg p-3 ml-9 overflow-x-auto">
                <code className="text-xs text-green-400 font-mono">
                  VITE_LOCAL_API_URL=http://localhost:3000/api
                </code>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm">3</span>
                <h3 className="font-bold text-gray-800 text-sm">Criar cliente API customizado</h3>
              </div>
              <p className="text-sm text-gray-600 ml-9 mb-2">
                Criar o arquivo <code className="px-1.5 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono text-xs">api/apiClient.js</code> substituindo o <code className="px-1.5 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono text-xs">base44Client.js</code>:
              </p>
              <div className="bg-gray-900 rounded-lg p-3 ml-9 overflow-x-auto max-h-48 overflow-y-auto">
                <code className="text-xs text-green-400 font-mono whitespace-pre">
{`// api/apiClient.js
const API_URL = import.meta.env.VITE_LOCAL_API_URL;

export const api = {
  entities: {
    Scheduling: {
      list: async (sort, limit) => {
        const res = await fetch(
          \`\${API_URL}/schedulings?sort=\${sort}&limit=\${limit}\`
        );
        return res.json();
      },
      get: async (id) => {
        const res = await fetch(\`\${API_URL}/schedulings/\${id}\`);
        return res.json();
      },
      create: async (data) => {
        const res = await fetch(\`\${API_URL}/schedulings\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return res.json();
      },
      update: async (id, data) => { /* PUT */ },
      delete: async (id) => { /* DELETE */ },
      filter: async (query) => { /* GET com query params */ },
    },
    // ... repetir para as 25 entidades
  }
};`}
                </code>
              </div>
            </div>

            {/* Passo 4 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-sm">4</span>
                <h3 className="font-bold text-gray-800 text-sm">Trocar os imports em todas as páginas e componentes</h3>
              </div>
              <p className="text-sm text-gray-600 ml-9 mb-2">
                Em cada arquivo que usa o SDK Base44, substituir:
              </p>
              <div className="bg-gray-900 rounded-lg p-3 ml-9 overflow-x-auto mb-2">
                <code className="text-xs text-red-400 font-mono">
{`// Antes (Base44 SDK)
import { base44 } from "@/api/base44Client";
base44.entities.Scheduling.list()`}
                </code>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 ml-9 overflow-x-auto">
                <code className="text-xs text-green-400 font-mono">
{`// Depois (API local)
import { api } from "@/api/apiClient";
api.entities.Scheduling.list()`}
                </code>
              </div>
            </div>

            {/* Download do guia */}
            <Button
              onClick={downloadMigrationGuide}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 mb-4"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Guia de Migração (.md)
            </Button>

            {/* Tabela resumo */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-3 py-2 text-left font-bold">Ordem</th>
                    <th className="px-3 py-2 text-left font-bold">Arquivo</th>
                    <th className="px-3 py-2 text-left font-bold">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-bold text-emerald-600">1</td>
                    <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">.env</code></td>
                    <td className="px-3 py-2">Adicionar <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">VITE_LOCAL_API_URL</code></td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 font-bold text-emerald-600">2</td>
                    <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">api/apiClient.js</code></td>
                    <td className="px-3 py-2">Criar cliente HTTP</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-bold text-emerald-600">3</td>
                    <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">api/base44Client.js</code></td>
                    <td className="px-3 py-2">Substituir export</td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 font-bold text-emerald-600">4</td>
                    <td className="px-3 py-2">Todas as páginas/components</td>
                    <td className="px-3 py-2">Trocar <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">base44.entities.X</code> → <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">api.entities.X</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Bundle Completo — Baixar Tudo */}
        <FullMigrationBundleDownload />

        {/* Projeto Completo em ZIP (estrutura idêntica ao download do painel) */}
        <ProjectZipDownload />

        {/* Arquivos de Autenticação Local (login email + senha) */}
        <LoginFilesDownload />

        {/* Preview de categorias */}
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Categorias de Entidades</h2>
          {ENTITIES.map((cat) => (
            <Card key={cat.category} className="shadow-md border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-[#860063]">{cat.category}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((entity) => (
                    <span
                      key={entity.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700"
                    >
                      <Database className="w-3 h-3 text-[#860063]" />
                      {entity.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}