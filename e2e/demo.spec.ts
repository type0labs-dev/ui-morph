import { test, expect, type Page } from '@playwright/test'

// The salesman-at-a-distance, on camera. Every acceptance criterion from
// specs/demo-spec.md is asserted here and photographed into e2e/evidence/.
// The clock is faked (page.clock) so dwell-time thresholds are scripted, not
// slept through — determinism is the point: act 2 must replay act 1's chain.

const EV = 'e2e/evidence'

interface AuditEntry {
  kind: string
  detail: string
}

const audit = (page: Page) => page.evaluate(() => (window as unknown as { __audit: AuditEntry[] }).__audit)

const morphKeys = (page: Page) =>
  page.evaluate(() =>
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => k.startsWith('ui-morph:')),
  )

const themeAttr = (page: Page) => page.locator('[data-morph="theme"]').getAttribute('data-morph-variant-active')

/** let the demo's 2s salesman tick + the mock's 300ms "thinking" run */
async function tick(page: Page) {
  await page.waitForFunction(() => '__audit' in window) // module executed
  // two frames so IntersectionObserver delivers its initial entries (real
  // async) before we jump the fake clock — otherwise the ignored-set races
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.clock.fastForward(2500)
  await page.clock.fastForward(1000)
}

/** the scripted gamer visit: home (from Google) → specs → laptops → gear teasers */
async function gamerActOne(page: Page) {
  await page.locator('[data-morph="specs-teaser"] h2').click() // "specs" click → technical trait
  await tick(page)
  await page.getByRole('link', { name: 'LAPTOPS' }).click()
  await expect(page).toHaveURL(/products/)
  await tick(page)
}

