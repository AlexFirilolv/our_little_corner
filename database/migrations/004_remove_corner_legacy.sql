-- Migration: Remove legacy 'corner' naming
-- All corner-related objects should be migrated to 'locket' naming
-- This migration removes the duplicate corner_id columns and corner_* tables

-- ================================================================
-- Phase 1: Remove corner_id columns from media and memory_groups
-- ================================================================

-- Drop foreign key constraints first
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_corner_id_fkey;
ALTER TABLE memory_groups DROP CONSTRAINT IF EXISTS memory_groups_corner_id_fkey;

-- Drop indexes on corner_id columns
DROP INDEX IF EXISTS idx_media_locket_id;  -- This index is on corner_id despite the name
DROP INDEX IF EXISTS idx_memory_groups_locket_id;  -- This index is on corner_id despite the name

-- Drop the corner_id columns
ALTER TABLE media DROP COLUMN IF EXISTS corner_id;
ALTER TABLE memory_groups DROP COLUMN IF EXISTS corner_id;

-- ================================================================
-- Phase 2: Drop legacy corner_* tables (all empty or unused)
-- ================================================================

-- Drop tables that reference corners first (due to FK constraints)
DROP TABLE IF EXISTS corner_analytics CASCADE;
DROP TABLE IF EXISTS corner_invites CASCADE;
DROP TABLE IF EXISTS corner_users CASCADE;

-- Drop the main corners table
DROP TABLE IF EXISTS corners CASCADE;

-- ================================================================
-- Phase 3: Cleanup any remaining corner references
-- ================================================================

-- Drop corner_role enum type if it exists
DROP TYPE IF EXISTS corner_role CASCADE;

-- ================================================================
-- Verification comments
-- ================================================================
COMMENT ON TABLE lockets IS 'Primary tenant table - formerly named corners';
COMMENT ON TABLE locket_users IS 'Locket membership - formerly named corner_users';
COMMENT ON TABLE locket_invites IS 'Locket invitations - formerly named corner_invites';
COMMENT ON TABLE locket_analytics IS 'Locket analytics - formerly named corner_analytics';
