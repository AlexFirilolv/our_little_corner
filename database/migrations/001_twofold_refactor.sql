-- Twofold Refactor Migration
-- This migration adds new features for the Twofold rebranding

-- ================================================================
-- Phase 2.1: Rename storage fields (s3_key → storage_key, s3_url → storage_url)
-- ================================================================

-- Check if columns exist before renaming (idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'media' AND column_name = 's3_key') THEN
        ALTER TABLE media RENAME COLUMN s3_key TO storage_key;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'media' AND column_name = 's3_url') THEN
        ALTER TABLE media RENAME COLUMN s3_url TO storage_url;
    END IF;
END $$;

-- ================================================================
-- Phase 2.2: Add new fields for Twofold features
-- ================================================================

-- Create mood enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'memory_mood') THEN
        CREATE TYPE memory_mood AS ENUM ('cozy', 'silly', 'romantic', 'adventurous');
    END IF;
END $$;

-- Add mood and milestone to memory_groups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'memory_groups' AND column_name = 'mood') THEN
        ALTER TABLE memory_groups ADD COLUMN mood memory_mood;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'memory_groups' AND column_name = 'is_milestone') THEN
        ALTER TABLE memory_groups ADD COLUMN is_milestone BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add location fields to media
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'media' AND column_name = 'latitude') THEN
        ALTER TABLE media ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'media' AND column_name = 'longitude') THEN
        ALTER TABLE media ADD COLUMN longitude DECIMAL(11, 8);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'media' AND column_name = 'place_name') THEN
        ALTER TABLE media ADD COLUMN place_name VARCHAR(255);
    END IF;
END $$;

-- Add relationship metadata to corners
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'corners' AND column_name = 'anniversary_date') THEN
        ALTER TABLE corners ADD COLUMN anniversary_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'corners' AND column_name = 'next_countdown_event_name') THEN
        ALTER TABLE corners ADD COLUMN next_countdown_event_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'corners' AND column_name = 'next_countdown_date') THEN
        ALTER TABLE corners ADD COLUMN next_countdown_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ================================================================
-- Indexes for new fields
-- ================================================================

-- Create index on media location (only for geotagged media)
CREATE INDEX IF NOT EXISTS idx_media_location
    ON media(latitude, longitude)
    WHERE latitude IS NOT NULL;

-- Create index on milestones for quick filtering
CREATE INDEX IF NOT EXISTS idx_memory_groups_milestone
    ON memory_groups(is_milestone)
    WHERE is_milestone = true;

-- Create index on mood for filtering
CREATE INDEX IF NOT EXISTS idx_memory_groups_mood
    ON memory_groups(mood)
    WHERE mood IS NOT NULL;

-- ================================================================
-- Comments for documentation
-- ================================================================

COMMENT ON COLUMN media.storage_key IS 'Storage provider key (GCS object path)';
COMMENT ON COLUMN media.storage_url IS 'Public URL for the stored file';
COMMENT ON COLUMN media.latitude IS 'GPS latitude of where the media was captured';
COMMENT ON COLUMN media.longitude IS 'GPS longitude of where the media was captured';
COMMENT ON COLUMN media.place_name IS 'Human-readable location name';

COMMENT ON COLUMN memory_groups.mood IS 'Emotional mood/vibe of the memory: cozy, silly, romantic, adventurous';
COMMENT ON COLUMN memory_groups.is_milestone IS 'Whether this memory represents a relationship milestone';

COMMENT ON COLUMN corners.anniversary_date IS 'The couple''s relationship anniversary date';
COMMENT ON COLUMN corners.next_countdown_event_name IS 'Name of the next event to count down to';
COMMENT ON COLUMN corners.next_countdown_date IS 'Date/time of the next countdown event';
