const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../cookie-consent.js'), 'utf8');
const key = 'nubie-cookie-consent';
const config = { provider: 'ga4', ga4MeasurementId: 'G-TEST123456', policyVersion: '2026-11-08', maxAgeDays: 180 };
const plain = (value) => JSON.parse(JSON.stringify(value));

function browser(options = {}) {
    let now = Date.now();
    const storage = new Map(options.storage || []);
    const cookies = new Map([['_ga', 'old'], ['_ga_TEST', 'old'], ['_gcl_au', 'old'], ['nubie_cart', 'keep']]);
    const scripts = options.scripts || [];
    const events = [];
    const callbacks = new Map();
    const timers = new Map();
    let timerId = 0;
    let reloads = 0;
    const location = { hostname: 'shop.example.com', pathname: options.pathname || '/index.html', href: 'https://shop.example.com/index.html', reload() { reloads++; } };
    const document = {
        scripts,
        createElement: () => ({}),
        head: { appendChild(script) { scripts.push(script); } }
    };
    Object.defineProperty(document, 'cookie', {
        get: () => Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; '),
        set: (value) => {
            const [nameValue] = value.split(';');
            const [name, cookieValue] = nameValue.split('=');
            if (value.includes('Max-Age=0')) cookies.delete(name);
            else cookies.set(name, cookieValue);
        }
    });
    class FakeDate extends Date { static now() { return now; } }
    const context = vm.createContext({
        console: { warn() {}, error() {} }, URL, Date: FakeDate, document, location,
        NubieConsentConfig: { ...config, ...options.config },
        localStorage: {
            getItem(name) { if (options.blocked) throw Error('blocked'); return storage.get(name) ?? null; },
            setItem(name, value) { if (options.blocked || options.writeFailure) throw Error('blocked'); storage.set(name, value); },
            removeItem(name) { if (options.blocked) throw Error('blocked'); storage.delete(name); }
        },
        CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
        setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
        addEventListener(type, callback) {
            if (!callbacks.has(type)) callbacks.set(type, []);
            callbacks.get(type).push(callback);
        },
        dispatchEvent(event) { events.push(event); callbacks.get(event.type)?.forEach((callback) => callback(event)); }
    });
    context.window = context;
    vm.runInContext(source, context);
    return {
        api: context.NubieCookieConsent, context, storage, cookies, scripts, events, timers,
        runAgain() { vm.runInContext(source, context); },
        emit(type, detail = {}) { callbacks.get(type)?.forEach((callback) => callback(detail)); },
        advance(milliseconds) { now += milliseconds; },
        reloads: () => reloads,
        commands: () => Array.from(context.dataLayer, (entry) => Array.isArray(entry) || '0' in entry ? Array.from(entry) : entry),
        runTimer(delay) { const timer = Array.from(timers.entries()).find(([, timer]) => timer.delay === delay); assert.ok(timer); timers.delete(timer[0]); timer[1].fn(); }
    };
}

const count = (b, command, name) => b.commands().filter((entry) => entry[0] === command && entry[1] === name).length;

test('denied defaults precede all commands and no Google tag loads before consent', () => {
    const b = browser();
    assert.deepEqual(plain(b.commands()[0]), ['consent', 'default', {
        analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        personalization_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted'
    }]);
    assert.deepEqual(plain(b.api.getPreferences()), { necessary: true, analytics: false, marketing: false });
    assert.equal(b.scripts.length, 0);
    assert.equal(b.context['ga-disable-G-TEST123456'], true);
});

test('analytics-only consent initializes one GA4 loader/config/page view and keeps ads denied', () => {
    const b = browser();
    b.api.save({ analytics: true, marketing: false });
    assert.equal(b.scripts.length, 1);
    assert.match(b.scripts[0].src, /gtag\/js\?id=G-TEST123456$/);
    assert.equal(count(b, 'config', 'G-TEST123456'), 1);
    assert.equal(count(b, 'event', 'page_view'), 1);
    assert.equal(b.api.getGoogleConsent().ad_user_data, 'denied');
    assert.equal(b.context['ga-disable-G-TEST123456'], false);
    assert.equal(b.commands().find((entry) => entry[0] === 'config')[2].send_page_view, false);
});

test('repeated accepts/saves, duplicate scripts and pageshow cannot duplicate tracking', () => {
    const b = browser();
    b.api.acceptAll();
    const updates = count(b, 'consent', 'update');
    b.api.acceptAll(); b.api.acceptAll(); b.runAgain(); b.emit('pageshow');
    assert.equal(b.scripts.length, 1);
    assert.equal(count(b, 'event', 'page_view'), 1);
    assert.equal(count(b, 'config', 'G-TEST123456'), 1);
    assert.equal(count(b, 'consent', 'update'), updates);
});

