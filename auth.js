// Global Logout Function - Accessible from anywhere
async function logoutUser() {
    console.log("Global logout triggered...");

    // 1. UI Feedback
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.textContent = "Logging out...";
        logoutBtn.style.opacity = "0.5";
        logoutBtn.style.pointerEvents = "none";
    }

    try {
        const isSubDir = window.location.pathname.includes("/account/") || window.location.pathname.includes("/admin/");
        const loginPath = isSubDir ? "../login.html" : "login.html";

        if (window.supabase) {
            window.supabase.auth.signOut().catch(err => {
                console.error("Supabase signOut error (handled):", err);
            });
        }

        const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
        localStorage.removeItem(storageKey);
        localStorage.removeItem('nubie_cart');
        window.sessionStorage.clear(); 

        setTimeout(() => {
            window.location.replace(loginPath);
        }, 100);

    } catch (error) {
        console.error("Logout process error:", error);
        const isSubDir = window.location.pathname.includes("/account/") || window.location.pathname.includes("/admin/");
        window.location.replace(isSubDir ? "../login.html" : "login.html");
    }
}

// Helper functions for inline validation
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
    
    // Handle error application for phone box container
    const phoneBox = inputElement.closest(".phone-box");
    if (phoneBox) {
        phoneBox.parentNode.appendChild(alertDiv);
        phoneBox.classList.add("input-error");
    } else {
        inputElement.parentNode.appendChild(alertDiv);
        inputElement.classList.add("input-error");
    }
}

