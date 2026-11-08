const SUPABASE_URL = 'https://qsbrjlhnklnfblqulzwn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV';

async function main() {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
    };

    // 1. Fetch referrals
    const referralsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/referrals?select=*&limit=10&order=created_at.desc`,
        { headers }
    );
    const referrals = await referralsRes.json();
    console.log('Recent Referrals:', JSON.stringify(referrals, null, 2));

    // 2. Fetch referral_rewards
    const rewardsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/referral_rewards?select=*&limit=10&order=created_at.desc`,
        { headers }
    );
    const rewards = await rewardsRes.json();
    console.log('Recent Rewards:', JSON.stringify(rewards, null, 2));
}

main().catch(console.error);
