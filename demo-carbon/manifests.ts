import type { PageManifest } from '../src/index.ts'

// NOVA 3.0 manifests — denser vocabulary than MVP1's (which stays frozen in
// demo/manifests.ts). Changing this file changes the manifest hash, which
// kills every previously compiled chain for these routes: designed behavior.
// Same three routes, so the salesman module (objectives/paths/themes) is
// untouched.

const THEME = { id: 'theme', role: 'page design-token theme', variants: ['default', 'tech-savvy', 'gamer', 'comfort'] }
const NAV = { id: 'nav', role: 'site navigation header (Carbon UI Shell)', protected: true }
const FOOTER = { id: 'footer', role: 'footer columns', protected: true }
const PROMO = { id: 'promo-banner', role: 'seasonal discount banner' }
const NEWSLETTER = { id: 'newsletter', role: 'newsletter subscription band' }
const ARTICLES = { id: 'articles-teaser', role: 'technical articles (benchmarks, teardowns)' }

/** One manifest shape for every product — chains keyed per sku via the route. */
export function productManifest(sku: string): PageManifest {
  return {
    route: `/product.html?sku=${sku}`,
    entries: [
      THEME,
      NAV,
      { id: 'overview', role: 'product title, price and short pitch' },
      { id: 'color-picker', role: 'color selection', variants: ['silver', 'white', 'black'] },
      { id: 'cta-buy', role: 'primary buy button' },
      { id: 'dimensions', role: 'headline specs highlight strip' },
      { id: 'gallery', role: 'product photo gallery' },
      { id: 'size-compare', role: 'physical size comparison vs everyday objects (hidden by default)' },
      { id: 'specs-detail', role: 'full technical specifications', variants: ['expanded', 'collapsed'] },
      { id: 'reviews', role: 'expert reviews' },
      NEWSLETTER,
      PROMO,
      FOOTER,
    ],
  }
}

/** Resolve the manifest for any store URL (funnel pages + parameterized detail). */
export function manifestFor(pathname: string, search: string): PageManifest {
  if (pathname === '/product.html') {
    const sku = new URLSearchParams(search).get('sku') ?? 'nova-13-air'
    return productManifest(sku)
  }
  return MANIFESTS[pathname] ?? MANIFESTS['/index.html']!
}

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
      { id: 'card-13-air', role: 'NOVA 13 Air card — thinnest model, comes in white' },
      { id: 'comparison', role: 'side-by-side spec comparison table (hidden by default)' },
      { id: 'gear-teaser', role: 'accessory cross-sell strip' },
      { id: 'testimonials', role: 'social proof quotes' },
      ARTICLES,
      NEWSLETTER,
      PROMO,
      FOOTER,
    ],
  },
  '/cart.html': {
    route: '/cart.html',
    entries: [
      THEME,
      NAV,
      { id: 'cart-items', role: 'cart line items with totals' },
      { id: 'upsell', role: 'cross-sell suggestions strip' },
      { id: 'shipping-note', role: 'shipping and returns reassurance', variants: ['short', 'detailed'] },
      { id: 'cta-checkout', role: 'proceed to checkout button' },
      PROMO,
      FOOTER,
    ],
  },
  '/checkout.html': {
    route: '/checkout.html',
    entries: [
      THEME,
      NAV,
      { id: 'signup-step', role: 'account step', variants: ['guest', 'account'] },
      { id: 'trust-badges', role: 'security / guarantee reassurance strip' },
      { id: 'cta-continue', role: 'continue to payment button' },
      FOOTER,
    ],
  },
  '/payment.html': {
    route: '/payment.html',
    entries: [
      THEME,
      NAV,
      { id: 'payment-methods', role: 'payment method selection', variants: ['pix', 'card', 'installments'] },
      { id: 'order-summary', role: 'order summary box' },
      { id: 'cta-pay', role: 'place order button' },
      FOOTER,
    ],
  },
  '/done.html': {
    route: '/done.html',
    entries: [
      THEME,
      NAV,
      { id: 'confirmation', role: 'order confirmation summary' },
      { id: 'next-steps', role: 'post-purchase suggestions', variants: ['setup-guides', 'more-gear'] },
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
