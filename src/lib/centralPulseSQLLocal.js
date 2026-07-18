// Central Pulse — PostgreSQL Schema Script (VERSÃO LOCALHOST)
// Exportado como string para download na página de Documentação
// Inclui criação do banco, usuário local, permissões e configuração de conexão

export const CENTRAL_PULSE_SQL_LOCAL = `-- =====================================================================
-- CENTRAL PULSE — Script de Criação do Banco PostgreSQL (LOCALHOST)
-- =====================================================================
-- Banco: central_pulse
-- Usuário: central_pulse_user
-- Senha:   central_pulse_pass
-- Host:    localhost
-- Porta:   5433
-- =====================================================================
-- Este script cria TUDO necessário para rodar o banco localmente:
--   1. Banco de dados
--   2. Usuário com permissões
--   3. Schemas, tipos ENUM, tabelas, índices e triggers
-- =====================================================================
-- COMO EXECUTAR:
--   psql -U postgres -f central_pulse_localhost.sql
--   (ou cole no pgAdmin / DBeaver conectado como postgres)
-- =====================================================================

-- =====================================================================
-- 0. CRIAÇÃO DO BANCO E USUÁRIO LOCAL
-- =====================================================================

-- Cria o banco (IGNORE se já existir)
SELECT 'CREATE DATABASE central_pulse
  WITH ENCODING '\''UTF8'\''
  LC_COLLATE '\''pt_BR.UTF-8'\''
  LC_CTYPE '\''pt_BR.UTF-8'\'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'central_pulse')\gexec

-- Conecta ao banco criado
\\c central_pulse

-- Cria usuário local (ROLE) com senha definida
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'central_pulse_user') THEN
    CREATE ROLE central_pulse_user
      WITH LOGIN PASSWORD 'central_pulse_pass'
      CREATEDB
      CONNECTION LIMIT 100;
  END IF;
END $$;

-- Concede todos os privilégios no banco ao usuário local
GRANT ALL PRIVILEGES ON DATABASE central_pulse TO central_pulse_user;

-- Concede privilégios de schema (será re-aplicado após criar os schemas)
ALTER DATABASE central_pulse OWNER TO central_pulse_user;

-- =====================================================================
-- 1. SCHEMAS
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS logistica AUTHORIZATION central_pulse_user;
CREATE SCHEMA IF NOT EXISTS qualidade AUTHORIZATION central_pulse_user;
CREATE SCHEMA IF NOT EXISTS sustentabilidade AUTHORIZATION central_pulse_user;
CREATE SCHEMA IF NOT EXISTS cadastro AUTHORIZATION central_pulse_user;
CREATE SCHEMA IF NOT EXISTS financeiro AUTHORIZATION central_pulse_user;
CREATE SCHEMA IF NOT EXISTS sistema AUTHORIZATION central_pulse_user;

-- Garante que o usuário local pode usar os schemas
GRANT ALL ON SCHEMA logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema TO central_pulse_user;

-- Define search_path padrão para facilitar consultas
ALTER ROLE central_pulse_user SET search_path TO logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema, public;

-- =====================================================================
-- 2. EXTENSÕES
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT USAGE, CREATE ON SCHEMA public TO central_pulse_user;

-- =====================================================================
-- 3. TIPOS ENUM
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE warehouse_type AS ENUM ('central', 'fabrica', 'barra', 'ferraz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE scheduling_status AS ENUM ('agendado', 'aguardando', 'em_descarga', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('RFP', 'PTBF', 'DIF', 'TRANSFERÊNCIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE release_status AS ENUM ('pendente', 'aguardando_liberacao', 'liberado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE origin_type AS ENUM ('BAHIA', 'PARÁ', 'GHANA', 'MARFIM', 'ESPIRITO SANTO', 'RONDÔNIA', 'TOCANTINS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_phase AS ENUM ('carga', 'descarga');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pallet_type AS ENUM ('1MT', '1.5MT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_location AS ENUM ('central', 'fabrica', 'ferraz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('aguardando', 'em_descarga', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_deposit_status AS ENUM ('Pendente', 'OK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sacos_type AS ENUM ('Sacos', 'Big Bags');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE classificador_type AS ENUM ('Andryo Borges', 'Vinicius Teles', 'Igor Moura');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_opinion AS ENUM ('pendente', 'favoravel', 'desfavoravel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moisture_approval AS ENUM ('pendente', 'aprovado', 'devolvido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pile_status AS ENUM ('ativa', 'finalizada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perfil_visita AS ENUM ('1 - ADESAO', '2 - REVISITA', '3 - MONITORAMENTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE atribuicao_status AS ENUM ('pendente', 'em_andamento', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fazer_nao_fazer AS ENUM ('FAZER', 'NÃO FAZER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE clmrs_f1_type AS ENUM ('FAZER', 'NÃO FAZER', 'PERFIL FAMILIAR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE programa_type AS ENUM ('Nestlé/AtSource', 'Mondelez/Cocoa Life', 'Outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_prioridade AS ENUM ('Baixa', 'Média', 'Alta', 'Crítica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_tipo AS ENUM ('Macro', 'Subprojeto', 'Individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('Não Iniciado', 'Em Andamento', 'Pausado', 'Concluído', 'Cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sugestao_tipo AS ENUM ('Sugestão', 'Ideia', 'Requerimento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sugestao_requerimento AS ENUM ('Melhoria', 'Desenvolvimento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sugestao_status AS ENUM ('aguardando', 'em_analise', 'em_execucao', 'concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE criticidade_type AS ENUM ('baixa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_balanca_status AS ENUM ('pendente', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE motivo_bloqueio_lote AS ENUM ('Análise especial', 'Monitoramento', 'Reservado para cliente', 'Desvio de micro', 'Patógenos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mb52_fonte AS ENUM ('upload_excel', 'onedrive', 'sharepoint');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_config_type AS ENUM ('warehouse', 'line', 'alert');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_action AS ENUM ('create', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE paletizado_type AS ENUM ('SIM', 'NÃO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE frete_type AS ENUM ('CIF', 'FCA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE expedicao_status AS ENUM ('agendado', 'aguardando', 'em_carregamento', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE eudr_cvn_type AS ENUM ('EUDR', 'CVN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE apanha_status AS ENUM ('Apanha', 'NA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ms_gender_type AS ENUM ('M', 'F', 'Outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Concede uso dos tipos ao usuário local
GRANT USAGE ON TYPE warehouse_type, scheduling_status, contract_type, release_status,
  origin_type, transfer_phase, pallet_type, transfer_location, transfer_status,
  transfer_deposit_status, sacos_type, classificador_type, quality_opinion, moisture_approval,
  pile_status, perfil_visita, atribuicao_status, fazer_nao_fazer, clmrs_f1_type, programa_type,
  project_prioridade, project_tipo, project_status, sugestao_tipo, sugestao_requerimento,
  sugestao_status, criticidade_type, ma_balanca_status, motivo_bloqueio_lote, mb52_fonte,
  app_config_type, log_action, user_role, paletizado_type, frete_type, expedicao_status,
  eudr_cvn_type, apanha_status, ms_gender_type TO central_pulse_user;

-- =====================================================================
-- 4. SISTEMA — USERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS sistema.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(255),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    role            user_role DEFAULT 'user',
    profile         VARCHAR(50),
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON sistema.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON sistema.users(role);

-- =====================================================================
-- 5. LOGÍSTICA — SCHEDULINGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS logistica.schedulings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date                    DATE NOT NULL,
    start_time              VARCHAR(5) NOT NULL,
    start_time_actual       VARCHAR(5),
    arrival_time            VARCHAR(5),
    call_time               VARCHAR(5),
    called_by               VARCHAR(255),
    end_time_predicted      VARCHAR(5),
    end_time_actual         VARCHAR(5),
    supplier                VARCHAR(500) NOT NULL,
    quantity_bags           NUMERIC(14,2) NOT NULL,
    quantity_tons           NUMERIC(14,4),
    warehouse               warehouse_type NOT NULL,
    line                    VARCHAR(50) NOT NULL,
    status                  scheduling_status DEFAULT 'agendado',
    contract                contract_type,
    wb_number               VARCHAR(50),
    load_number             VARCHAR(50),
    actual_bags             NUMERIC(14,2),
    tracking_code           VARCHAR(100),
    eudr_cvn                eudr_cvn_type,
    apanha_status           apanha_status,
    vehicle_plate           VARCHAR(20),
    driver_name             VARCHAR(255),
    driver_phone            VARCHAR(50),
    invoice_number          VARCHAR(100),
    gross_weight            NUMERIC(14,3),
    tare_weight             NUMERIC(14,3),
    net_weight              NUMERIC(14,3),
    net_weight_without_bags NUMERIC(14,3),
    origin_weight           NUMERIC(14,3),
    balancinha              VARCHAR(50),
    amostragem              VARCHAR(50),
    duplo                   VARCHAR(50),
    nibs                    VARCHAR(50),
    po                      VARCHAR(50),
    amostragem_devolvida    VARCHAR(50),
    duplo_devolvido         VARCHAR(50),
    nibs_devolvido          VARCHAR(50),
    po_devolvido            VARCHAR(50),
    batch                   VARCHAR(100),
    batches                 JSONB,
    gr                      VARCHAR(100),
    release_status          release_status DEFAULT 'pendente',
    release_requested_by    VARCHAR(255),
    release_requested_date  TIMESTAMPTZ,
    released_by             VARCHAR(255),
    released_date           TIMESTAMPTZ,
    created_by_name         VARCHAR(255),
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sched_date ON logistica.schedulings(date);
CREATE INDEX IF NOT EXISTS idx_sched_warehouse ON logistica.schedulings(warehouse);
CREATE INDEX IF NOT EXISTS idx_sched_status ON logistica.schedulings(status);
CREATE INDEX IF NOT EXISTS idx_sched_supplier ON logistica.schedulings(supplier);
CREATE INDEX IF NOT EXISTS idx_sched_load_number ON logistica.schedulings(load_number);

-- =====================================================================
-- 6. LOGÍSTICA — TRANSFERS_2082
-- =====================================================================

CREATE TABLE IF NOT EXISTS logistica.transfers_2082 (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date                    DATE NOT NULL,
    transfer_group_id       VARCHAR(100) NOT NULL,
    phase                   transfer_phase NOT NULL,
    location                transfer_location NOT NULL,
    pallet_type             pallet_type NOT NULL,
    batch                   VARCHAR(100) NOT NULL,
    origin                  origin_type NOT NULL,
    quantity_per_truck      NUMERIC(14,2) NOT NULL,
    load_number             VARCHAR(50),
    start_time              VARCHAR(5),
    end_time                VARCHAR(5),
    invoice_number          VARCHAR(100),
    wb_number               VARCHAR(50),
    gross_weight            NUMERIC(14,3),
    tare_weight             NUMERIC(14,3),
    net_weight              NUMERIC(14,3),
    status                  transfer_status DEFAULT 'aguardando',
    gr                      VARCHAR(100),
    release_status          release_status DEFAULT 'pendente',
    release_requested_by    VARCHAR(255),
    release_requested_date  TIMESTAMPTZ,
    released_by             VARCHAR(255),
    released_date           TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_t2082_date ON logistica.transfers_2082(date);
CREATE INDEX IF NOT EXISTS idx_t2082_group ON logistica.transfers_2082(transfer_group_id);
CREATE INDEX IF NOT EXISTS idx_t2082_phase ON logistica.transfers_2082(phase);

-- =====================================================================
-- 7. LOGÍSTICA — TRANSFER_DEPOSITS
-- =====================================================================

CREATE TABLE IF NOT EXISTS logistica.transfer_deposits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date            DATE NOT NULL,
    nf              VARCHAR(100) NOT NULL,
    pile_lot        VARCHAR(100) NOT NULL,
    origin          origin_type NOT NULL,
    moisture_percent NUMERIC(8,4),
    ffa             NUMERIC(8,4),
    deposito        VARCHAR(100),
    classificador   classificador_type,
    status          transfer_deposit_status DEFAULT 'Pendente',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_td_date ON logistica.transfer_deposits(date);

-- =====================================================================
-- 8. LOGÍSTICA — MOEGA_ANTERIOR
-- =====================================================================

CREATE TABLE IF NOT EXISTS logistica.moega_anterior (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consuming_date  DATE NOT NULL,
    origin          origin_type NOT NULL,
    ffa             NUMERIC(8,4),
    moisture_percent NUMERIC(8,4),
    shell_percent   NUMERIC(8,4),
    consumo         NUMERIC(14,2),
    sacos           sacos_type,
    linha           VARCHAR(50),
    classificador   classificador_type,
    ffa_ponderado   NUMERIC(8,4),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ma_consuming_date ON logistica.moega_anterior(consuming_date);
CREATE INDEX IF NOT EXISTS idx_ma_origin ON logistica.moega_anterior(origin);

-- =====================================================================
-- 9. QUALIDADE — QUALITY_RECORDS
-- =====================================================================

CREATE TABLE IF NOT EXISTS qualidade.quality_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date                        DATE NOT NULL,
    released_by                 VARCHAR(255),
    sample                      VARCHAR(255) NOT NULL,
    reception_time              VARCHAR(5),
    release_time                VARCHAR(5),
    release_duration            VARCHAR(10),
    justification               TEXT,
    observations                TEXT,
    origin                      origin_type,
    germinated_percent          NUMERIC(8,4),
    flat_percent                NUMERIC(8,4),
    insect_damaged_percent      NUMERIC(8,4),
    fumaca                      VARCHAR(50),
    slaty_percent               NUMERIC(8,4),
    bean_count                  INTEGER,
    moisture_percent            NUMERIC(8,4),
    mouldy_percent              NUMERIC(8,4),
    external_mould_percent      NUMERIC(8,4),
    violet_percent              NUMERIC(8,4),
    ffa                         NUMERIC(8,4),
    shell_percent               NUMERIC(8,4),
    duplo                       VARCHAR(50),
    residuo                     VARCHAR(50),
    type                        VARCHAR(100),
    quality_opinion             quality_opinion DEFAULT 'pendente',
    quality_opinion_by          VARCHAR(255),
    quality_opinion_date        TIMESTAMPTZ,
    quality_opinion_notes       TEXT,
    moisture_approval_status    moisture_approval DEFAULT 'pendente',
    moisture_approved_by        VARCHAR(255),
    moisture_approval_date      TIMESTAMPTZ,
    alert_email_sent            BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_qr_date ON qualidade.quality_records(date);
CREATE INDEX IF NOT EXISTS idx_qr_sample ON qualidade.quality_records(sample);
CREATE INDEX IF NOT EXISTS idx_qr_opinion ON qualidade.quality_records(quality_opinion);
CREATE INDEX IF NOT EXISTS idx_qr_approval ON qualidade.quality_records(moisture_approval_status);

-- =====================================================================
-- 10. QUALIDADE — PILE_QUALITIES
-- =====================================================================

CREATE TABLE IF NOT EXISTS qualidade.pile_qualities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month               VARCHAR(7) NOT NULL,
    pile_lot            VARCHAR(100) NOT NULL,
    origin              origin_type NOT NULL,
    formation_date      DATE,
    formation_moisture  NUMERIC(8,4) NOT NULL,
    formation_ffa       NUMERIC(8,4) NOT NULL,
    last_test_date      DATE,
    last_moisture       NUMERIC(8,4),
    last_ffa            NUMERIC(8,4),
    moisture_variation  NUMERIC(8,4),
    ffa_variation       NUMERIC(8,4),
    quantity_tons       NUMERIC(14,2),
    current_balance     NUMERIC(14,2) DEFAULT 0,
    status              pile_status DEFAULT 'ativa',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_pq_month ON qualidade.pile_qualities(month);
CREATE INDEX IF NOT EXISTS idx_pq_pile ON qualidade.pile_qualities(pile_lot);
CREATE INDEX IF NOT EXISTS idx_pq_status ON qualidade.pile_qualities(status);

-- =====================================================================
-- 11. QUALIDADE — BLEND_HISTORY
-- =====================================================================

CREATE TABLE IF NOT EXISTS qualidade.blend_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date                DATE NOT NULL,
    total_quantity_mt   NUMERIC(14,2) NOT NULL,
    target_ffa          NUMERIC(8,4) NOT NULL,
    calculated_ffa      NUMERIC(8,4) NOT NULL,
    blend_data          JSONB,
    highest_ffa_pile    VARCHAR(100),
    highest_ffa_value   NUMERIC(8,4),
    highest_ffa_origin VARCHAR(50),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_bh_date ON qualidade.blend_history(date);

-- =====================================================================
-- 12. SUSTENTABILIDADE — PRODUTORES
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.produtores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                VARCHAR(500) NOT NULL,
    produtor_id         VARCHAR(100),
    contato             VARCHAR(100),
    cpf                 VARCHAR(20),
    fornecedor          VARCHAR(255),
    municipio           VARCHAR(255),
    nome_fazenda        VARCHAR(255),
    programa            programa_type,
    comprador_responsavel VARCHAR(255),
    filial_responsavel  VARCHAR(255),
    tecnico_responsavel VARCHAR(255),
    meeiro              VARCHAR(255),
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    area_produtiva      NUMERIC(14,2),
    ativo               BOOLEAN DEFAULT TRUE,
    notas               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_prod_nome ON sustentabilidade.produtores(nome);
CREATE INDEX IF NOT EXISTS idx_prod_id ON sustentabilidade.produtores(produtor_id);
CREATE INDEX IF NOT EXISTS idx_prod_tecnico ON sustentabilidade.produtores(tecnico_responsavel);

-- =====================================================================
-- 13. SUSTENTABILIDADE — FAZENDA_ATRIBUICOES
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.fazenda_atribuicoes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produtor_id                 VARCHAR(100) NOT NULL,
    produtor_nome               VARCHAR(500),
    tecnico_email               VARCHAR(255) NOT NULL,
    tecnico_nome                VARCHAR(255),
    perfil_visita               perfil_visita NOT NULL,
    data_atendimento            DATE,
    data_agendamento_tecnico    DATE,
    status                      atribuicao_status DEFAULT 'pendente',
    doc_enviada                 BOOLEAN DEFAULT FALSE,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_fa_produtor ON sustentabilidade.fazenda_atribuicoes(produtor_id);
CREATE INDEX IF NOT EXISTS idx_fa_tecnico ON sustentabilidade.fazenda_atribuicoes(tecnico_email);
CREATE INDEX IF NOT EXISTS idx_fa_status ON sustentabilidade.fazenda_atribuicoes(status);

-- =====================================================================
-- 14. SUSTENTABILIDADE — FAZENDA_CHECKLISTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.fazenda_checklists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produtor_id         VARCHAR(100) NOT NULL,
    atribuicao_id       VARCHAR(100),
    tecnico_email       VARCHAR(255),
    poligono            fazer_nao_fazer,
    coord_geoespacial   fazer_nao_fazer,
    termo_adesao        fazer_nao_fazer,
    codigo_fornecedor   fazer_nao_fazer,
    ficha_recomendacao  fazer_nao_fazer,
    doc_pessoal         fazer_nao_fazer,
    doc_fazenda         fazer_nao_fazer,
    doc_trabalhador     fazer_nao_fazer,
    all_farmers         fazer_nao_fazer,
    cadastro_meeiros    fazer_nao_fazer,
    pesquisa_anual      fazer_nao_fazer,
    checklist           fazer_nao_fazer,
    asc_pesquisa        fazer_nao_fazer,
    clmrs_f1            clmrs_f1_type,
    clmrs_f2            fazer_nao_fazer,
    treinamento_coaching fazer_nao_fazer,
    treinamento_agri    fazer_nao_fazer,
    drive               fazer_nao_fazer,
    longitude           NUMERIC(10,7),
    latitude            NUMERIC(10,7),
    reporte             TEXT,
    adequacao           VARCHAR(100),
    observacao          TEXT,
    responsavel_verificacao VARCHAR(255),
    data_verificacao    DATE,
    reporte_final       TEXT,
    observacoes_finais  TEXT,
    itens_feitos        JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_fc_produtor ON sustentabilidade.fazenda_checklists(produtor_id);
CREATE INDEX IF NOT EXISTS idx_fc_tecnico ON sustentabilidade.fazenda_checklists(tecnico_email);

-- =====================================================================
-- 15. SUSTENTABILIDADE — TECNICOS_SUSTENTABILIDADE
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.tecnicos_sustentabilidade (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    telefone    VARCHAR(50),
    cidade      VARCHAR(255),
    estado      VARCHAR(10),
    ativo       BOOLEAN DEFAULT TRUE,
    notas       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ts_email ON sustentabilidade.tecnicos_sustentabilidade(email);

-- =====================================================================
-- 16. SUSTENTABILIDADE — SUSTENTABILIDADE_CONFIGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.sustentabilidade_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key  VARCHAR(100) NOT NULL UNIQUE,
    config_label VARCHAR(255),
    enabled     BOOLEAN DEFAULT TRUE,
    value       TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sc_key ON sustentabilidade.sustentabilidade_configs(config_key);

-- =====================================================================
-- 17. SUSTENTABILIDADE — MEEIROS
-- =====================================================================

CREATE TABLE IF NOT EXISTS sustentabilidade.meeiros (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_fazenda      VARCHAR(100) NOT NULL,
    nome_produtor   VARCHAR(500),
    farmer_id_fk    VARCHAR(100),
    stakeholder_id  VARCHAR(100),
    ms_temp_id      VARCHAR(100),
    nome_meeiro     VARCHAR(255) NOT NULL,
    ms_gender       ms_gender_type,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_me_fazenda ON sustentabilidade.meeiros(id_fazenda);

-- =====================================================================
-- 18. CADASTRO — SUPPLIERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS cadastro.suppliers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(500) NOT NULL,
    contact     VARCHAR(255),
    active      BOOLEAN DEFAULT TRUE,
    buyer_email VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sup_name ON cadastro.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_sup_buyer ON cadastro.suppliers(buyer_email);

-- =====================================================================
-- 19. CADASTRO — CONTRACT_BALANCES
-- =====================================================================

CREATE TABLE IF NOT EXISTS cadastro.contract_balances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor          VARCHAR(500) NOT NULL,
    centro_fornecedor   VARCHAR(50),
    material            VARCHAR(50),
    quantidade          NUMERIC(14,2) NOT NULL,
    documento_compras   VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_cb_fornecedor ON cadastro.contract_balances(fornecedor);

-- =====================================================================
-- 20. CADASTRO — MA_LOTES
-- =====================================================================

CREATE TABLE IF NOT EXISTS cadastro.ma_lotes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote                    VARCHAR(100) NOT NULL,
    produto                 VARCHAR(255),
    material_sap            VARCHAR(50),
    data_entrada            DATE NOT NULL,
    total_paletes           INTEGER,
    lote_bloqueado          BOOLEAN DEFAULT FALSE,
    motivo_bloqueio_lote    motivo_bloqueio_lote,
    observacao_bloqueio_lote TEXT,
    cliente_reserva_lote    VARCHAR(255),
    paletes                 JSONB,
    notas                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ml_lote ON cadastro.ma_lotes(lote);

-- =====================================================================
-- 21. CADASTRO — MA_BALANCA
-- =====================================================================

CREATE TABLE IF NOT EXISTS cadastro.ma_balanca (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date            DATE NOT NULL,
    product         VARCHAR(255) NOT NULL,
    vehicle_plate   VARCHAR(20) NOT NULL,
    driver_name     VARCHAR(255),
    gross_weight    NUMERIC(14,3) NOT NULL,
    tare_weight     NUMERIC(14,3) NOT NULL,
    net_weight      NUMERIC(14,3),
    status          ma_balanca_status DEFAULT 'pendente',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_mb_date ON cadastro.ma_balanca(date);
CREATE INDEX IF NOT EXISTS idx_mb_plate ON cadastro.ma_balanca(vehicle_plate);

-- =====================================================================
-- 22. CADASTRO — MA_EXPEDICOES
-- =====================================================================

CREATE TABLE IF NOT EXISTS cadastro.ma_expedicoes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date                DATE NOT NULL,
    material_no         VARCHAR(50) NOT NULL,
    sales_order_no      VARCHAR(50),
    customer            VARCHAR(255),
    short_text          VARCHAR(255),
    customer_po_no      VARCHAR(100),
    quantity            NUMERIC(14,2),
    net_price           NUMERIC(14,2),
    pluto               VARCHAR(100),
    delivery            VARCHAR(100),
    paletizado          paletizado_type,
    frete               frete_type,
    status              expedicao_status DEFAULT 'agendado',
    arrival_time        VARCHAR(5),
    arrived_by          VARCHAR(255),
    call_time           VARCHAR(5),
    called_by           VARCHAR(255),
    vehicle_plate       VARCHAR(20),
    driver_name         VARCHAR(255),
    gross_weight        NUMERIC(14,3),
    tare_weight         NUMERIC(14,3),
    net_weight          NUMERIC(14,3),
    batch_loaded        VARCHAR(100),
    batches             JSONB,
    volumes_quantity    NUMERIC(14,2),
    actual_quantity     NUMERIC(14,2),
    quality_released    BOOLEAN DEFAULT FALSE,
    quality_released_by VARCHAR(255),
    quality_released_at TIMESTAMPTZ,
    quality_release_notes TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_me_date ON cadastro.ma_expedicoes(date);
CREATE INDEX IF NOT EXISTS idx_me_material ON cadastro.ma_expedicoes(material_no);
CREATE INDEX IF NOT EXISTS idx_me_status ON cadastro.ma_expedicoes(status);

-- =====================================================================
-- 23. FINANCEIRO — INDIRETOS_COSTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS financeiro.indiretos_costs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name       VARCHAR(500) NOT NULL,
    filial          VARCHAR(100) NOT NULL,
    month           VARCHAR(7) NOT NULL,
    is_custom       BOOLEAN DEFAULT FALSE,
    origin_month    VARCHAR(7),
    pr_number       VARCHAR(50),
    po_number       VARCHAR(50),
    completed_steps JSONB,
    step_dates      JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ic_month ON financeiro.indiretos_costs(month);
CREATE INDEX IF NOT EXISTS idx_ic_filial ON financeiro.indiretos_costs(filial);

-- =====================================================================
-- 24. FINANCEIRO — PROJECTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS financeiro.projects (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filial                  VARCHAR(100),
    numero_projeto          VARCHAR(50),
    projeto                 VARCHAR(500) NOT NULL,
    descricao               TEXT,
    prioridade              project_prioridade DEFAULT 'Média',
    responsavel             VARCHAR(255) NOT NULL,
    area                    VARCHAR(255),
    tipo                    project_tipo DEFAULT 'Individual',
    projeto_pai_id          UUID REFERENCES financeiro.projects(id) ON DELETE SET NULL,
    ano_budget              INTEGER,
    valor_previsto          NUMERIC(14,2),
    valor_gasto             NUMERIC(14,2) DEFAULT 0,
    data_inicio_planejada   DATE,
    data_inicio_real        DATE,
    data_fim_planejada       DATE,
    data_fim_real           DATE,
    status                  project_status DEFAULT 'Não Iniciado',
    progresso               NUMERIC(5,2) DEFAULT 0,
    gastos                  JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_proj_responsavel ON financeiro.projects(responsavel);
CREATE INDEX IF NOT EXISTS idx_proj_status ON financeiro.projects(status);
CREATE INDEX IF NOT EXISTS idx_proj_tipo ON financeiro.projects(tipo);

-- =====================================================================
-- 25. FINANCEIRO — SUGESTOES
-- =====================================================================

CREATE TABLE IF NOT EXISTS financeiro.sugestoes (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                        VARCHAR(255) NOT NULL,
    departamento                VARCHAR(255) NOT NULL,
    tipo                        sugestao_tipo NOT NULL,
    tipo_requerimento           sugestao_requerimento,
    nome_projeto                VARCHAR(255),
    descricao                   TEXT NOT NULL,
    objetivo                    TEXT,
    impacto                     TEXT,
    prioridade                  INTEGER,
    status                      sugestao_status DEFAULT 'aguardando',
    prazo_estimado_dias         INTEGER,
    criticidade                 criticidade_type,
    tempo_processo_atual_horas  NUMERIC(10,2),
    tempo_novo_fluxo_horas      NUMERIC(10,2),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sug_status ON financeiro.sugestoes(status);
CREATE INDEX IF NOT EXISTS idx_sug_created_by ON financeiro.sugestoes(created_by);

-- =====================================================================
-- 26. SISTEMA — MB52_STOCK (Estoque SAP)
-- =====================================================================

CREATE TABLE IF NOT EXISTS sistema.mb52_stock (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material                VARCHAR(50) NOT NULL,
    lote                    VARCHAR(100),
    texto_breve_material    VARCHAR(500),
    deposito               VARCHAR(50),
    centro                 VARCHAR(50),
    unidade_medida         VARCHAR(20),
    utilizacao_livre       NUMERIC(14,2),
    em_controle_qualidade   NUMERIC(14,2),
    estoque_transito        NUMERIC(14,2),
    em_transfer_centro      NUMERIC(14,2),
    devolucoes             NUMERIC(14,2),
    bloqueado              NUMERIC(14,2),
    estoque_nao_disponivel  NUMERIC(14,2),
    fonte                  mb52_fonte,
    data_importacao        TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    created_by             VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_mb52_material ON sistema.mb52_stock(material);
CREATE INDEX IF NOT EXISTS idx_mb52_lote ON sistema.mb52_stock(lote);
CREATE INDEX IF NOT EXISTS idx_mb52_deposito ON sistema.mb52_stock(deposito);

-- =====================================================================
-- 27. SISTEMA — APP_CONFIGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS sistema.app_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type     app_config_type NOT NULL,
    name            VARCHAR(255) NOT NULL,
    warehouse_ref   VARCHAR(50),
    value           TEXT,
    enabled         BOOLEAN DEFAULT TRUE,
    has_crew        BOOLEAN DEFAULT TRUE,
    max_bags        INTEGER,
    visible         BOOLEAN DEFAULT TRUE,
    settings        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_ac_type ON sistema.app_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_ac_warehouse ON sistema.app_configs(warehouse_ref);

-- =====================================================================
-- 28. SISTEMA — TRANSACTION_LOGS (Auditoria)
-- =====================================================================

CREATE TABLE IF NOT EXISTS sistema.transaction_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(100) NOT NULL,
    action          log_action NOT NULL,
    data_before     JSONB,
    data_after      JSONB,
    changed_fields  JSONB,
    user_email      VARCHAR(255) NOT NULL,
    user_name       VARCHAR(255),
    timestamp       TIMESTAMPTZ NOT NULL,
    ip_address      VARCHAR(50),
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_tl_entity ON sistema.transaction_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tl_action ON sistema.transaction_logs(action);
CREATE INDEX IF NOT EXISTS idx_tl_timestamp ON sistema.transaction_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_tl_user ON sistema.transaction_logs(user_email);

-- =====================================================================
-- 29. TRIGGERS — Auto-update updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedulings_updated BEFORE UPDATE ON logistica.schedulings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transfers_2082_updated BEFORE UPDATE ON logistica.transfers_2082
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transfer_deposits_updated BEFORE UPDATE ON logistica.transfer_deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_moega_anterior_updated BEFORE UPDATE ON logistica.moega_anterior
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quality_records_updated BEFORE UPDATE ON qualidade.quality_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pile_qualities_updated BEFORE UPDATE ON qualidade.pile_qualities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_blend_history_updated BEFORE UPDATE ON qualidade.blend_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_produtores_updated BEFORE UPDATE ON sustentabilidade.produtores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fazenda_atribuicoes_updated BEFORE UPDATE ON sustentabilidade.fazenda_atribuicoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fazenda_checklists_updated BEFORE UPDATE ON sustentabilidade.fazenda_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tecnicos_updated BEFORE UPDATE ON sustentabilidade.tecnicos_sustentabilidade
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sustentabilidade_configs_updated BEFORE UPDATE ON sustentabilidade.sustentabilidade_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_meeiros_updated BEFORE UPDATE ON sustentabilidade.meeiros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON cadastro.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contract_balances_updated BEFORE UPDATE ON cadastro.contract_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ma_lotes_updated BEFORE UPDATE ON cadastro.ma_lotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ma_balanca_updated BEFORE UPDATE ON cadastro.ma_balanca
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ma_expedicoes_updated BEFORE UPDATE ON cadastro.ma_expedicoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_indiretos_costs_updated BEFORE UPDATE ON financeiro.indiretos_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON financeiro.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sugestoes_updated BEFORE UPDATE ON financeiro.sugestoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_mb52_stock_updated BEFORE UPDATE ON sistema.mb52_stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_app_configs_updated BEFORE UPDATE ON sistema.app_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON sistema.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- 29b. AUTH LOCAL — coluna de senha na tabela de usuários
-- =====================================================================
-- O server.js auto-cria um usuário admin (admin@ofi.com / admin123)
-- no primeiro startup se a tabela estiver vazia.
ALTER TABLE sistema.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- =====================================================================
-- 30. PERMISSÕES FINAIS PARA O USUÁRIO LOCAL
-- =====================================================================

-- Concede todos os privilégios em todas as tabelas, sequências e funções
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema TO central_pulse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema TO central_pulse_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA logistica, qualidade, sustentabilidade, cadastro, financeiro, sistema TO central_pulse_user;

-- Define privilégios padrão para tabelas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA logistica GRANT ALL ON TABLES TO central_pulse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA qualidade GRANT ALL ON TABLES TO central_pulse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA sustentabilidade GRANT ALL ON TABLES TO central_pulse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro GRANT ALL ON TABLES TO central_pulse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA financeiro GRANT ALL ON TABLES TO central_pulse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA sistema GRANT ALL ON TABLES TO central_pulse_user;

-- =====================================================================
-- 31. COMENTÁRIOS
-- =====================================================================

COMMENT ON SCHEMA logistica IS 'Descargas, transferências e moega';
COMMENT ON SCHEMA qualidade IS 'Análises de qualidade e blends';
COMMENT ON SCHEMA sustentabilidade IS 'Produtores, fazendas, técnicos e meeiros';
COMMENT ON SCHEMA cadastro IS 'Fornecedores, contratos e matéria acabada';
COMMENT ON SCHEMA financeiro IS 'Custos, projetos e sugestões';
COMMENT ON SCHEMA sistema IS 'Configurações, estoque SAP, auditoria e usuários';

COMMENT ON DATABASE central_pulse IS 'Central Pulse — Sistema de gestão de descargas, qualidade, sustentabilidade e custos (OFI)';

-- =====================================================================
-- 32. DADOS DE EXEMPLO —Usuário admin é auto-criado pelo server.js
-- =====================================================================
-- NÃO insira manualmente: o server.js cria admin@ofi.com / admin123
-- automaticamente no primeiro startup (com senha bcrypt-hash).
-- Para criar outros usuários, use o endpoint POST /api/users/invite
-- (apenas admins) ou a tela de Gestão de Usuários no frontend.

-- =====================================================================
-- 33. STRING DE CONEXÃO PARA O .env DA API
-- =====================================================================
-- Use esta string no seu arquivo .env do backend (API Express):
--
--   DATABASE_URL="postgresql://central_pulse_user:central_pulse_pass@localhost:5433/central_pulse?schema=public"
--
-- E no .env do app React (frontend):
--
--   VITE_LOCAL_API_URL=http://localhost:3000/api
--
-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
`;