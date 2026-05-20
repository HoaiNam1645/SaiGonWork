# Sai Gon Wok — Deployment guide

Server: Ubuntu, đã có sẵn Node / MySQL / nginx / certbot / pm2.
Domain: **sai-gon-work.lemiex.us**
Ports nội bộ: FE `5175`, BE `4000` — chỉ bind 127.0.0.1, nginx reverse proxy ra ngoài.

---

## 0. Pre-check — bắt buộc làm trước

### 0.1 Verify ports trống
```bash
ss -tulpn | grep -E ':(4000|5175)\s'
# Nếu có output → port đang bị chiếm, đổi sang port khác và cập nhật
# trong nginx conf + ecosystem.config.js + package.json
```

### 0.2 Verify DNS đã trỏ về server
```bash
dig +short sai-gon-work.lemiex.us
# Phải in ra IP của server. Nếu chưa, tạo A record trước rồi đợi propagate.
```

### 0.3 Kiểm tra MySQL có sẵn
```bash
mysql --version
sudo systemctl status mysql
```

---

## 1. Setup MySQL database

```bash
sudo mysql -u root

CREATE DATABASE saigon_wok CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'saigon_wok_user'@'localhost' IDENTIFIED BY 'CHOOSE_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON saigon_wok.* TO 'saigon_wok_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 2. Đẩy code lên server

Trên **máy local**:
```bash
# Build local cũng OK, nhưng khuyến nghị build trên server (tránh OS/arch mismatch)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='dist' \
  ./next-tailwind-basic/ \
  user@SERVER_IP:/var/www/sai-gon-work-tmp/
```

Trên **server**, tổ chức lại 2 folder riêng:
```bash
sudo mkdir -p /var/www/sai-gon-work
sudo mv /var/www/sai-gon-work-tmp /var/www/sai-gon-work/frontend

# Backend tách ra subfolder riêng để PM2 quản gọn
sudo mv /var/www/sai-gon-work/frontend/backend /var/www/sai-gon-work/backend

sudo chown -R $USER:$USER /var/www/sai-gon-work
```

---

## 3. Backend — install + migrate + build

```bash
cd /var/www/sai-gon-work/backend

# 3.1 Tạo env production
cp /var/www/sai-gon-work/frontend/deploy/env/backend.env.example .env
# Sửa các CHANGE_ME — đặc biệt:
#   - DATABASE_URL (user/pass MySQL đã tạo ở bước 1)
#   - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET — generate mới:
#     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
#   - MAIL_USERNAME / MAIL_PASSWORD
nano .env

# 3.2 Install deps + generate Prisma Client
npm ci
npx prisma generate

# 3.3 Apply migrations (KHÔNG dùng migrate dev trên production)
npx prisma migrate deploy

# 3.4 Seed initial data (chỉ chạy 1 lần — chứa admin account, store settings, dishes)
npm run seed

# 3.5 Build TypeScript → dist/
npm run build

# Smoke test
node dist/server.js
# Mở terminal khác: curl http://127.0.0.1:4000/api/health
# Ctrl+C nếu OK
```

---

## 4. Frontend — install + build

```bash
cd /var/www/sai-gon-work/frontend

# 4.1 Tạo env production
cp deploy/env/frontend.env.example .env.production
# NEXT_PUBLIC_API_URL đã set sẵn — kiểm tra lại domain đúng chưa
nano .env.production

# 4.2 Install + build
npm ci
npm run build

# Smoke test
npm run start
# Mở terminal khác: curl http://127.0.0.1:5175
# Ctrl+C nếu OK
```

---

## 5. PM2 — chạy daemon

```bash
# Tạo log folder
sudo mkdir -p /var/log/pm2 && sudo chown -R $USER:$USER /var/log/pm2

# Start cả FE + BE
cd /var/www/sai-gon-work/frontend
pm2 start deploy/pm2/ecosystem.config.js

# Verify running
pm2 status
# Phải thấy sgw-frontend (online) + sgw-backend (online)

