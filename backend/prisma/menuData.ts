/**
 * Menu data — nguồn sự thật: bản in "MENU (1).pdf" (Canva, 07/2026).
 * Dùng chung cho prisma/seed.ts (fresh DB) và scripts/replaceMenu.ts (thay menu sống).
 *
 * Ảnh: trích từ chính PDF → frontend public/menu/<slug>.jpg (commit vào repo,
 * Next serve build-time). Erdnuss Soße dùng chung ảnh với Thai Curry — đúng như bản in.
 */

export interface DishSeed {
  slug:          string
  nameVi:        string
  descriptionVi: string | null
  price:         number
  imageUrl:      string | null
  isFeatured?:   boolean
  variants?:     Array<{ label: string; labelEn: string; priceDelta: number }>
}

export interface CategorySeed {
  slug:         string
  nameVi:       string
  nameEn:       string
  displayOrder: number
  dishes:       DishSeed[]
}

const IMG = (slug: string) => `/menu/${slug}.jpg`

// ---- Variant sets (giá = base + delta) ----

/** Tofu / Hähnchen / Garnelen — cùng giá (Sommerrollen, Tom Yum) */
const VAR3 = [
  { label: 'Tofu',            labelEn: 'Tofu',    priceDelta: 0 },
  { label: 'Hähnchenfleisch', labelEn: 'Chicken', priceDelta: 0 },
  { label: 'Garnelen',        labelEn: 'Shrimp',  priceDelta: 0 },
]

/** Pho / Pho Xao: 13,90 / 14,90 / 15,90 */
const VAR_PHO = [
  { label: 'Tofu',            labelEn: 'Tofu',    priceDelta: 0 },
  { label: 'Hähnchenfleisch', labelEn: 'Chicken', priceDelta: 1 },
  { label: 'Rindfleisch',     labelEn: 'Beef',    priceDelta: 2 },
]

/** Soßen-Gerichte 20–24 + Pad Thai: 11,90 / 12,90 / 12,90 / 14,90 / 14,90 / 14,90 */
const VAR_SAUCE = [
  { label: 'Tofu',                    labelEn: 'Tofu',          priceDelta: 0 },
  { label: 'Hähnchen',                labelEn: 'Chicken',       priceDelta: 1 },
  { label: 'Frittiertes Hähnchen',    labelEn: 'Fried chicken', priceDelta: 1 },
  { label: 'Knusprig gebratene Ente', labelEn: 'Crispy duck',   priceDelta: 3 },
  { label: 'Gebratenes Rindfleisch',  labelEn: 'Roasted beef',  priceDelta: 3 },
  { label: 'Garnelen',                labelEn: 'Shrimp',        priceDelta: 3 },
]

/** Reis-/Nudelgerichte C1–C8, M1–M8: 10,90 … 16,90 */
const VAR_REIS_NUDEL = [
  { label: 'Tofu',                          labelEn: 'Tofu',                        priceDelta: 0 },
  { label: 'Gemüse',                        labelEn: 'Vegetables',                  priceDelta: 0 },
  { label: 'Hähnchen',                      labelEn: 'Chicken',                     priceDelta: 2 },
  { label: 'Panierte Hühnerbrust',          labelEn: 'Breaded chicken breast',      priceDelta: 2 },
  { label: 'Knusprig Ente',                 labelEn: 'Crispy duck',                 priceDelta: 4 },
  { label: 'Rindfleisch',                   labelEn: 'Beef',                        priceDelta: 4 },
  { label: 'Garnelen',                      labelEn: 'Shrimp',                      priceDelta: 4 },
  { label: 'Mix (Rind, Garnelen, Hähnchen)', labelEn: 'Mix (beef, shrimp, chicken)', priceDelta: 6 },
]

/** Yaki Udon U1–U7: 12,00 / 14,00 / 17,00 */
const VAR_UDON = [
  { label: 'Tofu',                 labelEn: 'Tofu',                   priceDelta: 0 },
  { label: 'Gemüse',               labelEn: 'Vegetables',             priceDelta: 0 },
  { label: 'Hähnchen',             labelEn: 'Chicken',                priceDelta: 2 },
  { label: 'Panierte Hühnerbrust', labelEn: 'Breaded chicken breast', priceDelta: 2 },
  { label: 'Knusprig Ente',        labelEn: 'Crispy duck',            priceDelta: 5 },
  { label: 'Rindfleisch',          labelEn: 'Beef',                   priceDelta: 5 },
  { label: 'Garnelen',             labelEn: 'Shrimp',                 priceDelta: 5 },
]

