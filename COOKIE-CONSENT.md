# Cookie consent

The storefront uses a local, first-party consent manager with a banner and a native preferences dialog. Optional analytics and marketing default to off. Essential cart, checkout, security, sign-in, and explicitly chosen language remain available.

## Google setup

Edit `cookie-consent-config.js`. Public measurement/container IDs are safe in this file. The default provider is `none`: no Google tracking is loaded until real IDs are supplied and a provider is selected.

- **Direct GA4:** set `provider: 'ga4'` and `ga4MeasurementId: 'G-…'`. Leave GTM unused. The loader queues Consent Mode v2 defaults and current preferences before initializing the Google tag. It disables the automatic initial page view and emits exactly one explicit `page_view` per document after analytics consent. Marketing-only consent does not load direct GA4.
- **GTM:** set `provider: 'gtm'` and `gtmContainerId: 'GTM-…'`. Configure GA4 inside that container. If known, also set `ga4MeasurementId` so withdrawal can immediately set Google's GA4 disable flag; it does not load a second GA4 script in GTM mode.

Use one provider. Remove other Google installation snippets. Existing Google loader scripts are detected and this manager refuses to add another. This guard cannot correct tags already running outside this manager.

The implementation uses **basic Consent Mode**: the selected Google loader is blocked until an applicable optional category is granted. No Google tracking request is made before that grant. The site's unrelated external fonts, payment providers, and existing assets are outside this tracking integration.

### GTM container configuration

Website changes cannot publish settings inside a Google account. Complete and verify these steps in the actual container before enabling its ID:

1. Create a Custom Tag Template. Paste `integrations/gtm-consent-template.js` into its sandboxed Code tab. Do not use a Custom HTML tag for consent APIs.
2. Grant **Accesses consent state → Write** for `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`, `personalization_storage`, `functionality_storage`, and `security_storage`. Grant **Accesses global variables → Execute** for `NubieCookieConsent.subscribe`. The template does not read cookies or contact a server.
3. Create one tag from that template and trigger it on **Consent Initialization – All Pages**, once per page. It sets denied defaults, then immediately reads the current state via the callback and updates consent synchronously before other measurement events.
4. Trigger the GA4 Google tag on the custom event **`nubie_analytics_ready`**. Require the additional consent `analytics_storage`. Let this tag send its initial page view and fire once per page. Do not also install a separate initial `page_view` tag, use All Pages, or trigger on `nubie_consent_update`. Disable automatic history-change page views for these static HTML pages if enabled in the GA4 stream.
5. Trigger marketing initialization on **`nubie_marketing_ready`**, once per page. Require all three advertising consent types: `ad_storage`, `ad_user_data`, and `ad_personalization`. Third-party tags need equivalent explicit category checks; Google consent flags do not automatically block arbitrary third-party scripts.
6. Other analytics/marketing event tags must also require their category's consent. Use `nubie_consent.analytics` and `nubie_consent.marketing` as Data Layer Variables if needed. Consent updates are configuration events, not page views or conversions.
7. In GTM Preview / Tag Assistant verify analytics-only, marketing-only, essential-only, and withdrawal before publishing. Check GA4 DebugView and the Network panel for a single initial page view per document. The local automated tests cover our loader and event ordering, not account-side container configuration or Google's delivery pipeline.

Google references: [website consent implementation](https://developers.google.com/tag-platform/security/guides/consent), [basic versus advanced mode](https://developers.google.com/tag-platform/security/concepts/consent-mode), [native GTM consent templates](https://developers.google.com/tag-platform/tag-manager/templates/consent-apis), and [Google tag configuration](https://developers.google.com/tag-platform/gtagjs/configure).

## Persistence and withdrawal

`localStorage['nubie-cookie-consent']` stores schema version 2, policy version, original creation time, most recent update time, expiry, choice source, and category booleans. The default expiry is 180 days. Changing `policyVersion` prompts a new decision. Old version 1, malformed, invalid, and expired records never grant optional permission. Open tabs synchronize changes through the storage event; expiry is checked during long visits and page restoration.

Records are browser-local; this is not a centralized consent audit database and it does not sync consent to an account. If storage is blocked, the choice remains valid for the current document and the UI reports that it could not be saved.

Withdrawing an optional category updates Google consent immediately, disables the configured GA4 destination when applicable, removes matching accessible first-party Google cookies, and reloads the document if a tracking SDK has already been requested. Reloading removes the running SDK and starts the next page with the new restrictions. Server-only or third-party cookies cannot be deleted by this browser code. Cart, authentication, and language state are preserved.

## UI and accessibility

The banner and modal follow the existing Manrope/Noto Sans Thai, white panels, archival red, and pill buttons. Both languages share the site's switcher. Native `<dialog>` provides modal semantics, background inertness, keyboard focus containment, Escape dismissal, and focus restoration. Opening/closing without saving does not change consent. Switches have accessible names/descriptions, keyboard support, visible focus, and 44px targets. Reduced-motion preferences are respected. Short screens scroll the categories while keeping the action buttons visible. Footer Cookie settings opens the modal; pages without the main footer receive a small settings shortcut.

## Verification

Run the deterministic consent/tracking tests with Node (no packages required):

```powershell
node --test tests/cookie-consent.test.cjs
```

Run real Chromium UI checks with an installed Chrome or Edge:

```powershell
node tests/cookie-consent.browser.cjs
```

The browser test uses a temporary local HTTP server and a disposable browser profile, blocks external network requests, and closes its owned browser/server afterward. Set `CHROME_PATH` if your Chromium binary is installed elsewhere. Optional `CONSENT_SCREENSHOT_DIR` saves desktop and mobile captures. Live Google delivery still needs verification after real IDs and the GTM container are configured.

For local diagnosis, inspect `NubieCookieConsent.getDiagnostics()`, `.getRecord()`, `.getPreferences()`, and `.getGoogleConsent()`. `nubie:consentchange` announces changes for site code; `.subscribe(callback)` replays and supplies the Google consent map to the native GTM template. No consent-management event should be configured as a purchase/conversion.
