import { test, expect, type Page } from '@playwright/test'

// Demo 2 walkthrough: the salesman on a real design system, with the
// inspector narrating why. Criteria R1–R8 (regression of MVP1's) plus C9
// (real Carbon components & token themes) and C10 (realtime explainability)
// from specs/carbon-demo-spec.md. Evidence → e2e/evidence-carbon/.

const EV = 'e2e/evidence-carbon'

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

const cssToken = (page: Page, token: string) =>
  page.evaluate((t) => getComputedStyle(document.body).getPropertyValue(t).trim(), token)

/** demo tick is 500ms; settle IO first, then jump the fake clock past it + mock's 300ms */
async function tick(page: Page) {
  await page.waitForFunction(() => '__audit' in window)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.clock.fastForward(1200)
  await page.clock.fastForward(1000)
}

/** UI Shell nav link (the footer repeats the labels — scope to the nav) */
const navLink = (page: Page, name: string) => page.getByRole('navigation').getByRole('link', { name, exact: true })

async function gamerActOne(page: Page) {
  await page.locator('[data-morph="specs-teaser"] h2').click()
  await tick(page)
  await navLink(page, 'Laptops').click()
  await expect(page).toHaveURL(/products/)
  await tick(page)
}

test('carbon walkthrough: enrichment narrated live, Carbon tokens morph, chain replays', async ({ page, browser }) => {
  await page.clock.install()

  // R1 — consent structural
  await page.goto('/index.html', { referer: 'https://google.com/' })
  expect(await morphKeys(page)).toEqual([])
  await expect(page.locator('#morph-consent')).toBeVisible()
  await page.screenshot({ path: `${EV}/c1-preconsent.png` })
  await page.locator('#morph-consent .yes').click()

  // C9a — the store is Carbon custom elements
  expect(await page.evaluate(() => customElements.get('cds-button') !== undefined)).toBe(true)
  expect(await page.evaluate(() => document.querySelector('cds-tile, cds-structured-list')?.matches(':defined'))).toBe(
    true,
  )

  // C11 — enterprise density: UI Shell header + ≥8 distinct home sections
  expect(await page.evaluate(() => document.querySelector('cds-header')?.matches(':defined'))).toBe(true)
  const homeSections = await page.evaluate(() => document.querySelectorAll('section[data-morph], header[data-morph]').length)
  expect(homeSections).toBeGreaterThanOrEqual(8)

  // act 1, home: the inspector explains the first traits as they fire
  await gamerActOne(page)

  // products arrived warm (pre-compiled on home) with tech-savvy Carbon tokens (C9b)
  expect((await audit(page)).some((e) => e.kind === 'chain-hit')).toBe(true)
  expect(await themeAttr(page)).toBe('tech-savvy')
  expect(await cssToken(page, '--cds-background')).toBe('#262626') // Carbon g90
  await page.screenshot({ path: `${EV}/c9-theme-tech-savvy.png` })

  // C11 — catalog density: six photographed laptops
  expect(await page.locator('[data-morph="product-grid"] img').count()).toBe(6)

  // C12 — content pattern on camera: technical persona lifted the tech
  // articles above the social proof at this page boundary, why attached
  const sectionOrder = await page.evaluate(() =>
    [...document.querySelectorAll('section[data-morph]')].map((e) => e.getAttribute('data-morph')),
  )
  expect(sectionOrder.indexOf('articles-teaser')).toBeLessThan(sectionOrder.indexOf('testimonials'))
  await expect(page.locator('[data-insp="decisions"]')).toContainText('technical > social proof')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/c12-content-pattern.png` })

  // C10a + C10d + R2 — trait appears live, with its because, JSON updates mid-page
  const personaBefore = (await page.locator('[data-insp="persona"]').innerText()) ?? ''
  expect(personaBefore).not.toContain('gamer')
  await page.locator('[data-morph="gear-teaser"] h2').click()
  await tick(page)
  await expect(page.locator('[data-insp="because"]')).toContainText('trait gamer: clicked gear-teaser')
  const personaAfter = (await page.locator('[data-insp="persona"]').innerText()) ?? ''
  expect(personaAfter).toContain('gamer')
  expect(personaAfter).not.toEqual(personaBefore)
  await page.screenshot({ path: `${EV}/c2-persona-live.png` })

  // C10b + R3 — top objective with its decomposition
  const obj = (await page.locator('[data-insp="objectives"]').innerText()) ?? ''
  expect(/purchase_accessories\s*\n?\s*8\d%/.test(obj)).toBe(true)
  expect(obj).toContain('gamer trait')
  expect(obj).toContain('+60')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/c3-objectives-breakdown.png` })

  // R4 — pre-adaptation of route B while on route A; R6 — guard on camera
  const beforeNav = await audit(page)
  expect(beforeNav.some((e) => e.kind === 'chain-compiled' && e.detail.includes('/accessories.html'))).toBe(true)
  await expect(page.locator('[data-insp="path"]')).toContainText('pre-adapted ✓')
  expect(beforeNav.some((e) => e.kind === 'op-rejected' && e.detail.includes('protected'))).toBe(true)

  // "before" evidence in a pristine context (also R1 decline path)
  const pristine = await browser.newContext()
  const pp = await pristine.newPage()
  await pp.goto(`${page.url().replace(/\/products.*/, '')}/accessories.html`)
  await pp.locator('#morph-consent .no').click()
  expect(await morphKeys(pp)).toEqual([])
  await pp.screenshot({ path: `${EV}/c4-preadapt-before.png`, fullPage: true })
  await pristine.close()

  // navigate into the pre-adapted page
  await navLink(page, 'Gear').click()
  await expect(page).toHaveURL(/accessories/)
  await tick(page)

  const accAudit = await audit(page)
  expect(accAudit.find((e) => e.kind === 'chain-hit' && e.detail.includes('0 LLM calls'))).toBeTruthy()
  // C9b — gamer theme is g100 + purple accent overrides, real Carbon tokens
  expect(await themeAttr(page)).toBe('gamer')
  expect(await cssToken(page, '--cds-background')).toBe('#161616') // Carbon g100
  expect(await cssToken(page, '--cds-button-primary')).toBe('#7c3aed') // custom accent inside the DS grammar
  await expect(page.locator('[data-morph="gear-grid"]')).toHaveAttribute('data-morph-emphasis', 'strong')
  await expect(page.locator('[data-morph="compat-table"]')).toBeVisible()
  expect(await page.locator('[data-morph="gear-grid"] img').count()).toBe(6) // C11
  await page.screenshot({ path: `${EV}/c4-preadapt-after.png`, fullPage: true })
  await page.screenshot({ path: `${EV}/c9-theme-gamer.png` })

  // C10c — every op explained; rejection carries the guard's reason
  const decisions = (await page.locator('[data-insp="decisions"]').innerText()) ?? ''
  expect(decisions).toContain('gamer trait → gear first')
  expect(decisions).toContain('g100 tokens + purple accents')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/c10-decisions.png` })
  const actOneOps = accAudit.filter((e) => e.kind === 'op-applied').map((e) => e.detail)
  expect(actOneOps.length).toBeGreaterThan(0)

  // R7 — act 2: new tab (fresh session, same chain cache) replays identically
  const page2 = await page.context().newPage()
  await page2.clock.install()
  await page2.goto('/index.html', { referer: 'https://google.com/' })
  await gamerActOne(page2)
  await page2.locator('[data-morph="gear-teaser"] h2').click()
  await tick(page2)

  const warmAudit = await audit(page2)
  expect(warmAudit.some((e) => e.kind === 'chain-compiled' && e.detail.includes('/accessories.html'))).toBe(false)
  expect(warmAudit.some((e) => e.kind === 'chain-hit' && e.detail.includes('/accessories.html'))).toBe(true)
  await page2.locator('#morph-inspector').screenshot({ path: `${EV}/c7-warm.png` })

  await navLink(page2, 'Gear').click()
  await tick(page2)
  const actTwoOps = (await audit(page2)).filter((e) => e.kind === 'op-applied').map((e) => e.detail)
  expect(actTwoOps, 'identical persona → identical deterministic chain').toEqual(actOneOps)
})

test('theme default: no evidence, untouched Carbon white tokens (R5/C9b)', async ({ page }) => {
  await page.clock.install()
  await page.goto('/index.html')
  await page.locator('#morph-consent .yes').click()
  await tick(page)
  await navLink(page, 'Laptops').click()
  await tick(page)
  expect(await themeAttr(page)).toBeNull()
  expect(await cssToken(page, '--cds-background')).toBe('#ffffff') // Carbon white
  await expect(page.locator('[data-morph="comparison"]')).toBeHidden() // no evidence → nothing revealed
  await page.screenshot({ path: `${EV}/c9-theme-default.png` })
})

test('act Marta: search + provided profile reorganize the detail page for a non-technical buyer', async ({ page }) => {
  await page.clock.install()

  // she clicked a shopping ad: the landing URL carries her search (C13)
  await page.goto('/index.html?utm_term=laptop+fino+branco', { referer: 'https://google.com/' })
  await page.locator('#morph-consent .yes').click()
  await tick(page)
  await expect(page.locator('[data-insp="because"]')).toContainText('trait thin-focus: searched "laptop fino branco"')
  await expect(page.locator('[data-insp="because"]')).toContainText('trait color-white')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/m1-search-traits.png` })

  // stage-3 PROVIDED, simulated — explicit sign-in is the adapter consent (C14)
  await page.locator('#nova-signin button').click()
  await tick(page)
  await expect(page.locator('[data-insp="provided"]')).toContainText('Marta · 65+')
  await expect(page.locator('[data-insp="because"]')).toContainText('PROVIDED adapter — prefers larger text')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/m2-provided.png` })

  // gift objective on top, path ends at the detail page
  await expect(page.locator('[data-insp="objectives"] .obj-top')).toContainText('buy_gift_laptop')
  await expect(page.locator('[data-insp="objectives"] .obj-top')).toContainText('gift-buyer trait')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/m3-objectives.png` })

  // the listing arrives adapted for her (C15 listing + C16 theme)
  await navLink(page, 'Laptops').click()
  await expect(page).toHaveURL(/products/)
  await tick(page)
  expect(await themeAttr(page)).toBe('comfort')
  await expect(page.locator('[data-morph="card-13-air"]')).toHaveAttribute('data-morph-emphasis', 'strong')
  await expect(page.locator('[data-morph="articles-teaser"]')).toBeHidden()
  await expect(page.locator('[data-insp="path"]')).toContainText('/product.html · pre-adapted ✓')
  await page.screenshot({ path: `${EV}/m4-listing.png` })

  // she opens the card — the detail page was pre-compiled and reorganizes for her (C15)
  await page.locator('[data-morph="card-13-air"] h3 a').click()
  await expect(page).toHaveURL(/product\.html/)
  await tick(page)
  expect((await audit(page)).find((e) => e.kind === 'chain-hit' && e.detail.includes('0 LLM calls'))).toBeTruthy()
  expect(await page.locator('[data-morph="color-picker"]').getAttribute('data-morph-variant-active')).toBe('white')
  await expect(page.locator('[data-morph="size-compare"]')).toBeVisible()
  await expect(page.locator('[data-morph="cta-buy"]')).toHaveAttribute('data-morph-emphasis', 'strong')
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('section[data-morph]')].map((e) => e.getAttribute('data-morph')),
  )
  expect(order.indexOf('gallery')).toBeLessThan(order.indexOf('specs-detail'))
  await expect(page.locator('[data-morph="specs-detail"] [data-morph-variant="collapsed"]')).toBeVisible()
  await expect(page.locator('[data-morph="specs-detail"] [data-morph-variant="expanded"]')).toBeHidden()

  // C16 — comfort is a real Carbon token set (g10) with a larger reading scale
  expect(await themeAttr(page)).toBe('comfort')
  expect(await cssToken(page, '--cds-background')).toBe('#f4f4f4') // Carbon g10
  const pitchSize = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('.overview .pitch')!).fontSize),
  )
  expect(pitchSize).toBeGreaterThan(16)
  await page.screenshot({ path: `${EV}/m5-detail.png`, fullPage: true })

  // every choice explained (C10 discipline holds for act 2)
  const decisions = (await page.locator('[data-insp="decisions"]').innerText()) ?? ''
  expect(decisions).toContain('preselect white')
  expect(decisions).toContain('images before data')
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/m6-decisions.png` })
})

test('treadmill regression: a drifted persona reuses the nearest chain (C18a/C18b)', async ({ page }) => {
  await page.clock.install()
  await page.goto('/index.html', { referer: 'https://google.com/' })
  await page.locator('#morph-consent .yes').click()
  await page.locator('[data-morph="specs-teaser"] h2').click()
  await tick(page)

  // C18b — fan-out: this route's own chain AND the predicted next compiled in parallel
  const compiled = (await audit(page)).filter((e) => e.kind === 'chain-compiled').map((e) => e.detail)
  expect(compiled.some((d) => d.includes('/index.html'))).toBe(true)
  expect(compiled.some((d) => d.includes('/products.html'))).toBe(true)

  // drift the persona AFTER those compiles: two more clicks flip the explorer
  // trait at flush time — the classic early-session treadmill
  await page.locator('[data-morph="testimonials"] h2').click()
  await page.locator('[data-morph="promo-banner"]').click()
  await navLink(page, 'Laptops').click() // navigate with NO further tick — nothing recompiled
  await expect(page).toHaveURL(/products/)
  await tick(page)

  // C18a — exact key missed (persona grew), the nearest chain applied anyway
  const arrival = await audit(page)
  const similar = arrival.find((e) => e.kind === 'chain-hit' && e.detail.includes('similar ('))
  expect(similar, `similar fallback fired; audit: ${arrival.map((e) => e.kind).join(',')}`).toBeTruthy()
  expect(arrival.filter((e) => e.kind === 'op-applied').length).toBeGreaterThan(0)
  expect(await themeAttr(page)).toBe('tech-savvy') // the young persona's chain, not nothing
  await page.locator('#morph-inspector').screenshot({ path: `${EV}/c18-similar.png` })
})
