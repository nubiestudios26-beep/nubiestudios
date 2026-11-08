/**
 * NUBIE Luxury Foundation Component
 * Automatically injects the brand's signature footer into all pages.
 * Conditional: Excludes checkout.html to maintain focus.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Checkout Lock: Prevent footer on the checkout flow
    if (window.location.pathname.includes('checkout.html')) {
        return;
    }

    // 2. Identify Subfolder Context (for relative links)
    const isSubfolder = window.location.pathname.includes('/account/');
    const basePath = isSubfolder ? '../' : '';

    // 3. Define the Luxury Foundation Markup
    const footerMarkup = `
    <footer class="footer">
        <div class="footer-container">
            <div class="footer-grid">
                <div class="footer-column brand-column">
                    <a href="${basePath}index.html" class="footer-logo">
                        <img src="${basePath}logo.png" alt="nubie" class="footer-logo-image">
                    </a>
                    <p class="footer-tagline" data-i18n="footer.tagline">medical-grade olfactory archival system</p>
                </div>

                <div class="footer-column support-column">
                    <h4 class="footer-label" data-i18n="footer.support">Support</h4>
                    <ul class="footer-links">
                        <li><a href="${basePath}faq.html" data-i18n="nav.faq">FAQ</a></li>
                        <li><a href="${basePath}contact.html" data-i18n="footer.contact">Contact</a></li>
                        <li><a href="${basePath}account.html#orders" data-i18n="footer.trackOrder">Track Order</a></li>
                        <li><a href="${basePath}shipping.html" data-i18n="footer.shipping">Shipping Policy</a></li>
                        <li><a href="${basePath}return.html" data-i18n="footer.return">Return & Refund Policy</a></li>
                    </ul>
                </div>

                <div class="footer-column legal-column">
                    <h4 class="footer-label" data-i18n="footer.legal">Legal</h4>
                    <ul class="footer-links">
                        <li><a href="${basePath}policies.html#terms" data-i18n="footer.terms">Terms & Conditions</a></li>
                        <li><a href="${basePath}policies.html#privacy" data-i18n="footer.privacy">Privacy Policy</a></li>
                        <li><a href="${basePath}policies.html#cookie" data-i18n="footer.cookie">Cookie Policy</a></li>
                        <li><button type="button" class="cookie-settings-link" data-cookie-settings data-i18n="cookie.settings">Cookie settings</button></li>
                        <li><a href="${basePath}policies.html#safety" data-i18n="footer.safety">Product Safety Disclaimer</a></li>
                    </ul>
                </div>

                <div class="footer-column member-column">
                    <h4 class="footer-label" data-i18n="footer.member">Member</h4>
                    <ul class="footer-links">
                        <!-- [DISABLED] Loyalty system paused. Uncomment to re-enable.
                        <li><a href="${basePath}loyalty.html">Mark Rewards</a></li>
                        <li><a href="${basePath}member.html#loyalty">Loyalty Terms</a></li>
                        -->
                        <li><a href="${basePath}member.html#promotion" data-i18n="footer.promotion">Promotion Terms</a></li>
                    </ul>
                </div>

                <div class="footer-column manifesto-column">
                    <h4 class="footer-label" data-i18n="footer.institutional">Institutional</h4>
                    <p class="manifesto-text" data-i18n="footer.manifesto">Stay connected with Nubie for exclusive updates and priority access.</p>
                    <div class="footer-input-group">
                        <input type="email" placeholder="Registry Email" class="footer-input" data-i18n-placeholder="footer.emailPlaceholder">
                        <button type="submit" class="footer-submit" data-i18n="footer.subscribe">Subscribe</button>
                    </div>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="footer-copyright">© 2024 NUBIE ARCHIVAL SYSTEM. ALL RIGHTS RESERVED.</div>
                <div class="footer-institutional-links">
                    <a href="#" data-i18n="footer.termsOfUse">Terms of Use</a>
                    <a href="#" data-i18n="footer.sitemap">Sitemap</a>
                </div>
            </div>
        </div>
    </footer>
    `;

    // 4. Surgical Injection: Append to body if no footer exists
    if (!document.querySelector('.footer')) {
        document.body.insertAdjacentHTML('beforeend', footerMarkup);
    }
});
