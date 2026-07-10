// Search terms as first-party signals — the store's OWN data, in the store's
// own storage. Two honest inlets: the landing URL of a shopping-ad click
// (?utm_term=…; organic Google stopped passing the query in referrers ~2013)
// and the in-store search box. Site rules (demo/salesman.ts) read the store;
// the engine never sees raw terms, only the quantized traits they produce.

const KEY = 'nova:search-terms'

/** Landing-URL inlet: ?utm_term=laptop+fino+branco or ?q=… */
export function ingestSearchFromUrl(): void {
  const term = new URLSearchParams(location.search).get('utm_term') ?? new URLSearchParams(location.search).get('q')
  if (term) recordSearch(term)
}

export function recordSearch(term: string): void {
  const prev = sessionStorage.getItem(KEY)
  sessionStorage.setItem(KEY, prev && !prev.includes(term) ? `${prev} ${term}` : (prev ?? term))
}

/** In-store search box, slotted into the UI Shell header. */
export function mountSearchBox(): void {
  const header = document.querySelector('cds-header')
  if (!header) return
  const form = document.createElement('form')
  form.className = 'nova-search'
  form.innerHTML = `<input type="search" placeholder="Search the store" aria-label="Search the store" />`
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const value = form.querySelector('input')!.value.trim()
    if (!value) return
    recordSearch(value)
    location.href = '/products.html'
  })
  header.appendChild(form)
}
