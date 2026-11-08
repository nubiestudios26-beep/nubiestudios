-- ============================================================
-- NUBIE SYSTEM V2 — Simplified Tier + Referral
-- Run this in Supabase SQL Editor
--
-- Changes:
--   1. Cancel Mark system (reset all marks to 0)
--   2. Two tiers only: Starter (on register) + Riser (referral completes)
--   3. One referral per referrer (unique constraint)
--   4. On referral completion → referrer gets Riser tier + GIFT-MINI code
-- ============================================================


-- ─── 1. RESET MARKS ─────────────────────────────────────────
-- Marks are no longer earned. Zero out all existing balances.
UPDATE public.profiles SET marks = 0;


-- ─── 2. RESET TIERS ─────────────────────────────────────────
-- Everyone starts at Starter, then Riser is granted below for
-- referrers who already have a completed referral.
UPDATE public.profiles SET tier = 'Starter';

UPDATE public.profiles
SET tier = 'Riser'
WHERE id IN (
    SELECT DISTINCT referrer_id
    FROM public.referrals
    WHERE status = 'completed'
      AND referrer_id IS NOT NULL
);


-- ─── 3. CLEAN UP OLD MILESTONE DATA ─────────────────────────
-- Remove milestone numbers (system is now binary: 0 or done).
UPDATE public.profiles SET referral_milestone = 0;


-- ─── 4. REMOVE DUPLICATE REFERRALS (keep oldest per referrer)
-- Required before adding the unique constraint below.
DELETE FROM public.referrals
WHERE id NOT IN (
    SELECT DISTINCT ON (referrer_id) id
    FROM public.referrals
    ORDER BY referrer_id, created_at ASC
);


-- ─── 5. ONE REFERRAL PER REFERRER ───────────────────────────
ALTER TABLE public.referrals
    DROP CONSTRAINT IF EXISTS one_referral_per_referrer;

ALTER TABLE public.referrals
    ADD CONSTRAINT one_referral_per_referrer UNIQUE (referrer_id);


-- ─── 6. REPLACE SIGNUP TRIGGER ──────────────────────────────
-- Old trigger generated a SHARE15 welcome discount on signup.
-- New trigger: just creates the pending referral row, no discount.
CREATE OR REPLACE FUNCTION public.handle_auto_referral_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        -- Find the inviter by their referral code
        SELECT id INTO v_referrer_id
        FROM public.profiles
        WHERE referral_code = NEW.referred_by;

        -- Only create if:
        --   1. Inviter exists
        --   2. This user has no existing referral row (not referred twice)
        --   3. Inviter has not already referred someone (1-referral cap)
        IF v_referrer_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1 FROM public.referrals WHERE referred_id = NEW.id
           )
           AND NOT EXISTS (
               SELECT 1 FROM public.referrals WHERE referrer_id = v_referrer_id
           )
        THEN
            INSERT INTO public.referrals (
                id, referrer_id, referred_id, referral_code, status
            ) VALUES (
                gen_random_uuid(),
                v_referrer_id,
                NEW.id,
                NEW.referred_by,
                'pending'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_referral ON public.profiles;
CREATE TRIGGER tr_auto_referral
    AFTER INSERT OR UPDATE OF referred_by ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auto_referral_on_signup();


-- ─── 7. REFERRAL COMPLETION TRIGGER ─────────────────────────
-- When a referral row flips from 'pending' → 'completed'
-- (done by your Edge Function after the referred user's first order):
--   a. Upgrade referrer tier to 'Riser'
--   b. Generate one GIFT-MINI code for the referrer
CREATE OR REPLACE FUNCTION public.handle_referral_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_gift_code TEXT;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'completed' THEN

        -- a. Upgrade referrer to Riser
        UPDATE public.profiles
        SET tier = 'Riser'
        WHERE id = NEW.referrer_id;

        -- b. Generate unique GIFT-MINI code
        v_gift_code := 'GIFT-MINI-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));

        INSERT INTO public.referral_rewards (
            user_id,
            referral_id,
            code,
            type,
            value_type,
            value,
            description,
            expires_at
        ) VALUES (
            NEW.referrer_id,
            NEW.id,
            v_gift_code,
            'gift',
            'fixed',
            0,
            'Mini Gift Set — Claim with your next order!',
            NOW() + INTERVAL '90 days'
        );

        -- c. Record on referral row
        UPDATE public.referrals
        SET reward_given_referrer = TRUE,
            referrer_reward_code  = v_gift_code,
            completed_at          = NOW()
        WHERE id = NEW.id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_referral_completion ON public.referrals;
CREATE TRIGGER tr_referral_completion
    AFTER UPDATE OF status ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_referral_completion();


-- ─── 8. BACKFILL GIFT-MINI FOR EXISTING COMPLETED REFERRALS ─
-- Referrers whose referral is already 'completed' but who
-- never got a GIFT-MINI code (from the old milestone system).
DO $$
DECLARE
    r RECORD;
    v_code TEXT;
BEGIN
    FOR r IN
        SELECT id, referrer_id
        FROM public.referrals
        WHERE status = 'completed'
          AND referrer_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.referral_rewards
              WHERE user_id = referrals.referrer_id
                AND code LIKE 'GIFT-MINI-%'
          )
    LOOP
        v_code := 'GIFT-MINI-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));

        INSERT INTO public.referral_rewards (
            user_id, referral_id, code, type, value_type, value, description, expires_at
        ) VALUES (
            r.referrer_id,
            r.id,
            v_code,
            'gift',
            'fixed',
            0,
            'Mini Gift Set — Claim with your next order!',
            NOW() + INTERVAL '90 days'
        );

        UPDATE public.referrals
        SET reward_given_referrer = TRUE,
            referrer_reward_code  = v_code
        WHERE id = r.id;

        RAISE NOTICE 'Backfilled GIFT-MINI for referrer % with code %', r.referrer_id, v_code;
    END LOOP;
END $$;


-- ─── 9. REMOVE STALE SHARE15 WELCOME CODES ──────────────────
-- SHARE15 codes will no longer be generated. Remove unused ones
-- from referral_rewards to keep data clean.
-- (Comment this out if you want to honour existing unused codes.)
DELETE FROM public.referral_rewards
WHERE code LIKE 'SHARE15-%'
  AND is_used = FALSE;


-- ─── EDGE FUNCTION NOTE ──────────────────────────────────────
-- Your omise-charge Edge Function must mark a referral as
-- 'completed' when the referred user places their FIRST order.
-- Add this logic inside the Edge Function after order creation:
--
--   const { data: ref } = await supabase
--     .from('referrals')
--     .select('id, status')
--     .eq('referred_id', userId)
--     .eq('status', 'pending')
--     .single();
--
--   if (ref) {
--     await supabase
--       .from('referrals')
--       .update({ status: 'completed' })
--       .eq('id', ref.id);
--   }
--
-- The tr_referral_completion trigger then fires automatically.
-- ─────────────────────────────────────────────────────────────
