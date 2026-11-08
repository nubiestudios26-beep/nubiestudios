/** Consent state and Google Consent Mode v2. Load synchronously before any tags. */
(function () {
    'use strict';
    if (window.NubieCookieConsent) return;

    const STORAGE_KEY = 'nubie-cookie-consent';
    const SCHEMA_VERSION = 2;
    const config = Object.freeze({
        provider: 'none', ga4MeasurementId: '', gtmContainerId: '',
        policyVersion: '2026-11-08', maxAgeDays: 180,
        ...window.NubieConsentConfig
    });
    const maxAge = Math.min(365, Math.max(1, Number(config.maxAgeDays) || 180)) * 86400000;
    const listeners = new Set();
    let record = readRecord();
    let persisted = record !== null;
    let expiryTimer;
    let reloadScheduled = false;
    let analyticsReady = false;
    let marketingReady = false;
    let googleStarted = false;
    let trackingStatus = 'unconfigured';
    let lastApplied;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const denied = googleState({ analytics: false, marketing: false });
    // This must precede config, event, gtm.js, and any restored consent update.
    window.gtag('consent', 'default', denied);
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'url_passthrough', false);

    function validRecord(value) {
        const now = Date.now();
        return !!value && value.version === SCHEMA_VERSION &&
            value.policyVersion === config.policyVersion &&
            value.preferences?.necessary === true &&
            typeof value.preferences.analytics === 'boolean' &&
            typeof value.preferences.marketing === 'boolean' &&
            Number.isFinite(value.createdAt) && Number.isFinite(value.updatedAt) &&
            value.createdAt <= value.updatedAt && value.updatedAt <= now &&
            Number.isFinite(value.expiresAt) && value.expiresAt > now &&
            value.expiresAt > value.updatedAt && value.expiresAt <= value.updatedAt + maxAge;
    }

    function readRecord() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
            // Old notices did not offer categories or record the policy version.
            // Ask again rather than infer new permissions from those records.
            return validRecord(value) ? value : null;
        } catch (error) {
            return null;
        }
    }

    function getPreferences() {
        if (!validRecord(record)) return { necessary: true, analytics: false, marketing: false };
        return { necessary: true, analytics: record.preferences.analytics, marketing: record.preferences.marketing };
    }

    function getRecord() {
        return validRecord(record) ? JSON.parse(JSON.stringify(record)) : null;
    }

    function googleState(preferences = getPreferences()) {
        return {
            analytics_storage: preferences.analytics ? 'granted' : 'denied',
            ad_storage: preferences.marketing ? 'granted' : 'denied',
            ad_user_data: preferences.marketing ? 'granted' : 'denied',
            ad_personalization: preferences.marketing ? 'granted' : 'denied',
            personalization_storage: preferences.marketing ? 'granted' : 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted'
        };
    }

    function removeOptionalCookies(preferences) {
        const domains = location.hostname.split('.');
        const paths = location.pathname.split('/');
        const cookiePaths = new Set(['/']);
        while (paths.length > 1) {
            paths.pop();
            const cookiePath = paths.join('/') || '/';
            cookiePaths.add(cookiePath);
            cookiePaths.add(cookiePath.endsWith('/') ? cookiePath : cookiePath + '/');
        }
        document.cookie.split(';').forEach((entry) => {
            const name = entry.split('=')[0].trim();
            const analyticsCookie = /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gac_)/.test(name);
            const marketingCookie = /^(_gcl_|__gads$|__gpi$)/.test(name);
            if ((!preferences.analytics && analyticsCookie) || (!preferences.marketing && marketingCookie)) {
                cookiePaths.forEach((cookiePath) => {
                    const expired = `${name}=; Max-Age=0; Path=${cookiePath}; SameSite=Lax`;
                    document.cookie = expired;
                    for (let i = 0; i < domains.length; i++) {
                        const domain = domains.slice(i).join('.');
                        document.cookie = `${expired}; Domain=${domain}`;
                        document.cookie = `${expired}; Domain=.${domain}`;
                    }
                });
            }
        });
    }

    function providerIsValid() {
        if (config.provider === 'none') return false;
        const valid = config.provider === 'ga4' ? /^G-[A-Z0-9]+$/.test(config.ga4MeasurementId)
            : config.provider === 'gtm' && /^GTM-[A-Z0-9]+$/.test(config.gtmContainerId);
        if (!valid) trackingStatus = 'invalid-configuration';
        return valid;
    }

    function startGoogle(preferences) {
        if (googleStarted || reloadScheduled || /\/admin\//.test(location.pathname) || !providerIsValid()) return;
        if (config.provider === 'ga4' ? !preferences.analytics : !(preferences.analytics || preferences.marketing)) {
            trackingStatus = 'waiting-for-consent';
            return;
        }
        // Existing snippets must be removed before this manager can own tracking.
        const duplicate = Array.from(document.scripts).some((script) => {
            if (!script.src) return false;
            const url = new URL(script.src, location.href);
            return /(^|\.)googletagmanager\.com$/.test(url.hostname) && /^\/(gtm\.js|gtag\/js)$/.test(url.pathname);
        });
        if (duplicate) {
            trackingStatus = 'existing-google-tag';
            console.warn('Nubie consent: existing Google tag found; skipping a second loader.');
            return;
        }
        googleStarted = true;
        trackingStatus = 'loading';
        const script = document.createElement('script');
        script.id = 'nubie-google-tag';
        script.async = true;
        script.onload = () => { trackingStatus = 'loaded'; };
        script.onerror = () => { trackingStatus = 'load-failed'; };
        if (config.provider === 'gtm') {
            window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
            script.src = `https://www.googletagmanager.com/gtm.js?id=${config.gtmContainerId}`;
        } else {
            window.gtag('set', {
                allow_google_signals: preferences.marketing,
                allow_ad_personalization_signals: preferences.marketing
            });
            window.gtag('js', new Date());
            window.gtag('config', config.ga4MeasurementId, {
                send_page_view: false
            });
            script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`;
        }
        document.head.appendChild(script);
    }

    function scheduleExpiry() {
        clearTimeout(expiryTimer);
        if (!record) return;
        expiryTimer = setTimeout(() => {
            if (validRecord(record)) scheduleExpiry();
            else {
                record = null;
                persisted = false;
                applyConsent('expired');
            }
        }, Math.min(Math.max(0, record.expiresAt - Date.now()), 2147483647));
    }

    function applyConsent(source) {
        const preferences = getPreferences();
        const signature = JSON.stringify(preferences);
        const changed = signature !== lastApplied;
        const previous = lastApplied && JSON.parse(lastApplied);
        const revoked = previous && ((previous.analytics && !preferences.analytics) || (previous.marketing && !preferences.marketing));
        lastApplied = signature;
        if (/^G-[A-Z0-9]+$/.test(config.ga4MeasurementId)) {
            window['ga-disable-' + config.ga4MeasurementId] = !preferences.analytics;
        }
        if (changed) {
            window.gtag('consent', 'update', googleState(preferences));
            // Native GTM consent-template callbacks run before any measurement event.
            listeners.forEach((callback) => {
                try { callback(googleState(preferences)); } catch (error) { console.error('Consent listener failed', error); }
            });
            if (config.provider === 'ga4' && googleStarted) {
                window.gtag('set', {
                    allow_google_signals: preferences.marketing,
                    allow_ad_personalization_signals: preferences.marketing
                });
            }
            removeOptionalCookies(preferences);
        }
        if (revoked && googleStarted) {
            // A loaded SDK cannot be unloaded. Reload after persisting revocation so
            // the next document starts clean and blocks the disallowed integration.
            reloadScheduled = true;
            setTimeout(() => location.reload(), 0);
        }
        startGoogle(preferences);
        if (changed) {
            window.dataLayer.push({ event: 'nubie_consent_update', nubie_consent: { ...preferences } });
            if (googleStarted && !reloadScheduled && preferences.analytics && !analyticsReady) {
                analyticsReady = true;
                if (config.provider === 'ga4') {
                    // One initial page view per document; saving settings never resends it.
                    window.gtag('event', 'page_view', { send_to: config.ga4MeasurementId });
                } else {
                    window.dataLayer.push({ event: 'nubie_analytics_ready', nubie_consent: { ...preferences } });
                }
            }
            if (config.provider === 'gtm' && googleStarted && !reloadScheduled && preferences.marketing && !marketingReady) {
                marketingReady = true;
                window.dataLayer.push({ event: 'nubie_marketing_ready', nubie_consent: { ...preferences } });
            }
        }
        scheduleExpiry();
        window.dispatchEvent(new CustomEvent('nubie:consentchange', {
            detail: { ...preferences, source, persisted, hasDecision: validRecord(record) }
        }));
    }

    function save(preferences, source = 'preferences') {
        if (typeof preferences?.analytics !== 'boolean' || typeof preferences?.marketing !== 'boolean') {
            throw new TypeError('Analytics and marketing preferences must be booleans.');
        }
        const now = Date.now();
        record = {
            version: SCHEMA_VERSION,
            policyVersion: config.policyVersion,
            createdAt: validRecord(record) ? record.createdAt : now,
            updatedAt: now,
            expiresAt: now + maxAge,
            source: ['accept-all', 'essential-only', 'preferences'].includes(source) ? source : 'preferences',
            preferences: { necessary: true, analytics: preferences.analytics, marketing: preferences.marketing }
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
            persisted = true;
        } catch (error) {
            persisted = false;
            // On quota errors, remove any older grant rather than restore stale
            // permission after a withdrawal-triggered reload.
            try { localStorage.removeItem(STORAGE_KEY); } catch (ignored) { /* Storage may be entirely disabled. */ }
        }
        applyConsent(source);
        return { persisted, reloadRequired: reloadScheduled };
    }

    window.NubieCookieConsent = Object.freeze({
        getPreferences, getRecord, getGoogleConsent: googleState, save,
        acceptAll: () => save({ analytics: true, marketing: true }, 'accept-all'),
        rejectOptional: () => save({ analytics: false, marketing: false }, 'essential-only'),
        open: (trigger) => window.dispatchEvent(new CustomEvent('nubie:open-cookie-settings', { detail: { trigger } })),
        // A GTM template can subscribe using callInWindow. Immediate replay ensures
        // restored preferences are applied during Consent Initialization.
        subscribe: (callback) => {
            if (typeof callback !== 'function') return;
            listeners.add(callback);
            callback(googleState());
            return () => listeners.delete(callback);
        },
        getDiagnostics: () => ({
            provider: config.provider, trackingStatus, googleStarted,
            persisted, hasDecision: validRecord(record), analyticsReady, marketingReady,
            policyVersion: config.policyVersion, reloadRequired: reloadScheduled
        })
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        record = readRecord();
        persisted = record !== null;
        applyConsent('storage');
    });
    window.addEventListener('pageshow', () => {
        // Recheck expiry and cross-tab changes when restoring from bfcache.
        record = persisted ? readRecord() : (validRecord(record) ? record : null);
        applyConsent('pageshow');
    });
    applyConsent('initial');
})();
