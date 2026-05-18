// Backend i18n — chỉ chứa string server-side (lỗi, email, notification).
// UI strings nằm ở frontend (src/i18n/dictionary.ts).
import type { Locale } from './locales'

type Dict = Record<string, string>

const de: Dict = {
  // Common
  'common.unknown_error': 'Ein unbekannter Fehler ist aufgetreten.',
  'common.too_many_requests': 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
  'common.not_found': 'Nicht gefunden.',
  'common.forbidden': 'Zugriff verweigert.',
  'common.unauthorized': 'Nicht authentifiziert.',

  // Validation
  'validation.invalid_payload': 'Ungültige Anfrageparameter.',
  'validation.required': 'Pflichtfeld.',
  'validation.email_format': 'Ungültige E-Mail-Adresse.',
  'validation.phone_format': 'Ungültige Telefonnummer (Format: +49…).',
  'validation.password_weak': 'Passwort muss mindestens 8 Zeichen mit Buchstaben und Zahlen enthalten.',
  'validation.postal_code_de': 'Ungültige Postleitzahl (5 Ziffern für Deutschland erforderlich).',
  'validation.quantity_range': 'Anzahl muss zwischen 1 und 99 liegen.',
  'validation.reason_too_short': 'Bitte geben Sie einen Grund an (mindestens 3 Zeichen).',
  'validation.reason_too_long':  'Grund darf höchstens 500 Zeichen enthalten.',

  // Auth
  'auth.email_taken': 'Diese E-Mail-Adresse ist bereits registriert.',
  'auth.invalid_credentials': 'E-Mail oder Passwort ist falsch.',
  'auth.account_disabled': 'Dieses Konto wurde deaktiviert.',
  'auth.token_missing': 'Kein Zugriffstoken vorhanden.',
  'auth.token_invalid': 'Token ist ungültig oder abgelaufen.',
  'auth.role_insufficient': 'Sie haben keine Berechtigung für diese Aktion.',
  'auth.email_not_verified': 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.',
  'auth.email_disposable': 'Wegwerf-E-Mail-Adressen sind nicht erlaubt. Bitte verwenden Sie Ihre echte E-Mail.',
  'auth.email_already_verified': 'Diese E-Mail-Adresse wurde bereits bestätigt.',
  'auth.suspicious_request': 'Anfrage konnte nicht verarbeitet werden.',

  // OTP
  'otp.cooldown': 'Bitte warten Sie {{seconds}} Sekunden, bevor Sie einen neuen Code anfordern.',
  'otp.rate_limit': 'Zu viele OTP-Anfragen. Bitte versuchen Sie es in 15 Minuten erneut.',
  'otp.expired': 'Der Code ist abgelaufen. Bitte fordern Sie einen neuen an.',
  'otp.invalid': 'Falscher Code. Noch {{remaining}} Versuche übrig.',
  'otp.locked': 'Zu viele falsche Versuche. Bitte fordern Sie einen neuen Code an.',
  'otp.sent': 'Bestätigungscode an {{email}} gesendet.',
  'otp.ip_blocked': 'Aus Sicherheitsgründen wurde Ihre IP-Adresse vorübergehend gesperrt. Bitte versuchen Sie es später erneut.',
  'otp.ip_email_combo': 'Zu viele Anfragen für diese E-Mail-Adresse von Ihrem Gerät. Bitte versuchen Sie es später erneut.',

  // Store
  'store.closed': 'Das Restaurant ist derzeit geschlossen.',
  'store.out_of_zone': 'Lieferung außerhalb unseres Liefergebiets ({{km}} km). Maximaler Radius: {{max}} km.',

  // Order
  'order.not_found': 'Bestellung nicht gefunden.',
  'order.no_items': 'Bestellung muss mindestens einen Artikel enthalten.',
  'order.dish_unavailable': '„{{name}}" ist derzeit nicht verfügbar.',
  'order.invalid_status_transition': 'Statusänderung von „{{from}}" zu „{{to}}" nicht erlaubt.',
  'order.cannot_cancel': 'Diese Bestellung kann nicht mehr storniert werden.',
  'order.created': 'Bestellung {{code}} wurde erfolgreich aufgegeben.',
  'order.payment_confirmed': 'Zahlung für Bestellung {{code}} bestätigt.',
  'order.cancelled': 'Bestellung {{code}} wurde storniert.',
  'order.email_daily_limit': 'Sie haben das tägliche Bestelllimit erreicht.',

  // Promotion
  'promo.not_found': 'Aktionscode nicht gefunden.',
  'promo.expired': 'Aktionscode ist abgelaufen.',
  'promo.min_order': 'Mindestbestellwert {{amount}} € für diesen Code erforderlich.',
  'promo.usage_limit': 'Aktionscode wurde bereits zu oft verwendet.',
  'promo.per_user_limit': 'Sie haben diesen Code bereits verwendet.',

  // Status names (cho email/notif/socket)
  'status.pending_payment': 'Zahlung ausstehend',
  'status.paid': 'Bezahlt',
  'status.preparing': 'Wird zubereitet',
  'status.delivering': 'Unterwegs',
  'status.completed': 'Geliefert',
  'status.cancelled': 'Storniert',

  // Payment method names
  'payment.cash_on_delivery': 'Barzahlung bei Lieferung',
  'payment.paypal': 'PayPal',
  'payment.bank_qr_image': 'Banküberweisung (QR-Code)',

  // ==================== EMAIL TEMPLATES ====================
  'email.otp.subject': 'Ihr Bestätigungscode für Sai Gon Wok',
  'email.otp.heading': 'Bestätigungscode',
  'email.otp.body': 'Bitte verwenden Sie den folgenden Code, um Ihre Bestellung zu bestätigen. Der Code ist {{minutes}} Minuten gültig.',
  'email.otp.warning': 'Wenn Sie diesen Code nicht angefordert haben, ignorieren Sie diese E-Mail.',

  // ----- Common email blocks dùng chéo nhiều template -----
  'email.order.hello':         'Hallo {{name}},',
  'email.order.items_header':  'Bestellte Artikel',
  'email.order.subtotal':      'Zwischensumme',
  'email.order.delivery_fee':  'Liefergebühr',
  'email.order.total_label':   'Gesamt',
  'email.order.payment_label': 'Zahlungsart',
  'email.order.track_link':    'Bestellung ansehen',

  'email.order_confirm.subject': 'Bestellbestätigung {{code}} — Sai Gon Wok',
  'email.order_confirm.heading': 'Vielen Dank für Ihre Bestellung!',
  'email.order_confirm.body':    'Wir haben Ihre Bestellung erhalten. Folgen Sie der Zahlungsanweisung unten, damit die Küche mit der Zubereitung beginnen kann.',
  'email.order_confirm.cash_note':    'Sie zahlen bar bei der Lieferung — kein weiterer Schritt erforderlich.',
  'email.order_confirm.bank_note':    'Bitte überweisen Sie den Betrag mit der Bestellnummer „{{code}}" als Verwendungszweck. Die Küche startet nach Zahlungseingang.',
  'email.order_confirm.paypal_note':  'Bitte senden Sie den Betrag über PayPal mit der Bestellnummer „{{code}}" als Nachricht. Die Küche startet nach Zahlungseingang.',

  'email.payment_confirmed.subject': 'Zahlung bestätigt {{code}} — Sai Gon Wok',
  'email.payment_confirmed.heading': 'Ihre Zahlung wurde bestätigt',
  'email.payment_confirmed.body':    'Vielen Dank! Wir haben Ihre Zahlung erhalten. Die Küche bereitet Ihre Bestellung jetzt zu.',

  'email.delivering.subject': 'Ihre Bestellung {{code}} ist unterwegs',
  'email.delivering.heading': 'Ihr Essen ist unterwegs',
  'email.delivering.body':    'Unser Fahrer hat Ihre Bestellung abgeholt und ist auf dem Weg zu Ihrer angegebenen Adresse. Bitte halten Sie Ihr Telefon bereit, falls der Fahrer Sie kontaktiert.',

  'email.cancelled.subject':  'Bestellung {{code}} storniert',
  'email.cancelled.heading':  'Ihre Bestellung wurde storniert',
  'email.cancelled.body':     'Leider mussten wir Ihre Bestellung stornieren.',
  'email.cancelled.reason_label': 'Grund:',
  'email.cancelled.refund_paid':  'Da Sie bereits bezahlt haben, erstatten wir den vollen Betrag innerhalb weniger Werktage zurück.',
  'email.cancelled.refund_cash':  'Da Sie noch nicht bezahlt haben, fällt für Sie keine Gebühr an.',

  // Account deactivation
  'email.account_deactivated.subject': 'Ihr Konto wurde deaktiviert — Sai Gon Wok',
  'email.account_deactivated.heading': 'Ihr Konto wurde deaktiviert',
  'email.account_deactivated.body': 'Sehr geehrte/r {{name}}, Ihr Konto bei Sai Gon Wok wurde durch unser Team deaktiviert. Sie können sich nicht mehr anmelden oder bestellen.',
  'email.account_deactivated.reason_label': 'Grund:',
  'email.account_deactivated.contact': 'Wenn Sie Fragen haben oder dies klären möchten, antworten Sie bitte auf diese E-Mail.',

  // Account reactivation
  'email.account_reactivated.subject': 'Ihr Konto wurde reaktiviert — Sai Gon Wok',
  'email.account_reactivated.heading': 'Ihr Konto ist wieder aktiv',
  'email.account_reactivated.body': 'Sehr geehrte/r {{name}}, Ihr Konto bei Sai Gon Wok wurde reaktiviert. Sie können sich jetzt wieder anmelden und bestellen.',

  'email.signature': 'Mit freundlichen Grüßen,\nIhr Sai Gon Wok Team',
  'email.footer.address': 'Sài Gòn Wok · Kanalstraße 10, 70182 Stuttgart',

  // Dish admin
  'dish.featured_limit_reached': 'Es können maximal {{limit}} Gerichte als Spezialität markiert werden. Bitte entfernen Sie zuerst ein anderes Gericht.',
}

