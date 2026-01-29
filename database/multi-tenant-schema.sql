-- Multi-tenant database schema for "Our Little Corner"
-- This file contains the new schema design for Firebase Auth integration

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE corner_role AS ENUM ('admin', 'participant');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- 1. CORNERS TABLE - Represents each couple's private space
CREATE TABLE corners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Unique identifiers for sharing
    slug VARCHAR(100) UNIQUE NOT NULL, -- Human-readable identifier (e.g., 'alex-and-sarah')
    invite_code VARCHAR(32) UNIQUE NOT NULL, -- Secure invite code
    
    -- Privacy settings
    is_public BOOLEAN DEFAULT false,
    share_password VARCHAR(255), -- Optional password for shared access (hashed)
    
    -- Firebase Auth admin user
    admin_firebase_uid VARCHAR(255) NOT NULL, -- Firebase UID of the corner creator
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT corners_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT corners_name_length CHECK (length(name) >= 1 AND length(name) <= 255)
);

-- 2. CORNER_USERS TABLE - Many-to-many relationship between Firebase users and corners
CREATE TABLE corner_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
    firebase_uid VARCHAR(255) NOT NULL, -- Firebase Auth UID
    
    -- User details (cached from Firebase for performance)
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    
    -- Role and permissions
    role corner_role NOT NULL DEFAULT 'participant',
    
    -- Access settings
    can_upload BOOLEAN DEFAULT true,
    can_edit_others_media BOOLEAN DEFAULT false,
    can_manage_corner BOOLEAN DEFAULT false,
    
    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(corner_id, firebase_uid),
    CONSTRAINT corner_users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

-- 3. CORNER_INVITES TABLE - Track pending invitations
CREATE TABLE corner_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
    
    -- Invite details
    email VARCHAR(255) NOT NULL,
    invite_token VARCHAR(64) UNIQUE NOT NULL,
    message TEXT,
    
    -- Permissions for invited user
    role corner_role NOT NULL DEFAULT 'participant',
    can_upload BOOLEAN DEFAULT true,
    can_edit_others_media BOOLEAN DEFAULT false,
    
    -- Status tracking
    status invite_status NOT NULL DEFAULT 'pending',
    invited_by_firebase_uid VARCHAR(255) NOT NULL,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT corner_invites_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
    CONSTRAINT corner_invites_expires_future CHECK (expires_at > created_at)
);

-- 4. UPDATE EXISTING TABLES TO INCLUDE CORNER_ID
-- Note: These tables may not exist yet if this is a fresh install
-- The app migrations will create them properly

-- Add corner_id to memory_groups table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_groups') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'memory_groups' AND column_name = 'corner_id') THEN
            ALTER TABLE memory_groups ADD COLUMN corner_id UUID REFERENCES corners(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'memory_groups' AND column_name = 'created_by_firebase_uid') THEN
            ALTER TABLE memory_groups ADD COLUMN created_by_firebase_uid VARCHAR(255);
        END IF;
    END IF;
END $$;

-- Add corner_id to media table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'media' AND column_name = 'corner_id') THEN
            ALTER TABLE media ADD COLUMN corner_id UUID REFERENCES corners(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'media' AND column_name = 'uploaded_by_firebase_uid') THEN
            ALTER TABLE media ADD COLUMN uploaded_by_firebase_uid VARCHAR(255);
        END IF;
    END IF;
END $$;

-- 5. CORNER_ANALYTICS TABLE - Track usage and sharing
CREATE TABLE corner_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,

    -- Event tracking
    event_type VARCHAR(50) NOT NULL, -- 'view', 'upload', 'share', 'invite'
    firebase_uid VARCHAR(255), -- NULL for anonymous/guest views

    -- Additional data
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately (PostgreSQL doesn't support inline INDEX in CREATE TABLE)
CREATE INDEX IF NOT EXISTS idx_corner_analytics_corner_event ON corner_analytics(corner_id, event_type);
CREATE INDEX IF NOT EXISTS idx_corner_analytics_date ON corner_analytics(created_at);

-- 6. SHARED_ACCESS_TOKENS TABLE - For temporary guest access
CREATE TABLE shared_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corner_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
    
    -- Token details
    token VARCHAR(64) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{"can_view": true, "can_download": false}',
    
    -- Access tracking
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Created by
    created_by_firebase_uid VARCHAR(255) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT shared_tokens_uses_positive CHECK (current_uses >= 0),
    CONSTRAINT shared_tokens_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0)
);

