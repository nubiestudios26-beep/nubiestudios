-- ═══════════════════════════════════════════════════════
-- NUBIE Reviews Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id    TEXT NOT NULL,                           -- Slug or UUID from URL
    user_id       UUID REFERENCES auth.users(id),          -- Link to auth.users
    user_email    TEXT,                                    -- Email for moderation
    user_name     TEXT NOT NULL,                           -- Display name
    title         TEXT NOT NULL,
    content       TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',        -- pending, approved, hidden
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
    ON reviews FOR SELECT
    USING (status = 'approved');

-- Policy: Authenticated users can insert their own reviews
CREATE POLICY "Authenticated users can insert reviews"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own pending reviews
CREATE POLICY "Users can view own reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