test('records preserve original creation time and update the decision/expiry', () => {
    const b = browser();
    b.api.rejectOptional();
    const first = plain(b.api.getRecord());
    b.advance(1000);
    b.api.save({ analytics: true, marketing: false });
    const second = plain(b.api.getRecord());
    assert.equal(second.version, 2);
    assert.equal(second.policyVersion, config.policyVersion);
    assert.equal(second.createdAt, first.createdAt);
    assert.equal(second.updatedAt, first.updatedAt + 1000);
    assert.equal(second.expiresAt - second.updatedAt, 180 * 86400000);
    assert.deepEqual(JSON.parse(b.storage.get(key)), second);
    second.preferences.analytics = false;
    assert.equal(b.api.getPreferences().analytics, true, 'records returned to consumers are defensive copies');
});

test('restored consent applies before configuration and gives one page view on the next document', () => {
    const first = browser(); first.api.acceptAll();
    const next = browser({ storage: first.storage });
    assert.equal(next.api.getPreferences().analytics, true);
    assert.equal(next.scripts.length, 1);
    const commands = next.commands();
    const update = commands.findIndex((entry) => entry[0] === 'consent' && entry[1] === 'update' && entry[2].analytics_storage === 'granted');
    const configure = commands.findIndex((entry) => entry[0] === 'config');
    assert.ok(update > 0 && update < configure);
    assert.equal(count(next, 'event', 'page_view'), 1);
});

test('corrupt, expired, future, older schema and changed-policy records deny optional permissions', () => {
    const b = browser(); b.api.acceptAll();
    const valid = plain(b.api.getRecord());
    const invalid = [
        '{bad', JSON.stringify({ version: 1, choice: 'all', expiresAt: Date.now() + 100000 }),
        JSON.stringify({ ...valid, expiresAt: Date.now() - 1 }),
        JSON.stringify({ ...valid, policyVersion: 'old-policy' }),
        JSON.stringify({ ...valid, updatedAt: Date.now() + 100000 }),
        JSON.stringify({ ...valid, expiresAt: valid.updatedAt + 999 * 86400000 }),
        JSON.stringify({ ...valid, preferences: { necessary: true, analytics: 'yes', marketing: true } })
    ];
    for (const value of invalid) {
        const page = browser({ storage: [[key, value]] });
        assert.equal(page.api.getDiagnostics().hasDecision, false);
        assert.equal(page.scripts.length, 0);
    }
});

test('blocked storage keeps the page functional and reports that persistence failed', () => {
    const b = browser({ blocked: true });
    const result = b.api.save({ analytics: true, marketing: false });
    assert.equal(result.persisted, false);
    assert.equal(b.api.getPreferences().analytics, true);
    b.emit('pageshow');
    assert.equal(b.api.getPreferences().analytics, true);
});

test('invalid preference values cannot silently grant consent', () => {
    const b = browser();
    assert.throws(() => b.api.save({ analytics: 'true', marketing: false }), /booleans/);
    assert.throws(() => b.api.save({ analytics: true }), /booleans/);
    assert.equal(b.scripts.length, 0);
});

test('a failed withdrawal save removes the stale stored grant before reload', () => {
    const first = browser(); first.api.acceptAll();
    const b = browser({ storage: first.storage, writeFailure: true });
    assert.equal(b.api.getPreferences().analytics, true);
    const result = b.api.rejectOptional();
    assert.equal(result.persisted, false);
    assert.equal(b.storage.has(key), false);
    const next = browser({ storage: b.storage });
    assert.equal(next.scripts.length, 0);
    assert.equal(next.api.getPreferences().analytics, false);
});

test('Google advertising flags update without a second destination config or page view', () => {
    const b = browser(); b.api.save({ analytics: true, marketing: false });
    b.api.acceptAll();
    const commands = b.commands();
    const settings = commands.filter((entry) => entry[0] === 'set' && typeof entry[1] === 'object');
    assert.equal(settings[0][1].allow_google_signals, false);
    assert.equal(settings.at(-1)[1].allow_google_signals, true);
    assert.equal(count(b, 'config', config.ga4MeasurementId), 1);
    assert.equal(count(b, 'event', 'page_view'), 1);
    assert.equal('allow_google_signals' in commands.find((entry) => entry[0] === 'config')[2], false);
});

test('withdrawal disables GA4, clears matching cookies, preserves essential state and reloads cleanly', () => {
    const b = browser(); b.api.acceptAll();
    b.cookies.set('_ga', 'consented'); b.cookies.set('_gcl_au', 'consented');
    const result = b.api.rejectOptional();
    assert.equal(result.reloadRequired, true);
    assert.equal(b.context['ga-disable-G-TEST123456'], true);
    assert.equal(b.cookies.has('_ga'), false);
    assert.equal(b.cookies.has('_gcl_au'), false);
    assert.equal(b.cookies.get('nubie_cart'), 'keep');
    b.runTimer(0); assert.equal(b.reloads(), 1);
    const next = browser({ storage: b.storage });
    assert.equal(next.scripts.length, 0);
    assert.equal(next.api.getDiagnostics().hasDecision, true);
});