function clearInlineError(inputElement) {
    const phoneBox = inputElement.closest(".phone-box");
    if (phoneBox) {
        const existing = phoneBox.parentNode.querySelector(".inline-alert");
        if (existing) existing.remove();
        phoneBox.classList.remove("input-error");
    } else {
        const existing = inputElement.parentNode.querySelector(".inline-alert");
        if (existing) existing.remove();
        inputElement.classList.remove("input-error");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    let currentUserId = null; // Globally cache the ID to bypass getSession hangs

    // --- 1. Global Navbar Auth & Status Floater ---
    const userNavLink = document.getElementById("user-icon-link");
    const isSubDir = window.location.pathname.includes("/account/") || window.location.pathname.includes("/admin/");
    const initialLoginPath = isSubDir ? "../login.html" : "login.html";
    
    const floater = document.createElement("div");
    floater.id = "auth-status-floater";
    floater.innerHTML = `
        <a href="${initialLoginPath}">
            <div class="status-dot"></div>
            <span class="status-text">Account Off</span>
        </a>
    `;
    document.body.appendChild(floater);

    const statusDot = floater.querySelector(".status-dot");
    const statusText = floater.querySelector(".status-text");
    const floaterLink = floater.querySelector("a");

    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            const isSubDir = window.location.pathname.includes("/account/") || window.location.pathname.includes("/admin/");
            const accountPath = isSubDir ? (window.location.pathname.includes("/account/") ? "overview.html" : "../account/overview.html") : "account/overview.html";
            const loginPath = isSubDir ? "../login.html" : "login.html";

            if (session) {
                if (userNavLink) userNavLink.href = accountPath;
                floaterLink.href = accountPath;
                statusDot.classList.add("online");
                statusText.textContent = "Account On";

                // --- Sync Profile UI from Supabase ---
                const meta = session.user.user_metadata || {};
                
                // 1. Account Sidebar Overview
                const displayName = document.getElementById("display-name");
                const displayPhone = document.getElementById("display-phone");
                const displayEmail = document.getElementById("display-email");
                
                if (displayName) displayName.textContent = meta.first_name ? `${meta.first_name} ${meta.last_name || ''}` : session.user.email;
                if (displayPhone) displayPhone.textContent = meta.phone || "No phone added";
                if (displayEmail) displayEmail.textContent = session.user.email;

                // 2. Account Information Tab Forms
                const editFirstName = document.getElementById("edit-first-name");
                const editLastName = document.getElementById("edit-last-name");
                const editEmail = document.getElementById("edit-email");
                const editDob = document.getElementById("edit-dob");
                const editPhonePrefix = document.getElementById("edit-phone-prefix");
                const editPhoneNumber = document.getElementById("edit-phone-number");

                if (editFirstName) editFirstName.value = meta.first_name || '';
                if (editLastName) editLastName.value = meta.last_name || '';
                if (editEmail) editEmail.value = session.user.email || '';
                if (editDob) editDob.value = meta.dob || '';
                
                if (editPhonePrefix && editPhoneNumber && meta.phone) {
                    const phoneOptions = Array.from(editPhonePrefix.options).map(opt => opt.value);
                    // Match the longest prefix first to avoid matching "+1" when it's "+12" (if custom codes exist)
                    phoneOptions.sort((a,b) => b.length - a.length); 
                    const matchedPrefix = phoneOptions.find(p => meta.phone.startsWith(p));
                    if (matchedPrefix) {
                        editPhonePrefix.value = matchedPrefix;
                        editPhoneNumber.value = meta.phone.replace(matchedPrefix, "");
                    } else {
                        editPhoneNumber.value = meta.phone;
                    }
                }

            } else {
                if (userNavLink) userNavLink.href = loginPath;
                floaterLink.href = loginPath;
                statusDot.classList.remove("online");
                statusText.textContent = "Account Off";
                
                // If on account page and signed out, redirect
                if (document.querySelector(".account-container") && (event === 'SIGNED_OUT' || !session)) {
                    window.location.href = loginPath;
                }
            }
        });
    }

    // --- 2. Registration Handler ---
    const registerForm = document.querySelector("#register-form");
    if (registerForm) {
        // Password Visibility Toggle & Rules Logic
        const togglePassword = document.getElementById("toggle-password");
        const passwordInput = document.getElementById("password");
        const ruleLength = document.getElementById("rule-length");
        const ruleNumber = document.getElementById("rule-number");
        const ruleSpecial = document.getElementById("rule-special");

        function updateRule(el, isValid) {
            if (!el) return;
            const icon = el.querySelector(".rule-icon");
            if (isValid) {
                el.classList.remove("invalid");
                el.classList.add("valid");
                if (icon) icon.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                el.classList.remove("valid");
                el.classList.add("invalid");
                if (icon) icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            }
        }

        const emailInput = registerForm.querySelector("#email");
        const phoneInput = registerForm.querySelector("#phone-number");
        const dobInput = registerForm.querySelector("#dob");

        // DOB Auto-formatter
        if (dobInput) {
            dobInput.addEventListener("input", (e) => {
                let val = dobInput.value.replace(/\D/g, "");
                if (val.length > 2) val = val.slice(0,2) + "/" + val.slice(2);
                if (val.length > 5) val = val.slice(0,5) + "/" + val.slice(5,9);
                dobInput.value = val;
            });
        }

        // Email Validation
        if (emailInput) {
            emailInput.addEventListener("blur", () => {
                const val = emailInput.value;
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                if (val && !isValid) {
                    showInlineError(emailInput, "Please enter a valid email address");
                } else if (!val) {
                    showInlineError(emailInput, "Email is required");
                } else {
                    clearInlineError(emailInput);
                }
            });
        }

        // Phone Validation
        if (phoneInput) {
            phoneInput.addEventListener("blur", () => {
                const val = phoneInput.value;
                const isValid = /^\d+$/.test(val);
                if (val && !isValid) {
                    showInlineError(phoneInput, "Please enter a valid phone number (digits only)");
                } else if (!val) {
                    showInlineError(phoneInput, "Phone number is required");
                } else {
                    clearInlineError(phoneInput);
                }
            });
        }

        // Password Validation Rules
        if (passwordInput) {
            passwordInput.addEventListener("input", () => {
                const val = passwordInput.value;
                if (val.length === 0) {
                    [ruleLength, ruleNumber, ruleSpecial].forEach(el => {
                        if (el) {
                            el.classList.remove("invalid", "valid");
                            const icon = el.querySelector(".rule-icon");
                            if (icon) icon.innerHTML = "&mdash;";
                        }
                    });
                    return;
                }
                updateRule(ruleLength, val.length >= 8);
                updateRule(ruleNumber, /\d/.test(val));
                updateRule(ruleSpecial, /[!+,\-.\/:;<=>?@]/.test(val));
            });
        }

        // Password Toggle
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener("click", () => {
                const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
                passwordInput.setAttribute("type", type);
                togglePassword.classList.toggle("fa-eye");
                togglePassword.classList.toggle("fa-eye-slash");
            });
        }

        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const marketingConsent = document.getElementById("marketing")?.checked || false;

            // Capture referral code from localStorage (set by script.js on ?ref= pages)
            const referredByCode = localStorage.getItem('nubie_ref_code') || null;

            try {
                const { data: signUpData, error } = await supabase.auth.signUp({
                    email: formData.get("email"),
                    password: formData.get("password"),
                    options: {
                        data: {
                            prefix: formData.get("prefix"),
                            first_name: formData.get("first-name"),
                            last_name: formData.get("last-name"),
                            dob: formData.get("dob"),
                            phone: `${formData.get("phone-prefix")}${formData.get("phone-number")}`,
                            marketing_opt_in: marketingConsent,
                            referred_by: referredByCode
                        }
                    }
                });
                if (error) throw error;

                // If referred, save to profiles (the DB trigger will automatically create the referrals table row)
                if (referredByCode && signUpData?.user?.id) {
                    try {
                        // Update profile with referred_by code
                        await supabase
                            .from('profiles')
                            .update({ referred_by: referredByCode })
                            .eq('id', signUpData.user.id);

                        console.log('[Referral] Registered referred_by code on profile:', referredByCode);
                        
                        // Clear the stored referral code
                        localStorage.removeItem('nubie_ref_code');
                    } catch (refErr) {
                        console.warn('[Referral] Non-critical error saving referral:', refErr);
                    }
                }

                // Create default user preferences
                if (signUpData?.user?.id) {
                    try {
                        await supabase
                            .from('user_preferences')
                            .insert([{
                                id: signUpData.user.id,
                                pref_email: marketingConsent,
                                pref_phone: false,
                                pref_sms: false,
                                pref_im: false
                            }]);
                        console.log('[Preferences] Default preferences created on registration.');
                    } catch (prefErr) {
                        console.warn('[Preferences] Non-critical error saving default preferences:', prefErr);
                    }
                }

                alert("Account created successfully!");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Reg error:", error);
                alert(error.message);
            }
        });
    }

    // --- Dynamic Phone Prefix Display Logic ---
    const prefixSelects = document.querySelectorAll(".phone-prefix-select");
    prefixSelects.forEach(select => {
        Array.from(select.options).forEach(opt => {
            opt.dataset.fullText = opt.textContent;
        });

        const truncateSelected = () => {
            const selected = select.options[select.selectedIndex];
            if (selected) {
                Array.from(select.options).forEach(opt => {
                    opt.textContent = opt.dataset.fullText;
                });
                selected.textContent = selected.value;
            }
        };

        const restoreAll = () => {
            Array.from(select.options).forEach(opt => {
                opt.textContent = opt.dataset.fullText;
            });
        };

        select.addEventListener("focus", restoreAll);
        select.addEventListener("mousedown", restoreAll);
        select.addEventListener("change", () => {
            truncateSelected();
            select.blur();
        });
        select.addEventListener("blur", truncateSelected);
        truncateSelected();
    });

    const loginForm = document.querySelector("#login-form");
    if (loginForm) {
        const emailInput = loginForm.querySelector("#email");
        const passwordInput = loginForm.querySelector("#password");
        const togglePassword = loginForm.querySelector("#toggle-password");

        // Email Alert for Login
        if (emailInput) {
            emailInput.addEventListener("blur", () => {
                const val = emailInput.value;
                if (!val) {
                    showInlineError(emailInput, "Email is required");
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                    showInlineError(emailInput, "Please enter a valid email address");
                } else {
                    clearInlineError(emailInput);
                }
            });
        }

        // Password Toggle for Login
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener("click", () => {
                const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
                passwordInput.setAttribute("type", type);
                togglePassword.classList.toggle("fa-eye");
                togglePassword.classList.toggle("fa-eye-slash");
            });
        }

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.get("email"),
                    password: formData.get("password")
                });
                if (error) throw error;

                const isSubDir = window.location.pathname.includes("/account/") || window.location.pathname.includes("/admin/");
                window.location.href = isSubDir ? (window.location.pathname.includes("/account/") ? "overview.html" : "../account/overview.html") : "account/overview.html";
            } catch (error) {
                console.error("Login error:", error);
                const passInput = loginForm.querySelector("#password");
                showInlineError(passInput, error.message);
            }
        });
    }

    // --- 4. Account Page Handler ---
    const accountPage = document.querySelector(".account-container");
    if (accountPage) {
        const displayName = document.getElementById("display-name");
        const displayPhone = document.getElementById("display-phone");
        const displayEmail = document.getElementById("display-email");

        // Sync Profile Data
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session && session.user) {
                const user = session.user;
                currentUserId = user.id;
                if (displayEmail) displayEmail.textContent = user.email;
                
                // Try fetching from metadata first for speed
                const meta = user.user_metadata;
                if (displayName && meta) {
                    displayName.textContent = `${meta.first_name || ''} ${meta.last_name || ''}`.trim() || 'Valued Customer';
                }
                if (displayPhone && meta) {
                    displayPhone.textContent = meta.phone || "Phone not provided";
                }

                // Pre-fill profile form fields if on account page
                if (meta) {
                    const elPrefix = document.getElementById("edit-prefix");
                    if (elPrefix && meta.prefix) elPrefix.value = meta.prefix;
                    const elFirstName = document.getElementById("edit-first-name");
                    if (elFirstName && meta.first_name) elFirstName.value = meta.first_name;
                    const elLastName = document.getElementById("edit-last-name");
                    if (elLastName && meta.last_name) elLastName.value = meta.last_name;
                    const elDob = document.getElementById("edit-dob");
                    if (elDob && meta.dob) elDob.value = meta.dob;
                    const elPhonePrefix = document.getElementById("edit-phone-prefix");
                    if (elPhonePrefix && meta.phone_prefix) elPhonePrefix.value = meta.phone_prefix;
                    const elPhoneNum = document.getElementById("edit-phone-number");
                    if (elPhoneNum && meta.phone_number) elPhoneNum.value = meta.phone_number;
                }
                
                const elEmail = document.getElementById("edit-email");
                if (elEmail) elEmail.value = user.email;
                
                // Sync Preferences from custom Supabase table using native fetch
                try {
                    const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
                    const storedSession = localStorage.getItem(storageKey);
                    if (storedSession) {
                        const sd = JSON.parse(storedSession);
                        const tk = sd.access_token;
                        if (tk) {
                            const prefResponse = await fetch(
                                `https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_preferences?id=eq.${user.id}&select=*`, {
                                method: 'GET',
                                headers: {
                                    'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                                    'Authorization': `Bearer ${tk}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            if (prefResponse.ok) {
                                const prefArr = await prefResponse.json();
                                const prefData = prefArr.length > 0 ? prefArr[0] : null;
                                
                                // 1. Handle Checkboxes (on Stay in the Know page)
                                const prefCheckboxes = document.querySelectorAll("#stay-know input[type='checkbox']");
                                if (prefCheckboxes.length > 0) {
                                    prefCheckboxes.forEach(cb => {
                                        const colName = cb.id.replace(/-/g, '_');
                                        if (prefData && prefData[colName] !== undefined) {
                                            cb.checked = prefData[colName];
                                        } else {
                                            cb.checked = false; // Default for new users
                                        }
                                    });
                                    // Trigger sync for sidebar/UI
                                    prefCheckboxes.forEach(cb => cb.dispatchEvent(new Event('change')));
                                }

                                // 2. Handle Text List (on Overview page)
                                const overviewPrefList = document.querySelector(".preference-list");
                                if (overviewPrefList && prefCheckboxes.length === 0) {
                                    overviewPrefList.innerHTML = '';
                                    const mapping = {
                                        'pref_email': 'EMAIL',
                                        'pref_postal': 'POSTAL MAIL',
                                        'pref_phone': 'PHONE',
                                        'pref_samples': 'SAMPLES',
                                        'pref_sms': 'SMS / MMS',
                                        'pref_im': 'INSTANT MESSAGING'
                                    };
                                    
                                    let hasAny = false;
                                    Object.keys(mapping).forEach(col => {
                                        if (prefData && prefData[col]) {
                                            hasAny = true;
                                            const li = document.createElement("li");
                                            li.textContent = mapping[col];
                                            overviewPrefList.appendChild(li);
                                        }
                                    });

                                    if (!hasAny) {
                                        const li = document.createElement("li");
                                        li.textContent = "NO PREFERENCES SELECTED";
                                        li.style.color = "#999";
                                        overviewPrefList.appendChild(li);
                                    }
                                }
                            }
                        }
                    }
                } catch (prefErr) {
                    console.warn("[Preferences Load] Could not load preferences:", prefErr);
                }

                // Call the globally scoped function defined below
                if (window.fetchAndRenderAddresses) {
                    window.fetchAndRenderAddresses(user.id);
                }
            }
        });

        // Global Address Fetcher
        window.fetchAndRenderAddresses = async function(userId) {
            try {
                const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
                const storedSession = localStorage.getItem(storageKey);
                if (!storedSession) return;
                const sd = JSON.parse(storedSession);
                const tk = sd.access_token;
                if (!tk) return;

                const addrResponse = await fetch(
                    `https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_addresses?user_id=eq.${userId}&select=*`, {
                    method: 'GET',
                    headers: {
                        'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                        'Authorization': `Bearer ${tk}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (addrResponse.ok) {
                    const addrArr = await addrResponse.json();
                    const addrContainer = document.getElementById("address-list-container");
                    if (addrContainer) {
                        if (addrArr.length > 0) {
                            addrContainer.innerHTML = ''; // clear out 'no addresses saved'
                            addrArr.forEach(addr => {
                                const div = document.createElement("div");
                                div.style.border = "1px solid #eaeaea";
                                div.style.padding = "20px";
                                div.style.marginBottom = "20px";
                                div.style.fontSize = "13px";
                                div.style.color = "#333";
                                div.style.lineHeight = "1.6";
                                div.style.position = "relative";
                                
                                let defaultBadge = '';
                                if (addr.is_default) {
                                    defaultBadge = '<span style="position: absolute; top: 20px; right: 20px; background: #000; color: #FFFFFF; font-size: 10px; padding: 3px 8px; letter-spacing: 1px; text-transform: uppercase;">Default</span>';
                                }

                                div.innerHTML = `
                                    ${defaultBadge}
                                    <p style="font-weight: 500; font-size: 14px; margin-bottom: 5px; text-transform: uppercase;">${addr.first_name} ${addr.last_name}</p>
                                    <p style="margin-bottom: 10px; color: #666;">${addr.prefix ? addr.prefix + ' ' : ''}${addr.first_name} ${addr.last_name}</p>
                                    <p>${addr.address}</p>
                                    <p>${addr.city}, ${addr.postcode}</p>
                                    <p>${addr.country}</p>
                                    <p style="margin-top: 10px;">${addr.phone_prefix} ${addr.phone_number}</p>
                                    <div style="margin-top: 15px; display: flex; gap: 15px;">
                                        <button type="button" class="btn-edit-addr" data-id="${addr.id}" style="background: none; border: none; padding: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; text-decoration: underline;">Edit</button>
                                    </div>
                                `;

                                // Edit Handle
                                const editBtn = div.querySelector(".btn-edit-addr");
                                editBtn.addEventListener("click", () => {
                                    const titleEl = document.getElementById("address-section-title");
                                    const saveBtn = document.getElementById("save-address-btn");
                                    const hiddenId = document.getElementById("addr-id");
                                    
                                    if (titleEl) titleEl.textContent = "EDIT ADDRESS";
                                    if (saveBtn) saveBtn.textContent = "UPDATE ADDRESS";
                                    if (hiddenId) hiddenId.value = addr.id;
                                    
                                    // Fill fields
                                    const fields = {
                                        "addr-prefix": addr.prefix || "Mr",
                                        "addr-first-name": addr.first_name,
                                        "addr-last-name": addr.last_name,
                                        "addr-country": addr.country,
                                        "addr-address": addr.address,
                                        "addr-postcode": addr.postcode,
                                        "addr-city": addr.city,
                                        "addr-phone-prefix": addr.phone_prefix,
                                        "addr-phone-number": addr.phone_number
                                    };
                                    
                                    for (const [id, val] of Object.entries(fields)) {
                                        const el = document.getElementById(id);
                                        if (el) el.value = val;
                                    }
                                    
                                    const defCb = document.getElementById("addr-default");
                                    if (defCb) defCb.checked = addr.is_default;
                                    
                                    // Navigate
                                    const overview = document.getElementById("account-info-overview");
                                    const section = document.getElementById("create-address-section");
                                    if (overview) overview.style.display = "none";
                                    if (section) section.style.display = "block";
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                });

                                addrContainer.appendChild(div);
                            });
                        } else {
                            addrContainer.innerHTML = '<p class="empty-msg" style="margin-bottom: 30px; font-size: 13px; color: #666;">There are no addresses saved</p>';
                        }
                    }
                }
            } catch (addrErr) {
                console.warn("[Address Load] Could not load addresses:", addrErr);
            }
        };

        // Logout Logic
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                logoutUser();
            });
        }

        // Profile Save Logic
        const saveProfileBtn = document.getElementById("save-profile-btn");
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                const originalText = saveProfileBtn.textContent;
                saveProfileBtn.textContent = "SAVING...";

                const prefix = document.getElementById("edit-prefix")?.value || "";
                const first_name = document.getElementById("edit-first-name")?.value || "";
                const last_name = document.getElementById("edit-last-name")?.value || "";
                const dob = document.getElementById("edit-dob")?.value || "";
                const phone_prefix = document.getElementById("edit-phone-prefix")?.value || "";
                const phone_number = document.getElementById("edit-phone-number")?.value || "";

                if (!first_name || !last_name || !phone_number) {
                    saveProfileBtn.textContent = "Error: Missing required fields";
                    setTimeout(() => saveProfileBtn.textContent = originalText, 3000);
                    return;
                }

                try {
                    const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
                    const storedSession = localStorage.getItem(storageKey);
                    if (!storedSession) throw new Error("No active session found.");
                    const sessionData = JSON.parse(storedSession);
                    const token = sessionData.access_token;
                    const userId = sessionData.user?.id;

                    if (!token || !userId) throw new Error("Authentication token or user ID missing.");

                    // ========== STEP 1: Update the public `profiles` table ==========
                    // This is the database table visible in Supabase Table Editor
                    const profilePayload = {
                        prefix: prefix,
                        first_name: first_name,
                        last_name: last_name,
                        dob: dob || null,
                        phone: phone_prefix + phone_number
                    };

                    console.log("[Profile Save] Updating profiles table for user:", userId);
                    console.log("[Profile Save] Payload:", JSON.stringify(profilePayload));

                    const profileResponse = await fetch(
                        `https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/profiles?id=eq.${userId}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(profilePayload)
                    });

                    const profileResponseText = await profileResponse.text();
                    console.log("[Profile Save] Profiles table response status:", profileResponse.status);
                    console.log("[Profile Save] Profiles table response body:", profileResponseText);

                    if (!profileResponse.ok) {
                        console.error("[Profile Save] Profiles table update FAILED:", profileResponseText);
                        throw new Error("Failed to update profiles table: " + profileResponseText);
                    }

                    // ========== STEP 2: Also update auth user_metadata ==========
                    // This keeps the auth system in sync for onAuthStateChange listeners
                    const authPayload = {
                        data: {
                            prefix, first_name, last_name, dob,
                            phone_prefix, phone_number,
                            phone: phone_prefix + phone_number
                        }
                    };

                    const authResponse = await fetch('https://qsbrjlhnklnfblqulzwn.supabase.co/auth/v1/user', {
                        method: 'PUT',
                        headers: {
                            'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(authPayload)
                    });

                    if (authResponse.ok) {
                        const updatedUser = await authResponse.json();
                        if (updatedUser && updatedUser.user_metadata) {
                            sessionData.user.user_metadata = updatedUser.user_metadata;
                            localStorage.setItem(storageKey, JSON.stringify(sessionData));
                        }
                    } else {
                        console.warn("[Profile Save] Auth metadata update failed (non-critical):", await authResponse.text());
                    }

                    saveProfileBtn.textContent = "SAVED SUCCESSFULLY";
                    setTimeout(() => saveProfileBtn.textContent = originalText, 2000);

                    // Update UI immediately
                    const displayNameEl = document.getElementById("display-name");
                    const displayPhoneEl = document.getElementById("display-phone");
                    if (displayNameEl) displayNameEl.textContent = `${first_name} ${last_name}`.trim();
                    if (displayPhoneEl) displayPhoneEl.textContent = phone_prefix + phone_number;

                } catch (err) {
                    console.error("Error updating profile:", err);
                    saveProfileBtn.textContent = "Error: " + (err.message || "Failed to update").substring(0, 30) + "...";
                    setTimeout(() => saveProfileBtn.textContent = originalText, 4000);
                }
            });
        }

        // Navigation Tab Active State Handling
        const tabLinks = document.querySelectorAll(".tab-link");
        // No e.preventDefault() here anymore as they are real links.
        // We just ensure the right one is visually 'active' based on filename if not already set.
        const currentPath = window.location.pathname;
        tabLinks.forEach(link => {
            if (currentPath.includes(link.getAttribute("href"))) {
                tabLinks.forEach(l => l.classList.remove("active"));
                link.classList.add("active");
            }
        });

        // Sidebar buttons should be real links now or handled by HTML hrefs
        // (Removed old tab switching JS for the sidebar buttons)

        // --- Dynamic Subscription List Sync ---
        const prefListContainer = document.querySelector(".preference-list");
        const prefCheckboxes = document.querySelectorAll("#stay-know input[type='checkbox']");
        
        const updatePreferenceSidebar = () => {
            if (!prefListContainer) return;
            prefListContainer.innerHTML = '';
            
            let hasSelection = false;
            prefCheckboxes.forEach(cb => {
                if (cb.checked) {
                    hasSelection = true;
                    // Find the associated label text by looking up the ID
                    const label = document.querySelector(`label[for="${cb.id}"]`);
                    if (label) {
                        const li = document.createElement("li");
                        li.textContent = label.textContent.trim().toUpperCase();
                        prefListContainer.appendChild(li);
                    }
                }
            });

            if (!hasSelection) {
                const li = document.createElement("li");
                li.textContent = "NO PREFERENCES SELECTED";
                li.style.color = "#999";
                prefListContainer.appendChild(li);
            }
        };

        // Attach listeners and sync on load
        prefCheckboxes.forEach(cb => {
            cb.addEventListener("change", updatePreferenceSidebar);
        });
        updatePreferenceSidebar();
        // "Save Preferences" Button logic
        const savePrefBtn = document.getElementById("save-preferences-btn");
        if (savePrefBtn) {
            savePrefBtn.addEventListener("click", async () => {
                const originalText = savePrefBtn.textContent;
                savePrefBtn.textContent = "SAVING...";
                
                try {
                    // Read token from localStorage to avoid SDK hang
                    const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
                    const storedSession = localStorage.getItem(storageKey);
                    if (!storedSession) throw new Error("No active session found.");
                    const sessionData = JSON.parse(storedSession);
                    const token = sessionData.access_token;
                    const userId = sessionData.user?.id;

                    if (!token || !userId) throw new Error("Authentication token or user ID missing.");

                    // Build the preferences payload from checkbox states
                    const dbPreferences = {};
                    prefCheckboxes.forEach(cb => {
                        // Replace ALL hyphens with underscores: pref-email -> pref_email
                        const colName = cb.id.replace(/-/g, '_');
                        dbPreferences[colName] = cb.checked;
                    });

                    console.log("[Preferences Save] Updating for user:", userId);
                    console.log("[Preferences Save] Payload:", JSON.stringify(dbPreferences));

                    // STEP 1: Try PATCH (update existing row)
                    const patchResponse = await fetch(
                        `https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_preferences?id=eq.${userId}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(dbPreferences)
                    });

                    const patchText = await patchResponse.text();
                    console.log("[Preferences Save] PATCH response status:", patchResponse.status);
                    console.log("[Preferences Save] PATCH response body:", patchText);

                    // If PATCH returned empty array (no row existed), INSERT instead
                    let needsInsert = false;
                    if (patchResponse.ok) {
                        try {
                            const patchResult = JSON.parse(patchText);
                            if (Array.isArray(patchResult) && patchResult.length === 0) {
                                needsInsert = true;
                            }
                        } catch(e) { /* not JSON, that's fine */ }
                    } else {
                        needsInsert = true;
                    }

                    if (needsInsert) {
                        console.log("[Preferences Save] No existing row found, inserting new row...");
                        dbPreferences.id = userId;
                        const insertResponse = await fetch(
                            'https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_preferences', {
                            method: 'POST',
                            headers: {
                                'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(dbPreferences)
                        });

                        const insertText = await insertResponse.text();
                        console.log("[Preferences Save] INSERT response status:", insertResponse.status);
                        console.log("[Preferences Save] INSERT response body:", insertText);

                        if (!insertResponse.ok) {
                            throw new Error("Failed to save preferences: " + insertText);
                        }
                    }

                    savePrefBtn.textContent = "SAVED SUCCESSFULLY";

                    setTimeout(() => {
                        savePrefBtn.textContent = originalText;
                        // Successfully saved, can navigate back to overview or stay here
                        // For multi-page, we stay here or provide a way back
                    }, 1500);
                } catch (err) {
                    console.error("Error saving preferences:", err);
                    savePrefBtn.textContent = "Error: " + (err.message || 'Unknown').substring(0, 30) + "...";
                    // Reset back to original text after 4 seconds
                    setTimeout(() => {
                        savePrefBtn.textContent = originalText;
                    }, 4000);
                }
            });
        }

        // 6. Navigation Logic for Address Form
        const addAddressBtn = document.getElementById("add-address-btn");
        const backToProfileBtn = document.getElementById("back-to-profile");
        const accountInfoOverview = document.getElementById("account-info-overview");
        const createAddressSection = document.getElementById("create-address-section");

        if (addAddressBtn && backToProfileBtn && accountInfoOverview && createAddressSection) {
            addAddressBtn.addEventListener("click", () => {
                const titleEl = document.getElementById("address-section-title");
                const saveBtn = document.getElementById("save-address-btn");
                const hiddenId = document.getElementById("addr-id");
                
                if (titleEl) titleEl.textContent = "CREATE ADDRESS";
                if (saveBtn) saveBtn.textContent = "SAVE MODIFICATIONS";
                if (hiddenId) hiddenId.value = "";
                
                // Clear fields
                ["addr-first-name", "addr-last-name", "addr-address", "addr-postcode", "addr-city", "addr-phone-number"].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = "";
                });
                const defCb = document.getElementById("addr-default");
                if (defCb) defCb.checked = false;

                accountInfoOverview.style.display = "none";
                createAddressSection.style.display = "block";
            });

            backToProfileBtn.addEventListener("click", () => {
                // Reset form state on back
                const hiddenId = document.getElementById("addr-id");
                if (hiddenId) hiddenId.value = "";
                
                createAddressSection.style.display = "none";
                accountInfoOverview.style.display = "block";
            });
        }

        // --- Address Save Logic ---
        const saveAddressBtn = document.getElementById("save-address-btn");
        if (saveAddressBtn) {
            saveAddressBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                const originalText = saveAddressBtn.textContent;
                saveAddressBtn.textContent = "SAVING...";

                try {
                    const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
                    const storedSession = localStorage.getItem(storageKey);
                    if (!storedSession) throw new Error("No active session found.");
                    const sessionData = JSON.parse(storedSession);
                    const token = sessionData.access_token;
                    const userId = sessionData.user?.id;

                    if (!token || !userId) throw new Error("Authentication token or user ID missing.");

                    // Gather form data
                    const addrId = document.getElementById("addr-id")?.value;
                    const prefix = document.getElementById("addr-prefix")?.value || "";
                    const first_name = document.getElementById("addr-first-name")?.value || "";
                    const last_name = document.getElementById("addr-last-name")?.value || "";
                    const country = document.getElementById("addr-country")?.value || "";
                    const address = document.getElementById("addr-address")?.value || "";
                    const postcode = document.getElementById("addr-postcode")?.value || "";
                    const city = document.getElementById("addr-city")?.value || "";
                    const phone_prefix = document.getElementById("addr-phone-prefix")?.value || "";
                    const phone_number = document.getElementById("addr-phone-number")?.value || "";
                    const is_default = document.getElementById("addr-default")?.checked || false;

                    if (!first_name || !last_name || !country || !address || !postcode || !city || !phone_number) {
                        throw new Error("Missing required fields (*)");
                    }

                    const addressPayload = {
                        user_id: userId,
                        prefix,
                        first_name,
                        last_name,
                        country,
                        address,
                        postcode,
                        city,
                        phone_prefix,
                        phone_number,
                        is_default
                    };

                    let response;
                    if (addrId) {
                        console.log("[Address Save] Updating address:", addrId);
                        response = await fetch(`https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_addresses?id=eq.${addrId}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(addressPayload)
                        });
                    } else {
                        console.log("[Address Save] Creating new address for user:", userId);
                        response = await fetch('https://qsbrjlhnklnfblqulzwn.supabase.co/rest/v1/user_addresses', {
                            method: 'POST',
                            headers: {
                                'apikey': 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV',
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(addressPayload)
                        });
                    }

                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.message || response.statusText);
                    }

                    saveAddressBtn.textContent = addrId ? "ADDRESS UPDATED!" : "ADDRESS SAVED!";
                    
                    // Reset form or return to overview
                    setTimeout(() => {
                        saveAddressBtn.textContent = originalText;
                        
                        // Clear hidden ID
                        const hiddenId = document.getElementById("addr-id");
                        if (hiddenId) hiddenId.value = "";
                        
                        if (backToProfileBtn) backToProfileBtn.click(); // Return to account overview
                        
                        // Clear fields
                        ["addr-first-name", "addr-last-name", "addr-address", "addr-postcode", "addr-city", "addr-phone-number"].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.value = "";
                        });
                        const defCb = document.getElementById("addr-default");
                        if (defCb) defCb.checked = false;

                        // Re-fetch and update the address list UI right away
                        if (window.fetchAndRenderAddresses) {
                            window.fetchAndRenderAddresses(userId);
                        }
                    }, 2000);

                } catch (err) {
                    console.error("[Address Save] Error:", err);
                    saveAddressBtn.textContent = "Error: " + (err.message || 'Unknown').substring(0, 20) + "...";
                    setTimeout(() => {
                        saveAddressBtn.textContent = originalText;
                    }, 4000);
                }
            });
        }
    }
});

