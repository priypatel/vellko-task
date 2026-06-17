-- 003_signatures.sql
-- Reusable saved signatures, and the placements applied to documents.

CREATE TABLE IF NOT EXISTS signatures (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label      VARCHAR(100),
  type       VARCHAR(20) NOT NULL, -- 'drawn' | 'typed' | 'uploaded'
  image_key  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signatures (user_id);

-- A signature placed on a specific page of a document.
-- Coordinates are stored as percentages of page width/height so placement is
-- resolution-independent. Designed to support multiple placements per document.
CREATE TABLE IF NOT EXISTS document_signatures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  signature_id UUID NOT NULL REFERENCES signatures (id),
  page         INT NOT NULL,
  x            FLOAT NOT NULL,
  y            FLOAT NOT NULL,
  width        FLOAT NOT NULL,
  height       FLOAT NOT NULL,
  signed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures (document_id);
