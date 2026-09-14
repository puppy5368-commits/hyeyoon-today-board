const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:4173/english/v2.html');
    assert(await page.getByText('희윤이의 작은 가게').count());
    assert.equal(await page.locator('[data-section]').count(), 3);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByRole('button', { name: '👉📕 하나를 가리켜요' }).click();
    assert.equal(await page.getByRole('button', { name: '👉📕 하나를 가리켜요' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: '확인' }).isEnabled(), true);
    await page.getByRole('button', { name: '확인' }).click();
    assert(await page.getByText('my', { exact: true }).count());

    await page.getByRole('button', { name: '🙋🎒 내가 들고 있어요' }).click();
    assert.equal(await page.getByRole('button', { name: '🙋🎒 내가 들고 있어요' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '확인' }).click();
    assert(await page.getByText('bag', { exact: true }).count());
    await page.getByRole('button', { name: 'bag', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'bag', exact: true }).getAttribute('aria-pressed'), 'true');

    await page.getByRole('button', { name: /B 듣기/ }).click();
    await page.getByRole('button', { name: '시작하기' }).click();
    assert(await page.getByText('🔊 듣기를 먼저 눌러보세요').count());
    await page.getByRole('button', { name: /C 말하기/ }).click();
    await page.getByRole('button', { name: '시작하기' }).click();
    assert(await page.getByText('This is my bag.', { exact: true }).count());

    assert.deepEqual(errors, []);
    const v1 = await page.evaluate(() => localStorage.getItem('heeyoon-english-board:v1'));
    assert.equal(v1, null);
    console.log('PASS: V2 choice selection, A/B/C start, 375px, console, separate V2 storage.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
