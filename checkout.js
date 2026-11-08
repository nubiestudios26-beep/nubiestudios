// ============================================================
// NUBIE CHECKOUT — FIXED VERSION
// Fixes:
//   1. Auth state: hide/show email input based on login status
//   2. Order summary: correct subtotal + total calculation
//   3. Promo code: actually applies discount and updates UI
// ============================================================

function showInlineError(inputElement, msg) {
    clearInlineError(inputElement);
    const alertDiv = document.createElement("div");
    alertDiv.className = "inline-alert active";
    const icon = document.createElement("i");
    icon.className = "fas fa-exclamation-triangle";
    alertDiv.appendChild(icon);
    const textSpan = document.createElement("span");
    textSpan.textContent = msg;
    alertDiv.appendChild(textSpan);
    inputElement.parentNode.appendChild(alertDiv);
    inputElement.classList.add("input-error");
}

function clearInlineError(inputElement) {
    const existing = inputElement.parentNode.querySelector(".inline-alert");
    if (existing) existing.remove();
    inputElement.classList.remove("input-error");
}

const THAI_PROVINCES = [
    { en: "Bangkok", th: "กรุงเทพมหานคร" },
    { en: "Amnat Charoen", th: "อำนาจเจริญ" },
    { en: "Ang Thong", th: "อ่างทอง" },
    { en: "Bueng Kan", th: "บึงกาฬ" },
    { en: "Buriram", th: "บุรีรัมย์" },
    { en: "Chachoengsao", th: "ฉะเชิงเทรา" },
    { en: "Chai Nat", th: "ชัยนาท" },
    { en: "Chaiyaphum", th: "ชัยภูมิ" },
    { en: "Chanthaburi", th: "จันทบุรี" },
    { en: "Chiang Mai", th: "เชียงใหม่" },
    { en: "Chiang Rai", th: "เชียงราย" },
    { en: "Chonburi", th: "ชลบุรี" },
    { en: "Chumphon", th: "ชุมพร" },
    { en: "Kalasin", th: "กาฬสินธุ์" },
    { en: "Kamphaeng Phet", th: "กำแพงเพชร" },
    { en: "Kanchanaburi", th: "กาญจนบุรี" },
    { en: "Khon Kaen", th: "ขอนแก่น" },
    { en: "Krabi", th: "กระบี่" },
    { en: "Lampang", th: "ลำปาง" },
    { en: "Lamphun", th: "ลำพูน" },
    { en: "Loei", th: "เลย" },
    { en: "Lopburi", th: "ลพบุรี" },
    { en: "Mae Hong Son", th: "แม่ฮ่องสอน" },
    { en: "Maha Sarakham", th: "มหาสารคาม" },
    { en: "Mukdahan", th: "มุกดาหาร" },
    { en: "Nakhon Nayok", th: "นครนายก" },
    { en: "Nakhon Pathom", th: "นครปฐม" },
    { en: "Nakhon Phanom", th: "นครพนม" },
    { en: "Nakhon Ratchasima", th: "นครราชสีมา" },
    { en: "Nakhon Sawan", th: "นครสวรรค์" },
    { en: "Nakhon Si Thammarat", th: "นครศรีธรรมราช" },
    { en: "Nan", th: "น่าน" },
    { en: "Narathiwat", th: "นราธิวาส" },
    { en: "Nong Bua Lamphu", th: "หนองบัวลำภู" },
    { en: "Nong Khai", th: "หนองคาย" },
    { en: "Nonthaburi", th: "นนทบุรี" },
    { en: "Pathum Thani", th: "ปทุมธานี" },
    { en: "Pattani", th: "ปัตตานี" },
    { en: "Phang Nga", th: "พังงา" },
    { en: "Phatthalung", th: "พัทลุง" },
    { en: "Phayao", th: "พะเยา" },
    { en: "Phetchabun", th: "เพชรบูรณ์" },
    { en: "Phetchaburi", th: "เพชรบุรี" },
    { en: "Phichit", th: "พิจิตร" },
    { en: "Phitsanulok", th: "พิษณุโลก" },
    { en: "Phra Nakhon Si Ayutthaya", th: "พระนครศรีอยุธยา" },
    { en: "Phrae", th: "แพร่" },
    { en: "Phuket", th: "ภูเก็ต" },
    { en: "Prachinburi", th: "ปราจีนบุรี" },
    { en: "Prachuap Khiri Khan", th: "ประจวบคีรีขันธ์" },
    { en: "Ranong", th: "ระนอง" },
    { en: "Ratchaburi", th: "ราชบุรี" },
    { en: "Rayong", th: "ระยอง" },
    { en: "Roi Et", th: "ร้อยเอ็ด" },
    { en: "Sa Kaeo", th: "สระแก้ว" },
    { en: "Sakon Nakhon", th: "สกลนคร" },
    { en: "Samut Prakan", th: "สมุทรปราการ" },
    { en: "Samut Sakhon", th: "สมุทรสาคร" },
    { en: "Samut Songkhram", th: "สมุทรสงคราม" },
    { en: "Saraburi", th: "สระบุรี" },
    { en: "Satun", th: "สตูล" },
    { en: "Sing Buri", th: "สิงห์บุรี" },
    { en: "Sisaket", th: "ศรีสะเกษ" },
    { en: "Songkhla", th: "สงขลา" },
    { en: "Sukhothai", th: "สุโขทัย" },
    { en: "Suphan Buri", th: "สุพรรณบุรี" },
    { en: "Surat Thani", th: "สุราษฎร์ธานี" },
    { en: "Surin", th: "สุรินทร์" },
    { en: "Tak", th: "ตาก" },
    { en: "Trang", th: "ตรัง" },
    { en: "Trat", th: "ตราด" },
    { en: "Ubon Ratchathani", th: "อุบลราชธานี" },
    { en: "Udon Thani", th: "อุดรธานี" },
    { en: "Uthai Thani", th: "อุทัยธานี" },
    { en: "Uttaradit", th: "อุตรดิตถ์" },
    { en: "Yala", th: "ยะลา" },
    { en: "Yasothon", th: "ยโสธร" }
];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing Checkout...');

    // --- ELEMENT REGISTRY ---
    const guestEmailInput = document.getElementById('guest-email');
    const guestContinueBtn = document.getElementById('guest-continue-btn');
    const contactIntroText = document.getElementById('contact-intro-text');
    const guestEmailGroup = document.getElementById('guest-email-group');
    const loggedInInfo = document.getElementById('logged-in-info');
    const loggedInEmailDisplay = document.getElementById('logged-in-email-display');
    const summaryItemsEl = document.getElementById('summary-items');
    const summarySubtotalEl = document.getElementById('summary-subtotal');
    const summaryTotalEl = document.getElementById('summary-total');
    const discountRow = document.getElementById('summary-discount-row');
    const discountLabel = document.getElementById('summary-discount-label');
    const discountValue = document.getElementById('summary-discount-value');
    const cartCountEls = document.querySelectorAll('.cart-count');
    const placeOrderBtn = document.getElementById('place-order-btn');

    // ─── STEP NAVIGATION (PRIORITY) ──────────────────────────
    window.nextStep = function (stepNumber) {
        console.log('Transitioning to step:', stepNumber);
        try {
            const currentStep = document.querySelector('.step-section.active');
            if (currentStep) {
                currentStep.classList.remove('active');
                currentStep.classList.add('completed');
            }
            const nextStepEl = document.getElementById(`step-${stepNumber}`);
            if (nextStepEl) {
                nextStepEl.classList.add('active');
                nextStepEl.classList.remove('completed');
                window.scrollTo({ top: nextStepEl.offsetTop - 150, behavior: 'smooth' });
            }
        } catch (e) {
            console.error('Navigation Error:', e);
        }
    };

    window.reopenStep = function (stepNumber) {
        console.log('Reopening step:', stepNumber);
        try {
            // Mark subsequent steps as inactive
            for (let i = stepNumber + 1; i <= 4; i++) {
                const s = document.getElementById(`step-${i}`);
                if (s) s.classList.remove('active', 'completed');
            }
            // Activate target step
            const target = document.getElementById(`step-${stepNumber}`);
            if (target) {
                document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
                target.classList.remove('completed');
                target.classList.add('active');
                window.scrollTo({ top: target.offsetTop - 150, behavior: 'smooth' });
            }
        } catch (e) {
            console.error('Reopen Error:', e);
        }
    };

    window.submitShipping = function () {
        window.nextStep(4);
    };

    try {
        document.querySelectorAll('.step-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                if (section.classList.contains('completed')) {
                    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
                    section.classList.add('active');
                    section.classList.remove('completed');
                }
            });
        });
    } catch (e) { console.warn('Step header listener failed:', e); }

    // ─── CART STATE ──────────────────────────────────────────
    let cart = [];
    let currentUserId = null;

    // --- STEP 1: AUTH INITIALIZATION (FINAL STABILIZED) ---
    function applyStep1UI(isLoggedIn, userEmail = '') {
        const step1 = document.getElementById('step-1');
        if (!step1) return;

        console.log('Applying Step 1 UI:', isLoggedIn ? 'Logged-In' : 'Guest');

        if (isLoggedIn) {
            step1.classList.remove('auth-guest');
            step1.classList.add('auth-loggedin');
            if (loggedInEmailDisplay) loggedInEmailDisplay.textContent = userEmail;
            if (guestEmailInput) guestEmailInput.value = userEmail;
            if (guestContinueBtn) guestContinueBtn.disabled = false;
        } else {
            step1.classList.remove('auth-loggedin');
            step1.classList.add('auth-guest');
            validateGuestEmailInput();
        }
    }

    function validateGuestEmailInput() {
        if (!guestEmailInput || !guestContinueBtn) return;
        const email = guestEmailInput.value.trim();
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        guestContinueBtn.disabled = !isValid;
    }

    // Auth Engine (Improved with Reactive Listener)
    async function solveAuth() {
        if (!window.supabase) { applyStep1UI(false); return; }

        // A. Immediate Check
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session?.user) {
                currentUserId = session.user.id;
                applyStep1UI(true, session.user.email);
            } else {
                currentUserId = null;
                applyStep1UI(false);
            }
        } catch (e) {
            console.error('Initial Auth check failed:', e);
            currentUserId = null;
            applyStep1UI(false);
        }

        // B. Reactive Listener (Synchronizes with the Account Status Link/Floater)
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Checkout Auth Event:', event);
            if (session?.user) {
                currentUserId = session.user.id;
                applyStep1UI(true, session.user.email);
            } else {
                currentUserId = null;
                applyStep1UI(false);
            }
        });
    }

    // Initialize Auth Immediately
    solveAuth();
    setTimeout(solveAuth, 1000); // 1s fallback
    setTimeout(solveAuth, 3000); // 3s fallback

    // Attach Listeners
    if (guestEmailInput) {
        guestEmailInput.addEventListener('input', validateGuestEmailInput);
        guestEmailInput.addEventListener('blur', async () => {
            const email = guestEmailInput.value.trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showInlineError(guestEmailInput, "Please enter a valid email address");
            } else {
                clearInlineError(guestEmailInput);
            }
        });
    }

    window.validateContact = function () {
        if (!guestContinueBtn) return;

        // 1. Check if user is logged in via CSS class
        const step1 = document.getElementById('step-1');
        const isLoggedIn = step1?.classList.contains('auth-loggedin');

        if (isLoggedIn) {
            console.log('Navigating: Logged-in path');
            window.nextStep(2);
            return;
        }

        // 2. Guest Validation path
        if (!guestEmailInput) return;
        const email = guestEmailInput.value.trim();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            console.log('Navigating: Guest path');
            window.nextStep(2);
        } else {
            showInlineError(guestEmailInput, "Please enter a valid email address");
        }
    };

    // FIX #4 (from prev): recoverCart runs immediately so cart
    // is populated before any renderSummary() call below
    function recoverCart() {
        console.log('--- Order Reception Engine (Triple-Lock) ---');
        try {
            const sessionData = sessionStorage.getItem('nubie_cart_session');
            const handoffData = localStorage.getItem('nubie_cart_handoff');
            const primaryData = localStorage.getItem('nubie_cart');
            const source = sessionData || handoffData || primaryData;
            if (source) {
                cart = JSON.parse(source) || [];
                console.log('Recovery successful:', cart.length, 'items');
            } else {
                console.warn('No cart data found in any storage source.');
            }
            renderSummary();
        } catch (e) {
            console.error('Deep Recovery failed:', e);
            renderSummary();
        }
    }
    recoverCart(); // ← runs immediately

    // ─── CLOUD SYNC (background, additive only) ───────────────
    async function syncCartWithSupabase() {
        if (!window.supabase) return;
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session) return;
            const { data: cloudItems, error } = await window.supabase
                .from('cart_items').select('*').eq('user_id', session.user.id);
            if (error) throw error;
            if (cloudItems && cloudItems.length > 0) {
                const cloudCart = cloudItems.map(item => ({
                    id: item.product_id, title: item.title, image: item.image,
                    price: item.price, size: item.size, quantity: item.quantity
                }));
                let merged = false;
                cloudCart.forEach(cItem => {
                    const localMatch = cart.find(l => l.id === cItem.id && l.size === cItem.size);
                    if (!localMatch) { cart.push(cItem); merged = true; }
                });
                if (merged) { console.log('Background merge complete.'); renderSummary(); }
            }
        } catch (e) { console.error('Background sync failed:', e); }
    }
    setTimeout(syncCartWithSupabase, 500); // FIX #3 (prev): only called once

    // ─── PROMO CODES ─────────────────────────────────────────
    const PROMO_CODES = {
        "NUBIE10": { type: "percent", value: 10, label: "NUBIE10 (-10%)" },
        "WELCOME50": { type: "fixed", value: 50, label: "WELCOME50 (-฿50)" },
        "FREESHIP": { type: "fixed", value: 0, label: "FREESHIP (Always Free)" },
        "SAVE10": { type: "percent", value: 10, label: "SAVE10 (-10%)" },
        "FLAT200": { type: "fixed", value: 200, label: "FLAT200 (-฿200)" },
        "NUBIE15": { type: "percent", value: 15, label: "NUBIE15 (-15%)" },
        "WELCOME": { type: "percent", value: 5, label: "WELCOME (-5%)" },
        "SUMMER20": { type: "percent", value: 20, label: "SUMMER20 (-20%)" }
    };
    const GIFT_CARDS = {
        "GIFT500": 500,
        "GIFT1000": 1000,
        "LUCKY250": 250
    };

    // Gift claim code pattern: GIFT-MINI-XXXXXX
    function isReferralGiftCode(code) {
        return /^GIFT-MINI-[A-Z0-9]{6}$/.test(code);
    }

    let activePromo = null;
    let activeGift = null;

    // ─── FIX #2: renderSummary — correct subtotal & total ────
    // Root cause was that discountAmount was calculated but
    // finalTotal was sometimes recalculated without the promo,
    // and toLocaleString() was called on undefined when items
    // were missing price. Now every field is guarded.
    function renderSummary() {
        const sItems = document.getElementById('summary-items');
        if (!sItems) return;
        sItems.innerHTML = '';

        let subtotal = 0;
        let totalCount = 0;

        cart.forEach(item => {
            const rawPrice = String(item.price || "0").replace(/[^\d.]/g, '');
            const price = parseFloat(rawPrice) || 0;
            const qty = Number(item.quantity) || 1;
            const itemTotal = price * qty;

            subtotal += itemTotal;
            totalCount += qty;

            const priceLabel = price === 0 ? "Free" : `฿${itemTotal.toLocaleString('th-TH')}`;
            const isSample = item.size === "2 ml" || (item.title && item.title.toLowerCase().includes("sample"));

            const itemEl = document.createElement('div');
            itemEl.className = 'summary-item';
            itemEl.innerHTML = `
                <div class="summary-item-img">
                    <img src="${item.image || ''}" alt="${item.title || ''}">
                </div>
                <div class="summary-item-details">
                    <div class="summary-item-main">
                        <div class="summary-item-info">
                            <span class="summary-item-category">Eau de parfum</span>
                            <h4 class="summary-item-title">${item.title || ''}</h4>
                            <div class="summary-item-meta-group">
                                <p class="summary-item-meta">Size: ${item.size || '—'}</p>
                                ${isSample ? '<p class="summary-item-meta">Sample</p>' : ''}
                                <p class="summary-item-meta">Qty: ${qty}</p>
                            </div>
                        </div>
                        <span class="summary-item-price">${priceLabel}</span>
                    </div>
                </div>`;
            sItems.appendChild(itemEl);
        });

        // Calculations
        let discountAmount = 0;
        if (activePromo) {
            if (activePromo.type === 'percent') {
                discountAmount = Math.round(subtotal * activePromo.value / 100);
            } else if (activePromo.type === 'fixed') {
                discountAmount = Math.min(activePromo.value, subtotal);
            }
        }
        const afterPromo = subtotal - discountAmount;
        let giftAmount = 0;
        if (activeGift) {
            giftAmount = Math.min(activeGift.value, afterPromo);
        }
        const finalTotal = afterPromo - giftAmount;

        // HIGH PRIORITY DOM UPDATES
        const subtotalSpan = document.getElementById('summary-subtotal');
        const totalSpan = document.getElementById('summary-total');
        const discountRow = document.getElementById('summary-discount-row');
        const discountLabel = document.getElementById('summary-discount-label');
        const discountValue = document.getElementById('summary-discount-value');
        const giftRow = document.getElementById('summary-giftcard-row');
        const giftLabel = document.getElementById('summary-giftcard-label');
        const giftValue = document.getElementById('summary-giftcard-value');
        const countSpans = document.querySelectorAll('.cart-count');

        if (subtotalSpan) subtotalSpan.textContent = `฿${subtotal.toLocaleString('th-TH')}`;
        if (totalSpan) totalSpan.textContent = `฿${finalTotal.toLocaleString('th-TH')}`;
        countSpans.forEach(el => el.textContent = totalCount);

        if (discountRow) {
            if (activePromo && discountAmount > 0) {
                discountRow.style.display = 'flex';
                if (discountLabel) discountLabel.textContent = activePromo.label;
                if (discountValue) discountValue.textContent = `- ฿${discountAmount.toLocaleString('th-TH')}`;
            } else {
                discountRow.style.display = 'none';
            }
        }

        if (giftRow) {
            if (activeGift && giftAmount > 0) {
                giftRow.style.display = 'flex';
                if (giftLabel) giftLabel.textContent = `Gift card (${activeGift.code})`;
                if (giftValue) giftValue.textContent = `- ฿${giftAmount.toLocaleString('th-TH')}`;
            } else {
                giftRow.style.display = 'none';
            }
        }

        console.log(`[Summary Sync] Items: ${totalCount}, Subtotal: ${subtotal}, Total: ${finalTotal}`);
    }

    // ─── FIX #3: Promo- [x] Implement robust Step 1 UI toggling (Guest vs Logged-In)
    // - [x] Fix real-time email validation for "Continue" button
    // - [x] Implement staggered auth checks (0s, 1s, 3s) for maximum reliability
    // - [x] Direct DOM manipulation to ensure state visibility

    // returned early without re-rendering. Now fully separated.
    const promoInput = document.getElementById('promo-code-input');
    const applyPromoBtn = document.getElementById('apply-promo-btn');

    window.applyPromoCode = async function () {
        const pInput = document.getElementById('promo-code-input');
        const pBtn = document.getElementById('apply-promo-btn');
        if (!pInput || !pBtn) return;

        const parentField = pInput.closest('.promo-input-field');

        // ── REMOVE PROMO (Unseal) ──
        if (activePromo) {
            activePromo = null;
            pInput.value = '';
            pInput.disabled = false;
            pBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            pBtn.classList.remove('is-remove');
            if (parentField) {
                parentField.classList.remove('promo-success');
                parentField.classList.remove('promo-sealed');
            }
            renderSummary();
            return;
        }

        // ── APPLY PROMO (Seal) ──
        const code = pInput.value.trim().toUpperCase();

        // Check static promo codes first
        if (PROMO_CODES[code]) {
            activePromo = { ...PROMO_CODES[code], code: code };
            pInput.disabled = true;
            pBtn.innerHTML = '<i class="fas fa-times"></i>';
            pBtn.classList.add('is-remove');
            if (parentField) {
                parentField.classList.add('promo-success');
                parentField.classList.add('promo-sealed');
                parentField.classList.remove('promo-error');
            }
            renderSummary();
            console.log('Promo code applied successfully:', code);
        }
        else {
            // Invalid code feedback
            if (parentField) {
                parentField.classList.add('promo-error');
                setTimeout(() => parentField.classList.remove('promo-error'), 400);
            }
        }
    }
    window.applyPromo = window.applyPromoCode;

    // Validate referral code against Supabase
    async function validateReferralCode(code) {
        try {
            if (!window.supabase) return { valid: true }; // If no supabase, accept pattern

            const { data, error } = await window.supabase.rpc('validate_reward_code', { p_code: code });

            if (error || !data) return { valid: false };
            if (data.valid === false) return { valid: false };

            return { valid: true, rewardId: data.rewardId };
        } catch (e) {
            console.warn('Referral validation error:', e);
            return { valid: true }; // Fail open for UX
        }
    }

    window.applyGift = function () {
        const gInput = document.getElementById('gift-card-input');
        const gBtn = document.getElementById('apply-gift-card-btn');
        if (!gInput || !gBtn) return;

        const parentField = gInput.closest('.promo-input-field');

        // ── REMOVE GIFT ──
        if (activeGift) {
            activeGift = null;
            gInput.value = '';
            gInput.disabled = false;
            gBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            gBtn.classList.remove('is-remove');
            if (parentField) {
                parentField.classList.remove('promo-success');
            }
            renderSummary();
            return;
        }

        // ── APPLY GIFT ──
        const code = gInput.value.trim().toUpperCase();
        if (GIFT_CARDS[code]) {
            activeGift = { code, value: GIFT_CARDS[code] };
            gInput.disabled = true;
            gBtn.innerHTML = '<i class="fas fa-times"></i>';
            gBtn.classList.add('is-remove');
            if (parentField) {
                parentField.classList.add('promo-success');
                parentField.classList.remove('promo-error');
            }
            renderSummary();
            console.log('Gift card applied successfully:', code);
        }
        // Check referral gift codes (GIFT-MINI-XXXXXX)
        else if (isReferralGiftCode(code)) {
            const giftType = 'Mini Gift Set';
            activeGift = { code, value: 0, isReferralGift: true, giftType };
            gInput.disabled = true;
            gBtn.innerHTML = '<i class="fas fa-times"></i>';
            gBtn.classList.add('is-remove');
            if (parentField) {
                parentField.classList.add('promo-success');
                parentField.classList.remove('promo-error');
            }
            // Show a note about the gift
            const noteEl = parentField?.querySelector('.gift-claim-note');
            if (!noteEl) {
                const note = document.createElement('div');
                note.className = 'gift-claim-note';
                note.style.cssText = 'font-size: 11px; color: #D9291C; margin-top: 8px; letter-spacing: 0.5px;';
                note.textContent = `✓ ${giftType} will be included with this order`;
                parentField?.appendChild(note);
            }
            renderSummary();
            console.log('Referral gift claimed:', code, giftType);
        }
        else {
            if (parentField) {
                parentField.classList.add('promo-error');
                setTimeout(() => parentField.classList.remove('promo-error'), 400);
            }
        }
    }

    if (promoInput) promoInput.addEventListener('keydown', e => { if (e.key === 'Enter') window.applyPromoCode(); });
    if (applyPromoBtn) applyPromoBtn.addEventListener('click', window.applyPromoCode);

    // ─── CARD FORMATTING ENGINE ───────────────────────────────
    try {
        document.addEventListener('input', (e) => {
            const target = e.target;
            if (!target) return;

            if (target.id === 'card-number') {
                let value = target.value.replace(/\D/g, '').slice(0, 16);
                const brandImg = document.getElementById('brand-logo-img');
                const defaultIcon = document.getElementById('default-card-icon');
                let logoSrc = '', recognized = false;

                if (value.startsWith('4')) {
                    logoSrc = 'https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/images/visa-brandmark-blue-1960x622.png';
                    recognized = true;
                } else if (/^5[1-5]/.test(value) || /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(value)) {
                    logoSrc = 'https://www.mastercard.com/brandcenter/us/en/brand-requirements/_jcr_content/root/container/container_1578756628/container/container/teaser4_copy.coreimg.png/1751029674404/ma-bc-mastercard-logo-eq.png';
                    recognized = true;
                } else if (/^35/.test(value)) {
                    logoSrc = 'https://www.jcbusa.com/JCB-logos/EmblemColor.png';
                    recognized = true;
                }

                if (brandImg && defaultIcon) {
                    if (recognized) {
                        brandImg.src = logoSrc;
                        brandImg.style.display = 'block';
                        defaultIcon.style.display = 'none';
                    } else {
                        brandImg.src = '';
                        brandImg.style.display = 'none';
                        defaultIcon.style.display = 'block';
                    }
                }

                let formatted = '';
                for (let i = 0; i < value.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' - ';
                    formatted += value[i];
                }
                target.value = formatted;
            }

            if (target.id === 'card-expiry') {
                let val = target.value.replace(/\D/g, '').slice(0, 4);
                if (val.length >= 1 && !/^[01]/.test(val[0])) val = '';
                if (val.length >= 2) {
                    const month = parseInt(val.slice(0, 2));
                    if (month === 0 || month > 12) val = val[0];
                }
                let fmt = val.slice(0, 2);
                if (val.length > 2) fmt += ' / ' + val.slice(2);
                target.value = fmt;
            }

            if (target.id === 'card-cvc') {
                target.value = target.value.replace(/\D/g, '').slice(0, 3);
            }

            if (target.id === 'truemoney-phone') {
                let v = target.value.replace(/\D/g, '').slice(0, 10);
                let f = '';
                if (v.length > 0) {
                    f = v.slice(0, 3);
                    if (v.length > 3) f += ' ' + v.slice(3, 6);
                    if (v.length > 6) f += ' ' + v.slice(6);
                }
                target.value = f;
            }
        });
        console.log('Formatting engine attached.');
    } catch (e) { console.error('Initialization Error (Engine):', e.message); }

    // ─── (STEP NAVIGATION MOVED TO TOP) ─────────────────────

    // ─── (AUTH LOGIC MOVED TO TOP) ──────────────────────────

    // ─── GIFT MESSAGE ─────────────────────────────────────────
    try {
        const giftToggle = document.getElementById('toggle-gift-message');
        const giftContainer = document.getElementById('gift-message-container');
        const giftInput = document.getElementById('gift-message-input');
        const charCount = document.getElementById('char-count');

        if (giftToggle && giftContainer) {
            giftToggle.addEventListener('change', () => {
                giftContainer.style.display = giftToggle.checked ? 'block' : 'none';
            });
        }

        if (giftInput && charCount) {
            giftInput.addEventListener('input', () => {
                const remaining = 200 - giftInput.value.length;
                charCount.textContent = `${remaining} Characters left`;
            });
        }

        console.log('Gift logic initialized.');
    } catch (e) { console.error('Initialization Error (Gift):', e.message); }

    // ─── SHIPPING FORM ────────────────────────────────────────
    try {
        const shippingForm = document.getElementById('shipping-form');
        const shippingBtn = document.getElementById('shipping-continue-btn');
        const shippingCountry = document.getElementById('shipping-country');
        const shippingPrefix = document.getElementById('shipping-phone-prefix');
        const cityText = document.getElementById('shipping-city-text');
        const citySelect = document.getElementById('shipping-city-select');

        // (Provinces are now directly in the HTML for reliability)

        function updateCityUI() {
            const countryEl = document.getElementById('shipping-country');
            const cityTextEl = document.getElementById('shipping-city-text');
            const citySelectEl = document.getElementById('shipping-city-select');

            if (!countryEl || !cityTextEl || !citySelectEl) return;

            const rawVal = countryEl.value || "";
            const isTH = rawVal.trim().toLowerCase() === "thailand";

            console.log('Final City Refresh. Country:', rawVal, 'isTH:', isTH);

            // Toggle Visibility
            cityTextEl.style.display = isTH ? 'none' : 'block';
            citySelectEl.style.display = isTH ? 'block' : 'none';

            // Clear unused value to prevent validation confusion
            if (isTH) {
                cityTextEl.value = '';
            } else {
                citySelectEl.selectedIndex = 0;
            }

            // Toggle Required
            cityTextEl.required = !isTH;
            citySelectEl.required = isTH;

            updateShippingBtnState();
        }

        function updateShippingBtnState() {
            if (!shippingForm || !shippingBtn) return;
            const requiredInputs = Array.from(
                shippingForm.querySelectorAll('input[required], select[required]')
            ).filter(el => {
                const s = window.getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden' && el.type !== 'hidden';
            });

            const allFilled = requiredInputs.every(input => input.value.trim().length > 0);
            const phoneInput = document.getElementById('shipping-phone-number');
            const phoneValue = phoneInput ? phoneInput.value.replace(/[\s\-\(\)]/g, '') : '';
            const isPhoneValid = /^\d+$/.test(phoneValue) && phoneValue.length >= 8;

            shippingBtn.disabled = !(allFilled && isPhoneValid);
        }

        function setupPhonePrefixes() {
            document.querySelectorAll('.phone-prefix-select').forEach(select => {
                Array.from(select.options).forEach(opt => { opt.dataset.fullText = opt.textContent; });

                const truncateSelected = () => {
                    const selected = select.options[select.selectedIndex];
                    if (selected) {
                        Array.from(select.options).forEach(opt => { opt.textContent = opt.dataset.fullText; });
                        selected.textContent = selected.value;
                    }
                };
                const restoreAll = () => {
                    Array.from(select.options).forEach(opt => { opt.textContent = opt.dataset.fullText; });
                };

                select.addEventListener('focus', restoreAll);
                select.addEventListener('mousedown', restoreAll);
                select.addEventListener('change', () => { truncateSelected(); select.blur(); });
                select.addEventListener('blur', truncateSelected);
                truncateSelected();
            });
        }

        if (shippingForm && shippingBtn) {
            shippingForm.addEventListener('input', updateShippingBtnState);
            shippingForm.addEventListener('change', updateShippingBtnState);

            if (shippingCountry) {
                shippingCountry.addEventListener('change', () => {
                    if (shippingPrefix) {
                        const country = shippingCountry.value;
                        const match = Array.from(shippingPrefix.options)
                            .find(opt => opt.dataset.fullText && opt.dataset.fullText.startsWith(country));
                        if (match) {
                            shippingPrefix.value = match.value;
                            shippingPrefix.dispatchEvent(new Event('change'));
                        }
                    }
                    updateCityUI();
                });
            }

            setupPhonePrefixes();
            updateCityUI();
        }

        console.log('Shipping logic initialized.');
    } catch (e) { console.error('Initialization Error (Shipping):', e.message); }

    // ─── PAYMENT & OMISE ─────────────────────────────────────
    try {
        if (typeof Omise !== 'undefined') {
            Omise.setPublicKey("pkey_test_64wfd7sz1lte7xuw8ay");
        }

        // FIX #5 (prev): guard against missing supabaseUrl
        const SUPABASE_FUNCTION_URL = window.supabaseUrl
            ? `${window.supabaseUrl}/functions/v1/omise-charge`
            : (() => { console.warn('window.supabaseUrl not set — payment endpoint unavailable.'); return ''; })();

        const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
        const cardForm = document.getElementById('card-details-form');
        const truemoneyPhoneArea = document.getElementById('truemoney-phone-area');
        const promptpayQRArea = document.getElementById('promptpay-qr-area');

        function updatePaymentUI() {
            const selected = document.querySelector('input[name="payment_method"]:checked')?.value;
            if (cardForm) cardForm.style.display = selected === 'card' ? 'block' : 'none';
            if (truemoneyPhoneArea) truemoneyPhoneArea.style.display = selected === 'truemoney' ? 'block' : 'none';
            if (promptpayQRArea && selected !== 'promptpay') {
                promptpayQRArea.style.display = 'none';
                clearPromptPayTimer();
            }
            const errorEl = document.getElementById('payment-error');
            if (errorEl) errorEl.style.display = 'none';
        }
        window.switchPayment = updatePaymentUI;

        paymentRadios.forEach(r => r.addEventListener('change', updatePaymentUI));
        if (paymentRadios.length > 0) { updatePaymentUI(); console.log('Payment UI initialized.'); }

        // Luhn
        function isValidLuhn(number) {
            let sum = 0, shouldDouble = false;
            for (let i = number.length - 1; i >= 0; i--) {
                let digit = parseInt(number.charAt(i));
                if (shouldDouble && (digit *= 2) > 9) digit -= 9;
                sum += digit;
                shouldDouble = !shouldDouble;
            }
            return (sum % 10) === 0;
        }

        function getTotalInSatangs() {
            let subtotal = 0;
            cart.forEach(item => { subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 1); });
            let discount = 0;
            if (activePromo) {
                discount = activePromo.type === 'percent'
                    ? Math.round(subtotal * activePromo.value / 100)
                    : Math.min(activePromo.value, subtotal);
            }
            return Math.round((subtotal - discount) * 100);
        }
        function getTotalInBaht() { return getTotalInSatangs() / 100; }

        function showPaymentOverlay(text) {
            const overlay = document.getElementById('payment-overlay');
            const overlayText = document.getElementById('payment-overlay-text');
            if (overlay) overlay.style.display = 'flex';
            if (overlayText) overlayText.textContent = text || 'Processing your payment...';
        }
        function hidePaymentOverlay() {
            const overlay = document.getElementById('payment-overlay');
            if (overlay) overlay.style.display = 'none';
        }
        function showPaymentError(msg) {
            const el = document.getElementById('payment-error');
            if (el) {
                el.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${msg}</span>`;
                el.style.cssText = 'display:flex; align-items:center; gap:8px;';
            }
        }
        function hidePaymentError() {
            const el = document.getElementById('payment-error');
            if (el) el.style.display = 'none';
        }
        function getUserEmail() {
            if (loggedInEmailDisplay && loggedInEmailDisplay.textContent.trim())
                return loggedInEmailDisplay.textContent.trim();
            if (guestEmailInput && guestEmailInput.value.trim())
                return guestEmailInput.value.trim();
            return '';
        }

        let promptPayTimerInterval = null;
        function clearPromptPayTimer() {
            if (promptPayTimerInterval) { clearInterval(promptPayTimerInterval); promptPayTimerInterval = null; }
        }
        function startPromptPayCountdown(seconds) {
            const countdownEl = document.getElementById('promptpay-countdown');
            const timerContainer = countdownEl?.parentElement;
            if (!countdownEl) return;
            clearPromptPayTimer();
            let remaining = seconds;
            function updateDisplay() {
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                countdownEl.textContent = `Expires in ${mins}:${secs.toString().padStart(2, '0')}`;
                if (remaining <= 120 && timerContainer) timerContainer.classList.add('expiring');
                if (remaining <= 0) {
                    clearPromptPayTimer();
                    countdownEl.textContent = 'QR code expired';
                    if (timerContainer) timerContainer.classList.add('expiring');
                }
            }
            updateDisplay();
            promptPayTimerInterval = setInterval(() => { remaining--; updateDisplay(); }, 1000);
        }

        async function createCharge(payload) {
            if (!SUPABASE_FUNCTION_URL) throw new Error('Payment endpoint not configured.');
            // Get user session token for Edge Function auth, fall back to anon key
            let authToken = window.supabaseKey || '';
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session?.access_token) authToken = session.access_token;
            } catch (e) { /* guest checkout — use anon key */ }
            const response = await fetch(SUPABASE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'apikey': window.supabaseKey || ''
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Payment failed');
            return data;
        }

        function completeOrder(chargeData, paymentMethod) {
            const orderData = {
                orderId: chargeData.id
                    ? chargeData.id.replace('chrg_', '').slice(0, 12).toUpperCase()
                    : 'N-' + Date.now().toString(36).toUpperCase(),
                paymentMethod,
                email: getUserEmail(),
                total: getTotalInBaht(),
                chargeId: chargeData.id,
                status: chargeData.status,
            };
            localStorage.setItem('nubie_last_order', JSON.stringify(orderData));
            window.location.href = 'order-confirmation.html';
        }

        async function handleCardPayment() {
            const cardNum = document.getElementById('card-number');
            const cardExp = document.getElementById('card-expiry');
            const cardCvc = document.getElementById('card-cvc');
            const cardName = document.getElementById('card-name');
            const rawNumber = cardNum ? cardNum.value.replace(/\D/g, '') : '';
            const rawExpiry = cardExp ? cardExp.value.replace(/\D/g, '') : '';
            const rawCvc = cardCvc ? cardCvc.value.trim() : '';
            const name = cardName ? cardName.value.trim() : '';
            if (rawNumber.length < 15 || !isValidLuhn(rawNumber)) {
                showPaymentError('Please enter a valid card number.');
                if (cardNum) showInlineError(cardNum, "Invalid card number");
                return;
            }
            if (rawExpiry.length < 4) { showPaymentError('Please enter a valid expiry date.'); return; }
            if (rawCvc.length < 3) { showPaymentError('Please enter a valid security code.'); return; }
            if (!name) { showPaymentError('Please enter the cardholder name.'); return; }
            hidePaymentError();
            showPaymentOverlay('Processing your card payment...');
            const month = parseInt(rawExpiry.slice(0, 2));
            const year = parseInt('20' + rawExpiry.slice(2, 4));
            return new Promise((resolve, reject) => {
                Omise.createToken("card", {
                    name, number: rawNumber,
                    expiration_month: month, expiration_year: year, security_code: rawCvc,
                }, async (statusCode, response) => {
                    if (statusCode !== 200 || response.object === 'error') {
                        hidePaymentOverlay();
                        showPaymentError(response.message || 'Card tokenization failed.');
                        reject(response); return;
                    }
                    try {
                        const chargeData = await createCharge({
                            token: response.id, amount: getTotalInSatangs(), currency: 'THB',
                            items: cart, userEmail: getUserEmail(),
                            description: `NUBIE Order - ${getUserEmail()}`,
                            userId: currentUserId,
                            appliedPromo: activePromo ? activePromo.code : null,
                            appliedGift: activeGift ? activeGift.code : null,
                        });
                        hidePaymentOverlay();
                        if (chargeData.status === 'successful' || chargeData.paid) {
                            completeOrder(chargeData, 'card');
                        } else if (chargeData.status === 'failed') {
                            showPaymentError('Payment was declined. Please try a different card.');
                        } else {
                            chargeData.authorize_uri
                                ? (window.location.href = chargeData.authorize_uri)
                                : completeOrder(chargeData, 'card');
                        }
                        resolve(chargeData);
                    } catch (err) {
                        hidePaymentOverlay();
                        showPaymentError(err.message || 'Payment failed. Please try again.');
                        reject(err);
                    }
                });
            });
        }

        async function handlePromptPayPayment() {
            hidePaymentError();
            showPaymentOverlay('Creating PromptPay QR code...');
            const amountInSatangs = getTotalInSatangs();
            return new Promise((resolve, reject) => {
                Omise.createSource("promptpay", { amount: amountInSatangs, currency: "THB" },
                    async (statusCode, response) => {
                        if (statusCode !== 200 || response.object === 'error') {
                            hidePaymentOverlay();
                            showPaymentError(response.message || 'Failed to create PromptPay source.');
                            reject(response); return;
                        }
                        try {
                            const chargeData = await createCharge({
                                source: response.id, amount: amountInSatangs, currency: 'THB',
                                items: cart, userEmail: getUserEmail(),
                                description: `NUBIE Order - ${getUserEmail()} (PromptPay)`,
                                return_uri: window.location.origin + '/order-confirmation.html',
                                userId: currentUserId,
                                appliedPromo: activePromo ? activePromo.code : null,
                                appliedGift: activeGift ? activeGift.code : null,
                            });
                            hidePaymentOverlay();
                            const qrArea = document.getElementById('promptpay-qr-area');
                            const qrImage = document.getElementById('promptpay-qr-image');
                            if (qrArea && qrImage) {
                                const qrUrl = chargeData.source?.scannable_code?.image?.download_uri
                                    || response.scannable_code?.image?.download_uri || '';
                                qrImage.src = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${chargeData.id}`;
                                qrArea.style.display = 'block';
                                startPromptPayCountdown(900);
                                if (placeOrderBtn) placeOrderBtn.style.display = 'none';
                                localStorage.setItem('nubie_last_order', JSON.stringify({
                                    orderId: chargeData.id
                                        ? chargeData.id.replace('chrg_', '').slice(0, 12).toUpperCase()
                                        : 'N-' + Date.now().toString(36).toUpperCase(),
                                    paymentMethod: 'promptpay', email: getUserEmail(),
                                    total: getTotalInBaht(), chargeId: chargeData.id, status: 'pending',
                                }));
                            }
                            resolve(chargeData);
                        } catch (err) {
                            hidePaymentOverlay();
                            showPaymentError(err.message || 'Failed to create PromptPay charge.');
                            reject(err);
                        }
                    });
            });
        }

        async function handleTrueMoneyPayment() {
            const phoneInput = document.getElementById('truemoney-phone');
            const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
            if (phone.length < 10) {
                showPaymentError('Please enter a valid 10-digit TrueMoney phone number.');
                const parentBox = phoneInput?.closest('.phone-box');
                if (parentBox) parentBox.classList.add('input-error');
                return;
            }
            hidePaymentError();
            showPaymentOverlay('Connecting to TrueMoney...');
            const amountInSatangs = getTotalInSatangs();
            return new Promise((resolve, reject) => {
                Omise.createSource("truemoney", { amount: amountInSatangs, currency: "THB", phone_number: phone },
                    async (statusCode, response) => {
                        if (statusCode !== 200 || response.object === 'error') {
                            hidePaymentOverlay();
                            showPaymentError(response.message || 'Failed to create TrueMoney source.');
                            reject(response); return;
                        }
                        try {
                            const chargeData = await createCharge({
                                source: response.id, amount: amountInSatangs, currency: 'THB',
                                items: cart, userEmail: getUserEmail(),
                                description: `NUBIE Order - ${getUserEmail()} (TrueMoney)`,
                                return_uri: window.location.origin + '/order-confirmation.html',
                                userId: currentUserId,
                                appliedPromo: activePromo ? activePromo.code : null,
                                appliedGift: activeGift ? activeGift.code : null,
                            });
                            hidePaymentOverlay();
                            localStorage.setItem('nubie_last_order', JSON.stringify({
                                orderId: chargeData.id
                                    ? chargeData.id.replace('chrg_', '').slice(0, 12).toUpperCase()
                                    : 'N-' + Date.now().toString(36).toUpperCase(),
                                paymentMethod: 'truemoney', email: getUserEmail(),
                                total: getTotalInBaht(), chargeId: chargeData.id, status: 'pending',
                            }));
                            chargeData.authorize_uri
                                ? (window.location.href = chargeData.authorize_uri)
                                : completeOrder(chargeData, 'truemoney');
                            resolve(chargeData);
                        } catch (err) {
                            hidePaymentOverlay();
                            showPaymentError(err.message || 'Failed to create TrueMoney charge.');
                            reject(err);
                        }
                    });
            });
        }

        // ─── PLACE ORDER BUTTON ───────────────────────────────
        async function initiatePlaceOrder() {
            hidePaymentError();
            if (cart.length === 0) { showPaymentError('Your cart is empty.'); return; }
            const selectedMethod = document.querySelector('input[name="payment_method"]:checked')?.value;
            if (!selectedMethod) { showPaymentError('Please select a payment method.'); return; }

            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Processing...';
            try {
                switch (selectedMethod) {
                    case 'card': await handleCardPayment(); break;
                    case 'promptpay': await handlePromptPayPayment(); break;
                    case 'truemoney': await handleTrueMoneyPayment(); break;
                    default: showPaymentError('Invalid payment method.');
                }
            } catch (err) {
                console.error('[Payment Error]', err);
                showPaymentError('Payment Error: ' + err.message);
            } finally {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place order';
            }
        }
        window.placeOrder = initiatePlaceOrder;

        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await initiatePlaceOrder();
            });
            console.log('Place Order button listener attached.');
        } else {
            console.warn('Place Order button (#place-order-btn) not found!');
        }

    } catch (e) { console.error('Initialization Error (Payment):', e.message); }

    // ─── FINAL: SOLVE AUTH (MOVED TO TOP) ───────────────────
    console.log('Checkout initialization sequence complete.');
});