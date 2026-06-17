-- 002_documents.sql
-- Uploaded PDF documents and their signing lifecycle state.

CREATE TABLE IF NOT EXISTS documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title              VARCHAR(255) NOT NULL,
  original_file_key  TEXT NOT NULL,
  signed_file_key    TEXT,
  file_hash          TEXT NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  verification_token UUID UNIQUE DEFAULT gen_random_uuid(),
  page_count         INT,
  file_size_bytes    BIGINT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_token ON documents (verification_token);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);