const en: Dict = {
  // Common
  'common.unknown_error': 'An unknown error occurred.',
  'common.too_many_requests': 'Too many requests. Please try again later.',
  'common.not_found': 'Not found.',
  'common.forbidden': 'Access denied.',
  'common.unauthorized': 'Not authenticated.',

  // Validation
  'validation.invalid_payload': 'Invalid request payload.',
  'validation.required': 'Required field.',
  'validation.email_format': 'Invalid email address.',
  'validation.phone_format': 'Invalid phone number (format: +49…).',
  'validation.password_weak': 'Password must be at least 8 characters with letters and digits.',
  'validation.postal_code_de': 'Invalid postal code (5 digits required for Germany).',
  'validation.quantity_range': 'Quantity must be between 1 and 99.',
  'validation.reason_too_short': 'Please provide a reason (at least 3 characters).',
  'validation.reason_too_long':  'Reason must be at most 500 characters.',

  // Auth
  'auth.email_taken': 'This email is already registered.',
  'auth.invalid_credentials': 'Incorrect email or password.',
  'auth.account_disabled': 'This account has been disabled.',
  'auth.token_missing': 'Missing access token.',
  'auth.token_invalid': 'Token is invalid or expired.',
  'auth.role_insufficient': 'You are not authorized to perform this action.',
  'auth.email_not_verified': 'Please verify your email address first.',
  'auth.email_disposable': 'Disposable email addresses are not allowed. Please use a real email.',
  'auth.email_already_verified': 'This email address has already been verified.',
  'auth.suspicious_request': 'Request could not be processed.',

  // OTP
  'otp.cooldown': 'Please wait {{seconds}} seconds before requesting a new code.',
  'otp.rate_limit': 'Too many OTP requests. Please try again in 15 minutes.',
  'otp.expired': 'The code has expired. Please request a new one.',
  'otp.invalid': 'Incorrect code. {{remaining}} attempts remaining.',
  'otp.locked': 'Too many wrong attempts. Please request a new code.',
  'otp.sent': 'Verification code sent to {{email}}.',
  'otp.ip_blocked': 'Your IP has been temporarily blocked for security reasons. Please try again later.',
  'otp.ip_email_combo': 'Too many requests for this email from your device. Please try again later.',

  // Store
  'store.closed': 'The restaurant is currently closed.',
  'store.out_of_zone': 'Delivery outside our service area ({{km}} km). Maximum radius: {{max}} km.',

  // Order
  'order.not_found': 'Order not found.',
  'order.no_items': 'Order must contain at least one item.',
  'order.dish_unavailable': '"{{name}}" is currently unavailable.',
  'order.invalid_status_transition': 'Status transition from "{{from}}" to "{{to}}" is not allowed.',
  'order.cannot_cancel': 'This order can no longer be cancelled.',
  'order.created': 'Order {{code}} placed successfully.',
  'order.payment_confirmed': 'Payment confirmed for order {{code}}.',
  'order.cancelled': 'Order {{code}} has been cancelled.',
  'order.email_daily_limit': 'You have reached the daily order limit.',

  // Promotion
  'promo.not_found': 'Promotion code not found.',
  'promo.expired': 'Promotion code has expired.',
  'promo.min_order': 'Minimum order €{{amount}} required for this code.',
  'promo.usage_limit': 'Promotion code has already been used too many times.',
  'promo.per_user_limit': 'You have already used this code.',

  // Status names
  'status.pending_payment': 'Pending payment',
  'status.paid': 'Paid',
  'status.preparing': 'Preparing',
  'status.delivering': 'Out for delivery',
  'status.completed': 'Delivered',
  'status.cancelled': 'Cancelled',

  // Payment method names
  'payment.cash_on_delivery': 'Cash on delivery',
  'payment.paypal': 'PayPal',
  'payment.bank_qr_image': 'Bank transfer (QR code)',

  // ==================== EMAIL TEMPLATES ====================
  'email.otp.subject': 'Your verification code for Sai Gon Wok',
  'email.otp.heading': 'Verification code',
  'email.otp.body': 'Please use the following code to verify your order. The code is valid for {{minutes}} minutes.',
  'email.otp.warning': 'If you did not request this code, please ignore this email.',

  // ----- Common email blocks shared across templates -----
  'email.order.hello':         'Hi {{name}},',
  'email.order.items_header':  'Items ordered',
  'email.order.subtotal':      'Subtotal',
  'email.order.delivery_fee':  'Delivery fee',
  'email.order.total_label':   'Total',
  'email.order.payment_label': 'Payment method',
  'email.order.track_link':    'View order',

  'email.order_confirm.subject': 'Order confirmation {{code}} — Sai Gon Wok',
  'email.order_confirm.heading': 'Thank you for your order!',
  'email.order_confirm.body':    'We have received your order. Follow the payment instructions below so our kitchen can start preparing.',
  'email.order_confirm.cash_note':    'You will pay in cash on delivery — no further action needed.',
  'email.order_confirm.bank_note':    'Please transfer the amount with order code "{{code}}" as the reference. The kitchen starts once payment arrives.',
  'email.order_confirm.paypal_note':  'Please send the amount via PayPal with order code "{{code}}" in the note. The kitchen starts once payment arrives.',

  'email.payment_confirmed.subject': 'Payment confirmed {{code}} — Sai Gon Wok',
  'email.payment_confirmed.heading': 'Your payment has been confirmed',
  'email.payment_confirmed.body':    'Thank you! We have received your payment. The kitchen is preparing your order now.',

  'email.delivering.subject': 'Your order {{code}} is on the way',
  'email.delivering.heading': 'Your food is on the way',
  'email.delivering.body':    'Our driver has picked up your order and is on the way to the address you provided. Please keep your phone handy in case the driver needs to contact you.',

  'email.cancelled.subject':  'Order {{code}} cancelled',
  'email.cancelled.heading':  'Your order has been cancelled',
  'email.cancelled.body':     'Unfortunately we had to cancel your order.',
  'email.cancelled.reason_label': 'Reason:',
  'email.cancelled.refund_paid':  'Since you have already paid, we will refund the full amount within a few business days.',
  'email.cancelled.refund_cash':  'Since you had not yet paid, no charge will be made.',

  // Account deactivation
  'email.account_deactivated.subject': 'Your account has been deactivated — Sai Gon Wok',
  'email.account_deactivated.heading': 'Your account has been deactivated',
  'email.account_deactivated.body': 'Dear {{name}}, your Sai Gon Wok account has been deactivated by our team. You can no longer sign in or place orders.',
  'email.account_deactivated.reason_label': 'Reason:',
  'email.account_deactivated.contact': 'If you have questions or want to discuss this, please reply to this email.',

  // Account reactivation
  'email.account_reactivated.subject': 'Your account has been reactivated — Sai Gon Wok',
  'email.account_reactivated.heading': 'Your account is active again',
  'email.account_reactivated.body': 'Dear {{name}}, your Sai Gon Wok account has been reactivated. You can sign in and place orders again.',

  'email.signature': 'Best regards,\nYour Sai Gon Wok team',
  'email.footer.address': 'Sài Gòn Wok · Kanalstraße 10, 70182 Stuttgart',

  // Dish admin
  'dish.featured_limit_reached': 'You can feature at most {{limit}} dishes. Please un-feature another dish first.',
}

export const dictionary: Record<Locale, Dict> = { de, en }
export type TKey = keyof typeof de
