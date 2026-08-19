# Borrow Hub VPS Deployment Runbook

## Kiến trúc production

`docker-compose.production.yml` chạy năm service:

- `postgres`: PostgreSQL 16, chỉ nằm trong mạng nội bộ.
- `redis`: Redis 7 có mật khẩu và AOF, chỉ nằm trong mạng nội bộ.
- `migrate`: chạy `prisma migrate deploy` trước API.
- `api`: NestJS chạy bằng user không đặc quyền, filesystem chỉ đọc, dữ liệu upload nằm trong volume.
- `caddy`: reverse proxy công khai, tự cấp/gia hạn TLS cho tên miền.

Chỉ các cổng `80` và `443` được public. API port `3000` mặc định chỉ bind vào `127.0.0.1` để kiểm tra sức khỏe tại VPS.

## Điều kiện máy chủ

- VPS Linux x86_64/arm64 với tối thiểu 2 GB RAM và dung lượng đĩa phù hợp dữ liệu upload.
- Docker Engine và Docker Compose plugin đang hoạt động.
- Bản ghi DNS `A`/`AAAA` của tên miền API trỏ về VPS.
- Firewall chỉ mở SSH, `80/tcp`, `443/tcp` và `443/udp`.
- SMTP account và tài khoản ngân hàng đã cấu hình webhook SePay.

## Chuẩn bị lần đầu

```bash
sudo mkdir -p /srv/borrow-hub/{repo,backups}
sudo chown -R "$USER":"$USER" /srv/borrow-hub
git clone <YOUR_REPOSITORY_URL> /srv/borrow-hub/repo
cd /srv/borrow-hub/repo
cp .env.example .env
chmod 600 .env
chmod +x deploy.sh
```

Không commit `.env`. Thay toàn bộ giá trị mẫu trước khi chạy.

## Cấu hình bắt buộc

Trong `.env`, đặt tối thiểu:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
APP_URL=https://api.example.com
DOMAIN=api.example.com
ACME_EMAIL=admin@example.com
API_BIND_ADDRESS=127.0.0.1
API_PORT=3000
CORS_ORIGINS=https://app.example.com

POSTGRES_DB=borrowhub
POSTGRES_USER=borrowhub
POSTGRES_PASSWORD=<STRONG_DATABASE_PASSWORD>
DOCKER_DATABASE_URL=postgresql://borrowhub:<URL_ENCODED_PASSWORD>@postgres:5432/borrowhub?schema=public
DOCKER_REDIS_URL=redis://:<URL_ENCODED_PASSWORD>@redis:6379
REDIS_PASSWORD=<STRONG_REDIS_PASSWORD>

JWT_ACCESS_SECRET=<INDEPENDENT_RANDOM_SECRET>
JWT_REFRESH_SECRET=<INDEPENDENT_RANDOM_SECRET>
STORAGE_SIGNING_SECRET=<INDEPENDENT_RANDOM_SECRET>

PASSWORD_RESET_URL=borrowhub://auth/reset-password
SMTP_HOST=<SMTP_HOST>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<SMTP_USER>
SMTP_PASSWORD=<SMTP_PASSWORD>
SMTP_FROM=Borrow Hub <no-reply@example.com>

SEPAY_ENABLED=true
SEPAY_ACCOUNT_NUMBER=<BANK_ACCOUNT_NUMBER>
SEPAY_ACCOUNT_NAME=<BANK_ACCOUNT_NAME>
SEPAY_BANK_NAME=<SEPAY_BANK_CODE_OR_NAME>
SEPAY_WEBHOOK_SECRET=<INDEPENDENT_RANDOM_SECRET>
```

Mật khẩu có ký tự đặc biệt phải được URL-encode trong `DOCKER_DATABASE_URL` và `DOCKER_REDIS_URL`. Ba secret JWT/storage và secret webhook phải độc lập; không tái sử dụng mật khẩu database.

Đặt webhook SePay đến:

```text
https://api.example.com/api/v1/payments/webhooks/sepay
```

Giá trị chữ ký webhook tại SePay phải trùng `SEPAY_WEBHOOK_SECRET`.

## Triển khai

Tại commit đã được kiểm thử:

```bash
cd /srv/borrow-hub/repo
./deploy.sh
```

Script sẽ kiểm tra Compose, tải image hạ tầng, build API, chờ database, chạy migration, khởi động API/Caddy và chỉ thành công khi health check trả về HTTP 2xx. Script không tự `git pull`, nhờ đó phiên bản deploy luôn là commit do người vận hành chủ động chọn.

## Kiểm tra sau deploy

```bash
docker compose -f docker-compose.production.yml ps
curl --fail https://api.example.com/api/v1/health
docker compose -f docker-compose.production.yml logs --tail=100 api
docker compose -f docker-compose.production.yml logs --tail=100 caddy
```

Health response phải có `status: "ok"` và `database: "up"`.

Kiểm tra thêm trước khi mở traffic:

1. Đăng ký, đăng nhập, refresh token và quên mật khẩu.
2. Upload ảnh tài sản và truy cập URL public.
3. Upload KYC rồi xác nhận URL tài liệu chỉ hoạt động khi có chữ ký tạm thời.
4. Tạo đơn thuê sandbox/staging; trên production xác nhận VietQR và webhook SePay cập nhật đúng một lần.
5. Tạo hợp đồng, ký hai bên, quét QR bàn giao và yêu cầu hoàn trả.

## Nâng cấp an toàn

```bash
cd /srv/borrow-hub/repo
git fetch --all --prune
git checkout <RELEASE_TAG_OR_COMMIT>
./deploy.sh
```

Luôn tạo backup database trước release có migration. Prisma migration production phải tiến về phía trước; không dùng `prisma db push`.

## Rollback ứng dụng

Nếu schema của release mới tương thích ngược:

```bash
cd /srv/borrow-hub/repo
git checkout <LAST_KNOWN_GOOD_COMMIT>
docker compose -f docker-compose.production.yml build api
docker compose -f docker-compose.production.yml up -d --no-deps api
curl --fail https://api.example.com/api/v1/health
```

Nếu migration không tương thích ngược, không tự hạ schema. Dừng ghi dữ liệu, thực hiện kế hoạch phục hồi đã duyệt từ backup theo `DATABASE_RUNBOOK.md`, rồi mới chạy phiên bản cũ.

## Mobile production

Trong EAS environment `production`, đặt:

```dotenv
EXPO_PUBLIC_API_URL=https://api.example.com/api/v1
```

Chạy build từ `apps/mobile`:

```bash
pnpm install --frozen-lockfile
cd apps/mobile
eas build --profile production --platform all
```

Không đặt JWT secret, SMTP password hay khóa SePay trong biến `EXPO_PUBLIC_*`; các biến này được nhúng vào ứng dụng.

## Vận hành

```bash
docker compose -f docker-compose.production.yml logs -f --tail=200 api
docker compose -f docker-compose.production.yml restart api
docker compose -f docker-compose.production.yml exec redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping
```

Theo dõi dung lượng các volume `postgres-data`, `redis-data`, `api-uploads` và log Docker. Cấu hình cảnh báo cho health endpoint, dung lượng đĩa, RAM và tỷ lệ lỗi HTTP 5xx.
