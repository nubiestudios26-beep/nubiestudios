-- Add loyalty columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS alias TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Starter',
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN profiles.alias IS 'Special title earned after first purchase';
COMMENT ON COLUMN profiles.marks IS 'Loyalty points (35 THB = 1 Mark, >17 THB rounds up)';
COMMENT ON COLUMN profiles.tier IS 'Loyalty tier based on spend: Starter, Riser (2,500+), Rebel (6,000+)';
COMMENT ON COLUMN profiles.total_spent IS 'Lifetime spend used to calculate tier status';
