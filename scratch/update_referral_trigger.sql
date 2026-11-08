-- ============================================================
-- NUBIE REFERRAL SYSTEM — "Immediate Friend Welcome Discount"
-- ============================================================

-- 1. Redefine trigger function to insert the friend's welcome code on signup
CREATE OR REPLACE FUNCTION public.handle_auto_referral_on_signup()
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
            VALUES (NEW.id, v_referral_id, v_friend_code, 'discount', 'percent', 15, '15% off your first order — Welcome gift from your friend!', NOW() + INTERVAL '30 days');
            
            -- Save the code on the referrals tracking row too
            UPDATE public.referrals 
            SET reward_given_referred = TRUE, referred_reward_code = v_friend_code
            WHERE id = v_referral_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add SELECT policy on profiles to allow authenticated users to fetch other profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
