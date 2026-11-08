document.addEventListener('DOMContentLoaded', () => {

    // 0. Inject Cart Shell if not present (Componentization)
    function injectCartDrawer() {
        if (document.getElementById('cart-drawer')) return;
        
        const shell = `
            <div class="cart-overlay" id="cart-overlay"></div>
            <aside class="cart-drawer" id="cart-drawer">
                <div class="cart-header">
                    <h2 class="cart-title">Cart (<span class="cart-count">0</span>)</h2>
                    <button id="close-cart" class="close-cart-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="cart-items-container">
                    <div id="cart-items" class="cart-items active">
                        <!-- Items injected by JS -->
                    </div>
                </div>

                <div class="cart-footer">
                    <div class="cart-total-row">
                        <span class="total-label">Total</span>
                        <div class="total-amount-box">
                            <span class="total-amount" id="cart-subtotal">฿ 0.00</span>
                            <span class="vat-note">(VAT included)</span>
                        </div>
                    </div>
                    <button class="checkout-btn btn-pill">Checkout</button>
                </div>
            </aside>
        `;
        document.body.insertAdjacentHTML('beforeend', shell);
    }

    injectCartDrawer();

    // DOM Elements
    const cartIcon = document.getElementById('cart-icon');
    const closeCartBtn = document.getElementById('close-cart');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    
    // State
    let cart = JSON.parse(localStorage.getItem('nubie_cart')) || [];
    let isSyncing = false;

    // --- Supabase Cloud Sync Logic ---
    async function syncWithSupabase() {
        if (!window.supabase || isSyncing) return;
        
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session) return;
            
            const userId = session.user.id;
            isSyncing = true;

            // 1. Fetch cloud cart
            const { data: cloudItems, error: fetchError } = await window.supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', userId);

            if (fetchError) throw fetchError;

            // 2. Merge Guest elements if any exist
            const guestCart = JSON.parse(localStorage.getItem('nubie_cart')) || [];
            if (guestCart.length > 0) {
                let mergedCart = [...cloudItems];
                guestCart.forEach(guestItem => {
                    const match = mergedCart.find(c => c.product_id === guestItem.id && c.size === guestItem.size);
                    if (match) {
                        match.quantity += (guestItem.quantity || 1);
                    } else {
                        mergedCart.push({
                            user_id: userId,
                            product_id: guestItem.id,
                            title: guestItem.title,
                            image: guestItem.image,
                            price: guestItem.price,
                            size: guestItem.size,
                            quantity: guestItem.quantity || 1
                        });
                    }
                });

                cart = mergedCart.map(item => ({
                    id: item.product_id,
                    title: item.title,
                    image: item.image,
                    price: item.price,
                    size: item.size,
                    quantity: item.quantity
                }));

                // Unified local storage with merged results
                localStorage.setItem('nubie_cart', JSON.stringify(cart));
                await pushCartToCloud(userId);
            } else {
                // Just use cloud cart
                cart = cloudItems.map(item => ({
                    id: item.product_id,
                    title: item.title,
                    image: item.image,
                    price: item.price,
                    size: item.size,
                    quantity: item.quantity
                }));
                localStorage.setItem('nubie_cart', JSON.stringify(cart));
            }

            updateCartUI();
        } catch (err) {
            console.error("Cart sync error:", err);
        } finally {
            isSyncing = false;
        }
    }

    async function pushCartToCloud(userId) {
        if (!window.supabase) return;
        
        try {
            // Delete all for this user and re-insert (Clean array sync)
            await window.supabase
                .from('cart_items')
                .delete()
                .eq('user_id', userId);

            if (cart.length > 0) {
                const upsertData = cart.map(item => ({
                    user_id: userId,
                    product_id: item.id,
                    title: item.title,
                    image: item.image,
                    price: item.price,
                    size: item.size,
                    quantity: item.quantity
                }));

                const { error } = await window.supabase
                    .from('cart_items')
                    .insert(upsertData);
                
                if (error) throw error;
            }
        } catch (err) {
            console.error("Cloud save error:", err);
        }
    }

    // Initialize
    syncWithSupabase();
    updateCartUI();

    // Listen for auth state changes to sync cart in real-time
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                syncWithSupabase();
            } else if (event === 'SIGNED_OUT') {
                cart = [];
                updateCartUI();
            }
        });
    }

    // Toggle Cart Drawer
    function toggleCart() {
        cartDrawer.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    if (cartIcon) cartIcon.addEventListener('click', toggleCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    // Save cart and update UI
    async function saveCart() {
        localStorage.setItem('nubie_cart', JSON.stringify(cart));
        updateCartUI();

        // Push to cloud if logged in
        if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session) {
                pushCartToCloud(session.user.id);
            }
        }
    }

    function updateCartUI() {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        let subtotal = 0;
        let totalCount = 0;

        const isSubfolder = window.location.pathname.includes('/account/');
        const basePath = isSubfolder ? '../' : '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color: #999; padding: 40px 0;">Your cart is empty.</p>';
        } else {
            cart.forEach((item, index) => {
                const itemTotal = item.price * (item.quantity || 1);
                subtotal += itemTotal;
                totalCount += (item.quantity || 1);

                // Handle relative image paths for subfolders
                const imageUrl = item.image.startsWith('http') ? item.image : basePath + item.image;

                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-image">
                        <img src="${imageUrl}" alt="${item.title}">
                    </div>
                    <div class="cart-item-info">
                        <span class="cart-item-ref">LP0${300 + index}${60 + index}</span>
                        <h4 class="cart-item-title">${item.title}</h4>
                        <span class="cart-item-size">Size: ${item.size}</span>
                        
                        <div class="cart-item-bottom">
                            <span class="cart-item-price">฿ ${itemTotal.toLocaleString()}</span>
                            <div class="qty-boxed-selector">
                                <button class="qty-calc minus" data-index="${index}">
                                    ${item.quantity > 1 ? '&minus;' : '<i class="far fa-trash-alt" style="font-size: 10px;"></i>'}
                                </button>
                                <span class="qty-number">${item.quantity || 1}</span>
                                <button class="qty-calc plus" data-index="${index}">&plus;</button>
                            </div>
                        </div>
                    </div>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }

        if (cartSubtotalEl) {
            cartSubtotalEl.textContent = `฿ ${subtotal.toLocaleString()}`;
        }

        // Update all cart count elements
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = totalCount);
        document.querySelectorAll('.cart-badge').forEach(badge => {
            badge.textContent = totalCount;
            badge.style.display = totalCount > 0 ? 'flex' : 'none';
        });

        attachItemListeners();
    }

    function attachItemListeners() {
        // Quantity Controls
        document.querySelectorAll('.qty-calc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle both the button and the icon inside it
                const targetBtn = e.target.closest('.qty-calc');
                const index = parseInt(targetBtn.getAttribute('data-index'));
                
                if (targetBtn.classList.contains('plus')) {
                    cart[index].quantity = (cart[index].quantity || 1) + 1;
                } else if (targetBtn.classList.contains('minus')) {
                    if (cart[index].quantity > 1) {
                        cart[index].quantity -= 1;
                    } else {
                        cart.splice(index, 1);
                    }
                }
                saveCart();
            });
        });

        // Checkout Button Redirection (Triple-Lock Safety)
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                const isSubfolder = window.location.pathname.includes('/account/');
                const basePath = isSubfolder ? '../' : '';
                
                if (cart && cart.length > 0) {
                    const cartData = JSON.stringify(cart);
                    // Triple-Lock: Store in three separate areas for absolute reliability
                    localStorage.setItem('nubie_cart', cartData);
                    localStorage.setItem('nubie_cart_handoff', cartData);
                    sessionStorage.setItem('nubie_cart_session', cartData);
                    
                    window.location.href = basePath + 'checkout.html';
                } else {
                    alert('Your cart is empty.');
                }
            });
        }
    }

    // Accordion Logic
    document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const parent = trigger.parentElement;
            parent.classList.toggle('active');
        });
    });

    // Tab Switching Logic
    document.querySelectorAll('.cart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.cart-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.cart-items').forEach(list => {
                list.classList.remove('active');
            });
            const targetList = document.getElementById(`${target}-items`);
            if (targetList) targetList.classList.add('active');
        });
    });

    // Product Page Logic: Add to Cart
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const variantBtns = document.querySelectorAll('.variant-btn');
    const priceDisplay = document.getElementById('product-price');
    
    let currentPrice = 790; // Default
    let currentSize = "150ml";

    if (variantBtns.length > 0) {
        variantBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                variantBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentPrice = parseFloat(e.target.getAttribute('data-price'));
                currentSize = e.target.textContent;
                if (priceDisplay) priceDisplay.textContent = `฿ ${currentPrice.toLocaleString()}`;
            });
        });
    }

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const productId = addToCartBtn.getAttribute('data-id');
            const productTitle = addToCartBtn.getAttribute('data-title');
            const productImage = addToCartBtn.getAttribute('data-image');
            
            // Check if item already exists in cart (same product and size)
            const existingItem = cart.find(item => item.id === productId && item.size === currentSize);
            
            if (existingItem) {
                existingItem.quantity = (existingItem.quantity || 1) + 1;
            } else {
                cart.push({
                    id: productId,
                    title: productTitle,
                    image: productImage,
                    price: currentPrice,
                    size: currentSize,
                    quantity: 1
                });
            }
            
            saveCart();
            
            // Reverted to opening the drawer instead of direct redirect
            if(!cartDrawer.classList.contains('active')){
                toggleCart();
            }
        });
    }
});