# Save process list để PM2 auto-start sau reboot
pm2 save
pm2 startup
# PM2 sẽ in ra 1 command sudo — copy paste và chạy
```

---

## 6. Nginx — reverse proxy

```bash
# Copy config
sudo cp /var/www/sai-gon-work/frontend/deploy/nginx/sai-gon-work.lemiex.us.conf \
        /etc/nginx/sites-available/sai-gon-work.lemiex.us.conf

# Enable site
sudo ln -sf /etc/nginx/sites-available/sai-gon-work.lemiex.us.conf \
            /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx
```

**Note**: config có SSL block trỏ tới `/etc/letsencrypt/live/...` — chưa tồn tại lúc này.
Tạm thời comment HTTPS block hoặc dùng nginx config "HTTP only" để xin cert trước.

### Quick workaround:
Sửa tạm `sai-gon-work.lemiex.us.conf`:
```nginx
# Comment toàn bộ "server { listen 443 ssl ... }" block
# Sửa redirect ở port 80 thành proxy trực tiếp tạm thời
```

Hoặc chạy certbot với `--nginx` plugin để nó tự handle:

---

## 7. SSL với Let's Encrypt (certbot)

```bash
sudo certbot --nginx -d sai-gon-work.lemiex.us

# Certbot sẽ:
#  - Xin cert
#  - Tự inject ssl_certificate path đúng vào nginx config
#  - Tự reload nginx
#  - Tự setup cronjob renew

# Verify auto-renew
sudo certbot renew --dry-run
```

---

## 8. Verify production

```bash
# 1. Healthcheck BE
curl https://sai-gon-work.lemiex.us/api/health

# 2. Mở trình duyệt
# https://sai-gon-work.lemiex.us              → Next.js homepage
# https://sai-gon-work.lemiex.us/menu         → Menu page
# https://sai-gon-work.lemiex.us/admin        → Admin login

# 3. Login admin (account từ seed)
# Email: admin@saigonwok.de  /  Password: admin123
# ⚠️ ĐỔI PASSWORD NGAY sau khi login

# 4. Check PM2 logs
pm2 logs sgw-backend  --lines 50
pm2 logs sgw-frontend --lines 50
```

---

## 9. Update flow (cho lần deploy tiếp theo)

### Backend
```bash
cd /var/www/sai-gon-work/backend
git pull   # nếu dùng git, ngược lại rsync lại
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy   # nếu có migration mới
npm run build
pm2 restart sgw-backend
```

### Frontend
```bash
cd /var/www/sai-gon-work/frontend
git pull
npm ci
npm run build
pm2 restart sgw-frontend
```

---

## 10. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Fix |
|---|---|---|
| `502 Bad Gateway` | PM2 process chết | `pm2 logs <app> --err` → fix lỗi → `pm2 restart` |
| `Missing access token` ngay sau login | Cookie không set | Check `sameSite=lax`, `secure=true` ở production. Browser block third-party? |
| Socket.io disconnect liên tục | nginx WebSocket timeout | Đã set `proxy_read_timeout 3600s` — verify config được reload |
| `CORS error` ở browser | `CORS_ORIGIN` ở BE chưa match | Phải = `https://sai-gon-work.lemiex.us` (KHÔNG `*` vì credentials) |
| Migration fail | DB user thiếu quyền | Verify GRANT ALL ở bước 1 |
| Email không gửi | Gmail block app password | Tạo app password mới ở myaccount.google.com/apppasswords |

---

## 11. File reference

- [deploy/nginx/sai-gon-work.lemiex.us.conf](nginx/sai-gon-work.lemiex.us.conf) — nginx reverse proxy
- [deploy/pm2/ecosystem.config.js](pm2/ecosystem.config.js) — PM2 process config
- [deploy/env/backend.env.example](env/backend.env.example) — BE env template
- [deploy/env/frontend.env.example](env/frontend.env.example) — FE env template
