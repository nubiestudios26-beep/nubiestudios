// Deployment: supabase functions deploy omise-charge --no-verify-jwt
// Set secret: supabase secrets set OMISE_SECRET_KEY=skey_test_64wfd7tk64y9go2cfaa
//             supabase secrets set OMISE_PUBLIC_KEY=pkey_test_64wfd7sz1lte7xuw8ay

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const OMISE_SECRET_KEY = Deno.env.get("OMISE_SECRET_KEY") || "skey_test_64wfd7tk64y9go2cfaa";
const OMISE_PUBLIC_KEY = Deno.env.get("OMISE_PUBLIC_KEY") || "pkey_test_64wfd7sz1lte7xuw8ay";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// ─── Helper: Save order to Supabase ───
async function saveOrder(chargeData: any, body: any) {
    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const orderNumber = `N-${Date.now().toString(36).toUpperCase()}`;
        const isSuccessful = chargeData.status === "successful" || chargeData.paid === true;
        const isPending = chargeData.status === "pending";

        if (!isSuccessful && !isPending) {
            console.log("[DB] Skipping order save — charge status:", chargeData.status);
            return null;
        }

        // Insert order
        const { data: order, error: orderError } = await supabaseClient
            .from("orders")
            .insert({
                order_number: orderNumber,
                user_email: body.userEmail || "guest@nubie.com",
                total_amount: (body.amount || 0) / 100, // satang → baht
                status: isSuccessful ? "paid" : "pending",
                payment_method: body.payment_method || "unknown",
                charge_id: chargeData.id || null,
                // Shipping Address Snapshot
                shipping_name: body.shipping?.name || null,
                shipping_address: body.shipping?.address || null,
                shipping_city: body.shipping?.city || null,
                shipping_postcode: body.shipping?.postcode || null,
                shipping_country: body.shipping?.country || null,
                shipping_phone: body.shipping?.phone || null,
            })
            .select()
            .single();

        if (orderError) {
            console.error("[DB Error - Order]", orderError);
            return null;
        }

        console.log("[DB] Order created:", order.id, orderNumber);

        // Insert order items
        if (body.items && body.items.length > 0 && order) {
            const orderItems = body.items.map((item: any) => ({
                order_id: order.id,
                product_title: item.title || "Unknown",
                size: item.size || "",
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                image_url: item.image || null,
            }));

            const { error: itemsError } = await supabaseClient
                .from("order_items")
                .insert(orderItems);

            if (itemsError) {
                console.error("[DB Error - Items]", itemsError);
            } else {
                console.log("[DB] Order items saved:", orderItems.length);
            }
        }

        // ─── Post-purchase: Tier, Loyalty, Referral ───
        if (isSuccessful) {
            if (body.userId) {
                const orderAmountBaht = (body.amount || 0) / 100;
                await processFirstPurchaseTier(supabaseClient, body.userId);
                await updateLoyaltyData(supabaseClient, body.userId, orderAmountBaht);
                await processReferralCompletion(supabaseClient, body.userId);
            }

            // Mark applied promocode as used
            if (body.appliedPromo) {
                console.log(`[Referral] Marking promocode ${body.appliedPromo} as used.`);
                const { error: promoErr } = await supabaseClient
                    .from("referral_rewards")
                    .update({
                        is_used: true,
                        used_at: new Date().toISOString()
                    })
                    .eq("code", body.appliedPromo);

                if (promoErr) {
                    console.error("[Referral] Error marking promocode as used:", promoErr);
                } else {
                    console.log(`[Referral] Promocode ${body.appliedPromo} marked as used successfully.`);
                }
            }

            // Mark applied gift card as used
            if (body.appliedGift) {
                console.log(`[Referral] Marking gift code ${body.appliedGift} as used.`);
                const { error: giftErr } = await supabaseClient
                    .from("referral_rewards")
                    .update({
                        is_used: true,
                        used_at: new Date().toISOString()
                    })
                    .eq("code", body.appliedGift);

                if (giftErr) {
                    console.error("[Referral] Error marking gift code as used:", giftErr);
                } else {
                    console.log(`[Referral] Gift code ${body.appliedGift} marked as used successfully.`);
                }
            }
        }

        return { orderNumber, orderId: order.id };
    } catch (err) {
        console.error("[DB] Unexpected error saving order:", err);
        return null;
    }
}

