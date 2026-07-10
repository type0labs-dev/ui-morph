import { bySku } from './catalog.ts'

// Demo-side cart — real state, honest scope: localStorage only, nothing sent
// anywhere. The salesman reads it (cart-holder trait) the same way it reads
// search terms: site-owned first-party evidence.

const KEY = 'nova:cart'

export type Cart = Record<string, number> // sku → qty

export function cart(): Cart {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Cart
  } catch {
    return {}
  }
}

export function addToCart(sku: string): void {
  const c = cart()
  c[sku] = (c[sku] ?? 0) + 1
  localStorage.setItem(KEY, JSON.stringify(c))
}

export function clearCart(): void {
  localStorage.removeItem(KEY)
}

export function cartCount(): number {
  return Object.values(cart()).reduce((s, q) => s + q, 0)
}

export function cartTotal(): number {
  return Object.entries(cart()).reduce((s, [sku, qty]) => {
    const p = bySku(sku)
    return s + (p ? (p.deal ?? p.price) * qty : 0)
  }, 0)
}
