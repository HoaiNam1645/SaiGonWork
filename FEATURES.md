# Sai Gon Wok — Danh sách chức năng & Auth theo Role

> Tài liệu này liệt kê toàn bộ chức năng theo từng role, kèm yêu cầu xác thực và ma trận phân quyền. Đi cùng với [DATABASE.md](DATABASE.md) và [schema.sql](schema.sql).
>
> **Bối cảnh**: Nhà hàng Sài Gòn Wok đặt tại Stuttgart, Đức — phục vụ thị trường Đức. Tiền tệ EUR. Khoảng cách giao hàng tính bằng **đường lái xe thật** (OSRM routing API), không phải đường chim bay. Phí ship `2 €/km`, miễn phí ship khi subtotal ≥ 25 €, bán kính phục vụ 15 km. Geocoding địa chỉ qua Nominatim (OSM).

---

## 1. Mô hình xác thực (Authentication)

### 1.1 Các loại "danh tính" trong hệ thống

| Loại | Mô tả | Định danh | Lưu DB |
|---|---|---|---|
| **Anonymous** | Khách lướt web, chưa làm gì | session cookie (tùy chọn) | Không |
| **Guest (verified)** | Khách đã pass OTP email để đặt đơn | `email + OTP` ở thời điểm checkout | Tạo `orders` với `user_id = NULL`, `email_verified_at = NOW()` |
| **Customer** | Khách đã đăng ký tài khoản | `email + password` (JWT) | Có row trong `users` (role=`customer`) |
| **Staff** | Kiểm duyệt viên | `email + password` (JWT, ép 2FA tương lai) | Có row trong `users` (role=`staff`), do admin tạo |
| **Admin** | Quản trị viên | `email + password` (JWT) | Có row trong `users` (role=`admin`) |

### 1.2 Cơ chế

- **JWT** ký bằng `JWT_SECRET`, lưu trong **httpOnly cookie** (`SameSite=Lax`, `Secure` trên production).
- **Access token** TTL 15 phút, **refresh token** TTL 7 ngày (lưu cookie riêng, có thể rotate).
- **Password**: bcrypt với cost 12.
- **OTP**: 6 chữ số, hash bcrypt khi lưu, TTL 10 phút, max 5 lần thử sai.
- **Rate limit**: per-IP cho `/auth/*` và `/otp/*`, per-email cho gửi OTP (cooldown 60s, max 3 lần / 15 phút).

### 1.3 Endpoint xác thực

| Endpoint | Public | Mô tả |
|---|---|---|
| `POST /auth/register` | ✅ | Đăng ký customer (email + password + full_name + phone). Gửi OTP verify email. |
| `POST /auth/login` | ✅ | Đăng nhập, trả JWT trong cookie. |
| `POST /auth/logout` | ✅ | Xóa cookie. |
| `POST /auth/refresh` | ✅ | Cấp access token mới từ refresh token. |
| `POST /auth/forgot-password` | ✅ | Gửi OTP reset. |
| `POST /auth/reset-password` | ✅ | Reset bằng OTP + password mới. |
| `POST /otp/send` | ✅ | Gửi OTP (purpose: `guest_checkout` / `register` / `login` / `reset_password`). |
| `POST /otp/verify` | ✅ | Verify OTP — trả token tạm cho guest checkout. |
| `GET  /auth/me` | 🔒 | Trả thông tin user đang login. |

### 1.4 Middleware

```
requireAuth                → có JWT hợp lệ
requireRole('staff','admin')→ JWT + role match
requireGuestOtp            → header X-Guest-Token (JWT ngắn hạn cấp sau khi verify OTP)
requireOrderAccess         → user là chủ đơn, hoặc staff/admin, hoặc guest có token khớp order
```

---

## 2. Ma trận phân quyền (tóm tắt)

| Chức năng | Anon | Guest | Customer | Staff | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Xem menu / chi tiết món | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quản lý giỏ hàng (localStorage) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Checkout | ❌ | ✅¹ | ✅ | ✅ | ✅ |
| Tra cứu đơn | ❌ | ✅² | ✅ | ✅ | ✅ |
| Lưu địa chỉ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Lịch sử đơn cá nhân | ❌ | ❌ | ✅ | ✅ | ✅ |
| Xác nhận thanh toán | ❌ | ❌ | ❌ | ✅ | ✅ |
| Chuyển trạng thái đơn | ❌ | ❌ | ❌ | ✅ | ✅ |
| CRUD menu/category/option | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sửa thông tin cửa hàng | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quản lý user/staff | ❌ | ❌ | ❌ | ❌ | ✅ |
| CRUD promotion | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem audit log | ❌ | ❌ | ❌ | ❌ | ✅ |
| Thống kê doanh thu | ❌ | ❌ | ❌ | ✅³ | ✅ |

