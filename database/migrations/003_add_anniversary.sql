-- Add anniversary and countdown fields to corners table
ALTER TABLE corners
ADD COLUMN IF NOT EXISTS anniversary_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_countdown_event_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS next_countdown_date TIMESTAMP WITH TIME ZONE;