// ─── Helper: Process Referral on First Purchase ───
// When a referred user makes their first purchase:
// 1. Mark referral as completed
// 2. Generate 15% discount code for referrer (milestone 1)
// 3. Count completed referrals → milestone detection (1=discount, 2=mini gift, 3=discovery set)
// 4. Cap: only first 3 completed referrals earn rewards
async function processReferralCompletion(supabaseClient: any, buyerId: string) {
    try {
        // 1. Check if this buyer was referred
        const { data: referral, error: refError } = await supabaseClient
            .from("referrals")
            .select("*")
            .eq("referred_id", buyerId)
            .eq("status", "pending")
            .single();

        if (refError || !referral) {
            console.log("[Referral] No pending referral for buyer:", buyerId);
            return;
        }

        // 2. Mark referral as completed
        const { error: updateError } = await supabaseClient
            .from("referrals")
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", referral.id);

        if (updateError) {
            console.error("[Referral] Failed to complete referral:", updateError);
            return;
        }

        console.log(`[Referral] Referral completed: ${referral.id}`);

        // 3. Generate or reuse 15% welcome discount code for the referred friend
        let friendCode = referral.referred_reward_code;
        if (!friendCode) {
            friendCode = `SHARE15-${generateShortCode()}`;
            await supabaseClient
                .from("referral_rewards")
                .insert({
                    user_id: buyerId,
                    referral_id: referral.id,
                    code: friendCode,
                    type: "discount",
                    value_type: "percent",
                    value: 15,
                    description: "15% off your next order — Welcome gift from your friend!",
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                });

            await supabaseClient
                .from("referrals")
                .update({
                    reward_given_referred: true,
                    referred_reward_code: friendCode
                })
                .eq("id", referral.id);

            console.log(`[Referral] Dynamic fallback friend reward generated: ${friendCode}`);
        } else {
            console.log(`[Referral] Friend welcome reward already exists: ${friendCode}`);
        }

        // 4. Count completed referrals for the referrer (cap at 3)
        const { count: completedCount, error: countError } = await supabaseClient
            .from("referrals")
            .select("id", { count: "exact", head: true })
            .eq("referrer_id", referral.referrer_id)
            .eq("status", "completed");

        if (countError) {
            console.error("[Referral] Count error:", countError);
            return;
        }

        const milestoneNumber = Math.min(completedCount || 0, 3);
        console.log(`[Referral] Referrer milestone: ${milestoneNumber}/3`);

        // 5. Only award if within the 3-reward cap
        if (milestoneNumber <= 3 && milestoneNumber > 0) {
            // Check if this specific milestone was already awarded
            const { data: profile } = await supabaseClient
                .from("profiles")
                .select("referral_milestone")
                .eq("id", referral.referrer_id)
                .single();

            const currentMilestone = profile?.referral_milestone || 0;

            if (milestoneNumber > currentMilestone) {
                let latestRewardCode = "";

                // Award all pending/skipped milestones up to the current milestone number
                for (let m = currentMilestone + 1; m <= milestoneNumber; m++) {
                    let rewardCode = "";
                    let rewardDescription = "";
                    let rewardType = "discount";

                    if (m === 1) {
                        // Milestone 1: 15% discount code
                        rewardCode = `SHARE15-${generateShortCode()}`;
                        rewardDescription = "15% off your next order — Referral reward!";
                        await supabaseClient
                            .from("referral_rewards")
                            .insert({
                                user_id: referral.referrer_id,
                                referral_id: referral.id,
                                code: rewardCode,
                                type: "discount",
                                value_type: "percent",
                                value: 15,
                                description: rewardDescription,
                                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                            });
                    } else if (m === 2) {
                        // Milestone 2: Mini Gift Set (flagged for manual fulfillment)
                        rewardCode = `GIFT-MINI-${generateShortCode()}`;
                        rewardDescription = "Mini Gift Set — Claim with your next order!";
                        rewardType = "gift";
                        await supabaseClient
                            .from("referral_rewards")
                            .insert({
                                user_id: referral.referrer_id,
                                referral_id: referral.id,
                                code: rewardCode,
                                type: "gift",
                                value_type: "fixed",
                                value: 0,
                                description: rewardDescription,
                                expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
                            });
                    } else if (m === 3) {
                        // Milestone 3: Discovery Set (flagged for manual fulfillment)
                        rewardCode = `GIFT-DISC-${generateShortCode()}`;
                        rewardDescription = "Discovery Set — Claim with your next order!";
                        rewardType = "gift";
                        await supabaseClient
                            .from("referral_rewards")
                            .insert({
                                user_id: referral.referrer_id,
                                referral_id: referral.id,
                                code: rewardCode,
                                type: "gift",
                                value_type: "fixed",
                                value: 0,
                                description: rewardDescription,
                                expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
                            });
                    }

                    if (m === milestoneNumber) {
                        latestRewardCode = rewardCode;
                    }
                    console.log(`[Referral] Referrer reward generated: ${rewardCode} (Milestone ${m})`);
                }

                // Update referral row with referrer reward
                await supabaseClient
                    .from("referrals")
                    .update({
                        reward_given_referrer: true,
                        referrer_reward_code: latestRewardCode,
                        milestone_at_completion: milestoneNumber
                    })
                    .eq("id", referral.id);

                // Update referrer's milestone on profile
                await supabaseClient
                    .from("profiles")
                    .update({ referral_milestone: milestoneNumber })
                    .eq("id", referral.referrer_id);
            }
        }
    } catch (err) {
        console.error("[Referral] Unexpected error processing referral:", err);
    }
}