¹ Phải pass OTP email tại bước checkout.
² Bằng `order.code` + `email`, hoặc qua link kèm token trong email confirmation.
³ Staff chỉ xem trong ngày / ca làm — không xem theo tháng/năm.

---

## 3. Customer (đã đăng ký)

> Tất cả chức năng của Guest, cộng thêm:

### 3.1 Tài khoản
- Đăng ký / đăng nhập / đăng xuất
- Verify email (OTP)
- Đổi mật khẩu (yêu cầu nhập password cũ)
- Quên mật khẩu (OTP qua email)
- Cập nhật thông tin cá nhân: `full_name`, `phone`
- Xóa tài khoản (soft delete: `is_active = FALSE`)

### 3.2 Địa chỉ
- Thêm / sửa / xóa địa chỉ giao hàng
- Đặt 1 địa chỉ làm mặc định
- Tự động chọn địa chỉ mặc định khi checkout

### 3.3 Đặt hàng
- Thêm món vào giỏ (lưu `localStorage`, sync khi login)
- Sửa số lượng, ghi chú từng món, chọn options (size/topping)
- Áp mã giảm giá (validate min_order, ends_at, per_user_limit)
- Checkout: nhập/chọn địa chỉ → tự động geocode (Nominatim) + tính đường lái xe (OSRM) → hiển thị `distance_km`, `duration_minutes`, `delivery_fee` realtime trên bản đồ Leaflet
- Chọn `payment_method`:
  - **`cash_on_delivery`** — trả tiền mặt khi shipper giao
  - **`paypal`** — redirect sang PayPal (hoặc paypal.me link), sau khi thanh toán xong webhook/manual confirm
  - **`bank_qr_image`** — hiển thị ảnh QR ngân hàng cá nhân (admin upload sẵn). Khách quét → chuyển khoản → bấm "Đã chuyển" → staff đối soát thủ công
- Báo "Đã thanh toán" (với `paypal` / `bank_qr_image`) → đơn vào hàng đợi staff xác nhận
- Snapshot toàn bộ công thức ship vào `delivery_fee_breakdown` (distance, duration, per_km, threshold, ETA, store coords, provider)

### 3.4 Theo dõi đơn
- Lịch sử toàn bộ đơn của mình (filter theo status)
- Chi tiết đơn: items, địa chỉ, timeline (từ `order_status_history`)
- **Realtime** trạng thái qua Socket.io (room `order:{code}`)
- Hủy đơn (chỉ khi `status IN ('pending_payment','paid')`)
- Đặt lại đơn cũ ("Order again" — copy items vào giỏ)

---

## 4. Guest (chưa đăng ký)

### 4.1 Có thể làm
- Tất cả việc xem menu / quản lý giỏ như anon
- Checkout với điều kiện **bắt buộc** điền đủ:
  - `contact_name` (2–100 ký tự)
  - `contact_email` (RFC 5322, sẽ bị verify OTP)
  - `contact_phone` (E.164 / VN / DE — chỉ validate format, không OTP)
  - Địa chỉ đầy đủ: `recipient`, `phone`, `line`, `city`, `country`
  - Ít nhất 1 món trong giỏ
  - `payment_method`
- Verify OTP email → backend cấp **guest token** (JWT TTL 30 ngày, claims: `order_code`, `email`)
- Theo dõi đơn realtime với guest token (socket join room `order:{code}` khi gửi token hợp lệ)
- Xem lại đơn qua URL `/orders/{code}?token=...` (lưu `localStorage` + gửi trong email confirmation)

### 4.2 Không thể làm
- Lưu địa chỉ
- Xem lịch sử nhiều đơn (chỉ xem được đơn trong session/email confirm)
- Áp mã có ràng buộc `per_user_limit` theo user (mã `per_user_limit` áp theo email vẫn được)

### 4.3 Anti-spam (đi kèm OTP)

| Lớp bảo vệ | Cấu hình |
|---|---|
| Cooldown gửi OTP | 60s giữa 2 lần |
| Max OTP / email / 15min | 3 |
| Max OTP sai / mã | 5 lần → khóa mã, phải xin mới |
| Max đơn / email / ngày | 5 |
| Honeypot field trong form | Có |
| Cloudflare Turnstile | Khuyến nghị (free) |
| Disposable email blacklist | Dùng package `disposable-email-domains` |

---

## 5. Staff (Kiểm duyệt viên)

### 5.1 Tài khoản
- Đăng nhập (do admin tạo, không tự đăng ký)
- Đổi mật khẩu
- Đăng xuất

