export interface MenuItemVariant {
  label: string
  price: number
  /** ID của dish_option_values khi data đến từ backend (cần để gọi cart API) */
  valueId?: string
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
  /** ID dish trong DB. Có khi item đến từ /api/menu (không có ở fallback local). */
  dishId?: string
  /** ID dish_option (option đầu tiên — hiện mỗi dish max 1 option). */
  optionId?: string
}

export interface MenuCategory {
  id: string
  name: string
  icon: string
  items: MenuItem[]
}

export interface CartItem {
  /** ID dùng cục bộ (server item id sau khi sync, hoặc UUID local trước đó). */
  cartId: string
  /** Slug dish — định danh hiển thị, dùng cho hành vi cũ (data/menu.ts). */
  menuItemId: string
  name: string
  variantLabel?: string
  price: number
  quantity: number
  image?: string
  /** Các ID DB — bắt buộc khi cần đồng bộ lên server. Có thể thiếu khi item add
   *  từ fallback menu data tĩnh (không có DB ids). */
  dishId?: string
  optionId?: string
  valueId?: string
  /** Cờ hiển thị khi giá hiện tại khác giá lúc add (cart phản ánh giá realtime). */
  priceChanged?: boolean
  /** Giá đã lưu lúc add. Khi != price → priceChanged=true. */
  snapshotPrice?: number
  /** Cảnh báo món đã hết / option bị deactivate ở server. */
  available?: boolean
  /** Ghi chú khách thêm cho món (vd "ít cay", "không hành"). Max 255 ký tự. */
  note?: string
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
