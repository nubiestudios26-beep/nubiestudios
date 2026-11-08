-- ============================================================
-- CREATE REFERRAL_REWARDS TABLE AND POLICIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_code ON public.referral_rewards(code);

-- Enable RLS
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Service role full access on rewards" ON public.referral_rewards;

-- Create policies
CREATE POLICY "Users can view own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');
