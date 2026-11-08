-- ============================================================
-- NUBIE REFERRAL SYSTEM — "Share Nubie"
-- Migration: Referral schema + auto-generated codes
-- ============================================================

-- 1. Add referral columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS referral_milestone INT DEFAULT 0;

COMMENT ON COLUMN profiles.referral_code IS 'Unique referral code for this user (auto-generated, e.g. NUBIE-A3F2K1)';
COMMENT ON COLUMN profiles.referred_by IS 'Referral code used when this user signed up (nullable)';
COMMENT ON COLUMN profiles.referral_milestone IS 'Current milestone reached: 0, 1, 2, or 3';

-- 2. Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reward_given_referrer BOOLEAN DEFAULT FALSE,
  reward_given_referred BOOLEAN DEFAULT FALSE,
  referrer_reward_code TEXT,
  referred_reward_code TEXT,
  milestone_at_completion INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE referrals IS 'Tracks each referral relationship and reward status';

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 4. Create referral_rewards table (stores generated discount/gift codes)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('discount', 'gift')),
  value_type TEXT NOT NULL CHECK (value_type IN ('percent', 'fixed')),
  value NUMERIC NOT NULL,
  description TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_on_order TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE referral_rewards IS 'Stores discount codes and gift codes generated from referral milestones';

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_code ON referral_rewards(code);

-- 5. Auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'NUBIE-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS set_referral_code ON profiles;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- 6. Backfill: Generate referral codes for existing users who don't have one
UPDATE profiles 
SET referral_code = 'NUBIE-' || UPPER(SUBSTRING(md5(id::text || random()::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- 7. RLS Policies for referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id
  );

-- Authenticated users can create referral rows (needed during registration)
CREATE POLICY "Authenticated users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access on referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- 8. RLS Policies for referral_rewards table
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view their own rewards
CREATE POLICY "Users can view own rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access on rewards" ON referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Automatic DB-side referral row creation trigger (RLS Bypass & Immediate Discount Generation)
CREATE OR REPLACE FUNCTION handle_auto_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_id UUID;
    v_friend_code TEXT;
BEGIN
    -- Only run if a referred_by code exists
    IF NEW.referred_by IS NOT NULL THEN
        -- Find the inviter's ID using their referral code
        SELECT id INTO v_referrer_id 
        FROM public.profiles 
        WHERE referral_code = NEW.referred_by;

        -- If the inviter exists, insert the pending referral row
        IF v_referrer_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.referrals 
            WHERE referred_id = NEW.id
        ) THEN
            -- Generate a unique referral ID
            v_referral_id := gen_random_uuid();
            
            -- Insert the pending referral
            INSERT INTO public.referrals (id, referrer_id, referred_id, referral_code, status)
            VALUES (v_referral_id, v_referrer_id, NEW.id, NEW.referred_by, 'pending');
            
            -- Generate a unique SHARE15 code
            v_friend_code := 'SHARE15-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
            
            -- Insert the welcome discount reward for the referred friend immediately
            INSERT INTO public.referral_rewards (user_id, referral_id, code, type, value_type, value, description, expires_at)
            VALUES (NEW.id, v_referral_id, v_friend_code, 'discount', 'percent', 15, '15% off your next order — Welcome gift from your friend!', NOW() + INTERVAL '30 days');
            
            -- Save the code on the referrals tracking row too
            UPDATE public.referrals 
            SET reward_given_referred = TRUE, referred_reward_code = v_friend_code
            WHERE id = v_referral_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS tr_auto_referral ON public.profiles;

CREATE TRIGGER tr_auto_referral
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_auto_referral_on_signup();

-- 10. SELECT policy on profiles to allow authenticated users to resolve referral codes
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
