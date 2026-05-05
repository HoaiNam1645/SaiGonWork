import type { MenuCategory } from '@/types'

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&auto=format&fit=crop&q=75`

// Curated food photography
const PHOTOS = {
  wantan: img('photo-1496116218417-1a781b1c416c'),
  gyoza: img('photo-1625938144755-652e08e359b7'),
  springrolls: img('photo-1606471191009-63994c53433b'),
  miniroll: img('photo-1576577445504-6af96477db52'),
  nemchay: img('photo-1606471191009-63994c53433b'),
  edamame: img('photo-1599056504888-fc8d72bf6ec0'),
  pommes: img('photo-1573080496219-bb080dd4f877'),
  yakitori: img('photo-1535473895227-bdecb20fb157'),
  sommerrollen: img('photo-1576577445504-6af96477db52'),
  garnelen: img('photo-1559847844-5315695dadae'),
  combo: img('photo-1547928576-b822bc410bdf'),
  pekingsuppe: img('photo-1547592180-85f173990554'),
  wantansuppe: img('photo-1569718212165-3a8278d5f624'),
  tomyum: img('photo-1569059078571-d0a1bd0d6c1e'),
  salad: img('photo-1546069901-ba9599a7e63c'),
  tomatensalat: img('photo-1607532941433-304659e8198a'),
  haehnchensalat: img('photo-1551248429-40975aa4de74'),
  garnelensalat: img('photo-1505253716362-afaea1d3d1af'),
  pho: img('photo-1582878826629-29b7ad1cdc43'),
  phoxao: img('photo-1612929633738-8fe44f7ec841'),
  bunbo: img('photo-1576577445504-6af96477db52'),
  bunvegan: img('photo-1565299585323-38d6b0865b47'),
  buntofu: img('photo-1559314809-0d155014e29e'),
  thaicurry: img('photo-1455619452474-d2be8b1e70cd'),
  kungpao: img('photo-1582878826629-29b7ad1cdc43'),
  suesssauer: img('photo-1604908176997-125f25cc6f3d'),
  saigon: img('photo-1633237308525-cd587cf71926'),
  friedrice: img('photo-1603133872878-684f208fb84b'),
  friednoodles: img('photo-1612929633738-8fe44f7ec841'),
  yakiudon: img('photo-1569058242253-92a9c755a0ec'),
  bibimbap: img('photo-1553163147-622ab57be1c7'),
  kinderhaehn: img('photo-1532550907401-a500c9a57435'),
  kinderreis: img('photo-1603133872878-684f208fb84b'),
  chuoichien: img('photo-1601493700631-2b16ec4b4716'),
}

export const menuCategories: MenuCategory[] = [
  {
    id: 'vorspeisen',
    name: 'Vorspeisen',
    icon: 'starter',
    items: [
      { id: 'wantan', number: '1', name: 'Knusprig gebackene WAN-TAN', description: 'Gefüllte Teigtaschen mit süß-sauer Sauce', price: 4.50, tag: '5 Stk.', image: PHOTOS.wantan, isPopular: true },
      { id: 'gyoza', number: '2', name: 'Gyoza', description: 'Frittierte Teigtaschen mit Hähnchenfleisch und Gemüsefüllung, serviert mit süß saurem Dip', price: 4.50, tag: '5 Stk.', image: PHOTOS.gyoza },
      { id: 'gyoza-veggie', number: '3', name: 'Gyoza Veggie', description: 'Vegetarische Gyoza mit Gemüsefüllung', price: 4.50, tag: '5 Stk.', isVegetarian: true, image: PHOTOS.gyoza },
      { id: 'mini-rollen', number: '4', name: 'Mini-Rollen', description: 'Tofu, Karotten, Sojasprossen, Reisnudeln (vegetarisch)', price: 4.50, tag: '7 Stk.', isVegetarian: true, image: PHOTOS.miniroll },
      { id: 'nem-chay', number: '5', name: 'Nem Chay', description: 'Hausgemachte Vietnamesische Frühlingsrollen, gefüllt mit Glasnudeln, China-Pilze, Marcheln, Karotten — süß-saurem Dip (Vegane Füllung)', price: 4.50, tag: '3 Stk.', isVegan: true, image: PHOTOS.nemchay },
      { id: 'edamame', number: '6', name: 'Edamame', description: 'Grüne Bohnen mit Meersalz', price: 4.50, isVegan: true, image: PHOTOS.edamame },
      { id: 'pommes', number: '7', name: 'Pommes Drittes', description: 'Knusprige Pommes Frites', price: 4.50, isVegan: true, image: PHOTOS.pommes },
      { id: 'yakitori', number: '8', name: 'Yakitori', description: 'Hähnchen Yakitori — Teriyaki mit Tamarinden Soße', price: 4.50, tag: '2 Stk.', isPopular: true, image: PHOTOS.yakitori },
      { id: 'sommerrollen', number: '9', name: 'Sommerrollen mit Salat', description: 'Reisnudeln, geröstete Schalotten, Gurke, Reispapier mit süß-sauer Soße', variants: [{ label: 'Tofu', price: 4.50 }, { label: 'Hähnchenfleisch', price: 4.50 }, { label: 'Garnelen', price: 4.50 }], image: PHOTOS.sommerrollen },
      { id: 'gebratene-garnelen', number: '10', name: 'Gebratene Garnelen', description: 'Grüne Reisflöckchen, Garnelen, süß-sauer Soße', price: 6.50, tag: '2 Stk.', isPopular: true, image: PHOTOS.garnelen },
      { id: 'vorspeise-platte', number: '101', name: 'Gemischte Vorspeise-Platte', description: '2 Stk. Sommerrollen · 2 Stk. Nem Chay · 2 Stk. Gebratene Garnelen · 5 Stk. Gyoza · 4 Stk. Wan-Tan', price: 15.90, isPopular: true, image: PHOTOS.combo },
    ],
  },
  {
    id: 'suppen',
    name: 'Suppen',
    icon: 'soup',
    items: [
      { id: 'peking-suppe', number: '11', name: 'Peking-Suppe', description: 'Sauer-scharf', price: 4.90, isPopular: true, image: PHOTOS.pekingsuppe },
      { id: 'wantan-suppe', number: '12', name: 'Wantan Suppe', description: 'Hähnchenfleisch, Garnelen, Zucchini, Brokkoli', price: 4.90, tag: '4 Stk.', image: PHOTOS.wantansuppe },
      { id: 'tom-yum', number: '13', name: 'Tom Yum Suppe', description: 'Tomyum, Zucchini, Brokkoli, Karotten, Champignon', variants: [{ label: 'Tofu', price: 4.90 }, { label: 'Hähnchenfleisch', price: 4.90 }, { label: 'Garnelen', price: 4.90 }], isPopular: true, image: PHOTOS.tomyum },
    ],
  },
  {
    id: 'salate',
    name: 'Salate',
    icon: 'salad',
    items: [
      { id: 'gemischter-salat', number: '14a', name: 'Gemischter Salat', price: 6.50, isVegan: true, image: PHOTOS.salad },
      { id: 'tomatensalat', number: '14b', name: 'Tomatensalat', price: 6.50, isVegan: true, image: PHOTOS.tomatensalat },
      { id: 'haehnchen-salat', number: '14c', name: 'Hähnchenfleisch-Salat', price: 7.50, image: PHOTOS.haehnchensalat },
      { id: 'garnelen-salat', number: '14d', name: 'Garnelen-Salat', price: 7.50, isPopular: true, image: PHOTOS.garnelensalat },
    ],
  },
  {
    id: 'hauptgerichte',
    name: 'Hauptgerichte',
    icon: 'main',
    items: [
      { id: 'pho', number: '15', name: 'Pho', description: 'Traditionelle 5-Kräuter-Brühe, Reisbandnudel Suppe mit frischem Koriander, Frühling, Zwiebeln und Sojasprossen', variants: [{ label: 'Tofu', price: 12.00 }, { label: 'Hähnchenfleisch', price: 13.00 }, { label: 'Rindfleisch', price: 14.00 }], isPopular: true, image: PHOTOS.pho },
      { id: 'pho-xao', number: '16', name: 'Pho Xao', description: 'Reisbandnudelsuppe mit Gemüse', variants: [{ label: 'Tofu', price: 12.00 }, { label: 'Hähnchenfleisch', price: 13.00 }, { label: 'Rindfleisch', price: 14.00 }], image: PHOTOS.phoxao },
      { id: 'bun-bo-nam-bo', number: '17', name: 'Bun Bo Nam Bo', description: 'Reisnudeln, Salat, hausgemachte Soße, deröstete Schalotten, Erdnüsse, Gurke, Koriander, Sojasprossen, Rindfleisch', price: 14.00, isPopular: true, image: PHOTOS.bunbo },
      { id: 'bun-vegan', number: '18', name: 'Bun Vegan', description: 'Frittierte vegane Frühlingsrollen auf warmen Reisnudeln mit wildkräuter Salat, verfeinert mit Koriander, gerösteten Zwiebeln und zerstoßenen Erdnüssen, serviert mit Sojasoße', price: 13.00, isVegan: true, image: PHOTOS.bunvegan },
      { id: 'bun-tofu', number: '19', name: 'Bun Tofu', description: 'Im Wok gebratener Bio-Tofu auf warmen Reisnudeln mit Sojasprossen, Karotten, wildkräuter Salat, verfeinert mit Koriander, gerösteten Zwiebeln und zerstoßenen Erdnüssen, serviert mit Sojasoße', price: 13.00, isVegetarian: true, image: PHOTOS.buntofu },
    ],
  },
  {
    id: 'wok-gerichte',
    name: 'Wok-Gerichte',
    icon: 'wok',
    items: [
      { id: 'thai-curry', number: '20', name: 'Thai Curry', description: 'Zu Reis essen — Gemüse, Chili, Salat, Zitronengras', variants: [{ label: 'Tofu', price: 10.90 }, { label: 'Hähnchen', price: 10.90 }, { label: 'Frittiertes Hähnchen', price: 10.90 }, { label: 'Knusprig gebratene Ente', price: 12.90 }, { label: 'Gebratenes Rindfleisch', price: 12.90 }], isPopular: true, image: PHOTOS.thaicurry },
      { id: 'kung-pao', number: '21', name: 'Kung Pao Soße', description: 'Grüne Gemüse, Reis', variants: [{ label: 'Tofu', price: 10.90 }, { label: 'Hähnchen', price: 10.90 }, { label: 'Frittiertes Hähnchen', price: 10.90 }, { label: 'Knusprig gebratene Ente', price: 12.90 }, { label: 'Gebratenes Rindfleisch', price: 12.90 }], image: PHOTOS.kungpao },
      { id: 'suesssauer', number: '22', name: 'Süß-sauer Soße mit Ananas', description: 'Grüne Gemüse, Reis', variants: [{ label: 'Tofu', price: 10.90 }, { label: 'Hähnchen', price: 10.90 }, { label: 'Frittiertes Hähnchen', price: 10.90 }, { label: 'Knusprig gebratene Ente', price: 12.90 }, { label: 'Gebratenes Rindfleisch', price: 12.90 }], image: PHOTOS.suesssauer },
      { id: 'saigon-sosse', number: '23', name: 'Saigon Soße', description: 'Grüne Gemüse, Reis', variants: [{ label: 'Tofu', price: 10.90 }, { label: 'Hähnchen', price: 10.90 }, { label: 'Frittiertes Hähnchen', price: 10.90 }, { label: 'Knusprig gebratene Ente', price: 12.90 }, { label: 'Gebratenes Rindfleisch', price: 12.90 }], image: PHOTOS.saigon },
    ],
  },
  {
    id: 'reis-nudeln',
    name: 'Reis & Nudeln',
    icon: 'rice',
    items: [
      { id: 'gebratene-eier-reis', number: '24', name: 'Gebratene Eier-Reis Gerichte', description: 'Gebratener Reis mit Ei und Sojasprossen, Zwiebeln', variants: [{ label: 'C1 — Tofu', price: 8.90 }, { label: 'C2 — Gemüse', price: 8.90 }, { label: 'C3 — Hähnchen', price: 10.90 }, { label: 'C4 — Panierte Hühnerbrust', price: 10.90 }, { label: 'C5 — Knusprig Ente', price: 12.90 }, { label: 'C6 — Rindfleisch', price: 12.90 }], image: PHOTOS.friedrice },
      { id: 'gebratene-nudeln', number: '25', name: 'Gebratene Nudelgerichte', description: 'Gebratene Nudeln mit Ei und Sojasprossen, Zwiebeln', variants: [{ label: 'M1 — Tofu', price: 8.90 }, { label: 'M2 — Gemüse', price: 8.90 }, { label: 'M3 — Hähnchen', price: 10.90 }, { label: 'M4 — Panierte Hühnerbrust', price: 10.90 }, { label: 'M5 — Knusprig Ente', price: 12.90 }, { label: 'M6 — Rindfleisch', price: 12.90 }], isPopular: true, image: PHOTOS.friednoodles },
      { id: 'yaki-udon', number: '26', name: 'Yaki Udon', description: 'Mit Gemüse, Karotten, Sojasprossen, Frühling, Zwiebeln, Paprika', variants: [{ label: 'U1 — Tofu', price: 11.00 }, { label: 'U2 — Gemüse', price: 11.00 }, { label: 'U3 — Hähnchen', price: 13.00 }, { label: 'U4 — Panierte Hühnerbrust', price: 13.00 }, { label: 'U5 — Knusprig Ente', price: 15.00 }, { label: 'U6 — Rindfleisch', price: 15.00 }], image: PHOTOS.yakiudon },
      { id: 'bibimbap', number: '27', name: 'Bibimbap', description: 'Reis, Karotten, Gurken, Zucchini, Sojasprossen, Mais, Erbsen, Sesam, Wakame, Ei', variants: [{ label: 'B1 — Tofu', price: 11.90 }, { label: 'B2 — Hähnchen', price: 11.90 }, { label: 'B3 — Rindfleisch', price: 13.90 }, { label: 'B4 — Garnelen', price: 13.90 }], isPopular: true, image: PHOTOS.bibimbap },
    ],
  },
  {
    id: 'kinder',
    name: 'Kinder Menu',
    icon: 'kids',
    items: [
      { id: 'kinder-huehnchen', number: 'K1', name: 'Panierte Hühnerbrustfilet', price: 6.90, image: PHOTOS.kinderhaehn },
      { id: 'kinder-reis', number: 'K2', name: 'Gebratene Duftries', price: 6.90, image: PHOTOS.kinderreis },
    ],
  },
  {
    id: 'desserts',
    name: 'Desserts',
    icon: 'dessert',
    items: [
      { id: 'chuoi-chien', number: '28', name: 'Chuối Chiên', description: 'Gebackene Banane mit Honig und Schokoladen Sauer', price: 4.50, isVegan: true, isPopular: true, image: PHOTOS.chuoichien },
    ],
  },
]

export const restaurantInfo = {
  name: 'Sai Gon Wok',
  tagline: 'Authentische vietnamesische Küche — Ich Bin Da',
  description: 'Erleben Sie die authentischen Aromen Vietnams mitten in Stuttgart. Frische Zutaten, traditionelle Rezepte und herzliche Gastfreundschaft — das ist Sai Gon Wok.',
  address: 'Kanalstraße 10, 70182 Stuttgart',
  phone: '',
  hours: {
    weekdays: 'Mo – Sa: 11:00 – 21:30 Uhr',
    sunday: 'Sonntag: Geschlossen',
  },
}

export const galleryImages = [
  img('photo-1582878826629-29b7ad1cdc43'), // pho
  img('photo-1576577445504-6af96477db52'), // sommerrollen
  img('photo-1553163147-622ab57be1c7'), // bibimbap
  img('photo-1455619452474-d2be8b1e70cd'), // curry
  img('photo-1535473895227-bdecb20fb157'), // yakitori
  img('photo-1569718212165-3a8278d5f624'), // soup
  img('photo-1559314809-0d155014e29e'), // noodles
  img('photo-1601493700631-2b16ec4b4716'), // dessert
]

export const heroImages = {
  main: img('photo-1583224944844-5b268c057a99'), // vietnamese spread
  ambience1: img('photo-1517248135467-4c7edcad34c4'), // restaurant interior
  ambience2: img('photo-1414235077428-338989a2e8c0'), // dining
}
