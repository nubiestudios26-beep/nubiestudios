const SUPABASE_URL = 'https://qsbrjlhnklnfblqulzwn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV';

async function testFetch() {
    const restUrl = `${SUPABASE_URL}/rest/v1/products?select=id,name,image_url,price&limit=5`;
    const response = await fetch(restUrl, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

testFetch();
