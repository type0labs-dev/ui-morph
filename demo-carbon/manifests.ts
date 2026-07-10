import type { PageManifest } from '../src/index.ts'

// NOVA 3.0 manifests — denser vocabulary than MVP1's (which stays frozen in
// demo/manifests.ts). Changing this file changes the manifest hash, which
// kills every previously compiled chain for these routes: designed behavior.
// Same three routes, so the salesman module (objectives/paths/themes) is
// untouched.

const THEME = { id: 'theme', role: 'page design-token theme', variants: ['default', 'tech-savvy', 'gamer'] }
const NAV = { id: 'nav', role: 'site navigation header (Carbon UI Shell)', protected: true }
const FOOTER = { id: 'footer', role: 'footer columns', protected: true }
const PROMO = { id: 'promo-banner', role: 'seasonal discount banner' }
const NEWSLETTER = { id: 'newsletter', role: 'newsletter subscription band' }
const ARTICLES = { id: 'articles-teaser', role: 'technical articles (benchmarks, teardowns)' }

export const MANIFESTS: Record<string, PageManifest> = {
  '/index.html': {
    route: '/index.html',
    entries: [
      THEME,
      NAV,
      { id: 'hero', role: 'landing hero with photo', variants: ['visual', 'technical'] },
      { id: 'cta-hero', role: 'hero call-to-action' },
      { id: 'deals-strip', role: 'deals of the week strip' },
      { id: 'category-tiles', role: 'category entry tiles' },
      { id: 'featured-grid', role: 'featured laptops with photos' },
      { id: 'specs-teaser', role: 'technical specs preview table' },
      { id: 'testimonials', role: 'social proof quotes' },
      ARTICLES,
      NEWSLETTER,
      PROMO,
      FOOTER,
    ],
  },
  '/products.html': {
    route: '/products.html',
    entries: [
      THEME,
      NAV,
      { id: 'hero', role: 'catalog hero', variants: ['visual', 'technical'] },
      { id: 'deals-strip', role: 'deals of the week strip' },
      { id: 'product-grid', role: 'laptop cards with photos and buy CTAs' },
      { id: 'comparison', role: 'side-by-side spec comparison table (hidden by default)' },
      { id: 'gear-teaser', role: 'accessory cross-sell strip' },
      { id: 'testimonials', role: 'social proof quotes' },
      ARTICLES,
      NEWSLETTER,
      PROMO,
      FOOTER,
    ],
  },
  '/accessories.html': {
    route: '/accessories.html',
    entries: [
      THEME,
      NAV,
      { id: 'hero', role: 'gear hero', variants: ['visual', 'technical'] },
      { id: 'gear-grid', role: 'accessory cards with photos and add CTAs' },
      { id: 'compat-table', role: 'laptop×accessory compatibility matrix + technical FAQ (hidden by default)' },
      { id: 'reviews', role: 'expert reviews' },
      NEWSLETTER,
      PROMO,
      FOOTER,
    ],
  },
}
