/* Paste into a GTM Custom Template's sandboxed Code tab, not a Custom HTML tag.
 * Fire once on Consent Initialization - All Pages. See COOKIE-CONSENT.md.
 */
const setDefaultConsentState = require('setDefaultConsentState');
const updateConsentState = require('updateConsentState');
const callInWindow = require('callInWindow');

setDefaultConsentState({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted'
});
callInWindow('NubieCookieConsent.subscribe', (state) => {
    updateConsentState(state);
});
data.gtmOnSuccess();
