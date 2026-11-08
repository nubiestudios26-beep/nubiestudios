/**
 * Nubie Navigation Component
 * Handles site-wide navigation injection and scroll animations.
 */

function initNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const type = placeholder.getAttribute('data-nav-type') || 'standard';
    
    // Calculate path depth (e.g., for pages in subfolders like /account/ or /admin/)
    const isSubfolder = window.location.pathname.includes('/account/') || window.location.pathname.includes('/admin/');
    const basePath = isSubfolder ? '../' : '';

    // Check for admin privileges (nattawut2015@gmail.com)
    const storageKey = 'sb-qsbrjlhnklnfblqulzwn-auth-token';
    const storedSession = localStorage.getItem(storageKey);
    let isAdmin = false;
    if (storedSession) {
        try {
            const sessionData = JSON.parse(storedSession);
            isAdmin = sessionData.user.email === 'nattawut2015@gmail.com';
        } catch(e) {}
    }

    const navbarHtml = `
        <nav class="navbar minimal-nav ${type === 'standard' ? 'nav-dark-text' : ''}">
            <div class="nav-left">
                <div class="menu-trigger">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg-minimal">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                    <span class="nav-trigger-text" data-i18n="nav.menu">Menu</span>
                </div>
                <div class="search-trigger">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg-minimal">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span class="nav-trigger-text" data-i18n="nav.search">Search</span>
                </div>
            </div>
            <div class="nav-center">
                <a href="${basePath}index.html" class="brand-logo">
                    <img src="${basePath}logo.png" alt="nubie" class="logo-image">
                </a>
            </div>
            <div class="nav-right">
                <a href="${basePath}login.html" id="user-icon-link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg-minimal">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </a>
                <div class="cart-icon-wrapper" id="cart-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg-minimal bag-icon">
                        <rect x="3" y="7" width="18" height="13" rx="1"></rect>
                        <path d="M9 7V5a3 3 0 0 1 6 0v2"></path>
                    </svg>
                    <span class="cart-badge inside-bag">0</span>
                </div>
            </div>
        </nav>
    `;

    const menuHtml = `
        <div class="menu-overlay" id="menu-overlay"></div>
        <div class="menu-drawer" id="menu-drawer">
            <div class="menu-header">
                <button class="close-menu-btn" id="close-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="menu-body">
                <div class="menu-section">
                    <h3 class="menu-section-title" data-i18n="nav.fragrances">Fragrances</h3>
                    <ul class="menu-list">
                        <li><a href="${basePath}product.html?id=siren" class="menu-link">Siren</a></li>
                        <li><a href="${basePath}product.html?id=sweet-chaos" class="menu-link">Sweet Chaos</a></li>
                        <li><a href="${basePath}product.html?id=after-sour" class="menu-link">After Sour</a></li>
                        <li><a href="${basePath}product.html?id=discovery-set" class="menu-link">Discovery Set</a></li>
                        <li><a href="${basePath}quiz.html" class="menu-link rainbow-text-animated" style="font-weight: 600;" data-i18n="nav.scentQuiz">Scent Quiz</a></li>
                    </ul>
                </div>
                <div class="menu-section">
                    <h3 class="menu-section-title" data-i18n="nav.about">About Nubie</h3>
                    <ul class="menu-list">
                        <li><a href="${basePath}story.html" class="menu-link" data-i18n="nav.ourStory">Our Story</a></li>
                        <li><a href="${basePath}story-experience.html" class="menu-link">Our Story <span style="color: #D9291C; font-size: 9px; letter-spacing: 0.1em; vertical-align: middle;">· IMMERSIVE</span></a></li>
                        <li><a href="${basePath}index.html#sustainability" class="menu-link" data-i18n="nav.sustainability">Sustainability</a></li>
                        <li><a href="${basePath}craft.html" class="menu-link" data-i18n="nav.craft">The Craft</a></li>
                    </ul>
                </div>
                <div class="menu-section">
                    <h3 class="menu-section-title" data-i18n="nav.space">Your Space</h3>
                    <ul class="menu-list">
                        <li><a href="${basePath}account/overview.html" class="menu-link" data-i18n="nav.account">Account Overview</a></li>
                        <li><a href="${basePath}account/orders.html" class="menu-link" data-i18n="nav.orders">My Orders</a></li>

                        <li><a href="${basePath}account/personal-data.html" class="menu-link" data-i18n="nav.personalData">Personal Data</a></li>
                        ${isAdmin ? `<li><a href="${basePath}admin/orders.html" class="menu-link" style="color: #1C1813; font-weight: 600;" data-i18n="nav.admin">Admin Control</a></li>` : ''}
                    </ul>
                </div>
                <div class="menu-section">
                    <h3 class="menu-section-title" data-i18n="nav.support">Support</h3>
                    <ul class="menu-list">
                        <li><a href="${basePath}contact.html" class="menu-link" data-i18n="nav.contact">Contact Us</a></li>
                        <li><a href="${basePath}faq.html" class="menu-link" data-i18n="nav.faq">FAQ</a></li>
                    </ul>
                </div>
            </div>
            <div class="menu-footer">
                <p class="menu-contact">+66 (0) 123 456 789</p>
                <a href="#" class="menu-signout" data-i18n="nav.signOut">Sign Out</a>
            </div>
        </div>
    `;

    const searchHtml = `
        <div class="search-overlay" id="search-overlay"></div>
        <div class="search-drawer" id="search-drawer">
            <div class="search-header">
                <div class="search-input-container">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="search-icon-inside">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" placeholder="Search the archive..." class="search-input" id="search-input" data-i18n-placeholder="nav.searchPlaceholder">
                </div>
                <button class="close-search-btn" id="close-search-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="search-body">
                <div class="search-quick-links" id="search-suggestions">
                    <p class="search-label" data-i18n="nav.quickSuggestions">Quick Suggestions</p>
                    <div class="suggestion-tags">
                        <a href="${basePath}product.html?id=siren" class="suggestion-tag">Siren</a>
                        <a href="${basePath}product.html?id=sweet-chaos" class="suggestion-tag">Sweet Chaos</a>
                        <a href="${basePath}product.html?id=after-sour" class="suggestion-tag">After Sour</a>
                        <a href="${basePath}product.html?id=discovery-set" class="suggestion-tag">Discovery Set</a>
                    </div>
                </div>
                <div class="search-results-area" id="search-results-area" style="display: none;">
                    <p class="search-label" data-i18n="nav.matches">Archival Matches</p>
                    <div class="search-results-grid" id="search-results-grid">
                        <!-- Results injected here -->
                    </div>
                    <div id="search-loading" class="search-loading" style="display: none;" data-i18n="nav.searching">Searching the archive...</div>
                    <div id="search-empty" class="search-empty" style="display: none;"><span data-i18n="nav.noMatches">No matches found for</span> "<span id="query-val"></span>"</div>
                </div>
            </div>
        </div>
    `;

    placeholder.innerHTML = navbarHtml + menuHtml + searchHtml;

    // Supabase Config (Internal for Navbar)
    const SUPABASE_URL = 'https://qsbrjlhnklnfblqulzwn.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_N9ZhvV24PWSlXIDbDVC5sQ_Ee_3sulV';

    // Menu Logic
    const menuTrigger = placeholder.querySelector('.menu-trigger');
    const menuDrawer = placeholder.querySelector('#menu-drawer');
    const menuOverlay = placeholder.querySelector('#menu-overlay');
    const closeMenuBtn = placeholder.querySelector('#close-menu-btn');

    const toggleMenu = (open) => {
        menuDrawer.classList.toggle('active', open);
        menuOverlay.classList.toggle('active', open);
        document.body.style.overflow = open ? 'hidden' : '';
    };

    menuTrigger?.addEventListener('click', () => toggleMenu(true));
    closeMenuBtn?.addEventListener('click', () => toggleMenu(false));
    menuOverlay?.addEventListener('click', () => toggleMenu(false));

    // Search Logic
    const searchTrigger = placeholder.querySelector('.search-trigger');
    const searchDrawer = placeholder.querySelector('#search-drawer');
    const searchOverlay = placeholder.querySelector('#search-overlay');
    const closeSearchBtn = placeholder.querySelector('#close-search-btn');
    const searchInput = placeholder.querySelector('#search-input');
    const searchSuggestions = placeholder.querySelector('#search-suggestions');
    const searchResultsArea = placeholder.querySelector('#search-results-area');
    const searchResultsGrid = placeholder.querySelector('#search-results-grid');
    const searchLoading = placeholder.querySelector('#search-loading');
    const searchEmpty = placeholder.querySelector('#search-empty');
    const queryVal = placeholder.querySelector('#query-val');

    const getFirstImageUrl = (value) => {
        if (!value) return '';
        if (Array.isArray(value)) return value.find(Boolean) || '';
        if (typeof value !== 'string') return '';

        const trimmed = value.trim();
        if (!trimmed) return '';

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.find(Boolean) || '';
            if (typeof parsed === 'string') return parsed;
        } catch(e) {
            return trimmed;
        }

        return trimmed;
    };

    const toggleSearch = (open) => {
        searchDrawer.classList.toggle('active', open);
        searchOverlay.classList.toggle('active', open);
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
            setTimeout(() => searchInput?.focus(), 500);
        } else {
            // Reset search state on close
            if (searchInput) searchInput.value = '';
            searchSuggestions.style.display = 'block';
            searchResultsArea.style.display = 'none';
        }
    };

    searchTrigger?.addEventListener('click', () => toggleSearch(true));
    closeSearchBtn?.addEventListener('click', () => toggleSearch(false));
    searchOverlay?.addEventListener('click', () => toggleSearch(false));

    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length === 0) {
            searchSuggestions.style.display = 'block';
            searchResultsArea.style.display = 'none';
            return;
        }

        // Show results area and loading state
        searchSuggestions.style.display = 'none';
        searchResultsArea.style.display = 'block';
        searchLoading.style.display = 'block';
        searchEmpty.style.display = 'none';
        searchResultsGrid.innerHTML = '';

        searchTimeout = setTimeout(async () => {
            try {
                const restUrl = `${SUPABASE_URL}/rest/v1/products?name=ilike.*${query}*&select=id,name,category,price,image_url,sub_pic`;
                const response = await fetch(restUrl, {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                });
                
                const products = await response.json();
                searchLoading.style.display = 'none';

                if (products && products.length > 0) {
                    products.forEach(product => {
                        const imageSrc = product.image_url || 'https://via.placeholder.com/600x800?text=Nubie';
                        const subPicSrc = getFirstImageUrl(product.sub_pic);
                        const hasSubPic = Boolean(subPicSrc);
                        const productItem = document.createElement('div');
                        productItem.className = 'search-result-card';
                        productItem.innerHTML = `
                            <a href="${basePath}product.html?id=${product.id}" class="product-link">
                                <div class="product-image ${hasSubPic ? 'has-sub-pic' : ''}">
                                    <img class="product-image-primary" src="${imageSrc}" alt="${product.name}" loading="lazy" decoding="async">
                                    ${hasSubPic ? `<img class="product-image-secondary" src="${subPicSrc}" alt="${product.name} alternate view" loading="lazy" decoding="async">` : ''}
                                </div>
                                <div class="product-info">
                                    <span class="product-type">${product.category || 'FRAGRANCE'}</span>
                                    <h3 class="product-name">${product.name}</h3>
                                    <span class="product-price-grid">฿ ${product.price}</span>
                                </div>
                            </a>
                        `;
                        searchResultsGrid.appendChild(productItem);
                    });
                } else {
                    searchEmpty.style.display = 'block';
                    queryVal.textContent = query;
                }
            } catch (err) {
                console.error('Search error:', err);
                searchLoading.style.display = 'none';
                searchEmpty.style.display = 'block';
                queryVal.textContent = query;
            }
        }, 400); // Debounce
    });

    // Handle Scroll Animation for 'home' type — pages that need a different
    // trigger for the transform (e.g. product.html's pinned horizontal
    // gallery, which drives it off pan progress instead of raw scrollY) opt
    // out with data-scroll-controlled="custom" and manage the "scrolled"
    // class themselves.
    const navbarElement = placeholder.querySelector('.navbar');
    if (type === 'home' && navbarElement && placeholder.getAttribute('data-scroll-controlled') !== 'custom') {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbarElement.classList.add('scrolled');
            } else {
                navbarElement.classList.remove('scrolled');
            }
        });
    }
}

// Ensure it runs as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
} else {
    initNavbar();
}

// Lenis provides the site's eased wheel scrolling across every page.
function initSmoothScroll() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
    script.onload = () => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            smoothWheel: true
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    };
    document.head.appendChild(script);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScroll);
} else {
    initSmoothScroll();
}