// Generate a short uppercase alphanumeric code
function generateShortCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ─── Helper: Assign Tier on First Purchase ───
// First Circle = first 100 purchasing customers | Starter = everyone after
async function processFirstPurchaseTier(supabaseClient: any, userId: string) {
    try {
        // 1. Fetch current profile
        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("alias, tier")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            console.warn("[Tier] Profile not found for user:", userId, profileError);
            return;
        }

        // 2. Only assign tier on first purchase (alias is null)
        if (profile.alias) {
            console.log("[Tier] User already has alias, skipping tier assignment.");
            return;
        }

        // 3. Count how many "First Circle" members exist
        const { count, error: countError } = await supabaseClient
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("tier", "First Circle");

        if (countError) {
            console.error("[Tier] Count error:", countError);
            return;
        }

        const firstCircleCount = count || 0;
        const newTier = firstCircleCount < 100 ? "First Circle" : "Starter";

        // 4. Update profile with tier and alias
        const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({
                tier: newTier,
                alias: "The Nubie",
            })
            .eq("id", userId);

        if (updateError) {
            console.error("[Tier] Update error:", updateError);
        } else {
            console.log(`[Tier] User ${userId} assigned: ${newTier} (#${firstCircleCount + 1})`);
        }
    } catch (err) {
        console.error("[Tier] Unexpected error:", err);
    }
}

