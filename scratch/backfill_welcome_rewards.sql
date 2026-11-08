-- ============================================================
-- BACKFILL WELCOME REWARDS FOR EXISTING REFERRED USERS
-- ============================================================

DO $$
DECLARE
    r RECORD;
    v_referral_id UUID;
    v_friend_code TEXT;
BEGIN
    FOR r IN 
        SELECT id, referred_by 
        FROM public.profiles 
        WHERE referred_by IS NOT NULL
    LOOP
        -- Check if a welcome reward already exists for this user
        IF NOT EXISTS (
            SELECT 1 FROM public.referral_rewards 
            WHERE user_id = r.id AND type = 'discount'
        ) THEN
            -- Find or create a referral record
            SELECT id INTO v_referral_id 
            FROM public.referrals 
            WHERE referred_id = r.id;
            
            IF v_referral_id IS NULL THEN
                v_referral_id := gen_random_uuid();
                INSERT INTO public.referrals (id, referrer_id, referred_id, referral_code, status)
                VALUES (
                    v_referral_id, 
                    (SELECT id FROM public.profiles WHERE referral_code = r.referred_by LIMIT 1), 
                    r.id, 
                    r.referred_by, 
                    'pending'
                );
            END IF;
            
            -- Generate code
            v_friend_code := 'SHARE15-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
            
            -- Insert welcome reward
            INSERT INTO public.referral_rewards (user_id, referral_id, code, type, value_type, value, description, expires_at)
            VALUES (r.id, v_referral_id, v_friend_code, 'discount', 'percent', 15, '15% off your next order — Welcome gift from your friend!', NOW() + INTERVAL '90 days');
            
            -- Update referrals
            UPDATE public.referrals 
            SET reward_given_referred = TRUE, referred_reward_code = v_friend_code
            WHERE id = v_referral_id;
        END IF;
    END LOOP;
END $$;
