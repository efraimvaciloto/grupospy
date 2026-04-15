-- GrupoSpy — Schema PostgreSQL Completo
-- Versão 2.0 | uazapiGO v2.0.1

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- busca full-text

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: PLANOS & TENANTS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)  NOT NULL,
  slug            VARCHAR(50)   UNIQUE NOT NULL,
  price_cents     INTEGER       NOT NULL,
  billing_cycle   VARCHAR(20)   DEFAULT 'monthly',
  max_numbers     INTEGER       NOT NULL,
  max_groups      INTEGER       NOT NULL DEFAULT -1,
  features        JSONB         DEFAULT '{}',
  is_active       BOOLEAN       DEFAULT true,
  stripe_price_id VARCHAR(100),
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(200)  NOT NULL,
  slug                  VARCHAR(100)  UNIQUE NOT NULL,
  email                 VARCHAR(255)  UNIQUE NOT NULL,
  plan_id               UUID          REFERENCES plans(id),
  trial_ends_at         TIMESTAMPTZ,
  subscription_status   VARCHAR(30)   DEFAULT 'trial',
  stripe_customer_id    VARCHAR(100),
  stripe_sub_id         VARCHAR(100),
  settings              JSONB         DEFAULT '{}',
  is_active             BOOLEAN       DEFAULT true,
  created_at            TIMESTAMPTZ   DEFAULT now(),
  updated_at            TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  DEFAULT 'member',
  avatar_url    VARCHAR(500),
  last_login_at TIMESTAMPTZ,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  device_info JSONB,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: NÚMEROS WHATSAPP (INSTÂNCIAS UAZAPI)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE wa_numbers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label                 VARCHAR(100),
  phone_number          VARCHAR(20),

  -- uazapi
  uazapi_instance_id    VARCHAR(100) UNIQUE NOT NULL,
  uazapi_token          VARCHAR(255) NOT NULL,
  webhook_id            VARCHAR(100),

  -- status
  status                VARCHAR(30)  DEFAULT 'disconnected',
  qr_code               TEXT,
  qr_expires_at         TIMESTAMPTZ,
  pair_code             VARCHAR(20),

  -- perfil WA
  profile_name          VARCHAR(200),
  profile_pic_url       VARCHAR(500),
  is_business           BOOLEAN      DEFAULT false,
  platform              VARCHAR(30),

  -- anti-ban delay
  msg_delay_min         INTEGER      DEFAULT 3,
  msg_delay_max         INTEGER      DEFAULT 8,

  -- controle
  last_connected_at     TIMESTAMPTZ,
  last_disconnect_at    TIMESTAMPTZ,
  last_disconnect_reason VARCHAR(200),
  wa_messages_limit     JSONB,

  created_by            UUID         REFERENCES users(id),
  created_at            TIMESTAMPTZ  DEFAULT now(),
  updated_at            TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_wa_numbers_tenant ON wa_numbers(tenant_id);
CREATE INDEX idx_wa_numbers_status ON wa_numbers(status);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: GRUPOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wa_number_id      UUID         NOT NULL REFERENCES wa_numbers(id) ON DELETE CASCADE,

  wa_group_jid      VARCHAR(150) NOT NULL,
  wa_fast_id        VARCHAR(100),

  name              VARCHAR(300) NOT NULL,
  description       TEXT,
  avatar_url        VARCHAR(500),
  member_count      INTEGER      DEFAULT 0,
  invite_link       VARCHAR(500),

  -- flags WA
  is_announce       BOOLEAN      DEFAULT false,
  is_locked         BOOLEAN      DEFAULT false,
  is_community      BOOLEAN      DEFAULT false,
  is_pinned         BOOLEAN      DEFAULT false,

  -- monitoramento
  tags              TEXT[]       DEFAULT '{}',
  is_monitored      BOOLEAN      DEFAULT true,
  is_archived       BOOLEAN      DEFAULT false,
  alert_keywords    TEXT[]       DEFAULT '{}',

  -- atividade
  last_message_at   TIMESTAMPTZ,
  last_admin_msg_at TIMESTAMPTZ,
  last_team_msg_at  TIMESTAMPTZ,
  last_msg_type     VARCHAR(50),
  unread_count      INTEGER      DEFAULT 0,

  -- lead fields
  lead_status       VARCHAR(100),
  lead_tags         TEXT[]       DEFAULT '{}',
  lead_notes        TEXT,

  settings          JSONB        DEFAULT '{}',
  created_at        TIMESTAMPTZ  DEFAULT now(),
  updated_at        TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (wa_number_id, wa_group_jid)
);

CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tenant_id     UUID        NOT NULL REFERENCES tenants(id),
  phone_number  VARCHAR(20) NOT NULL,
  push_name     VARCHAR(200),
  jid           VARCHAR(150),
  is_admin      BOOLEAN     DEFAULT false,
  joined_at     TIMESTAMPTZ,
  left_at       TIMESTAMPTZ,
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, phone_number)
);

CREATE TABLE group_daily_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES tenants(id),
  date            DATE        NOT NULL,
  message_count   INTEGER     DEFAULT 0,
  unique_senders  INTEGER     DEFAULT 0,
  media_count     INTEGER     DEFAULT 0,
  heat_score      NUMERIC(5,2) DEFAULT 0,
  sentiment_score NUMERIC(5,2),
  sentiment_pos   NUMERIC(5,2),
  sentiment_neu   NUMERIC(5,2),
  sentiment_neg   NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, date)
);

CREATE TABLE group_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  type        VARCHAR(50) NOT NULL,
  severity    VARCHAR(20) DEFAULT 'medium',
  title       VARCHAR(300),
  description TEXT,
  metadata    JSONB       DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  seen_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_groups_tenant       ON groups(tenant_id);
CREATE INDEX idx_groups_wa_number    ON groups(wa_number_id);
CREATE INDEX idx_groups_last_msg     ON groups(last_message_at DESC NULLS LAST);
CREATE INDEX idx_groups_monitored    ON groups(tenant_id, is_monitored) WHERE is_monitored = true;
CREATE INDEX idx_group_scores_date   ON group_daily_scores(group_id, date DESC);
CREATE INDEX idx_group_alerts_open   ON group_alerts(tenant_id, resolved_at NULLS FIRST);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: MENSAGENS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id),
  group_id        UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  wa_number_id    UUID         NOT NULL REFERENCES wa_numbers(id),

  uazapi_id       VARCHAR(30)  UNIQUE NOT NULL,
  wa_message_id   VARCHAR(200),
  wa_chat_id      VARCHAR(150),

  sender_jid      VARCHAR(150),
  sender_name     VARCHAR(200),
  sender_phone    VARCHAR(20),

  message_type    VARCHAR(50),
  body            TEXT,
  file_url        VARCHAR(500),

  is_from_me      BOOLEAN      DEFAULT false,
  is_group        BOOLEAN      DEFAULT true,
  was_sent_by_api BOOLEAN      DEFAULT false,
  quoted_id       VARCHAR(30),
  reaction_to_id  VARCHAR(30),

  track_source    VARCHAR(100),
  track_id        VARCHAR(100),
  send_folder_id  VARCHAR(100),

  status          VARCHAR(50),
  error_message   TEXT,

  sentiment       VARCHAR(20),
  sentiment_score NUMERIC(5,4),
  ai_processed    BOOLEAN      DEFAULT false,

  sent_at         TIMESTAMPTZ  NOT NULL,
  created_at      TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX idx_messages_group_sent ON messages(group_id, sent_at DESC);
CREATE INDEX idx_messages_tenant     ON messages(tenant_id);
CREATE INDEX idx_messages_ai_queue   ON messages(ai_processed, tenant_id) WHERE ai_processed = false;
CREATE INDEX idx_messages_fts        ON messages USING GIN(to_tsvector('portuguese', COALESCE(body, '')));
CREATE INDEX idx_messages_sender     ON messages(group_id, sender_phone);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: IA & RESUMOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE ai_summaries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id),
  group_id             UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  date                 DATE        NOT NULL,
  period               VARCHAR(20) DEFAULT 'daily',
  summary_text         TEXT        NOT NULL,
  topics               TEXT[]      DEFAULT '{}',
  tasks                JSONB       DEFAULT '[]',
  key_messages         JSONB       DEFAULT '[]',
  participants_summary JSONB       DEFAULT '{}',
  heat_score           NUMERIC(5,2),
  sentiment            VARCHAR(20),
  sentiment_score      NUMERIC(5,2),
  tokens_used          INTEGER,
  model_used           VARCHAR(50),
  generated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, date, period)
);

