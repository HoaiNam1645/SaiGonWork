import type { Order } from '@/types'

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&auto=format&fit=crop&q=75`

export const mockOrders: Order[] = [
  {
    id: 'sgw-2026-0512',
    code: 'SGW-2026-0512',
    createdAt: '2026-05-07T11:24:00',
    status: 'shipping',
    items: [
      {
        name: 'Phở bò tái',
        variantLabel: 'Tô lớn',
        price: 12.5,
        quantity: 2,
        image: img('photo-1582878826629-29b7ad1cdc43'),
      },
      {
        name: 'Gỏi cuốn tôm',
        price: 6.9,
        quantity: 1,
        image: img('photo-1576577445504-6af96477db52'),
      },
    ],
    subtotal: 31.9,
    shippingFee: 2.5,
    total: 34.4,
    paymentMethod: 'Tiền mặt khi nhận hàng',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
    note: 'Ít hành, thêm rau sống',
  },
  {
    id: 'sgw-2026-0508',
    code: 'SGW-2026-0508',
    createdAt: '2026-05-06T19:10:00',
    status: 'placed',
    items: [
      {
        name: 'Bún bò Huế',
        price: 13.5,
        quantity: 1,
        image: img('photo-1576577445504-6af96477db52'),
      },
      {
        name: 'Trà đào',
        price: 3.5,
        quantity: 2,
        image: img('photo-1546069901-ba9599a7e63c'),
      },
    ],
    subtotal: 20.5,
    shippingFee: 2.5,
    total: 23.0,
    paymentMethod: 'Thẻ tín dụng',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
  },
  {
    id: 'sgw-2026-0476',
    code: 'SGW-2026-0476',
    createdAt: '2026-05-04T12:42:00',
    status: 'preparing',
    items: [
      {
        name: 'Cơm chiên Sài Gòn',
        price: 11.9,
        quantity: 1,
        image: img('photo-1603133872878-684f208fb84b'),
      },
    ],
    subtotal: 11.9,
    shippingFee: 2.5,
    total: 14.4,
    paymentMethod: 'PayPal',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
  },
  {
    id: 'sgw-2026-0431',
    code: 'SGW-2026-0431',
    createdAt: '2026-04-28T20:05:00',
    status: 'delivered',
    items: [
      {
        name: 'Bibimbap',
        price: 14.5,
        quantity: 1,
        image: img('photo-1553163147-622ab57be1c7'),
      },
      {
        name: 'Yakitori gà',
        variantLabel: '4 xiên',
        price: 8.9,
        quantity: 1,
        image: img('photo-1535473895227-bdecb20fb157'),
      },
    ],
    subtotal: 23.4,
    shippingFee: 2.5,
    total: 25.9,
    paymentMethod: 'Tiền mặt khi nhận hàng',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
  },
  {
    id: 'sgw-2026-0388',
    code: 'SGW-2026-0388',
    createdAt: '2026-04-22T18:30:00',
    status: 'delivered',
    items: [
      {
        name: 'Tom Yum hải sản',
        price: 12.9,
        quantity: 1,
        image: img('photo-1569059078571-d0a1bd0d6c1e'),
      },
    ],
    subtotal: 12.9,
    shippingFee: 2.5,
    total: 15.4,
    paymentMethod: 'Thẻ tín dụng',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
  },
  {
    id: 'sgw-2026-0355',
    code: 'SGW-2026-0355',
    createdAt: '2026-04-15T13:15:00',
    status: 'cancelled',
    items: [
      {
        name: 'Bún chay',
        price: 10.9,
        quantity: 2,
        image: img('photo-1565299585323-38d6b0865b47'),
      },
    ],
    subtotal: 21.8,
    shippingFee: 2.5,
    total: 24.3,
    paymentMethod: 'Tiền mặt khi nhận hàng',
    customer: {
      name: 'Nguyễn Hoài Nam',
      phone: '+49 151 234 5678',
      address: 'Kanalstraße 10, 70182 Stuttgart',
    },
    cancelReason: 'Khách yêu cầu hủy đơn — đổi thời gian giao',
  },
]

export function getOrderById(id: string): Order | undefined {
  return mockOrders.find((o) => o.id === id)
}
