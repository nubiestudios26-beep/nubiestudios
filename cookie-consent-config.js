/** Public tracking configuration. Choose exactly one provider; IDs are not secrets. */
window.NubieConsentConfig = Object.freeze({
    // 'none', 'ga4' (direct Google tag), or 'gtm' (GA4 managed inside the container).
    provider: 'none',
    ga4MeasurementId: '',
    gtmContainerId: '',
    policyVersion: '2026-11-08',
    maxAgeDays: 180
});