CREATE TABLE ai_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  group_id    UUID        NOT NULL REFERENCES groups(id),
  summary_id  UUID        REFERENCES ai_summaries(id),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  urgency     VARCHAR(20) DEFAULT 'medium',
  status      VARCHAR(30) DEFAULT 'open',
  assigned_to UUID        REFERENCES users(id),
  due_date    DATE,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id),
  operation   VARCHAR(50),
  group_id    UUID        REFERENCES groups(id),
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    NUMERIC(10,6),
  model       VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_summaries_group_date ON ai_summaries(group_id, date DESC);
CREATE INDEX idx_tasks_tenant         ON ai_tasks(tenant_id, status);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: CONTATOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  phone_number  VARCHAR(20)  NOT NULL,
  email         VARCHAR(255),
  tags          TEXT[]       DEFAULT '{}',
  custom_fields JSONB        DEFAULT '{}',
  is_team_member  BOOLEAN     DEFAULT false,
  is_group_member BOOLEAN     DEFAULT false,
  wa_valid        BOOLEAN,
  wa_checked_at   TIMESTAMPTZ,
  notes           TEXT,
  imported_from   VARCHAR(50),
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (tenant_id, phone_number)
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone  ON contacts(phone_number);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: DISPAROS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE broadcasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  wa_number_id      UUID        NOT NULL REFERENCES wa_numbers(id),
  created_by        UUID        REFERENCES users(id),
  name              VARCHAR(300) NOT NULL,
  status            VARCHAR(30) DEFAULT 'draft',
  sender_type       VARCHAR(20) DEFAULT 'advanced',
  uazapi_folder_id  VARCHAR(100),
  messages_payload  JSONB       NOT NULL DEFAULT '[]',
  delay_min         INTEGER     DEFAULT 3,
  delay_max         INTEGER     DEFAULT 8,
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  recurrence        JSONB,
  total_targets     INTEGER     DEFAULT 0,
  total_sent        INTEGER     DEFAULT 0,
  total_failed      INTEGER     DEFAULT 0,
  total_canceled    INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE broadcast_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id    UUID        NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  group_id        UUID        REFERENCES groups(id),
  wa_group_jid    VARCHAR(150),
  status          VARCHAR(30) DEFAULT 'pending',
  uazapi_msg_id   VARCHAR(30),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_broadcasts_tenant    ON broadcasts(tenant_id);
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(scheduled_at) WHERE status = 'scheduled';

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: BILLING
-- ─────────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id),
  plan_id               UUID        NOT NULL REFERENCES plans(id),
  stripe_sub_id         VARCHAR(100) UNIQUE,
  status                VARCHAR(30),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  trial_start           TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  stripe_invoice_id VARCHAR(100) UNIQUE,
  amount_cents      INTEGER     NOT NULL,
  status            VARCHAR(30),
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  pdf_url           VARCHAR(500),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stripe_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   VARCHAR(100) UNIQUE NOT NULL,
  type       VARCHAR(100) NOT NULL,
  processed  BOOLEAN      DEFAULT false,
  payload    JSONB,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- MÓDULO: NOTIFICAÇÕES & WEBHOOKS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id),
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(300),
  body        TEXT,
  link        VARCHAR(500),
  metadata    JSONB       DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_number_id  UUID        REFERENCES wa_numbers(id),
  event_type    VARCHAR(50) NOT NULL,
  instance_id   VARCHAR(100),
  payload       JSONB       NOT NULL,
  processed     BOOLEAN     DEFAULT false,
  error         TEXT,
  received_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_unprocessed ON webhook_events(processed, received_at) WHERE processed = false;
CREATE INDEX idx_notifications_user  ON notifications(user_id, read_at NULLS FIRST);

-- ─────────────────────────────────────────────────────────────
-- DADOS INICIAIS
-- ─────────────────────────────────────────────────────────────

-- Planos padrão
INSERT INTO plans (name, slug, price_cents, max_numbers, max_groups, features) VALUES
  ('Starter',  'starter',  9700,  1,  10, '{"ai_sentiment":true,"broadcasts":true,"export_pdf":false}'),
  ('Growth',   'growth',   24700, 3,  90, '{"ai_sentiment":true,"broadcasts":true,"export_pdf":true}'),
  ('Business', 'business', 69700, 10, -1, '{"ai_sentiment":true,"broadcasts":true,"export_pdf":true,"api_access":true}');

-- Admin padrão (senha: admin123 — TROCAR EM PRODUÇÃO)
INSERT INTO admin_users (email, password_hash) VALUES
  ('admin@grupospy.com.br', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGTTbxAO8Q1Z5.4MiS5lGMcUBaO');
