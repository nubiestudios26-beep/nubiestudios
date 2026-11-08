/** Accessible storefront UI for the consent manager. No tracking code lives here. */
(function () {
    'use strict';
    if (document.getElementById('nubie-cookie-notice') || !window.NubieCookieConsent) return;
    const consent = window.NubieCookieConsent;
    const assetBase = new URL('.', document.currentScript.src);

    function init() {
        if (document.getElementById('nubie-cookie-notice')) return;
        const host = document.createElement('div');
        const policyUrl = new URL('policies.html#cookie', assetBase).href;
        host.innerHTML = `
            <section id="nubie-cookie-notice" class="cookie-notice" role="region" aria-labelledby="cookie-notice-title" aria-describedby="cookie-notice-description" data-lenis-prevent hidden>
                <span class="cookie-notice__eyebrow" data-i18n="cookie.eyebrow">Your privacy</span>
                <h2 id="cookie-notice-title" data-i18n="cookie.title">A little room for cookies.</h2>
                <p id="cookie-notice-description" data-i18n="cookie.description">We use essential cookies and similar storage to keep your bag, checkout and account working. With your permission, we may also use optional cookies for analytics and marketing.</p>
                <a class="cookie-notice__policy" href="${policyUrl}" data-i18n="footer.cookie">Cookie Policy</a>
                <div class="cookie-notice__actions">
                    <button type="button" class="cookie-notice__button cookie-notice__button--accept" data-cookie-choice="all" data-i18n="cookie.accept">Accept all</button>
                    <button type="button" class="cookie-notice__button" data-cookie-choice="essential" data-i18n="cookie.essential">Essential only</button>
                </div>
                <button type="button" class="cookie-notice__manage" data-cookie-settings data-i18n="cookie.manage">Choose preferences</button>
                <p class="cookie-notice__note" data-i18n="cookie.note">You can change your choice in Cookie settings at any time.</p>
            </section>
            <dialog id="nubie-cookie-preferences" class="cookie-preferences" aria-labelledby="cookie-preferences-title" aria-describedby="cookie-preferences-description" data-lenis-prevent>
                <form class="cookie-preferences__form">
                    <header class="cookie-preferences__header">
                        <div>
                            <span class="cookie-notice__eyebrow" data-i18n="cookie.eyebrow">Your privacy</span>
                            <h2 id="cookie-preferences-title" data-i18n="cookie.preferencesTitle">Your cookie preferences.</h2>
                        </div>
                        <button type="button" class="cookie-preferences__close" autofocus>
                            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 6 12 12M18 6 6 18"/></svg>
                        </button>
                    </header>
                    <div class="cookie-preferences__body">
                        <p id="cookie-preferences-description" data-i18n="cookie.preferencesDescription">Make yourself at home. Choose which optional cookies we can use. Essential cookies stay on to keep the site working.</p>
                        <a class="cookie-notice__policy" href="${policyUrl}" data-i18n="footer.cookie">Cookie Policy</a>
                        <section class="cookie-preferences__category">
                            <div>
                                <h3 id="cookie-necessary-title" data-i18n="cookie.necessaryTitle">Essential</h3>
                                <p id="cookie-necessary-description" data-i18n="cookie.necessaryDescription">Keep your bag, checkout, sign-in and security working, and remember the language you choose.</p>
                            </div>
                            <div class="cookie-preferences__required">
                                <span data-i18n="cookie.alwaysOn">Always on</span>
                                <label class="cookie-switch"><input type="checkbox" checked disabled aria-labelledby="cookie-necessary-title" aria-describedby="cookie-necessary-description"><span aria-hidden="true"></span></label>
                            </div>
                        </section>
                        <section class="cookie-preferences__category">
                            <div>
                                <h3 id="cookie-analytics-title" data-i18n="cookie.analyticsTitle">Analytics</h3>
                                <p id="cookie-analytics-description" data-i18n="cookie.analyticsDescription">Help us understand which pages people visit so we can improve the website.</p>
                            </div>
                            <label class="cookie-switch"><input type="checkbox" role="switch" name="analytics" aria-labelledby="cookie-analytics-title" aria-describedby="cookie-analytics-description"><span aria-hidden="true"></span></label>
                        </section>
                        <section class="cookie-preferences__category">
                            <div>
                                <h3 id="cookie-marketing-title" data-i18n="cookie.marketingTitle">Marketing</h3>
                                <p id="cookie-marketing-description" data-i18n="cookie.marketingDescription">Allow advertising measurement and personalised advertising, including sharing advertising data with Google when its tags are enabled.</p>
                            </div>
                            <label class="cookie-switch"><input type="checkbox" role="switch" name="marketing" aria-labelledby="cookie-marketing-title" aria-describedby="cookie-marketing-description"><span aria-hidden="true"></span></label>
                        </section>
                        <p class="cookie-preferences__retention" data-i18n="cookie.retention">Your choice is saved in this browser. You can change it at any time.</p>
                    </div>
                    <footer class="cookie-preferences__footer">
                        <button type="submit" class="cookie-notice__button cookie-notice__button--accept" data-i18n="cookie.save">Save preferences</button>
                        <div class="cookie-preferences__secondary">
                            <button type="button" class="cookie-notice__button" data-cookie-choice="essential" data-i18n="cookie.essential">Essential only</button>
                            <button type="button" class="cookie-notice__button" data-cookie-choice="all" data-i18n="cookie.accept">Accept all</button>
                        </div>
                    </footer>
                </form>
            </dialog>
            <p class="cookie-consent-status" role="status" aria-live="polite" data-i18n="cookie.storageUnavailable" hidden></p>
        `;
        document.body.appendChild(host);
        const notice = host.querySelector('.cookie-notice');
        const dialog = host.querySelector('dialog');
        const form = host.querySelector('form');
        const status = host.querySelector('[role="status"]');
        const closeButton = host.querySelector('.cookie-preferences__close');
        let origin;
        let statusTimer;
        let shortcut;

        function translate() {
            window.NubieI18n?.applyTranslations(host);
            closeButton.setAttribute('aria-label', window.NubieI18n?.t('cookie.close') || 'Close preferences');
        }

        function sync() {
            notice.hidden = !!consent.getRecord();
            if (shortcut) shortcut.hidden = !notice.hidden;
        }

        function loadChoices() {
            const preferences = consent.getPreferences();
            form.elements.analytics.checked = preferences.analytics;
            form.elements.marketing.checked = preferences.marketing;
        }

        function open(trigger) {
            if (dialog.open) return;
            origin = trigger instanceof HTMLElement ? trigger : document.activeElement;
            loadChoices();
            dialog.showModal();
        }

        function close() {
            if (dialog.open) dialog.close();
        }

        function complete(result) {
            sync();
            close();
            if (!result.persisted) {
                status.textContent = window.NubieI18n?.t('cookie.storageUnavailable') || 'Your browser could not save this choice. It applies to this page only.';
                status.hidden = false;
                clearTimeout(statusTimer);
                statusTimer = setTimeout(() => { status.hidden = true; }, 8000);
            }
        }

        host.addEventListener('click', (event) => {
            const choice = event.target.closest('[data-cookie-choice]')?.dataset.cookieChoice;
            if (choice) complete(choice === 'all' ? consent.acceptAll() : consent.rejectOptional());
        });
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-cookie-settings]');
            if (trigger) {
                event.preventDefault();
                open(trigger);
            }
        });
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            complete(consent.save({ analytics: form.elements.analytics.checked, marketing: form.elements.marketing.checked }));
        });
        closeButton.addEventListener('click', close);
        dialog.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter((element) => element.getClientRects().length);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            close();
        });
        dialog.addEventListener('close', () => {
            if (origin?.isConnected && origin.getClientRects().length) origin.focus({ preventScroll: true });
        });
        dialog.addEventListener('click', (event) => {
            if (event.target !== dialog) return;
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
        });
        window.addEventListener('nubie:open-cookie-settings', (event) => open(event.detail?.trigger));
        window.addEventListener('nubie:languagechange', translate);
        window.addEventListener('nubie:consentchange', (event) => {
            sync();
            if (event.detail.source === 'storage' && dialog.open) loadChoices();
        });
        // Checkout and confirmation pages intentionally omit the main footer.
        if (!document.querySelector('[data-cookie-settings]:not(.cookie-notice [data-cookie-settings])')) {
            shortcut = document.createElement('button');
            shortcut.type = 'button';
            shortcut.className = 'cookie-settings-link cookie-settings-shortcut';
            shortcut.setAttribute('data-cookie-settings', '');
            shortcut.setAttribute('data-i18n', 'cookie.settings');
            shortcut.textContent = 'Cookie settings';
            host.appendChild(shortcut);
        }
        translate();
        sync();
    }

    if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