// ─── Helper: Update Loyalty Data (total_spent only) ───
// Runs on EVERY successful purchase
async function updateLoyaltyData(supabaseClient: any, userId: string, orderAmountBaht: number) {
    try {
        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("total_spent")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            console.warn("[Loyalty] Profile not found:", userId, profileError);
            return;
        }

        const currentSpent = Number(profile.total_spent) || 0;
        const newTotalSpent = currentSpent + orderAmountBaht;

        const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({ total_spent: newTotalSpent })
            .eq("id", userId);

        if (updateError) {
            console.error("[Loyalty] Update error:", updateError);
        } else {
            console.log(`[Loyalty] User ${userId}: +฿${orderAmountBaht} spent (total: ฿${newTotalSpent})`);
        }
    } catch (err) {
        console.error("[Loyalty] Unexpected error:", err);
    }
}


Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { payment_method, card, amount, currency, return_uri, description } = body;

        if (!amount || amount <= 0) {
            throw new Error("Invalid or missing amount.");
        }

        const authHeader = btoa(OMISE_SECRET_KEY + ":");
        let chargeData: any = null;

        // ─── CARD: Create token first, then charge ───
        if (payment_method === "card") {
            if (!card || !card.number) throw new Error("Missing card details.");

            // Step 1: Create token via Omise Vault API
            const tokenParams = new URLSearchParams();
            tokenParams.append("card[name]", card.name);
            tokenParams.append("card[number]", card.number);
            tokenParams.append("card[expiration_month]", card.expiration_month.toString());
            tokenParams.append("card[expiration_year]", card.expiration_year.toString());
            tokenParams.append("card[security_code]", card.security_code);

            const tokenResp = await fetch("https://vault.omise.co/tokens", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(OMISE_PUBLIC_KEY + ":"),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: tokenParams.toString(),
            });

            const tokenData = await tokenResp.json();
            if (!tokenResp.ok || tokenData.object === "error") {
                throw new Error(tokenData.message || "Card tokenization failed.");
            }
            console.log("[Omise] Token created:", tokenData.id);

            // Step 2: Create charge
            const chargeParams = new URLSearchParams();
            chargeParams.append("amount", amount.toString());
            chargeParams.append("currency", currency || "THB");
            chargeParams.append("card", tokenData.id);
            chargeParams.append("description", description || "NUBIE Order");

            const chargeResp = await fetch("https://api.omise.co/charges", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + authHeader,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: chargeParams.toString(),
            });

            chargeData = await chargeResp.json();
            console.log("[Omise] Charge result:", chargeData.id, chargeData.status);

            if (!chargeResp.ok) {
                throw new Error(chargeData.message || "Charge creation failed.");
            }
        }

        // ─── PROMPTPAY / TRUEMONEY: Create source first, then charge ───
        else if (payment_method === "promptpay" || payment_method === "truemoney") {
            const sourceParams = new URLSearchParams();
            sourceParams.append("type", payment_method);
            sourceParams.append("amount", amount.toString());
            sourceParams.append("currency", currency || "THB");
            if (body.phone_number) {
                sourceParams.append("phone_number", body.phone_number);
            }

            const sourceResp = await fetch("https://api.omise.co/sources", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(OMISE_PUBLIC_KEY + ":"),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: sourceParams.toString(),
            });

            const sourceData = await sourceResp.json();
            if (!sourceResp.ok || sourceData.object === "error") {
                throw new Error(sourceData.message || "Source creation failed.");
            }
            console.log("[Omise] Source created:", sourceData.id);

            const chargeParams = new URLSearchParams();
            chargeParams.append("amount", amount.toString());
            chargeParams.append("currency", currency || "THB");
            chargeParams.append("source", sourceData.id);
            chargeParams.append("description", description || "NUBIE Order");
            if (return_uri) chargeParams.append("return_uri", return_uri);

            const chargeResp = await fetch("https://api.omise.co/charges", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + authHeader,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: chargeParams.toString(),
            });

            chargeData = await chargeResp.json();
            console.log("[Omise] Charge result:", chargeData.id, chargeData.status);

            if (!chargeResp.ok) {
                throw new Error(chargeData.message || "Charge creation failed.");
            }
        } else {
            throw new Error("Unsupported payment method: " + payment_method);
        }

        // ─── SAVE ORDER TO SUPABASE ───
        const orderResult = await saveOrder(chargeData, body);

        // Attach order info to the response so the frontend can display it
        const responseData = {
            ...chargeData,
            order_number: orderResult?.orderNumber || null,
            order_id: orderResult?.orderId || null,
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("[omise-charge] Error:", err.message);
        return new Response(JSON.stringify({ object: "error", message: err.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
