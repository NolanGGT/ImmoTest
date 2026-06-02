-- ============================================================
-- ImmoTest — Requête de santé globale (Supabase SQL Editor)
-- À exécuter manuellement pour monitoring
-- ============================================================

-- Vue d'ensemble
SELECT
  (SELECT COUNT(*)                           FROM "User")                                             AS total_users,
  (SELECT COUNT(*)                           FROM "Bien")                                             AS total_biens,
  (SELECT COUNT(*)                           FROM "Subscription" WHERE status = 'ACTIVE')             AS active_subscriptions,
  (SELECT COUNT(*)                           FROM "Rapport")                                          AS total_rapports,
  (SELECT COUNT(*)                           FROM "AuditLog"   WHERE "createdAt" > NOW() - INTERVAL '24h') AS actions_today,
  (SELECT COUNT(*)                           FROM "LoginAttempt" WHERE "lockedUntil" > NOW())         AS locked_accounts,
  (SELECT COUNT(*)                           FROM "RevokedToken")                                     AS revoked_tokens,
  (SELECT COUNT(*)                           FROM "SharedAccess" WHERE status = 'ACTIVE')             AS active_shares,
  (SELECT COUNT(*)                           FROM "PriceCheck" WHERE "seen" = false)                  AS unseen_price_alerts;

-- ──────────────────────────────────────────────────────────────
-- État RLS sur toutes les tables
-- ──────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ──────────────────────────────────────────────────────────────
-- Index existants
-- ──────────────────────────────────────────────────────────────
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ──────────────────────────────────────────────────────────────
-- Données à nettoyer (aperçu avant suppression)
-- ──────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM "RevokedToken"  WHERE "expiresAt" < NOW())                                                    AS expired_revoked_tokens,
  (SELECT COUNT(*) FROM "SharedAccess"  WHERE status = 'PENDING' AND "expiresAt" < NOW())                             AS expired_invitations,
  (SELECT COUNT(*) FROM "PasswordResetToken" WHERE "expiresAt" < NOW() OR ("used" = true AND "createdAt" < NOW() - INTERVAL '7 days')) AS stale_reset_tokens,
  (SELECT COUNT(*) FROM "LoginAttempt"  WHERE "lockedUntil" IS NULL AND "lastAttempt" < NOW() - INTERVAL '30 days')   AS old_login_attempts,
  (SELECT COUNT(*) FROM "AuditLog"      WHERE "createdAt" < NOW() - INTERVAL '6 months')                              AS old_audit_logs;

-- ──────────────────────────────────────────────────────────────
-- Données orphelines
-- ──────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM "BienVote"  bv LEFT JOIN "Bien" b ON bv."bienId" = b.id WHERE b.id IS NULL) AS orphan_votes,
  (SELECT COUNT(*) FROM "PriceCheck" pc LEFT JOIN "Bien" b ON pc."bienId" = b.id WHERE b.id IS NULL) AS orphan_price_checks,
  (SELECT COUNT(*) FROM "Rapport"   r  LEFT JOIN "Bien" b ON r."bienId" = b.id  WHERE b.id IS NULL) AS orphan_rapports;

-- ──────────────────────────────────────────────────────────────
-- Taille des tables
-- ──────────────────────────────────────────────────────────────
SELECT
  relname                                                                AS table_name,
  pg_size_pretty(pg_total_relation_size(relid))                         AS total_size,
  pg_size_pretty(pg_relation_size(relid))                               AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
  n_live_tup                                                            AS row_count
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- ──────────────────────────────────────────────────────────────
-- Extensions installées
-- ──────────────────────────────────────────────────────────────
SELECT name, installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL
ORDER BY name;

-- ──────────────────────────────────────────────────────────────
-- Connexions actives
-- ──────────────────────────────────────────────────────────────
SELECT
  application_name,
  client_addr,
  state,
  query_start,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start DESC
LIMIT 20;
