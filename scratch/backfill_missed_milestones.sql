-- ─── BACKFILL MISSING REFERRER MILESTONE REWARDS ───
-- If a referrer's referral_milestone is >= 1, but they don't have Milestone 1 reward, create it.
-- If referral_milestone is >= 2, but they don't have Milestone 2 reward, create it.
-- If referral_milestone is >= 3, but they don't have Milestone 3 reward, create it.

DO $$
DECLARE
    v_profile RECORD;
    v_referral_id UUID;
    v_code TEXT;
BEGIN
    FOR v_profile IN 
        SELECT id, referral_milestone FROM public.profiles WHERE referral_milestone > 0
    LOOP
        -- Check if Milestone 1 reward is missing (type 'discount')
        IF v_profile.referral_milestone >= 1 AND NOT EXISTS (
            SELECT 1 FROM public.referral_rewards 
            WHERE user_id = v_profile.id AND type = 'discount' AND code LIKE 'SHARE15-%'
        ) THEN
            -- Get one completed referral_id to link
            SELECT id INTO v_referral_id FROM public.referrals 
            WHERE referrer_id = v_profile.id AND status = 'completed' LIMIT 1;
            
            -- Generate a unique code
            v_code := 'SHARE15-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
            
            -- Insert the reward
            INSERT INTO public.referral_rewards (user_id, referral_id, code, type, value_type, value, description, expires_at)
            VALUES (
                v_profile.id, 
                v_referral_id, 
                v_code, 
                'discount', 
                'percent', 
                15, 
                '15% off your next order — Referral reward!', 
                NOW() + INTERVAL '30 days'
            );
            
            RAISE NOTICE 'Backfilled Milestone 1 reward for user % with code %', v_profile.id, v_code;
        END IF;

        -- Check if Milestone 2 reward is missing (type 'gift' with code LIKE 'GIFT-MINI-%')
        IF v_profile.referral_milestone >= 2 AND NOT EXISTS (
            SELECT 1 FROM public.referral_rewards 
            WHERE user_id = v_profile.id AND type = 'gift' AND code LIKE 'GIFT-MINI-%'
        ) THEN
            SELECT id INTO v_referral_id FROM public.referrals 
            WHERE referrer_id = v_profile.id AND status = 'completed' LIMIT 1;
            
            v_code := 'GIFT-MINI-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
            
            INSERT INTO public.referral_rewards (user_id, referral_id, code, type, value_type, value, description, expires_at)
            VALUES (
                v_profile.id, 
                v_referral_id, 
                v_code, 
                'gift', 
                'fixed', 
                0, 
                'Mini Gift Set — Claim with your next order!', 
                NOW() + INTERVAL '60 days'
            );
            
            RAISE NOTICE 'Backfilled Milestone 2 reward for user % with code %', v_profile.id, v_code;
        END IF;

        -- Check if Milestone 3 reward is missing (type 'gift' with code LIKE 'GIFT-DISC-%')
        IF v_profile.referral_milestone >= 3 AND NOT EXISTS (
            SELECT 1 FROM public.referral_rewards 
            WHERE user_id = v_profile.id AND type = 'gift' AND code LIKE 'GIFT-DISC-%'
        ) THEN
            SELECT id INTO v_referral_id FROM public.referrals 
            WHERE referrer_id = v_profile.id AND status = 'completed' LIMIT 1;
            
            v_code := 'GIFT-DISC-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
            
            INSERT INTO public.referral_rewards (user_id, referral_id, code, type, value_type, value, description, expires_at)
            VALUES (
                v_profile.id, 
                v_referral_id, 
                v_code, 
                'gift', 
                'fixed', 
                0, 
                'Discovery Set — Claim with your next order!', 
                NOW() + INTERVAL '60 days'
            );
            
            RAISE NOTICE 'Backfilled Milestone 3 reward for user % with code %', v_profile.id, v_code;
        END IF;
    END LOOP;
END;
$$;
