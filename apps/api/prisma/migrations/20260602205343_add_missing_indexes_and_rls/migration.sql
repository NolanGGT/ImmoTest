-- ============================================================
-- Migration: add_missing_indexes_and_rls
-- Date: 2026-06-02
-- Purpose: Audit sécurité pré-production
--   1. Index manquants critiques (Bien, SharedAnalyse)
--   2. RLS activé sur toutes les tables sensibles
--   3. Policies "deny all" pour anon/authenticated (service_role bypass RLS)
--   4. Nettoyage données expirées
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PARTIE 1 : INDEX MANQUANTS
-- ──────────────────────────────────────────────────────────────

-- Bien.userId (CRITIQUE — toutes les requêtes filtrent par userId)
CREATE INDEX IF NOT EXISTS "Bien_userId_idx"
ON "Bien"("userId");

-- Bien : filtre liste par statut par utilisateur
CREATE INDEX IF NOT EXISTS "Bien_userId_statut_idx"
ON "Bien"("userId", "statut");

-- Bien : tri par score par utilisateur
CREATE INDEX IF NOT EXISTS "Bien_userId_scoreImmoSafe_idx"
ON "Bien"("userId", "scoreImmoSafe" DESC NULLS LAST);

-- Bien : watchlist + pricecheck (url non nulle)
CREATE INDEX IF NOT EXISTS "Bien_urlSource_idx"
ON "Bien"("urlSource")
WHERE "urlSource" IS NOT NULL;

-- Bien : carte GPS (coordonnées non nulles)
CREATE INDEX IF NOT EXISTS "Bien_coords_idx"
ON "Bien"("latitude", "longitude")
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- SharedAnalyse : FK sans index
CREATE INDEX IF NOT EXISTS "SharedAnalyse_bienId_idx"
ON "SharedAnalyse"("bienId");

-- ──────────────────────────────────────────────────────────────
-- PARTIE 2 : ROW LEVEL SECURITY
-- Note: le service_role bypass le RLS → l'API continue de
-- fonctionner normalement. RLS bloque uniquement les accès
-- directs via le SDK Supabase JS (rôle anon/authenticated).
-- ──────────────────────────────────────────────────────────────

ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bien"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rapport"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PersonalPoint"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BienVote"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharedAccess"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceCheck"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RevokedToken"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharedAnalyse"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TwoFactorAuth"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"           ENABLE ROW LEVEL SECURITY;

-- Policies "deny all" : aucun accès direct depuis le client
-- Seul le service_role (backend) peut lire/écrire

CREATE POLICY "deny_all_anon_authenticated" ON "User"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "Bien"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "Subscription"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "Rapport"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "PersonalPoint"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "BienVote"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "SharedAccess"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "PriceCheck"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "RevokedToken"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "LoginAttempt"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "SharedAnalyse"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "PasswordResetToken"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "TwoFactorAuth"
  FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_anon_authenticated" ON "AuditLog"
  FOR ALL TO anon, authenticated USING (false);

-- ──────────────────────────────────────────────────────────────
-- PARTIE 3 : CORRECTION DRIFT SCHEMA
-- Colonne Bien.votes (JSONB) ajoutée par migration 20260602134056
-- mais remplacée par la table BienVote — orpheline, jamais utilisée
-- ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Bien'
      AND column_name = 'votes'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE "Bien" DROP COLUMN "votes";
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- PARTIE 4 : NETTOYAGE DONNÉES EXPIRÉES
-- ──────────────────────────────────────────────────────────────

-- Tokens JWT révoqués expirés
DELETE FROM "RevokedToken"
WHERE "expiresAt" < NOW();

-- Invitations PENDING expirées
DELETE FROM "SharedAccess"
WHERE status = 'PENDING'
  AND "expiresAt" < NOW();

-- PasswordResetToken expirés ou utilisés (> 7 jours)
DELETE FROM "PasswordResetToken"
WHERE "expiresAt" < NOW()
   OR ("used" = true AND "createdAt" < NOW() - INTERVAL '7 days');

-- LoginAttempt sans verrou résolus anciens (> 30 jours)
DELETE FROM "LoginAttempt"
WHERE "lockedUntil" IS NULL
  AND "lastAttempt" < NOW() - INTERVAL '30 days';