test('cross-tab grants and withdrawals update immediately and clear-storage means no decision', () => {
    const b = browser();
    const other = browser(); other.api.acceptAll();
    b.advance(1000); // Both mock browser clocks must observe the other tab's timestamp.
    b.storage.set(key, other.storage.get(key)); b.emit('storage', { key });
    assert.equal(b.api.getPreferences().analytics, true);
    assert.equal(b.scripts.length, 1);
    other.api.rejectOptional(); b.storage.set(key, other.storage.get(key)); b.emit('storage', { key });
    assert.equal(b.api.getPreferences().analytics, false);
    b.storage.clear(); b.emit('storage', { key: null });
    assert.equal(b.api.getDiagnostics().hasDecision, false);
});

test('expiration during a long visit denies consent without needing navigation', () => {
    const b = browser(); b.api.acceptAll();
    b.advance(181 * 86400000);
    b.runTimer(2147483647);
    assert.equal(b.api.getPreferences().analytics, false);
    assert.equal(b.api.getDiagnostics().hasDecision, false);
    assert.equal(b.api.getDiagnostics().reloadRequired, true);
});

test('GTM mode never loads direct GA4 and readiness events fire once per document', () => {
    const b = browser({ config: { provider: 'gtm', gtmContainerId: 'GTM-TEST123' } });
    b.api.save({ analytics: false, marketing: true });
    assert.equal(b.scripts.length, 1);
    assert.match(b.scripts[0].src, /gtm\.js\?id=GTM-TEST123$/);
    assert.equal(b.commands().filter((entry) => entry.event === 'nubie_analytics_ready').length, 0);
    b.api.acceptAll(); b.api.acceptAll(); b.runAgain();
    assert.equal(b.scripts.length, 1);
    assert.equal(count(b, 'config', 'G-TEST123456'), 0);
    assert.equal(count(b, 'event', 'page_view'), 0);
    assert.equal(b.commands().filter((entry) => entry.event === 'nubie_analytics_ready').length, 1);
    assert.equal(b.commands().filter((entry) => entry.event === 'nubie_marketing_ready').length, 1);
});

test('native GTM listeners replay current consent and run before readiness events', () => {
    const b = browser({ config: { provider: 'gtm', gtmContainerId: 'GTM-TEST123' } });
    const calls = [];
    const unsubscribe = b.api.subscribe((state) => calls.push({ state: plain(state), ready: b.commands().some((entry) => entry.event === 'nubie_analytics_ready') }));
    assert.equal(calls[0].state.analytics_storage, 'denied');
    b.api.acceptAll();
    assert.equal(calls[1].state.analytics_storage, 'granted');
    assert.equal(calls[1].ready, false);
    unsubscribe(); b.api.rejectOptional();
    assert.equal(calls.length, 2);
});

test('unconfigured and invalid IDs never cause Google requests; admin pages never load tracking', () => {
    for (const options of [
        { config: { provider: 'none' } },
        { config: { provider: 'ga4', ga4MeasurementId: '' } },
        { config: { provider: 'gtm', gtmContainerId: 'wrong' } },
        { pathname: '/admin/orders.html' }
    ]) {
        const b = browser(options); b.api.acceptAll(); assert.equal(b.scripts.length, 0);
    }
});

test('an existing Google tag is detected instead of adding duplicate tracking', () => {
    const b = browser({ scripts: [{ src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456' }] });
    b.api.acceptAll();
    assert.equal(b.scripts.length, 1);
    assert.equal(b.api.getDiagnostics().trackingStatus, 'existing-google-tag');
    assert.equal(count(b, 'event', 'page_view'), 0);
});

test('all storefront HTML loads the synchronous consent core before other scripts', () => {
    const root = path.join(__dirname, '..');
    const files = [root, path.join(root, 'account')].flatMap((dir) => fs.readdirSync(dir).filter((name) => name.endsWith('.html')).map((name) => path.join(dir, name)));
    for (const file of files) {
        const html = fs.readFileSync(file, 'utf8');
        if (!html.includes('i18n.js')) continue;
        const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g));
        assert.ok(scripts[0][1].endsWith('cookie-consent-config.js'), path.basename(file));
        assert.ok(scripts[1][1].endsWith('cookie-consent.js'), path.basename(file));
        assert.ok(!/\b(async|defer)\b/.test(scripts[1][0]));
        assert.equal(html.match(/src="(?:\.\.\/)?cookie-consent\.js"/g).length, 1);
    }
});
