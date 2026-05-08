export interface MenuItemVariant {
  label: string
  price: number
}

export interface MenuItem {
  id: string
  number: string
  name: string
  description?: string
  variants?: MenuItemVariant[]
  price?: number
  isVegan?: boolean
  isVegetarian?: boolean
  isPopular?: boolean
  tag?: string
  image?: string
}

export interface MenuCategory {
  id: string
  name: string
  icon: string
  items: MenuItem[]
}

export interface CartItem {
  cartId: string
  menuItemId: string
  name: string
  variantLabel?: string
  price: number
  quantity: number
  image?: string
}

export type OrderStatus = 'placed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'

export interface OrderItem {
  name: string
  variantLabel?: string
  price: number
  quantity: number
  image?: string
}

export interface Order {
  id: string
  code: string
  createdAt: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  total: number
  paymentMethod: string
  customer: {
    name: string
    phone: string
    address: string
  }
  note?: string
  cancelReason?: string
}
