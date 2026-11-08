CREATE OR REPLACE FUNCTION validate_reward_code(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward RECORD;
BEGIN
    SELECT id, is_used, expires_at INTO v_reward
    FROM referral_rewards
    WHERE code = p_code 
      AND (type = 'discount' OR type = 'gift')
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN '{"valid": false, "reason": "not_found"}'::jsonb;
    END IF;
    
    IF v_reward.is_used THEN
        RETURN '{"valid": false, "reason": "already_used"}'::jsonb;
    END IF;
    
    IF v_reward.expires_at IS NOT NULL AND v_reward.expires_at < now() THEN
        RETURN '{"valid": false, "reason": "expired"}'::jsonb;
    END IF;
    
    RETURN json_build_object('valid', true, 'rewardId', v_reward.id)::jsonb;
END;
$$;
