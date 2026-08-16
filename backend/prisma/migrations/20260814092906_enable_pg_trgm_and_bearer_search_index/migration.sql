-- Feature 001 T027/research.md §7: pg_trgm-accelerated fuzzy search on
-- Bearer.fullName (SC-002: results within 2 seconds statewide).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Bearer_fullName_trgm_idx" ON "Bearer" USING GIN ("fullName" gin_trgm_ops);