/** Reis oder Bun — cùng giá (Bo Kho Chay, Ga Xao Sa Ot) */
const VAR_REIS_BUN = [
  { label: 'Reis',              labelEn: 'Rice',                priceDelta: 0 },
  { label: 'Bun (Reisnudeln)',  labelEn: 'Bun (rice noodles)',  priceDelta: 0 },
]

// ---- Menu ----

export const MENU: CategorySeed[] = [
  {
    slug: 'vorspeisen', nameVi: 'Vorspeisen', nameEn: 'Starters', displayOrder: 1,
    dishes: [
      { slug: 'wan-tan',            nameVi: 'Knusprig gebackene Wan-Tan',  descriptionVi: '5 Stk. — Gefüllte Teigtaschen mit süß-sauer Sauce', price: 6.90, imageUrl: IMG('wan-tan'), isFeatured: true },
      { slug: 'gyoza',              nameVi: 'Gyoza',                       descriptionVi: '5 Stk. — Frittierte Teigtaschen mit Hähnchenfleisch- und Gemüsefüllung, serviert mit süß-saurem Dip', price: 6.90, imageUrl: IMG('gyoza') },
      { slug: 'gyoza-veggie',       nameVi: 'Gyoza Veggie',                descriptionVi: '5 Stk. — Vegetarische Gyoza mit Gemüsefüllung', price: 6.90, imageUrl: IMG('gyoza-veggie') },
      { slug: 'mini-rollen',        nameVi: 'Mini-Rollen',                 descriptionVi: '7 Stk. — Tofu, Karotten, Sojasprossen, Reisnudeln (vegetarisch)', price: 6.90, imageUrl: IMG('mini-rollen') },
      { slug: 'nem-chay',           nameVi: 'Nem Chay',                    descriptionVi: '3 Stk. — Hausgemachte vietnamesische Frühlingsrollen, gefüllt mit Glasnudeln, China-Pilzen, Morcheln und Karotten, serviert mit süß-saurem Dip (vegane Füllung)', price: 6.90, imageUrl: IMG('nem-chay') },
      { slug: 'edamame',            nameVi: 'Edamame',                     descriptionVi: 'Grüne Bohnen mit Meersalz', price: 6.90, imageUrl: IMG('edamame') },
      { slug: 'pommes',             nameVi: 'Pommes Frites',               descriptionVi: 'Knusprige Pommes Frites', price: 6.90, imageUrl: IMG('pommes') },
      { slug: 'ha-cao',             nameVi: 'Ha Cao',                      descriptionVi: 'Gedämpfte Teigtaschen mit Garnelenfüllung', price: 6.90, imageUrl: IMG('ha-cao') },
      { slug: 'sommerrollen',       nameVi: 'Sommerrollen mit Salat',      descriptionVi: 'Reisnudeln, geröstete Schalotten, Gurke, Reispapier mit süß-sauer Soße', price: 6.90, imageUrl: IMG('sommerrollen'), variants: VAR3 },
      { slug: 'gebratene-garnelen', nameVi: 'Gebratene Garnelen',          descriptionVi: '2 Stk. — Grüne Reisflöckchen, Garnelen, süß-sauer Soße', price: 8.90, imageUrl: IMG('gebratene-garnelen') },
      { slug: 'vorspeise-platte',   nameVi: 'Gemischte Vorspeise-Platte',  descriptionVi: 'Eine Variation aus unseren Vorspeisen: 2 Stk. Sommerrollen · 2 Stk. Nem Chay · 2 Stk. Gebratene Garnelen · 5 Stk. Gyoza · 4 Stk. Wan-Tan', price: 18.90, imageUrl: IMG('vorspeise-platte'), isFeatured: true },
    ],
  },
  {
    slug: 'suppen', nameVi: 'Suppen', nameEn: 'Soups', displayOrder: 2,
    dishes: [
      { slug: 'peking-suppe', nameVi: 'Peking-Suppe',  descriptionVi: 'Sauer-scharf', price: 7.90, imageUrl: IMG('peking-suppe') },
      { slug: 'wantan-suppe', nameVi: 'Wantan Suppe',  descriptionVi: '4 Stk. — Hähnchenfleisch, Garnelen, Zucchini, Brokkoli', price: 7.90, imageUrl: IMG('wantan-suppe') },
      { slug: 'tom-yum',      nameVi: 'Tom Yum Suppe', descriptionVi: 'Tom Yum, Zucchini, Brokkoli, Karotten, Champignons', price: 7.90, imageUrl: IMG('tom-yum'), variants: VAR3 },
    ],
  },
  {
    slug: 'salate', nameVi: 'Salate', nameEn: 'Salads', displayOrder: 3,
    dishes: [
      { slug: 'gemischter-salat', nameVi: 'Gemischter Salat',      descriptionVi: null, price: 9.90, imageUrl: IMG('salat') },
      { slug: 'tomatensalat',     nameVi: 'Tomatensalat',          descriptionVi: null, price: 9.90, imageUrl: IMG('salat') },
      { slug: 'haehnchen-salat',  nameVi: 'Hühnerfleisch-Salat',   descriptionVi: null, price: 10.90, imageUrl: IMG('salat') },
      { slug: 'garnelen-salat',   nameVi: 'Garnelen-Salat',        descriptionVi: null, price: 10.90, imageUrl: IMG('salat') },
    ],
  },
  {
    slug: 'hauptgerichte', nameVi: 'Hauptgerichte', nameEn: 'Main dishes', displayOrder: 4,
    dishes: [
      { slug: 'pho',               nameVi: 'Pho',                        descriptionVi: 'Traditionelle 5-Kräuter-Brühe, Reisbandnudel-Suppe mit frischem Koriander, Frühlingszwiebeln und Sojasprossen', price: 15.90, imageUrl: IMG('pho'), isFeatured: true, variants: VAR_PHO },
      { slug: 'pho-xao',           nameVi: 'Pho Xao',                    descriptionVi: 'Gebratene Reisbandnudeln mit Gemüse', price: 15.90, imageUrl: IMG('pho-xao'), variants: VAR_PHO },
      { slug: 'bun-bo-nam-bo',     nameVi: 'Bun Bo Nam Bo',              descriptionVi: 'Reisnudeln, Salat, hausgemachte Soße, geröstete Schalotten, Erdnüsse, Gurke, Koriander, Sojasprossen, Rindfleisch', price: 17.90, imageUrl: IMG('bun-bo-nam-bo'), isFeatured: true },
      { slug: 'bun-nem-chay',      nameVi: 'Bun Nem Chay',               descriptionVi: 'Frittierte vegane Frühlingsrollen auf warmen Reisnudeln mit Wildkräuter-Salat, verfeinert mit Koriander, gerösteten Zwiebeln und zerstoßenen Erdnüssen, serviert mit Sojasoße', price: 15.90, imageUrl: IMG('bun-nem-chay') },
      { slug: 'bun-tofu',          nameVi: 'Bun Tofu',                   descriptionVi: 'Im Wok gebratener Bio-Tofu auf warmen Reisnudeln mit Sojasprossen, Karotten, Wildkräuter-Salat, verfeinert mit Koriander, gerösteten Zwiebeln und zerstoßenen Erdnüssen, serviert mit Sojasoße', price: 15.90, imageUrl: IMG('bun-tofu') },
      { slug: 'thai-curry',        nameVi: 'Thai Curry',                 descriptionVi: 'Zu Reis — Gemüse, Chili, Salat, Zitronengras', price: 13.90, imageUrl: IMG('thai-curry'), isFeatured: true, variants: VAR_SAUCE },
      { slug: 'kung-pao',          nameVi: 'Kung Pao Soße',              descriptionVi: 'Grünes Gemüse, Reis', price: 13.90, imageUrl: IMG('kung-pao'), variants: VAR_SAUCE },
      { slug: 'suess-sauer-ananas', nameVi: 'Süß-sauer Soße mit Ananas', descriptionVi: 'Grünes Gemüse, Reis', price: 13.90, imageUrl: IMG('suess-sauer-ananas'), variants: VAR_SAUCE },
      { slug: 'mango-sosse',       nameVi: 'Mango Soße',                 descriptionVi: 'Grünes Gemüse, Reis', price: 13.90, imageUrl: IMG('mango-sosse'), variants: VAR_SAUCE },
      { slug: 'erdnuss-sosse',     nameVi: 'Erdnuss Soße',               descriptionVi: 'Grünes Gemüse, Reis', price: 13.90, imageUrl: IMG('erdnuss-sosse'), variants: VAR_SAUCE },
      { slug: 'eier-reis',         nameVi: 'Gebratene Eier-Reis-Gerichte', descriptionVi: 'Gebratener Reis mit Ei', price: 12.90, imageUrl: IMG('eier-reis'), variants: VAR_REIS_NUDEL },
      { slug: 'nudel-gerichte',    nameVi: 'Gebratene Nudelgerichte',    descriptionVi: 'Gebratene Nudeln mit Ei, Sojasprossen und Zwiebeln', price: 12.90, imageUrl: IMG('nudel-gerichte'), variants: VAR_REIS_NUDEL },
      { slug: 'yaki-udon',         nameVi: 'Yaki Udon',                  descriptionVi: 'Mit Gemüse, Karotten, Sojasprossen, Frühlingszwiebeln, Paprika', price: 14.00, imageUrl: IMG('yaki-udon'), variants: VAR_UDON },
      { slug: 'pad-thai',          nameVi: 'Pad Thai',                   descriptionVi: 'Gebratene Reisbandnudeln nach Thai-Art mit Erdnüssen und Limette', price: 13.90, imageUrl: IMG('pad-thai'), isFeatured: true, variants: VAR_SAUCE },
      { slug: 'bo-kho-chay',       nameVi: 'Bo Kho Chay (vegan)',        descriptionVi: 'Veganes vietnamesisches „Beef“-Stew mit Zitronengras (wenig scharf) — Pilze, Shiitake, Karotten, Enoki, Kräuterseitling, Tofu. Mit Salat, Gurke, Tomate', price: 16.90, imageUrl: IMG('bo-kho-chay'), isFeatured: true, variants: VAR_REIS_BUN },
      { slug: 'ga-xao-sa-ot',      nameVi: 'Ga Xao Sa Ot',               descriptionVi: 'Gebratenes Hähnchen mit Zitronengras und Chili. Mit Salat, Gurke, Tomate', price: 16.90, imageUrl: IMG('ga-xao-sa-ot'), variants: VAR_REIS_BUN },
      { slug: 'tom-rang-bo-toi',   nameVi: 'Tom Rang Bo Toi',            descriptionVi: 'Garnelen in Knoblauchbutter. Mit Salat, Gurke und Reis', price: 17.90, imageUrl: IMG('tom-rang-bo-toi') },
      { slug: 'rau-xao-thap-cam',  nameVi: 'Rau Xao Thap Cam (vegan)',   descriptionVi: 'Gemischtes gebratenes Gemüse — Brokkoli, Karotten, Paprika, Zucchini, Zwiebel, Champignons', price: 14.90, imageUrl: IMG('rau-xao-thap-cam') },
      { slug: 'curry-tofu',        nameVi: 'Curry Tofu (vegan)',         descriptionVi: 'Tofu mit Zitronengras und Chili in gelber Curry-Soße (wenig scharf). Mit Gemüse', price: 15.90, imageUrl: IMG('curry-tofu') },
      // 34–35 bổ sung 08/2026 — chưa có ảnh, admin upload qua UI (/dishes/…)
      { slug: 'bun-rieu',          nameVi: 'Bun Rieu (leicht scharf)',   descriptionVi: 'Vietnamesische Suppe mit Krabbenfleisch — Reisnudeln, frittierter Tofu, Tomaten, Rind, Frühlingszwiebeln, Zitronengras, Basilikum', price: 18.90, imageUrl: null },
      { slug: 'bun-bo-hue',        nameVi: 'Bun Bo Hue (leicht scharf)', descriptionVi: 'Würzige Rindfleischsuppe — Reisnudeln, Rind, Frühlingszwiebeln, Zitronengras, Basilikum', price: 18.90, imageUrl: null },
    ],
  },
]
