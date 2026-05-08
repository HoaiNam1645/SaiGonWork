export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'de'

export const LOCALE_LABEL: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
}

export const DATE_LOCALE: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-GB',
}

type Dict = Record<string, string>

const de: Dict = {
  // Promo
  'promo.banner': '10% Rabatt auf Ihre erste Online-Bestellung · Kostenlose Lieferung ab 25€',

  // Header
  'header.menu': 'Speisekarte',
  'header.specialties': 'Spezialitäten',
  'header.about': 'Über Uns',
  'header.contact': 'Kontakt',
  'header.orders': 'Bestellungen',
  'header.cart': 'Warenkorb',
  'header.cart_aria': 'Warenkorb öffnen',
  'header.menu_aria': 'Menü öffnen',
  'header.orders_aria': 'Meine Bestellungen',
  'lang.label': 'Sprache',

  // Hero
  'hero.menu_label': 'MENU',
  'hero.tagline': 'Ich Bin Da',
  'hero.welcome': 'Herzlich Willkommen…',
  'hero.appetit': 'Guten Appetit',
  'hero.thanks': 'Wir bedanken uns für Ihren Besuch',
  'hero.cta_menu': 'Speisekarte ansehen',
  'hero.cta_reserve': 'Tisch reservieren',
  'hero.since': 'SEIT',

  // FeaturesBar
  'features.fresh.title': 'Frische Zutaten',
  'features.fresh.desc': 'Täglich frisch zubereitet',
  'features.vegan.title': 'Vegane Optionen',
  'features.vegan.desc': 'Viele pflanzliche Gerichte',
  'features.authentic.title': 'Authentisch',
  'features.authentic.desc': 'Traditionelle Rezepte aus Saigon',
  'features.fast.title': 'Schnelle Lieferung',
  'features.fast.desc': 'Heiß und frisch geliefert',

  // PopularDishes
  'popular.eyebrow': 'Empfehlung des Hauses',
  'popular.title_pre': 'Unsere',
  'popular.title_accent': 'Spezialitäten',
  'popular.subtitle':
    'Die Lieblingsgerichte unserer Gäste — sorgfältig ausgewählt, mit Liebe zubereitet.',
  'popular.from': 'ab',
  'popular.order': 'Bestellen',

  // Menu section
  'menu.eyebrow': 'Speisekarte',
  'menu.title': 'Unsere Gerichte',
  'menu.subtitle':
    'Von traditioneller Pho-Suppe über knusprige Wok-Kreationen bis zu süßen Desserts — entdecken Sie die ganze Vielfalt der vietnamesischen Küche.',
  'menu.add_to_cart': 'In den Warenkorb',
  'menu.add_to_cart_aria_suffix': 'in den Warenkorb',

  // Tags
  'tag.popular': 'Beliebt',
  'tag.vegan': 'Vegan',
  'tag.vegetarian': 'Vegetarisch',

  // Categories
  'category.vorspeisen': 'Vorspeisen',
  'category.suppen': 'Suppen',
  'category.salate': 'Salate',
  'category.hauptgerichte': 'Hauptgerichte',
  'category.wok-gerichte': 'Wok-Gerichte',
  'category.reis-nudeln': 'Reis & Nudeln',
  'category.kinder-menu': 'Kinder Menu',
  'category.desserts': 'Desserts',

  // Gallery
  'gallery.eyebrow': 'Galerie',
  'gallery.title_pre': 'Eindrücke aus unserer',
  'gallery.title_accent': 'Küche',
  'gallery.alt': 'Gerichte bei Sai Gon Wok',

  // About
  'about.eyebrow': 'Unsere Geschichte',
  'about.title_pre': 'Vietnamesische Tradition,',
  'about.title_accent': 'aus Liebe zum Geschmack',
  'about.p1':
    'Willkommen bei Sai Gon Wok — Ihrem Tor zur authentischen vietnamesischen Küche mitten in Stuttgart. Bei uns erleben Sie die Aromen Saigons, zubereitet nach traditionellen Familienrezepten.',
  'about.p2':
    'Von der würzigen Pho-Suppe über knusprige Frühlingsrollen bis hin zu aromatischen Wok-Gerichten — jede Speise wird täglich frisch mit den besten Zutaten zubereitet.',
  'about.p3': '„Guten Appetit — Wir bedanken uns für Ihren Besuch."',
  'about.since': 'Seit',
  'about.stat.dishes': 'Authentische Gerichte',
  'about.stat.fresh': 'Frisch täglich',
  'about.stat.rating': 'Google Bewertung',
  'about.stat.hours': 'Mo bis Sa geöffnet',
  'about.image_alt_1': 'Sai Gon Wok Restaurant Atmosphäre',
  'about.image_alt_2': 'Vietnamesische Spezialitäten',

  // Testimonials
  'testimonials.eyebrow': 'Was unsere Gäste sagen',
  'testimonials.title_pre': 'Bewertungen unserer',
  'testimonials.title_accent': 'zufriedenen Gäste',
  'testimonials.source': 'Google Bewertung',
  'testimonials.review1.text':
    'Die beste Pho in Stuttgart! Die Brühe schmeckt einfach unglaublich authentisch und das Personal ist super freundlich. Wir kommen immer wieder.',
  'testimonials.review2.text':
    'Top Qualität, faire Preise und große Portionen. Die Sommerrollen sind ein absolutes Muss. Vegane Optionen sind auch hervorragend.',
  'testimonials.review3.text':
    'Endlich vietnamesisches Essen wie zu Hause! Bun Bo Nam Bo schmeckt wie in Saigon. Sehr empfehlenswert für alle Liebhaber asiatischer Küche.',

  // Contact
  'contact.eyebrow': 'Besuchen Sie Uns',
  'contact.title': 'Kontakt & Öffnungszeiten',
  'contact.address': 'Adresse',
  'contact.address.country': 'Deutschland',
  'contact.openMap': 'Auf der Karte öffnen',
  'contact.hours.title': 'Öffnungszeiten',
  'contact.hours.weekdays': 'Mo – Sa',
  'contact.hours.sunday': 'Sonntag',
  'contact.hours.closed': 'Geschlossen',
  'contact.hours.note': 'Küche schließt 30 Min. vor Feierabend',
  'contact.order.title': 'Jetzt Bestellen',
  'contact.order.desc':
    'Genießen Sie unsere authentischen Gerichte bequem zu Hause oder im Büro — frisch zubereitet und schnell geliefert.',
  'contact.order.cta': 'Zur Speisekarte',

  // Footer
  'footer.description':
    'Authentische vietnamesische Küche mit frischen Zutaten und traditionellen Rezepten — mitten im Herzen Stuttgarts.',
  'footer.menu': 'Speisekarte',
  'footer.contact': 'Kontakt',
  'footer.hours': 'Mo – Sa: 11:00 – 21:30',
  'footer.closed': 'So: Geschlossen',
  'footer.imprint': 'Impressum',
  'footer.privacy': 'Datenschutz',
  'footer.terms': 'AGB',
  'footer.rights': 'Alle Rechte vorbehalten.',

  // Cart
  'cart.aria_label': 'Warenkorb',
  'cart.title': 'Ihr Warenkorb',
  'cart.close_aria': 'Warenkorb schließen',
  'cart.items_count': 'Artikel',
  'cart.empty.title': 'Ihr Warenkorb ist leer',
  'cart.empty.body':
    'Wählen Sie leckere Gerichte aus unserer Speisekarte und genießen Sie authentisches Vietnam-Erlebnis.',
  'cart.empty.cta': 'Zur Speisekarte',
  'cart.subtotal': 'Zwischensumme',
  'cart.total': 'Gesamt',
  'cart.checkout': 'Zur Kasse',
  'cart.clear': 'Warenkorb leeren',
  'cart.remove_aria': 'Entfernen',
  'cart.qty_minus_aria': 'Weniger',
  'cart.qty_plus_aria': 'Mehr',

  // Orders list
  'orders.eyebrow': 'Konto · Verlauf',
  'orders.title': 'Meine Bestellungen',
  'orders.subtitle':
    'Verfolgen Sie Status und Verlauf Ihrer Bestellungen bei Sai Gon Wok.',
  'orders.tab.placed': 'Aufgegeben',
  'orders.tab.shipping': 'Unterwegs',
  'orders.tab.delivered': 'Geliefert',
  'orders.tab.cancelled': 'Storniert',
  'orders.empty.title': 'Keine Bestellungen',
  'orders.empty.body': 'Keine Bestellungen mit diesem Status.',
  'orders.code': 'Bestellnr.',
  'orders.detail': 'Details',
  'orders.items_count': 'Artikel',

  // Order detail
  'order.back': 'Alle Bestellungen',
  'order.code_label': 'Bestellnummer',
  'order.placed_at': 'Bestellt am',
  'order.items_title': 'Bestellte Speisen',
  'order.subtotal': 'Zwischensumme',
  'order.shipping_fee': 'Liefergebühr',
  'order.total': 'Gesamt',
  'order.shipping_info': 'Lieferinformationen',
  'order.recipient': 'Empfänger',
  'order.phone': 'Telefon',
  'order.address': 'Adresse',
  'order.note': 'Notiz',
  'order.payment': 'Zahlung',
  'order.payment_method': 'Methode',
  'order.reorder': 'Erneut bestellen',
  'order.cancel': 'Bestellung stornieren',
  'order.cancel_reason': 'Grund:',

  // Order status
  'status.placed': 'Aufgegeben',
  'status.preparing': 'Küche bereitet vor',
  'status.shipping': 'Unterwegs',
  'status.delivered': 'Geliefert',
  'status.cancelled': 'Storniert',

  // Stepper
  'stepper.placed': 'Bestellung aufgegeben',
  'stepper.preparing': 'Küche bereitet vor',
  'stepper.shipping': 'Unterwegs zur Lieferung',
  'stepper.delivered': 'Bestellung geliefert',
  'stepper.cancelled.title': 'Bestellung storniert',
  'stepper.cancelled.body': 'Diese Bestellung wird nicht mehr bearbeitet.',

  // Checkout
  'checkout.eyebrow': 'Konto · Bezahlung',
  'checkout.title': 'Bestellung abschließen',
  'checkout.back_to_cart': 'Zurück zum Warenkorb',
  'checkout.empty.title': 'Ihr Warenkorb ist leer',
  'checkout.empty.cta': 'Zur Speisekarte',

  'checkout.section.contact': 'Kontakt',
  'checkout.section.address': 'Lieferadresse',
  'checkout.section.time': 'Lieferzeit',
  'checkout.section.payment': 'Bezahlmethode',
  'checkout.section.note': 'Notiz (optional)',

  'checkout.field.name': 'Vor- und Nachname',
  'checkout.field.phone': 'Telefonnummer',
  'checkout.field.email': 'E-Mail (optional)',
  'checkout.field.address_search': 'Straße und Hausnummer eingeben',
  'checkout.field.address_apt': 'Wohnung / Etage / Hinweis (optional)',
  'checkout.field.note_placeholder': 'Wünsche an die Küche, Allergien, …',

  'checkout.use_location': 'Aktuellen Standort verwenden',
  'checkout.locating': 'Standort wird ermittelt …',
  'checkout.location_error': 'Standort konnte nicht ermittelt werden.',
  'checkout.address_no_results': 'Keine Ergebnisse',
  'checkout.address_searching': 'Suche …',

  'checkout.map.placeholder.title': 'Karte erscheint nach Adresseingabe',
  'checkout.map.placeholder.body':
    'Geben Sie Ihre Adresse ein oder verwenden Sie Ihren Standort, um die Lieferstrecke zu sehen.',
  'checkout.map.calculating': 'Route wird berechnet …',
  'checkout.map.distance': 'Entfernung',
  'checkout.map.duration': 'Fahrzeit',
  'checkout.map.duration_min': 'Min',
  'checkout.map.you': 'Lieferadresse',
  'checkout.map.restaurant': 'Restaurant',

  'checkout.time.now': 'Sofort liefern',
  'checkout.time.now_eta': 'Geschätzte Ankunft',
  'checkout.time.scheduled': 'Geplant liefern',
  'checkout.time.scheduled_help': 'Datum und Uhrzeit auswählen',

  'checkout.payment.card': 'Kredit- oder Debitkarte',
  'checkout.payment.card_desc': 'Visa, Mastercard, Amex',
  'checkout.payment.paypal': 'PayPal',
  'checkout.payment.paypal_desc': 'Sicher mit PayPal bezahlen',
  'checkout.payment.cash': 'Bar bei Lieferung',
  'checkout.payment.cash_desc': 'Bezahlen Sie beim Fahrer',
  'checkout.payment.bank': 'Banküberweisung (QR)',
  'checkout.payment.bank_desc': 'QR-Code scannen und mit Ihrer Bank-App bezahlen',
  'checkout.payment.bank_hint':
    'Nach Bestellaufgabe erhalten Sie einen QR-Code (GiroCode) mit Empfänger und Betrag.',

  'checkout.summary.title': 'Ihre Bestellung',
  'checkout.summary.subtotal': 'Zwischensumme',
  'checkout.summary.distance': 'Entfernung',
  'checkout.summary.shipping': 'Versand',
  'checkout.summary.shipping_free': 'Gratis',
  'checkout.summary.shipping_pending': 'Adresse eingeben',
  'checkout.summary.total': 'Gesamt',
  'checkout.summary.free_shipping_progress': 'Noch {{amount}} bis Gratis-Versand',
  'checkout.summary.free_shipping_unlocked': 'Gratis-Versand freigeschaltet ✓',

  'checkout.warning.out_of_zone':
    'Lieferung außerhalb unseres Servicegebiets ({{km}} km). Maximaler Radius: 15 km.',
  'checkout.warning.required_fields': 'Bitte füllen Sie alle Pflichtfelder aus.',

  'checkout.cta.place_order': 'Bestellung aufgeben',
  'checkout.cta.placing_order': 'Wird gesendet …',

  'checkout.success.title': 'Bestellung erhalten!',
  'checkout.success.body': 'Wir bereiten Ihre Bestellung vor und liefern sie schnellstmöglich.',
  'checkout.success.view_order': 'Bestellung anzeigen',
}

