import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Multi-page build so `vite build demo-carbon` emits every store page with
// its CSS as a real <link> in <head> — the dev-mode FOUC (styles injected by
// JS after the module graph loads) does not exist in the built demo.
const page = (name: string) => resolve(__dirname, `${name}.html`)

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page('index'),
        entry: page('entry'),
        products: page('products'),
        accessories: page('accessories'),
        product: page('product'),
        cart: page('cart'),
        checkout: page('checkout'),
        payment: page('payment'),
        done: page('done'),
      },
    },
  },
})
