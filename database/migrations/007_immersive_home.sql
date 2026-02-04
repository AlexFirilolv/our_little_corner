-- Migration 007: Immersive Home Dashboard
-- Adds support for multiple cover photos and pinned memory ("Fridge") feature

-- 1. Multiple cover photos table
CREATE TABLE IF NOT EXISTS locket_covers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES lockets(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    storage_key TEXT,
    sort_order INTEGER DEFAULT 0,
    added_by_firebase_uid VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_locket_covers_locket ON locket_covers(locket_id);
CREATE INDEX IF NOT EXISTS idx_locket_covers_order ON locket_covers(locket_id, sort_order);

-- Enable RLS
ALTER TABLE locket_covers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locket_covers
DROP POLICY IF EXISTS locket_covers_select_policy ON locket_covers;
CREATE POLICY locket_covers_select_policy ON locket_covers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS locket_covers_insert_policy ON locket_covers;
CREATE POLICY locket_covers_insert_policy ON locket_covers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS locket_covers_update_policy ON locket_covers;
CREATE POLICY locket_covers_update_policy ON locket_covers
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS locket_covers_delete_policy ON locket_covers;
CREATE POLICY locket_covers_delete_policy ON locket_covers
    FOR DELETE USING (true);

-- 2. Pinned memory for "Fridge" feature
ALTER TABLE lockets
ADD COLUMN IF NOT EXISTS pinned_memory_id UUID REFERENCES memory_groups(id) ON DELETE SET NULL;

COMMENT ON COLUMN lockets.pinned_memory_id IS 'Currently pinned memory shown in the Fridge widget';