const en: Dict = {
  // Promo
  'promo.banner': '10% off your first online order · Free delivery from €25',

  // Header
  'header.menu': 'Menu',
  'header.specialties': 'Specialties',
  'header.about': 'About',
  'header.contact': 'Contact',
  'header.orders': 'Orders',
  'header.cart': 'Cart',
  'header.cart_aria': 'Open cart',
  'header.menu_aria': 'Open menu',
  'header.orders_aria': 'My orders',
  'lang.label': 'Language',

  // Hero
  'hero.menu_label': 'MENU',
  'hero.tagline': 'I Am Here',
  'hero.welcome': 'A warm welcome…',
  'hero.appetit': 'Bon Appétit',
  'hero.thanks': 'Thank you for visiting us',
  'hero.cta_menu': 'View menu',
  'hero.cta_reserve': 'Reserve a table',
  'hero.since': 'SINCE',

  // FeaturesBar
  'features.fresh.title': 'Fresh ingredients',
  'features.fresh.desc': 'Prepared fresh daily',
  'features.vegan.title': 'Vegan options',
  'features.vegan.desc': 'Many plant-based dishes',
  'features.authentic.title': 'Authentic',
  'features.authentic.desc': 'Traditional recipes from Saigon',
  'features.fast.title': 'Fast delivery',
  'features.fast.desc': 'Hot and fresh, on time',

  // PopularDishes
  'popular.eyebrow': "Chef's recommendations",
  'popular.title_pre': 'Our',
  'popular.title_accent': 'Specialties',
  'popular.subtitle':
    "Our guests' favorite dishes — carefully selected, lovingly prepared.",
  'popular.from': 'from',
  'popular.order': 'Order',

  // Menu section
  'menu.eyebrow': 'Menu',
  'menu.title': 'Our dishes',
  'menu.subtitle':
    'From traditional Pho to crispy wok creations and sweet desserts — discover the full variety of Vietnamese cuisine.',
  'menu.add_to_cart': 'Add to cart',
  'menu.add_to_cart_aria_suffix': 'add to cart',

  // Tags
  'tag.popular': 'Popular',
  'tag.vegan': 'Vegan',
  'tag.vegetarian': 'Vegetarian',

  // Categories
  'category.vorspeisen': 'Starters',
  'category.suppen': 'Soups',
  'category.salate': 'Salads',
  'category.hauptgerichte': 'Main dishes',
  'category.wok-gerichte': 'Wok dishes',
  'category.reis-nudeln': 'Rice & Noodles',
  'category.kinder-menu': 'Kids menu',
  'category.desserts': 'Desserts',

  // Gallery
  'gallery.eyebrow': 'Gallery',
  'gallery.title_pre': 'Glimpses from our',
  'gallery.title_accent': 'kitchen',
  'gallery.alt': 'Dishes at Sai Gon Wok',

  // About
  'about.eyebrow': 'Our story',
  'about.title_pre': 'Vietnamese tradition,',
  'about.title_accent': 'crafted with love',
  'about.p1':
    'Welcome to Sai Gon Wok — your gateway to authentic Vietnamese cuisine in the heart of Stuttgart. Experience the flavors of Saigon, prepared from traditional family recipes.',
  'about.p2':
    'From spicy Pho soup to crispy spring rolls and aromatic wok dishes — every dish is freshly made daily with the finest ingredients.',
  'about.p3': '"Bon appétit — thank you for visiting us."',
  'about.since': 'Since',
  'about.stat.dishes': 'Authentic dishes',
  'about.stat.fresh': 'Fresh daily',
  'about.stat.rating': 'Google rating',
  'about.stat.hours': 'Open Mon to Sat',
  'about.image_alt_1': 'Sai Gon Wok restaurant atmosphere',
  'about.image_alt_2': 'Vietnamese specialties',

  // Testimonials
  'testimonials.eyebrow': 'What our guests say',
  'testimonials.title_pre': 'Reviews from our',
  'testimonials.title_accent': 'happy guests',
  'testimonials.source': 'Google review',
  'testimonials.review1.text':
    'The best Pho in Stuttgart! The broth tastes incredibly authentic and the staff is super friendly. We keep coming back.',
  'testimonials.review2.text':
    'Top quality, fair prices and large portions. The summer rolls are a must. Vegan options are also excellent.',
  'testimonials.review3.text':
    'Finally Vietnamese food that tastes like home! Bun Bo Nam Bo tastes like in Saigon. Highly recommended for lovers of Asian cuisine.',

  // Contact
  'contact.eyebrow': 'Visit us',
  'contact.title': 'Contact & Opening Hours',
  'contact.address': 'Address',
  'contact.address.country': 'Germany',
  'contact.openMap': 'Open on map',
  'contact.hours.title': 'Opening hours',
  'contact.hours.weekdays': 'Mon – Sat',
  'contact.hours.sunday': 'Sunday',
  'contact.hours.closed': 'Closed',
  'contact.hours.note': 'Kitchen closes 30 min before closing time',
  'contact.order.title': 'Order now',
  'contact.order.desc':
    'Enjoy our authentic dishes comfortably at home or at the office — freshly prepared and quickly delivered.',
  'contact.order.cta': 'View menu',

  // Footer
  'footer.description':
    'Authentic Vietnamese cuisine with fresh ingredients and traditional recipes — in the heart of Stuttgart.',
  'footer.menu': 'Menu',
  'footer.contact': 'Contact',
  'footer.hours': 'Mon – Sat: 11:00 – 21:30',
  'footer.closed': 'Sun: Closed',
  'footer.imprint': 'Imprint',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.rights': 'All rights reserved.',

  // Cart
  'cart.aria_label': 'Cart',
  'cart.title': 'Your cart',
  'cart.close_aria': 'Close cart',
  'cart.items_count': 'items',
  'cart.empty.title': 'Your cart is empty',
  'cart.empty.body':
    'Choose tasty dishes from our menu and enjoy an authentic Vietnamese experience.',
  'cart.empty.cta': 'View menu',
  'cart.subtotal': 'Subtotal',
  'cart.total': 'Total',
  'cart.checkout': 'Checkout',
  'cart.clear': 'Clear cart',
  'cart.remove_aria': 'Remove',
  'cart.qty_minus_aria': 'Decrease',
  'cart.qty_plus_aria': 'Increase',

  // Orders list
  'orders.eyebrow': 'Account · History',
  'orders.title': 'My Orders',
  'orders.subtitle':
    'Track the status and history of your orders at Sai Gon Wok.',
  'orders.tab.placed': 'Placed',
  'orders.tab.shipping': 'Shipping',
  'orders.tab.delivered': 'Delivered',
  'orders.tab.cancelled': 'Cancelled',
  'orders.empty.title': 'No orders yet',
  'orders.empty.body': 'No orders in this status.',
  'orders.code': 'Order',
  'orders.detail': 'Details',
  'orders.items_count': 'items',

  // Order detail
  'order.back': 'All orders',
  'order.code_label': 'Order number',
  'order.placed_at': 'Placed on',
  'order.items_title': 'Items ordered',
  'order.subtotal': 'Subtotal',
  'order.shipping_fee': 'Shipping fee',
  'order.total': 'Total',
  'order.shipping_info': 'Delivery information',
  'order.recipient': 'Recipient',
  'order.phone': 'Phone',
  'order.address': 'Address',
  'order.note': 'Note',
  'order.payment': 'Payment',
  'order.payment_method': 'Method',
  'order.reorder': 'Reorder',
  'order.cancel': 'Cancel order',
  'order.cancel_reason': 'Reason:',

  // Order status
  'status.placed': 'Placed',
  'status.preparing': 'Kitchen preparing',
  'status.shipping': 'Shipping',
  'status.delivered': 'Delivered',
  'status.cancelled': 'Cancelled',

  // Stepper
  'stepper.placed': 'Order placed',
  'stepper.preparing': 'Kitchen preparing',
  'stepper.shipping': 'Out for delivery',
  'stepper.delivered': 'Order delivered',
  'stepper.cancelled.title': 'Order cancelled',
  'stepper.cancelled.body': 'This order is no longer being processed.',

  // Checkout
  'checkout.eyebrow': 'Account · Payment',
  'checkout.title': 'Complete your order',
  'checkout.back_to_cart': 'Back to cart',
  'checkout.empty.title': 'Your cart is empty',
  'checkout.empty.cta': 'View menu',

  'checkout.section.contact': 'Contact',
  'checkout.section.address': 'Delivery address',
  'checkout.section.time': 'Delivery time',
  'checkout.section.payment': 'Payment method',
  'checkout.section.note': 'Note (optional)',

  'checkout.field.name': 'Full name',
  'checkout.field.phone': 'Phone number',
  'checkout.field.email': 'Email (optional)',
  'checkout.field.address_search': 'Enter street and house number',
  'checkout.field.address_apt': 'Apartment / floor / hint (optional)',
  'checkout.field.note_placeholder': 'Special requests, allergies, …',

  'checkout.use_location': 'Use my current location',
  'checkout.locating': 'Detecting location …',
  'checkout.location_error': 'Could not detect your location.',
  'checkout.address_no_results': 'No results',
  'checkout.address_searching': 'Searching …',

  'checkout.map.placeholder.title': 'Map appears after entering address',
  'checkout.map.placeholder.body':
    'Enter your address or use your location to see the delivery route.',
  'checkout.map.calculating': 'Calculating route …',
  'checkout.map.distance': 'Distance',
  'checkout.map.duration': 'Drive time',
  'checkout.map.duration_min': 'min',
  'checkout.map.you': 'Delivery address',
  'checkout.map.restaurant': 'Restaurant',

  'checkout.time.now': 'Deliver now',
  'checkout.time.now_eta': 'Estimated arrival',
  'checkout.time.scheduled': 'Schedule for later',
  'checkout.time.scheduled_help': 'Choose date and time',

  'checkout.payment.card': 'Credit or debit card',
  'checkout.payment.card_desc': 'Visa, Mastercard, Amex',
  'checkout.payment.paypal': 'PayPal',
  'checkout.payment.paypal_desc': 'Pay securely with PayPal',
  'checkout.payment.cash': 'Cash on delivery',
  'checkout.payment.cash_desc': 'Pay the driver in cash',
  'checkout.payment.bank': 'Bank transfer (QR)',
  'checkout.payment.bank_desc': 'Scan a QR code and pay with your banking app',
  'checkout.payment.bank_hint':
    "After placing the order you'll receive a QR code (GiroCode) with the recipient and amount.",

  'checkout.summary.title': 'Your order',
  'checkout.summary.subtotal': 'Subtotal',
  'checkout.summary.distance': 'Distance',
  'checkout.summary.shipping': 'Shipping',
  'checkout.summary.shipping_free': 'Free',
  'checkout.summary.shipping_pending': 'Enter address',
  'checkout.summary.total': 'Total',
  'checkout.summary.free_shipping_progress': '{{amount}} away from free shipping',
  'checkout.summary.free_shipping_unlocked': 'Free shipping unlocked ✓',

  'checkout.warning.out_of_zone':
    'Delivery outside our service area ({{km}} km). Maximum radius: 15 km.',
  'checkout.warning.required_fields': 'Please fill in all required fields.',

  'checkout.cta.place_order': 'Place order',
  'checkout.cta.placing_order': 'Sending …',

  'checkout.success.title': 'Order received!',
  'checkout.success.body': 'We are preparing your order and will deliver it as soon as possible.',
  'checkout.success.view_order': 'View order',
}

export const dictionary: Record<Locale, Dict> = { de, en }

export type TKey = keyof typeof de

/** Resolve a category id (e.g. 'vorspeisen') to a translated name. */
export function categoryName(categoryId: string, dict: Dict): string {
  return dict[`category.${categoryId}`] ?? categoryId
}
