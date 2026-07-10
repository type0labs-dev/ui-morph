import { byCategory, bySku } from './catalog.ts'
import { addToCart, cart, cartTotal, clearCart } from './cart.ts'
import { logEvent } from './session-log.ts'

// Funnel wiring: renders cart lines / order summaries / upsells into the
// step pages and records funnel events (add_to_cart, checkout_step, purchase)
// into the session log.

function money(n: number): string {
  return `$${n.toLocaleString()}`
}

function renderCartSlots(): void {
  const lines = document.querySelector<HTMLElement>('[data-slot="cart-lines"]')
  const total = document.querySelector<HTMLElement>('[data-slot="cart-total"]')
  if (!lines || !total) return
  const entries = Object.entries(cart())
  if (entries.length === 0) {
    lines.innerHTML = `<p class="dim-note">Your cart is empty — <a href="/products.html">see the lineup</a>.</p>`
    total.textContent = ''
    return
  }
  lines.innerHTML = entries
    .map(([sku, qty]) => {
      const p = bySku(sku)
      if (!p) return ''
      const price = p.deal ?? p.price
      return `<div class="cart-line"><img src="${p.photo}" alt="" /><span>${p.name}${qty > 1 ? ` ×${qty}` : ''}</span><b>${money(price * qty)}</b></div>`
    })
    .join('')
  total.innerHTML = `Total <b>${money(cartTotal())}</b> · free shipping`
}

function renderUpsell(): void {
  const slot = document.querySelector<HTMLElement>('[data-slot="upsell"]')
  if (!slot) return
  const inCart = new Set(Object.keys(cart()))
  const picks = byCategory('gear').filter((p) => !inCart.has(p.sku)).slice(0, 3)
  slot.innerHTML = picks
    .map(
      (p) =>
        `<cds-tile><img src="${p.photo}" alt="${p.name}" /><h3>${p.name}</h3><p>${money(p.deal ?? p.price)}</p><cds-button size="sm" kind="tertiary" href="/product.html?sku=${p.sku}">Details</cds-button></cds-tile>`,
    )
    .join('')
}

/** Per-page funnel behavior. Call after static render, before morph.start. */
export function initFunnel(pathname: string, productSku?: string): void {
  renderCartSlots()
  renderUpsell()

  if (pathname === '/product.html' && productSku) {
    document.querySelector('[data-morph="cta-buy"]')?.addEventListener('click', () => {
      addToCart(productSku)
      logEvent('add_to_cart', { sku: productSku })
    })
  }
  if (pathname === '/cart.html') logEvent('checkout_step', { step: 'cart', items: cart(), total: cartTotal() })
  if (pathname === '/checkout.html') logEvent('checkout_step', { step: 'signup' })
  if (pathname === '/payment.html') logEvent('checkout_step', { step: 'payment', total: cartTotal() })
  if (pathname === '/done.html') {
    logEvent('purchase', { items: cart(), total: cartTotal() })
    clearCart() // summary already rendered above; a reload shows an empty order, honestly
  }
}
