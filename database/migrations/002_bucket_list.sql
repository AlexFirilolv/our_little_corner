-- Create bucket_list_items table
CREATE TABLE IF NOT EXISTS bucket_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locket_id UUID NOT NULL REFERENCES corners(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other', -- 'travel', 'food', 'activity', 'other'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by_firebase_uid VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bucket_list_locket ON bucket_list_items(locket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_list_status ON bucket_list_items(status);

-- Enable RLS
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE TRIGGER trigger_bucket_list_updated_at
    BEFORE UPDATE ON bucket_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