test('cold + warm walkthrough: persona forms live, next page pre-adapts, guard rejects, cache replays', async ({
  page,
  browser,
}) => {
  await page.clock.install()

  // ── consent is structural (criterion 1) ──
  await page.goto('/index.html', { referer: 'https://google.com/' })
  expect(await morphKeys(page)).toEqual([])
  await expect(page.locator('#morph-consent')).toBeVisible()
  await page.screenshot({ path: `${EV}/01-preconsent.png` })
  await page.locator('#morph-consent .yes').click()

  // ── act 1, page A (home): behavior starts shaping the persona ──
  await gamerActOne(page)

  // ── page B (laptops): first transition is already warm — the home page
  //    pre-compiled this route for the live persona before we navigated ──
  const productsAudit = await audit(page)
  expect(productsAudit.some((e) => e.kind === 'chain-hit')).toBe(true)

  // persona forms LIVE (criterion 2): no gamer trait yet…
  await expect(page.locator('#morph-hud')).not.toContainText('gamer')
  await page.screenshot({ path: `${EV}/02-persona-forming.png` })
  // …then gear clicks mid-page flip it, without any navigation
  await page.locator('[data-morph="gear-teaser"] h2').click()
  await tick(page)
  await expect(page.locator('#morph-hud')).toContainText('gamer')
  await page.screenshot({ path: `${EV}/02-persona-formed.png` })

  // objectives ranked with probabilities (criterion 3)
  const objText = (await page.locator('[data-hud="objectives"]').textContent()) ?? ''
  const top = /objectives \(estimated\)\s*([a-z_]+)/.exec(objText)?.[1]
  expect(top).toBe('purchase_accessories')
  const pct = Number(/purchase_accessories(\d+)%/.exec(objText)?.[1])
  expect(pct).toBeGreaterThanOrEqual(80)
  await page.locator('#morph-hud').screenshot({ path: `${EV}/03-objectives.png` })

  // pre-adaptation happened for route B' while we are still on B (criterion 4)
  const beforeNav = await audit(page)
  expect(beforeNav.some((e) => e.kind === 'chain-compiled' && e.detail.includes('/accessories.html'))).toBe(true)
  await expect(page.locator('[data-hud="path"]')).toContainText('pre-adapted ✓')

  // the guard, on camera (criterion 6)
  expect(beforeNav.some((e) => e.kind === 'op-rejected' && e.detail.includes('protected'))).toBe(true)
  await page.locator('#morph-hud').screenshot({ path: `${EV}/06-guard.png` })

  // "before" evidence: what accessories looks like with no adaptation at all
  const pristine = await browser.newContext()
  const pp = await pristine.newPage()
  await pp.goto('http://localhost:5199/accessories.html')
  await pp.locator('#morph-consent .no').click()
  expect(await morphKeys(pp)).toEqual([]) // declining leaves nothing behind (criterion 1)
  await pp.screenshot({ path: `${EV}/04-preadapt-before.png`, fullPage: true })
  await pristine.close()

  // ── navigate into the pre-adapted page ──
  await page.getByRole('link', { name: 'GEAR', exact: true }).click()
  await expect(page).toHaveURL(/accessories/)
  await tick(page)

  const accessoriesAudit = await audit(page)
  const replay = accessoriesAudit.find((e) => e.kind === 'chain-hit' && e.detail.includes('0 LLM calls'))
  expect(replay, 'pre-compiled chain replays with zero model calls').toBeTruthy()
  expect(await themeAttr(page)).toBe('gamer')
  await expect(page.locator('[data-morph="gear-grid"]')).toHaveAttribute('data-morph-emphasis', 'strong')
  await expect(page.locator('[data-morph="compat-table"]')).toBeVisible()
  await page.screenshot({ path: `${EV}/04-preadapt-after.png`, fullPage: true })
  await page.screenshot({ path: `${EV}/05-theme-gamer.png` })
  const actOneOps = accessoriesAudit.filter((e) => e.kind === 'op-applied').map((e) => e.detail)
  expect(actOneOps.length).toBeGreaterThan(0)

  // ── act 2: same behavior, fresh session — identical chain, zero compiles (criterion 7) ──
  // new tab in the same context: sessionStorage (per-session signals) resets,
  // localStorage (consent + chain cache) persists — a returning visitor
  const page2 = await page.context().newPage()
  await page2.clock.install()
  await page2.goto('/index.html', { referer: 'https://google.com/' })
  await gamerActOne(page2)
  await page2.locator('[data-morph="gear-teaser"] h2').click()
  await tick(page2)

  const warmAudit = await audit(page2)
  expect(
    warmAudit.some((e) => e.kind === 'chain-compiled' && e.detail.includes('/accessories.html')),
    'nothing recompiles on the warm path',
  ).toBe(false)
  expect(
    warmAudit.some((e) => e.kind === 'chain-hit' && e.detail.includes('/accessories.html')),
    'pre-adaptation resolves from cache',
  ).toBe(true)
  await page2.locator('#morph-hud').screenshot({ path: `${EV}/07-warm.png` })

  await page2.getByRole('link', { name: 'GEAR', exact: true }).click()
  await tick(page2)
  const actTwoOps = (await audit(page2)).filter((e) => e.kind === 'op-applied').map((e) => e.detail)
  expect(actTwoOps, 'identical persona → identical deterministic chain').toEqual(actOneOps)
})

test('theme default: a persona with no evidence gets the untouched token set (criterion 5)', async ({ page }) => {
  await page.clock.install()
  await page.goto('/index.html')
  await page.locator('#morph-consent .yes').click()
  await tick(page)
  await page.getByRole('link', { name: 'LAPTOPS' }).click()
  await tick(page)
  expect(await themeAttr(page)).toBeNull()
  await page.screenshot({ path: `${EV}/05-theme-default.png` })
})

test('theme tech-savvy: spec-reading persona re-binds the tokens (criterion 5)', async ({ page }) => {
  await page.clock.install()
  await page.goto('/index.html')
  await page.locator('#morph-consent .yes').click()
  await page.locator('[data-morph="specs-teaser"] h2').click()
  await tick(page)
  await page.getByRole('link', { name: 'LAPTOPS' }).click()
  await tick(page)
  expect(await themeAttr(page)).toBe('tech-savvy')
  await page.screenshot({ path: `${EV}/05-theme-tech-savvy.png` })
})