### 5.2 Dashboard đơn realtime
- Subscribe socket room `staff:orders` → đơn mới push lên đầu list (kèm âm báo + browser notification)
- List đơn theo tab status: `pending_payment` / `paid` / `preparing` / `delivering` / `completed` / `cancelled`
- Filter: theo ngày, theo `payment_method`, search theo `code` / `contact_phone` / `contact_email`
- Sort: mới nhất / cũ nhất / theo `total`

### 5.3 Xử lý đơn
- Xem chi tiết đơn: items + options + note + địa chỉ + timeline
- **Xác nhận thanh toán** (với `paypal` và `bank_qr_image`):
  1. Staff đối soát:
     - PayPal: kiểm tra email PayPal nhận được tiền với số tiền + tên người gửi khớp đơn
     - Bank QR: đối soát app banking xem có khoản chuyển khớp số tiền + thời gian
  2. Nhập `bank_tx_id` (mã giao dịch / PayPal transaction ID) → bấm "Đã nhận tiền"
  3. Backend chuyển `pending_payment` → `paid`, set `paid_at`, `paid_confirmed_by`
  4. INSERT `order_status_history`, push socket cho customer
- **`cash_on_delivery`** không cần xác nhận thanh toán bước này — đơn tự động vào `paid` (hoặc `preparing` luôn) sau khi tạo, chỉ confirm tiền lúc shipper giao thành công (`completed`)
- **Chuyển trạng thái** (theo state machine):
  - `paid` → `preparing` ("Bắt đầu chế biến")
  - `preparing` → `delivering` ("Đã giao shipper")
  - `delivering` → `completed` ("Đã giao thành công")
- **Hủy đơn** (kèm `cancelled_reason` bắt buộc, max 255 ký tự)
- In phiếu bếp / hóa đơn (PDF)

### 5.4 Thống kê (giới hạn ca làm)
- Số đơn theo status trong ngày
- Tổng doanh thu trong ngày
- Số đơn chờ thanh toán quá 30 phút (cảnh báo)
- **Không** xem được dữ liệu lịch sử > 7 ngày

### 5.5 Không được phép
- Sửa/xóa đơn (chỉ chuyển status)
- Sửa giá / menu
- Tạo/sửa user
- Xem audit log đầy đủ (chỉ xem hành động của chính mình)

---

## 6. Admin

> Tất cả chức năng của Staff, cộng thêm:

### 6.1 Quản lý menu

**Categories:**
- Tạo / sửa / xóa (xóa = chặn nếu còn dishes; cần "deactivate" trước)
- Sắp xếp drag-drop (`display_order`)
- Toggle `is_active`

**Dishes:**
- CRUD đầy đủ (name vi/en, description vi/en, price, image_url, prep_time, spicy_level, calories)
- Upload ảnh (lưu vào `/public/menu/` hoặc S3/Cloudinary)
- Toggle `is_available` (hết món tạm thời) và `is_featured` (popular)
- Bulk: ẩn/hiện nhiều món, đổi giá theo %

**Dish options:**
- CRUD `dish_options` và `dish_option_values`
- Set `is_required` cho option bắt buộc (ví dụ "Size")
- Set `price_delta` cho từng value

### 6.2 Quản lý đơn hàng
- Tất cả quyền của staff
- **Xem toàn bộ lịch sử đơn** (không giới hạn 7 ngày)
- **Cancel đơn ở mọi trạng thái** (kể cả `completed`, ví dụ refund)
- **Sửa đơn** trong trường hợp đặc biệt (sửa địa chỉ, ghi chú) — log vào `audit_logs`

### 6.3 Quản lý cửa hàng (`store_settings`)
- Sửa: tên, hotline, email, địa chỉ, lat/lng
- `open_hours_json`: cấu hình giờ mở từng ngày trong tuần
- Toggle `is_open` (tạm đóng cửa → chặn đặt đơn mới, FE hiện banner `closed_message`)
- **Thanh toán**:
  - `paypal_email`, `paypal_me_link` — cho phương thức PayPal
  - **Upload ảnh QR ngân hàng** (`bank_qr_image_url`) — chụp từ app banking cá nhân/doanh nghiệp, cập nhật khi đổi
  - `bank_account_name`, `bank_account_no` (IBAN), `bank_name` — hiển thị cùng QR cho khách đối chiếu
- **Giao hàng**: `delivery_radius_km` (default 15 km), `delivery_per_km` (default 2 €), `free_ship_threshold` (default 25 €), `kitchen_prep_minutes` (default 25 phút), `routing_provider` (`osrm` / `google` / `mapbox`)
- `default_currency` (mặc định `EUR`)

### 6.4 Quản lý người dùng
- List customers (read-only): xem email, phone, tổng số đơn, tổng chi tiêu
- List staff/admin: tạo / vô hiệu hóa / reset password
- Tạo staff mới: nhập email + full_name + phone → hệ thống gửi email kèm password tạm
- Đổi role (customer ↔ staff ↔ admin) — chỉ super admin (admin đầu tiên)

