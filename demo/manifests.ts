import type { PageManifest } from '../src/index.ts'

// Shared by both demo frontends (MVP1 plain CSS and the Carbon store): same
// routes, same morphable vocabulary, same protected zones. The pages LOOK
// different; the contract the engine sees is identical — which is the point.

const THEME = { id: 'theme', role: 'page design-token theme', variants: ['default', 'tech-savvy', 'gamer'] }

export const MANIFESTS: Record<string, PageManifest> = {
  '/index.html': {
    route: '/index.html',
    entries: [
      THEME,
      { id: 'nav', role: 'site navigation', protected: true },
      { id: 'hero', role: 'landing hero', variants: ['visual', 'technical'] },
      { id: 'cta-hero', role: 'hero call-to-action' },
      { id: 'testimonials', role: 'social proof quotes' },
      { id: 'specs-teaser', role: 'technical specs preview table' },
      { id: 'promo-banner', role: 'seasonal discount banner' },
      { id: 'footer', role: 'footer', protected: true },
    ],
  },
  '/products.html': {
    route: '/products.html',
    entries: [
      THEME,
      { id: 'nav', role: 'site navigation', protected: true },
      { id: 'hero', role: 'catalog hero', variants: ['visual', 'technical'] },
      { id: 'product-grid', role: 'product cards with buy CTAs' },
      { id: 'comparison', role: 'side-by-side spec comparison table (hidden by default)' },
      { id: 'gear-teaser', role: 'accessory cross-sell strip' },
      { id: 'reviews', role: 'expert reviews' },
      { id: 'promo-banner', role: 'seasonal discount banner' },
      { id: 'footer', role: 'footer', protected: true },
    ],
  },
  '/accessories.html': {
    route: '/accessories.html',
    entries: [
      THEME,
      { id: 'nav', role: 'site navigation', protected: true },
      { id: 'hero', role: 'gear hero', variants: ['visual', 'technical'] },
      { id: 'gear-grid', role: 'accessory cards with add CTAs' },
      { id: 'compat-table', role: 'laptop×accessory compatibility matrix (hidden by default)' },
      { id: 'reviews', role: 'expert reviews' },
      { id: 'promo-banner', role: 'seasonal discount banner' },
      { id: 'footer', role: 'footer', protected: true },
    ],
  },
}
