-- Create bookmarked_items table
CREATE TABLE bookmarked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('supplement', 'wellness_service', 'provider', 'deal', 'lab_test', 'course', 'event', 'live_room')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_image_url TEXT,
  item_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE bookmarked_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarked_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON bookmarked_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarked_items FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_bookmarked_items_user_id ON bookmarked_items(user_id);
CREATE INDEX idx_bookmarked_items_type ON bookmarked_items(item_type);
CREATE INDEX idx_bookmarked_items_user_type ON bookmarked_items(user_id, item_type);

-- Trigger for updated_at
CREATE TRIGGER update_bookmarked_items_updated_at
  BEFORE UPDATE ON bookmarked_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();