### 6.5 Promotions
- CRUD đầy đủ
- Xem `used_count`, list đơn đã áp mã
- Toggle `is_active`

### 6.6 Thống kê & báo cáo
- Doanh thu theo ngày / tuần / tháng / năm (line chart)
- Top 10 món bán chạy
- Tỉ lệ đơn theo status (pie chart)
- Tỉ lệ hủy đơn + lý do hủy
- Doanh thu theo `payment_method`
- Số khách mới vs khách quay lại
- Export CSV / Excel

### 6.7 Audit log
- Xem toàn bộ hành động của staff/admin
- Filter theo actor / entity_type / khoảng thời gian
- Không cho xóa log

---

## 7. State machine `orders.status` (nhắc lại)

```
pending_payment ──[staff confirm CK]──► paid
pending_payment ──[customer cancel]──► cancelled
pending_payment ──[timeout 30min]────► cancelled (system)

paid       ──[staff start cooking]──► preparing
paid       ──[admin cancel + refund]─► cancelled
preparing  ──[staff hand to courier]─► delivering
delivering ──[shipper confirm]──────► completed
delivering ──[delivery failed]──────► cancelled
```

Mọi transition phải:
1. Validate role được phép thực hiện
2. Validate state machine hợp lệ
3. INSERT `order_status_history`
4. Emit socket event `order.status_changed`
5. Gửi email/push notification cho customer (tùy status)

---

## 8. Sự kiện Socket.io

| Event | Hướng | Room | Payload | Dùng khi |
|---|---|---|---|---|
| `order.created` | server → staff | `staff:orders` | `{ order }` | Có đơn mới |
| `order.status_changed` | server → both | `order:{code}`, `staff:orders` | `{ code, from, to, at }` | Đổi trạng thái |
| `order.payment_confirmed` | server → customer | `order:{code}` | `{ code, paid_at }` | Staff xác nhận CK |
| `order.cancelled` | server → both | `order:{code}`, `staff:orders` | `{ code, reason }` | Hủy đơn |
| `store.toggle` | server → all | `public` | `{ is_open }` | Admin toggle đóng/mở |
| `dish.availability_changed` | server → all | `public` | `{ dish_id, is_available }` | Hết món / có lại món |

**Bảo vệ socket:**
- Customer/Guest join `order:{code}` phải gửi token; server verify token khớp order trước khi cho join.
- Staff/Admin join `staff:orders` phải có JWT role hợp lệ.
- `public` room — ai cũng join được, chỉ broadcast info không nhạy cảm.

---

## 9. Validation checkout (BE bắt buộc)

```ts
{
  contact_name:  string (2-100, trim),
  contact_email: string (RFC 5322, lowercase),
  contact_phone: string (regex: ^\+?[0-9]{8,15}$),
  address: {
    recipient: string (2-100),
    phone:     string (E.164),
    line:      string (5-255),
    city:      string (required),
    country:   ISO-3166-1 alpha-2,
    ward?:     string,
    district?: string,
    postal_code?: string,
    lat?: number, lng?: number,
    note?: string (max 255)
  },
  items: Array<{
    dish_id:  number,
    quantity: int (1-99),
    options?: Array<{ option_id: number, value_id: number }>,
    note?:    string (max 255)
  }> (length >= 1),
  payment_method: 'cash_on_delivery' | 'paypal' | 'bank_qr_image',
  promotion_code?: string,
  customer_note?:  string (max 500),

  // Chỉ cho guest:
  guest_otp_code?: string (6 digits)  // bắt buộc nếu user_id == null
}
```

Backend **luôn tính lại** `subtotal`, `delivery_fee`, `discount`, `total` từ DB. Không tin frontend.

---

## 10. Roadmap đề xuất

| Phase | Nội dung | Ưu tiên |
|---|---|---|
| **MVP 1** | Auth (customer + staff + admin), CRUD menu, đặt hàng + 3 phương thức TT (cash/PayPal/QR ảnh) + xác nhận thủ công, OSRM routing + tính ship realtime, theo dõi đơn realtime | Cao |
| **MVP 2** | Guest checkout + OTP email, lịch sử đơn, hủy đơn, promotion cơ bản | Cao |
| **V2** | Thống kê admin, audit log, đa ngôn ngữ DE/EN/VI đầy đủ, upload ảnh S3/Cloudinary | Trung |
| **V3** | PayPal IPN/Webhook auto-confirm, Stripe (thẻ + Apple Pay + Google Pay), SEPA QR động, push notification, mobile PWA | Thấp |
| **V4** | Loyalty points, review món, recommend món theo lịch sử, multi-restaurant | Thấp |
