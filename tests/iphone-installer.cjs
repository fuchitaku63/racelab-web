'use strict';

// The installer is tested against the exact PR #4 bookmarklet; no real race data is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
let playwright;
for (const name of [process.env.RACELAB_PLAYWRIGHT, 'playwright', '/opt/codex/runtimes/cua/lib/node_modules/playwright'].filter(Boolean)) {
  try { playwright = require(name); break; } catch (_) { /* Try the next installation. */ }
}
if (!playwright) throw Error('Playwright が必要です');

const installer = path.resolve('bookmarklets/install-v1124-iphone.html');
const source = fs.readFileSync('bookmarklets/generated/v1124_iphone_compact.txt', 'utf8').replace(/\r?\n$/, '');
const engine = process.env.RACELAB_BROWSER || 'chromium';
const browserType = playwright[engine];
if (!browserType) throw Error('未対応のブラウザ: ' + engine);

async function main() {
  const server = http.createServer((req, res) => {
    if (req.url !== '/install') { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
    res.end(fs.readFileSync(installer));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const launch = {headless: true};
  if (engine === 'chromium') {
    launch.args = ['--no-sandbox'];
    launch.executablePath = process.env.RACELAB_CHROMIUM || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  }
  if (engine === 'webkit' && process.env.RACELAB_WEBKIT) launch.executablePath = process.env.RACELAB_WEBKIT;
  let browser;
  try {
    browser = await browserType.launch(launch);
    const mobile = {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true};
    if (engine === 'chromium') mobile.serviceWorkers = 'block';
    const context = await browser.newContext(mobile);
    const external = [];
    if (engine === 'chromium') await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
      return route.continue();
    });
    if (engine === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
    const page = await context.newPage();
    page.on('request', request => { if (new URL(request.url()).origin !== origin) external.push(new URL(request.url()).origin); });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/install');
    assert.equal(await page.locator('#bookmarklet-source').inputValue(), source);
    assert.ok(source.startsWith('javascript:'));
    assert.equal(await page.locator('h1').innerText(), '出走表を、\nRaceLabへ。');
    assert.equal(await page.locator('.steps li').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.match(await page.locator('.notice').innerText(), /未検証/);
    await page.screenshot({path: '/tmp/racelab-v1124-iphone-installer.png', fullPage: true});
    console.log('PASS 実画面・モバイル幅・PR #4の元コードと完全一致');

    await page.click('#copy-button');
    await page.waitForFunction(() => document.getElementById('copy-status').textContent.length > 0);
    if (engine === 'chromium') {
      assert.match(await page.locator('#copy-status').innerText(), /コピーしました/);
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), source);
      console.log('PASS ワンタップで実クリップボードに全文コピー');
    } else {
      const message = await page.locator('#copy-status').innerText();
      assert.match(message, /コピーしました|自動コピーできませんでした/);
      if (/コピーしました/.test(message)) {
        await page.evaluate(() => { const el = document.createElement('textarea'); el.id = 'test-paste'; document.body.prepend(el); });
        await page.locator('#test-paste').focus();
        await page.keyboard.press('Control+V');
        assert.equal(await page.locator('#test-paste').inputValue(), source);
        console.log('PASS ワンタップで実クリップボードに全文コピー（WebKit）');
      } else {
        console.log('MANUAL_REQUIRED WebKit環境で自動コピーが拒否され、手動コピーに切替');
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();

    const legacy = await browser.newContext(mobile);
    if (engine === 'chromium') await legacy.grantPermissions(['clipboard-read', 'clipboard-write'], {origin});
    await legacy.addInitScript(() => {
      window.testNativeClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true});
    });
    const legacyPage = await legacy.newPage();
    await legacyPage.goto(origin + '/install');
    await legacyPage.click('#copy-button');
    await legacyPage.waitForFunction(() => document.getElementById('copy-status').textContent.length > 0);
    if (/コピーしました/.test(await legacyPage.locator('#copy-status').innerText())) {
      if (engine === 'chromium') {
        assert.equal(await legacyPage.evaluate(() => window.testNativeClipboard.readText()), source);
      } else {
        await legacyPage.evaluate(() => { const el = document.createElement('textarea'); el.id = 'test-paste'; document.body.prepend(el); });
        await legacyPage.locator('#test-paste').focus();
        await legacyPage.keyboard.press('Control+V');
        assert.equal(await legacyPage.locator('#test-paste').inputValue(), source);
      }
      console.log('PASS Clipboard API未対応時の代替コピー');
    } else {
      assert.equal(await legacyPage.locator('#manual-copy').evaluate(el => el.open), true);
      console.log('MANUAL_REQUIRED この環境では代替コピーも拒否、手動選択へ移行');
    }
    await legacy.close();

    const failed = await browser.newContext(mobile);
    await failed.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => { throw Error('blocked'); }}, configurable: true});
      document.execCommand = () => false;
    });
    const fallback = await failed.newPage();
    await fallback.goto(origin + '/install');
    await fallback.click('#copy-button');
    await fallback.waitForFunction(() => document.getElementById('copy-status').textContent.length > 0);
    assert.match(await fallback.locator('#copy-status').innerText(), /自動コピーできませんでした/);
    assert.equal(await fallback.locator('#manual-copy').evaluate(el => el.open), true);
    assert.deepEqual(await fallback.locator('#bookmarklet-source').evaluate(el => [el.selectionStart, el.selectionEnd]), [0, source.length]);
    await fallback.click('#select-source');
    assert.deepEqual(await fallback.locator('#bookmarklet-source').evaluate(el => [el.selectionStart, el.selectionEnd]), [0, source.length]);
    console.log('PASS コピー拒否時は全文選択と手動コピーを案内');
    await failed.close();

    const fileContext = await browser.newContext(mobile);
    const filePage = await fileContext.newPage();
    try {
      await filePage.goto(pathToFileURL(installer).href);
      assert.equal(await filePage.locator('#bookmarklet-source').inputValue(), source);
      console.log('PASS 単一HTMLをfile://で開き元コードを読込');
      await filePage.click('#copy-button');
      await filePage.waitForFunction(() => document.getElementById('copy-status').textContent.length > 0);
      if (/コピーしました/.test(await filePage.locator('#copy-status').innerText())) {
        await filePage.evaluate(() => { const el = document.createElement('textarea'); el.id = 'test-paste'; document.body.prepend(el); });
        await filePage.locator('#test-paste').focus();
        await filePage.keyboard.press('Control+V');
        assert.equal(await filePage.locator('#test-paste').inputValue(), source);
        console.log('PASS file://でワンタップして全文コピー');
      } else {
        assert.equal(await filePage.locator('#manual-copy').evaluate(el => el.open), true);
        console.log('MANUAL_REQUIRED file://では自動コピー拒否、手動選択へ移行');
      }
    } catch (error) {
      if (process.env.RACELAB_REQUIRE_FILE || !String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
      console.log('MANUAL_REQUIRED file:// はこのブラウザの管理ポリシーで禁止');
    }
    await fileContext.close();

    const noJs = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(origin + '/install');
    await noJsPage.locator('#manual-copy summary').click();
    assert.equal(await noJsPage.locator('#bookmarklet-source').inputValue(), source);
    console.log('PASS JavaScript無効時も手動コピーを表示');
    await noJs.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
