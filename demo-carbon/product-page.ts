import { bySku, byCategory, DEFAULT_SKU, type Product } from './catalog.ts'

// Fills the sku-parameterized detail template from the catalog. Static render
// at page load, BEFORE the engine applies any chain: the data-morph skeleton
// never changes, only its content — so one manifest shape serves every sku
// while chains stay keyed per product.

const REVIEWS: Record<Product['category'], [string, string][]> = {
  laptops: [
    ['“Completely silent. You forget it is on.”', 'laptopbench.io'],
    ['“Battery numbers match the brochure. Rare.”', 'dailycarry'],
  ],
  gear: [
    ['“Does exactly what it says, no driver drama.”', 'gearlab.gg'],
    ['“Build quality above its price class.”', 'padreview'],
  ],
}

export function currentSku(): string {
  return new URLSearchParams(location.search).get('sku') ?? DEFAULT_SKU
}

export function renderProductPage(): Product {
  const product = bySku(currentSku()) ?? bySku(DEFAULT_SKU)!
  const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`)

  document.title = `${product.name} — NOVA · ui-morph × Carbon`
  slot('crumb-cat')!.textContent = product.category === 'laptops' ? 'Laptops' : 'Gear'
  slot('crumb-cat')!.setAttribute('href', product.category === 'laptops' ? '/products.html' : '/accessories.html')
  slot('crumb-name')!.textContent = product.name
  slot('name')!.textContent = product.name
  slot('blurb')!.textContent = product.blurb
  slot('price')!.innerHTML = product.deal
    ? `<s>$${product.price.toLocaleString()}</s> <b>$${product.deal.toLocaleString()}</b> · deal of the week`
    : `<b>from $${product.price.toLocaleString()}</b> · free shipping`

  const picker = document.querySelector<HTMLElement>('[data-morph="color-picker"]')!
  if (product.colors?.length) {
    picker.hidden = false
    for (const chip of picker.querySelectorAll<HTMLElement>('.chip')) chip.hidden = !product.colors.includes(chip.dataset.color!)
  }

  slot('dims')!.innerHTML = product.specs
    .slice(0, 4)
    .map(([k, v]) => `<span><b>${v}</b> ${k.toLowerCase()}</span>`)
    .join('')

  slot('specs-rows')!.innerHTML = product.specs
    .map(
      ([k, v]) =>
        `<cds-structured-list-row><cds-structured-list-cell>${k}</cds-structured-list-cell><cds-structured-list-cell>${v}</cds-structured-list-cell></cds-structured-list-row>`,
    )
    .join('')
  slot('specs-line')!.textContent = product.specs.map(([k, v]) => `${k}: ${v}`).join(' · ')

  const mates = byCategory(product.category).filter((p) => p.sku !== product.sku).slice(0, 2)
  slot('gallery')!.innerHTML = [product, ...mates]
    .map((p) => `<img src="${p.photo}" alt="${p.name}" />`)
    .join('')

  slot('size-label')!.textContent = `${product.name} — closed profile`

  slot('reviews')!.innerHTML = REVIEWS[product.category]
    .map(([quote, who]) => `<cds-tile><blockquote>${quote}</blockquote><p class="who">— ${who}</p></cds-tile>`)
    .join('')

  return product
}
