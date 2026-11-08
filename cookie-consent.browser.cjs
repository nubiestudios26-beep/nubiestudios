/* Real Chromium smoke/regression checks, using only Node's built-in modules. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const executable = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find((file) => fs.existsSync(file));
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
    assert.ok(executable, 'Install Chromium or set CHROME_PATH.');
    const defaultConfig = fs.readFileSync(path.join(root, 'cookie-consent-config.js'), 'utf8');
    let trackingConfig = null;
    const server = http.createServer((req, res) => {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        if (path.basename(file) === 'cookie-consent-config.js') {
            res.end(trackingConfig ? `window.NubieConsentConfig = ${JSON.stringify(trackingConfig)};` : defaultConfig);
            return;
        }
        fs.readFile(file, (error, data) => { if (error) { res.writeHead(404).end(); } else res.end(data); });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nubie-consent-browser-'));
    const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let socket;
    try {
        const debuggerUrl = await new Promise((resolve, reject) => {
            let output = '';
            const timer = setTimeout(() => reject(new Error('Chromium startup timed out')), 20000);
            browser.stderr.on('data', (chunk) => {
                output += chunk;
                const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
                if (match) { clearTimeout(timer); resolve(match[1]); }
            });
            browser.on('error', (error) => { clearTimeout(timer); reject(error); });
            browser.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited ${code}: ${output}`)); });
        });
        const targets = await (await fetch(debuggerUrl.replace('ws:', 'http:').replace(/\/devtools\/browser\/.*/, '/json/list'))).json();
        socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        let id = 0;
        const pending = new Map();
        const requests = [];
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
            if (!message.id) return;
            const callback = pending.get(message.id);
            pending.delete(message.id);
            clearTimeout(callback.timer);
            if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
            else callback.resolve(message.result);
        };
        const send = (method, params = {}) => new Promise((resolve, reject) => {
            const current = ++id;
            const timer = setTimeout(() => { pending.delete(current); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
            pending.set(current, { resolve, reject, timer });
            socket.send(JSON.stringify({ id: current, method, params }));
        });
        const evaluate = async (expression) => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        const waitFor = async (expression) => {
            for (let attempt = 0; attempt < 100; attempt++) {
                if (await evaluate(expression)) return;
                await pause(100);
            }
            throw new Error(`Timed out: ${expression}`);
        };
        const ready = () => waitFor('document.readyState === "complete" && !!document.getElementById("nubie-cookie-preferences")');
        const navigate = async (url) => { await send('Page.navigate', { url: base + url }); await ready(); await pause(100); };
        const noticeVisible = () => evaluate('!document.getElementById("nubie-cookie-notice").hidden');
        const commands = () => evaluate('dataLayer.map(entry => typeof entry[0] === "string" ? Array.from(entry) : entry)');
        const countCommand = async (command, name) => (await commands()).filter((entry) => entry[0] === command && entry[1] === name).length;
        const open = async () => { await evaluate('NubieCookieConsent.open(document.querySelector("[data-cookie-settings]"))'); await waitFor('document.querySelector("dialog").open'); };
        const capture = async (name) => {
            if (!process.env.CONSENT_SCREENSHOT_DIR) return;
            fs.mkdirSync(process.env.CONSENT_SCREENSHOT_DIR, { recursive: true });
            fs.writeFileSync(path.join(process.env.CONSENT_SCREENSHOT_DIR, name), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
        };
        const key = async (key, modifiers = 0) => {
            const windowsVirtualKeyCode = { Tab: 9, Escape: 27 }[key];
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers, windowsVirtualKeyCode });
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers, windowsVirtualKeyCode });
        };

        await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
        await send('Network.setBlockedURLs', { urls: ['https://*'] });
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await navigate('/index.html');
        assert.equal(await noticeVisible(), true);
        assert.equal(await evaluate('NubieCookieConsent.getPreferences().analytics'), false);
        assert.equal(requests.some((url) => /googletagmanager|google-analytics/.test(url)), false);
        assert.equal(await evaluate('!!document.querySelector(".footer [data-cookie-settings]")'), true);
        assert.equal(await evaluate('!!document.querySelector(".cookie-settings-shortcut")'), false);
        await capture('cookie-banner-desktop.png');
        await evaluate('document.querySelector(".cookie-notice [data-cookie-settings]").click()');
        assert.equal(await evaluate('document.querySelector("dialog").open'), true);
        assert.equal(await evaluate('document.activeElement.classList.contains("cookie-preferences__close")'), true);
        assert.equal(await evaluate('document.querySelector("[name=analytics]").checked'), false);
        assert.equal(await evaluate('document.querySelector("[name=marketing]").checked'), false);
        assert.equal(await evaluate('document.querySelector("dialog input:disabled").checked'), true);
        await capture('cookie-preferences-desktop.png');
        // Native modal focus must stay in the dialog in both directions.
        for (let index = 0; index < 12; index++) {
            await key('Tab');
            assert.equal(await evaluate('!!document.activeElement.closest("dialog")'), true);
        }
        await key('Tab', 8);
        assert.equal(await evaluate('!!document.activeElement.closest("dialog")'), true);
        await key('Escape');
        assert.equal(await evaluate('document.querySelector("dialog").open'), false);
        assert.equal(await noticeVisible(), true);
        await waitFor('document.activeElement.hasAttribute("data-cookie-settings")');
        assert.equal(await evaluate('NubieCookieConsent.getRecord()'), null);

        await open();
        await evaluate('document.querySelector("[name=analytics]").click(); document.querySelector(".cookie-preferences__form").requestSubmit()');
        assert.deepEqual(await evaluate('NubieCookieConsent.getPreferences()'), { necessary: true, analytics: true, marketing: false });
        assert.equal(await noticeVisible(), false);
        await navigate('/product.html?id=siren');
        assert.equal(await noticeVisible(), false);
        await open();
        assert.equal(await evaluate('document.querySelector("[name=analytics]").checked'), true);
        assert.equal(await evaluate('document.querySelector("[name=marketing]").checked'), false);
        await evaluate('document.querySelector(".cookie-preferences__close").click()');

        await navigate('/checkout.html');
        assert.equal(await evaluate('!!document.querySelector(".cookie-settings-shortcut:not([hidden])")'), true);
        await evaluate('document.querySelector(".cookie-settings-shortcut").click()');
        assert.equal(await evaluate('document.querySelector("dialog").open'), true);
        await key('Escape');

        await evaluate('localStorage.removeItem("nubie-cookie-consent");NubieI18n.setLanguage("th")');
        await navigate('/index.html');
        assert.equal(await noticeVisible(), true);
        assert.equal(await evaluate('document.querySelector(".cookie-notice [data-cookie-choice=all]").textContent'), 'ยอมรับทั้งหมด');
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await capture('cookie-banner-mobile-th.png');
        await open();
        assert.equal(await evaluate('document.querySelector(".cookie-preferences__close").getAttribute("aria-label")'), 'ปิดการตั้งค่า');
        await capture('cookie-preferences-mobile-th.png');
        for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
            await send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: true });
            const layout = await evaluate('(() => {const d=document.querySelector("dialog").getBoundingClientRect();const f=document.querySelector(".cookie-preferences__footer").getBoundingClientRect();return {left:d.left,right:d.right,top:d.top,bottom:d.bottom,footerTop:f.top,footerBottom:f.bottom,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};})()');
            assert.ok(layout.left >= 0 && layout.right <= layout.width && layout.top >= 0 && layout.bottom <= layout.height, JSON.stringify(layout));
            assert.ok(layout.footerTop >= 0 && layout.footerBottom <= layout.height, JSON.stringify(layout));
            assert.equal(layout.overflow, false);
        }
        await key('Escape');
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await evaluate('NubieI18n.setLanguage("en")');
        await open();
        assert.equal(await evaluate('document.querySelector("#cookie-preferences-title").textContent'), 'Your cookie preferences.');
        await key('Escape');
        await navigate('/account/overview.html');
        assert.equal(await evaluate('document.querySelector(".cookie-notice__policy").pathname'), '/policies.html');
        assert.equal(await evaluate('Array.from(document.querySelectorAll("link")).some(link => link.href.endsWith("cookie-consent.css") && link.sheet !== null)'), true);

        trackingConfig = { provider: 'ga4', ga4MeasurementId: 'G-TEST123456' };
        await evaluate('localStorage.removeItem("nubie-cookie-consent")');
        await navigate('/index.html');
        assert.equal(await evaluate('!!document.getElementById("nubie-google-tag")'), false);
        await evaluate('NubieCookieConsent.save({analytics:true,marketing:false})');
        assert.equal(await evaluate('document.querySelectorAll("#nubie-google-tag").length'), 1);
        assert.equal(await countCommand('event', 'page_view'), 1);
        await evaluate('NubieCookieConsent.save({analytics:true,marketing:false});NubieCookieConsent.acceptAll();NubieCookieConsent.acceptAll()');
        assert.equal(await countCommand('event', 'page_view'), 1);
        assert.equal(await countCommand('config', 'G-TEST123456'), 1);
        await evaluate('document.cookie="_ga=tracking;path=/";document.cookie="nubie_cart=keep;path=/";NubieCookieConsent.rejectOptional()');
        await pause(200); await ready();
        assert.equal(await evaluate('!!document.getElementById("nubie-google-tag")'), false);
        assert.equal(await evaluate('document.cookie.includes("_ga=")'), false);
        assert.equal(await evaluate('document.cookie.includes("nubie_cart=keep")'), true);
        assert.equal(await noticeVisible(), false);

        trackingConfig = { provider: 'gtm', gtmContainerId: 'GTM-TEST123', ga4MeasurementId: 'G-TEST123456' };
        await navigate('/index.html');
        await evaluate('NubieCookieConsent.save({analytics:false,marketing:true});NubieCookieConsent.acceptAll();NubieCookieConsent.acceptAll()');
        assert.equal(await evaluate('document.querySelectorAll("#nubie-google-tag").length'), 1);
        assert.equal(await evaluate('document.getElementById("nubie-google-tag").src.includes("/gtm.js?")'), true);
        assert.equal(await countCommand('config', 'G-TEST123456'), 0);
        assert.equal((await commands()).filter((entry) => entry.event === 'nubie_analytics_ready').length, 1);
        assert.equal((await commands()).filter((entry) => entry.event === 'nubie_marketing_ready').length, 1);

        trackingConfig = null;
        const blocked = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(Storage.prototype,"getItem",{value(){throw Error("blocked")}});Object.defineProperty(Storage.prototype,"setItem",{value(){throw Error("blocked")}});' });
        await navigate('/index.html');
        assert.equal(await noticeVisible(), true);
        await evaluate('document.querySelector(".cookie-notice [data-cookie-choice=essential]").click()');
        assert.equal(await noticeVisible(), false);
        assert.equal(await evaluate('!document.querySelector(".cookie-consent-status").hidden'), true);
        await evaluate('NubieI18n.setLanguage("th")');
        assert.equal(await evaluate('document.documentElement.lang'), 'th');
        await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blocked.identifier });
        console.log('PASS: banner, modal, default-off switches, custom choices, persistence, footer/checkout controls, keyboard focus/Escape, English/Thai, 390px/320px/landscape layout, nested assets, GA4/GTM loader and page-view deduplication, withdrawal reload/cookie cleanup, blocked storage. Google requests were blocked; no live analytics data was sent.');
    } finally {
        socket?.close();
        browser.kill();
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
