-- Migration 002: Team contacts + last_team_msg_at
-- Run: psql $DATABASE_URL -f backend/db/migrations/002_team_contacts.sql

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_team_member BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_group_member BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS last_team_msg_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_team
  ON contacts(tenant_id, is_team_member) WHERE is_team_member = true;
