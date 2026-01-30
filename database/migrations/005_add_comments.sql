-- Migration: Add comments table for memory groups
-- Supports both user comments and system activity logs

-- Create comment_type enum
DO $$ BEGIN
  CREATE TYPE comment_type AS ENUM ('comment', 'activity');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create comments table
CREATE TABLE IF NOT EXISTS memory_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_group_id UUID NOT NULL REFERENCES memory_groups(id) ON DELETE CASCADE,
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,
    comment_type comment_type NOT NULL DEFAULT 'comment',

    -- For activity logs, store the action type
    activity_action VARCHAR(50), -- 'title_changed', 'photo_added', 'photo_removed', 'caption_changed', etc.

    -- Author (NULL for system activities)
    author_firebase_uid VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_comments_group ON memory_comments(memory_group_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_locket ON memory_comments(locket_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_author ON memory_comments(author_firebase_uid);
CREATE INDEX IF NOT EXISTS idx_memory_comments_type ON memory_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_memory_comments_created ON memory_comments(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_memory_comments_updated_at ON memory_comments;
CREATE TRIGGER trigger_memory_comments_updated_at
    BEFORE UPDATE ON memory_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE memory_comments ENABLE ROW LEVEL SECURITY;
