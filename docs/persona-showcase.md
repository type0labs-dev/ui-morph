# Persona showcase — the same store, five different pages

> Generated from **real captured runs** (deterministic mock cold path,
> fake-clock scripted sessions) — every row below is an op the engine
> actually applied, with the reason recorded at proposal time. To
> reproduce any of these live: `npm run demo:carbon`, use the inspector's
> **⟲ reset demo**, and follow the persona's entry/actions.

## Gamer técnico — orgânico, fuça specs e gear

Persona final: `defined|evaluate|gamer+scanner+search-led+technical|ignored-cta`

### home (1ª página — nada a aplicar ainda)

Rota `/index.html` · cache: **miss (cold compile p/ próxima visita)** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### listagem de laptops

Rota `/products.html` · cache: **exact** · tema: **tech-savvy**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"tech-savvy"}` | technical/reader trait → g90 tokens, data-first |
| `{"op":"swap-variant","target":"hero","variant":"technical"}` | technical persona → numbers, not adjectives |
| `{"op":"show","target":"comparison"}` | technical persona → comparison data upfront |
| `{"op":"reorder","target":"articles-teaser","before":"testimonials"}` | preferred content pattern: technical > social proof (sketch 02) |

### listagem de gear

Rota `/accessories.html` · cache: **similar 0.93** · tema: **gamer**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"gamer"}` | gamer trait → g100 tokens + purple accents |
| `{"op":"swap-variant","target":"hero","variant":"technical"}` | technical persona → numbers, not adjectives |
| `{"op":"show","target":"compat-table"}` | technical persona → compatibility matrix upfront |
| `{"op":"emphasize","target":"gear-grid","level":"strong"}` | gamer trait → gear first |

### detalhe do APEX Controller

Rota `/product.html?sku=gear-controller` · cache: **exact** · tema: **gamer**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"gamer"}` | gamer trait → g100 tokens + purple accents |
| `{"op":"hide","target":"promo-banner"}` | ignored-cta pain → cut promotional noise |
| `{"op":"hide","target":"newsletter"}` | ignored-cta pain → this visitor does not want CTAs |

## Dona Marta — anúncio "laptop fino branco presente" + sign-in

Persona final: `defined|evaluate|cart-holder+color-white+comfort+gift-buyer+scanner+search-led+thin-focus|ignored-cta`

### home (chegada do anúncio)

Rota `/index.html?utm_term=laptop+fino+branco+presente` · cache: **miss (cold compile p/ próxima visita)** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### listagem de laptops

Rota `/products.html` · cache: **exact** · tema: **comfort**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"comfort"}` | comfort trait → larger type, stronger contrast |
| `{"op":"emphasize","target":"card-13-air","level":"strong"}` | thinnest white model — exactly what she searched for |
| `{"op":"hide","target":"articles-teaser"}` | benchmark articles do not help a gift buyer |

### detalhe do NOVA 13 Air

Rota `/product.html?sku=nova-13-air` · cache: **exact** · tema: **comfort**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"comfort"}` | comfort trait → larger type, stronger contrast |
| `{"op":"reorder","target":"gallery","before":"specs-detail"}` | she buys with her eyes — images before data |
| `{"op":"show","target":"size-compare"}` | searched "fino" — show how thin, against everyday objects |
| `{"op":"swap-variant","target":"color-picker","variant":"white"}` | searched "branco" — preselect white |
| `{"op":"emphasize","target":"cta-buy","level":"strong"}` | one obvious next step, no hunting |
| `{"op":"swap-variant","target":"specs-detail","variant":"collapsed"}` | specs are noise for this persona — fold them away |

### carrinho

Rota `/cart.html` · cache: **similar 1.00** · tema: **comfort**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"comfort"}` | comfort trait → larger type, stronger contrast |
| `{"op":"swap-variant","target":"shipping-note","variant":"detailed"}` | comfort persona → reassurance spelled out in full |

### checkout (cadastro)

Rota `/checkout.html` · cache: **exact** · tema: **comfort**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"theme","variant":"comfort"}` | comfort trait → larger type, stronger contrast |
| `{"op":"swap-variant","target":"signup-step","variant":"guest"}` | gift/comfort buyer → no account friction, guest checkout first |

## Caçador de ofertas — anúncio "notebook barato promoção"

Persona final: `defined|evaluate|cart-holder+price-aware+scanner+search-led|ignored-cta`

### home

Rota `/index.html?utm_term=notebook+barato+promo%C3%A7%C3%A3o` · cache: **miss (cold compile p/ próxima visita)** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### listagem de laptops

Rota `/products.html` · cache: **exact** · tema: **default**

| mudança aplicada | por quê |
|---|---|
| `{"op":"emphasize","target":"deals-strip","level":"strong"}` | price-aware search → deals front and center |

### detalhe do NOVA 15 (deal -20%)

Rota `/product.html?sku=nova-15` · cache: **exact** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### carrinho

Rota `/cart.html` · cache: **similar 1.00** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### pagamento

Rota `/payment.html` · cache: **exact** · tema: **default**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"payment-methods","variant":"pix"}` | price-aware → the 5%-off method leads |

## Comparador — direto, revisita e compara

Persona final: `defined|compare|scanner|ignored-cta+search-loop`

### listagem, 3ª visita (intent compare)

Rota `/products.html` · cache: **similar 1.00** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### listagem, 4ª visita

Rota `/products.html` · cache: **exact** · tema: **default**

| mudança aplicada | por quê |
|---|---|
| `{"op":"swap-variant","target":"hero","variant":"technical"}` | technical persona → numbers, not adjectives |
| `{"op":"show","target":"comparison"}` | technical persona → comparison data upfront |
| `{"op":"reorder","target":"articles-teaser","before":"testimonials"}` | preferred content pattern: technical > social proof (sketch 02) |
| `{"op":"hide","target":"promo-banner"}` | ignored-cta pain → cut promotional noise |
| `{"op":"hide","target":"newsletter"}` | ignored-cta pain → this visitor does not want CTAs |

## Genérico — direto, sem interações

Persona final: `narrow|browse|-|-`

### home

Rota `/index.html` · cache: **miss (cold compile p/ próxima visita)** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

### listagem de laptops

Rota `/products.html` · cache: **exact** · tema: **default**

_Nenhuma mutação aplicada nesta página (sem chain para a persona no momento da chegada — o cold path compila para a próxima visita)._

## Lado a lado — o que cada persona vê de diferente

| persona | tema | hero | seções reveladas | seções removidas | funil |
|---|---|---|---|---|---|
| Gamer técnico | tech-savvy, gamer | técnico | comparison, compat-table | promo-banner, newsletter | — |
| Dona Marta | comfort | visual | size-compare | articles-teaser | shipping-note=detailed, signup-step=guest |
| Caçador de ofertas | default | visual | — | — | payment-methods=pix |
| Comparador | default | técnico | comparison | promo-banner, newsletter | — |
| Genérico | default | visual | — | — | — |

Mesma loja, mesmo engine, mesmos 5 ops — o que muda é somente a persona
quantizada que o cold path recebeu. Nenhuma dessas páginas foi desenhada à
mão para a persona: todas saíram do vocabulário declarado nos manifests.