-- 7. UPDATE SESSIONS TABLE FOR FIREBASE COMPATIBILITY
-- We'll keep this for guest/shared access sessions (if sessions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'sessions' AND column_name = 'corner_id') THEN
            ALTER TABLE sessions ADD COLUMN corner_id UUID REFERENCES corners(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'sessions' AND column_name = 'firebase_uid') THEN
            ALTER TABLE sessions ADD COLUMN firebase_uid VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'sessions' AND column_name = 'session_type') THEN
            ALTER TABLE sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'firebase';
        END IF;
    END IF;
END $$;

-- 8. CREATE INDEXES FOR PERFORMANCE

-- Corners indexes
CREATE INDEX idx_corners_admin_uid ON corners(admin_firebase_uid);
CREATE INDEX idx_corners_slug ON corners(slug);
CREATE INDEX idx_corners_invite_code ON corners(invite_code);

-- Corner users indexes
CREATE INDEX idx_corner_users_firebase_uid ON corner_users(firebase_uid);
CREATE INDEX idx_corner_users_corner_role ON corner_users(corner_id, role);

-- Corner invites indexes
CREATE INDEX idx_corner_invites_token ON corner_invites(invite_token);
CREATE INDEX idx_corner_invites_email ON corner_invites(email);
CREATE INDEX idx_corner_invites_status ON corner_invites(status);

-- Memory groups indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_groups') THEN
        CREATE INDEX IF NOT EXISTS idx_memory_groups_corner ON memory_groups(corner_id);
        CREATE INDEX IF NOT EXISTS idx_memory_groups_creator ON memory_groups(created_by_firebase_uid);
    END IF;
END $$;

-- Media indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media') THEN
        CREATE INDEX IF NOT EXISTS idx_media_corner ON media(corner_id);
        CREATE INDEX IF NOT EXISTS idx_media_uploader ON media(uploaded_by_firebase_uid);
    END IF;
END $$;

-- Shared tokens indexes
CREATE INDEX idx_shared_tokens_corner ON shared_access_tokens(corner_id);
CREATE INDEX idx_shared_tokens_token ON shared_access_tokens(token);

-- 9. CREATE FUNCTIONS FOR COMMON OPERATIONS

-- Function to generate unique corner slug
CREATE OR REPLACE FUNCTION generate_corner_slug(corner_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Generate base slug from corner name
    base_slug := lower(regexp_replace(corner_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Ensure it's not empty
    IF base_slug = '' THEN
        base_slug := 'corner';
    END IF;
    
    -- Check for uniqueness and add counter if needed
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM corners WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    invite_code TEXT;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        invite_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if it's unique
        IF NOT EXISTS (SELECT 1 FROM corners WHERE invite_code = invite_code) THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN invite_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE TRIGGERS

-- Auto-update updated_at for corners
CREATE TRIGGER trigger_corners_updated_at
    BEFORE UPDATE ON corners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. INSERT DEFAULT DATA

-- Note: We won't insert any default data since this will be a fresh multi-tenant setup
-- Existing data will be migrated separately

-- 12. SECURITY POLICIES (Row Level Security)

-- Enable RLS on all tenant-aware tables (conditionally for tables that may not exist)
ALTER TABLE corners ENABLE ROW LEVEL SECURITY;
ALTER TABLE corner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE corner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE corner_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_access_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_groups') THEN
        ALTER TABLE memory_groups ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media') THEN
        ALTER TABLE media ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS policies will be created in a separate file for Firebase integration
-- These will use Firebase JWT claims to ensure users can only access their corners

COMMENT ON SCHEMA public IS 'Multi-tenant "Our Little Corner" database with Firebase Auth integration';