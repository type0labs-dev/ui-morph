// The NOVA catalog — every product in the store, both categories. One source
// of truth: listings, the sku-parameterized detail page, the cart and the
// salesman's sku prediction all read from here. All content original.

export interface Product {
  sku: string
  name: string
  category: 'laptops' | 'gear'
  price: number
  /** deal price when the product is in the weekly deals strip */
  deal?: number
  photo: string
  blurb: string
  specs: [string, string][]
  /** laptops come in colors; gear doesn't */
  colors?: string[]
  tags: { label: string; type: string }[]
}

export const CATALOG: Product[] = [
  {
    sku: 'nova-13',
    name: 'NOVA 13',
    category: 'laptops',
    price: 1299,
    photo: '/img/laptop-nova13.jpg',
    blurb: 'The everyday ultralight. One kilo of everything you need.',
    specs: [['CPU', '10-core, 5.0GHz boost'], ['Memory', '32GB LPDDR5X'], ['Display', '13.4″ 2560×1600'], ['Battery', '63Wh · 14h'], ['Ports', '2×TB4']],
    colors: ['silver', 'black'],
    tags: [{ label: 'ultralight', type: 'blue' }],
  },
  {
    sku: 'nova-13-air',
    name: 'NOVA 13 Air',
    category: 'laptops',
    price: 1099,
    deal: 989,
    photo: '/img/laptop-nova13-air.jpg',
    blurb: "The thinnest NOVA ever. Silent, fanless, and light enough to forget it's in the bag.",
    specs: [['CPU', '8-core, 4.4GHz boost, fanless'], ['Memory', '16GB LPDDR5X'], ['Display', '13.4″ 2560×1600'], ['Battery', '52Wh · 18h'], ['Ports', '2×TB4']],
    colors: ['silver', 'white', 'black'],
    tags: [{ label: 'fanless', type: 'teal' }, { label: 'white', type: 'cool-gray' }],
  },
  {
    sku: 'nova-15',
    name: 'NOVA 15',
    category: 'laptops',
    price: 1699,
    deal: 1359,
    photo: '/img/laptop-nova15.jpg',
    blurb: 'The best seller. Desktop replacement without the desk.',
    specs: [['CPU', '12-core, 5.1GHz boost'], ['Memory', '64GB LPDDR5X'], ['Display', '15.6″ 2880×1800'], ['Battery', '84Wh · 15h'], ['Ports', '3×TB4 + HDMI']],
    colors: ['silver', 'black'],
    tags: [{ label: 'best seller', type: 'blue' }],
  },
  {
    sku: 'nova-15-pro',
    name: 'NOVA 15 Pro',
    category: 'laptops',
    price: 2099,
    photo: '/img/laptop-nova15-pro.jpg',
    blurb: 'The 15, plus a discrete GPU. Renders, trains and games.',
    specs: [['CPU', '12-core, 5.1GHz boost'], ['GPU', 'RTX-class dGPU'], ['Memory', '64GB LPDDR5X'], ['Display', '15.6″ 2880×1800 120Hz'], ['Battery', '84Wh · 11h']],
    colors: ['silver', 'black'],
    tags: [{ label: 'RTX-class', type: 'purple' }],
  },
  {
    sku: 'nova-17',
    name: 'NOVA 17',
    category: 'laptops',
    price: 2199,
    photo: '/img/laptop-nova17.jpg',
    blurb: 'Desktop-class canvas. The workstation that travels.',
    specs: [['CPU', '12-core, 5.1GHz sustained'], ['Memory', '64GB LPDDR5X'], ['Display', '17.3″ 3072×1920'], ['Battery', '99Wh · 18h'], ['Ports', '3×TB4 + HDMI + SD']],
    colors: ['silver', 'black'],
    tags: [{ label: 'desktop-class', type: 'blue' }],
  },
  {
    sku: 'nova-17-creator',
    name: 'NOVA 17 Creator',
    category: 'laptops',
    price: 2599,
    photo: '/img/laptop-nova17-creator.jpg',
    blurb: 'Color-true panel, dGPU, and thermals that never throttle.',
    specs: [['CPU', '12-core, 5.1GHz sustained'], ['GPU', 'RTX-class dGPU'], ['Display', '17.3″ 100% DCI-P3'], ['Memory', '64GB LPDDR5X'], ['Battery', '99Wh · 12h']],
    colors: ['silver', 'black'],
    tags: [{ label: '100% DCI-P3', type: 'purple' }],
  },
  {
    sku: 'gear-headset',
    name: 'VOID Headset',
    category: 'gear',
    price: 199,
    deal: 169,
    photo: '/img/gear-headset.jpg',
    blurb: 'Wireless, 38 hours measured, 18ms in 2.4GHz mode.',
    specs: [['Radio', '2.4GHz + BT'], ['Latency', '18ms (2.4GHz)'], ['Battery', '38h measured'], ['Weight', '278g']],
    tags: [{ label: 'all models', type: 'green' }],
  },
  {
    sku: 'gear-gpu-dock',
    name: 'CORE GPU Dock',
    category: 'gear',
    price: 349,
    photo: '/img/gear-dock.jpg',
    blurb: 'eGPU over TB4. Turns the 13 into a desktop, zero driver drama.',
    specs: [['Interface', 'TB4'], ['GPU support', 'up to RTX-class'], ['PSU', '230W included'], ['Charging', '100W passthrough']],
    tags: [{ label: 'TB4 required', type: 'purple' }],
  },
  {
    sku: 'gear-hub',
    name: 'SPAN Hub',
    category: 'gear',
    price: 89,
    photo: '/img/gear-hub.jpg',
    blurb: '10-in-1, dual 4K out, 100W power delivery.',
    specs: [['Ports', '10-in-1'], ['Video', 'dual 4K60'], ['PD', '100W'], ['Body', 'aluminum']],
    tags: [{ label: 'all models', type: 'green' }],
  },
  {
    sku: 'gear-keyboard',
    name: 'KEYS Board',
    category: 'gear',
    price: 149,
    photo: '/img/gear-keyboard.jpg',
    blurb: 'Low-profile mechanical, hot-swappable, silent enough for calls.',
    specs: [['Switches', 'low-profile, hot-swap'], ['Radio', 'BT/2.4GHz/USB-C'], ['Battery', '6 weeks'], ['Layout', 'ANSI/ISO']],
    tags: [{ label: 'all models', type: 'green' }],
  },
  {
    sku: 'gear-controller',
    name: 'APEX Controller',
    category: 'gear',
    price: 79,
    photo: '/img/gear-controller.jpg',
    blurb: 'Hall-effect sticks at this price is absurd. 1000Hz over 2.4GHz.',
    specs: [['Sticks', 'hall-effect'], ['Polling', '1000Hz (2.4GHz)'], ['Battery', '40h'], ['Radio', 'BT/2.4GHz']],
    tags: [{ label: 'gamer pick', type: 'purple' }],
  },
  {
    sku: 'gear-case',
    name: 'SHELL Case',
    category: 'gear',
    price: 59,
    photo: '/img/gear-case.jpg',
    blurb: 'Recycled ballistic nylon, fits every NOVA size.',
    specs: [['Material', 'recycled ballistic nylon'], ['Fits', '13″–17″'], ['Pockets', '4'], ['Warranty', 'lifetime']],
    tags: [{ label: '13″–17″', type: 'green' }],
  },
]

export const bySku = (sku: string): Product | undefined => CATALOG.find((p) => p.sku === sku)
export const byCategory = (c: Product['category']): Product[] => CATALOG.filter((p) => p.category === c)
export const DEFAULT_SKU = 'nova-13-air'
