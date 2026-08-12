# Borrow Hub

<p align="center">
  Nền tảng chia sẻ và cho thuê tài sản ngang hàng với eKYC, hợp đồng điện tử, bàn giao, thanh toán sandbox và xử lý dispute.
</p>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white">
</p>

<p align="center">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">
  <img alt="PNPM" src="https://img.shields.io/badge/PNPM-F69220?style=for-the-badge&logo=pnpm&logoColor=white">
  <img alt="Expo Ready" src="https://img.shields.io/badge/Frontend-Expo%20Ready-111827?style=for-the-badge&logo=expo&logoColor=white">
  <img alt="Monorepo" src="https://img.shields.io/badge/Architecture-Monorepo-0F172A?style=for-the-badge&logo=turbo&logoColor=white">
</p>

## Tổng quan

Borrow Hub được dựng theo monorepo để backend và mobile app có thể phát triển song song, nhưng hiện tại repo này chỉ hoàn thiện phần backend/API.

Frontend React Native / Expo được giữ nguyên để bạn tự code tay, nên mình không đụng vào flow UI hay scaffold app mobile.

## Backend hiện có

- Xác thực JWT: đăng ký, đăng nhập, refresh token, đăng xuất, `me`
- Hồ sơ người dùng: cập nhật profile, địa chỉ, trust score
- eKYC giả lập: submit hồ sơ, xem trạng thái xác minh
- KYC review nội bộ: admin duyệt `VERIFIED / REJECTED / REQUIRES_REVIEW`
- Danh mục tài sản: cây danh mục, CRUD cơ bản cho admin
- Tài sản cho thuê: tạo listing, tìm kiếm, lọc, moderation
- Quy trình thuê: tạo yêu cầu, duyệt/từ chối, hủy đơn theo policy, thanh toán sandbox
- Hợp đồng điện tử: tạo contract snapshot, ký hai bên, kích hoạt
- Bàn giao và hoàn trả: checklist, evidence, xác nhận giao nhận
- QR handover: owner tạo QR ngắn hạn, renter scan một lần để xác nhận bàn giao
- Đánh giá sau thuê: review hai chiều, edit trong cửa sổ cấu hình, moderation cho staff
- Chat theo rental: conversation giữa owner, renter và staff, hỗ trợ text/image/system warning và lifecycle timeline
- Dispute: mở vụ việc, phản hồi, gán người xử lý, cập nhật trạng thái
- Reports: report user, listing, review và chat message
- Support ticket: lịch sử hỗ trợ, note nội bộ, phân công customer support
- Finance: tra cứu payment, payout, refund và khóa payout khi có dispute
- Risk engine: prohibited asset rules, risk incidents và manual review
- Favorite/Wishlist: lưu tài sản yêu thích và xem danh sách wish list
- Reminder batch: tạo notification cho rental tomorrow, return reminder, overdue, review reminder, availability match
- Analytics: tracking funnel sự kiện nghiệp vụ chính và endpoint summary cho admin
- Admin: dashboard, quản lý user, role, user nội bộ, system config, audit log
- Notifications và audit log cho các action nhạy cảm

## Cấu trúc repo

```text
.
├─ apps/
│  └─ api/              # NestJS API + Prisma schema + seed
├─ docker-compose.yml   # PostgreSQL + API dev container
├─ package.json         # workspace scripts
└─ README.md
```

## Công nghệ sử dụng

- Backend API: NestJS 11, TypeScript
- Database: PostgreSQL 16
- ORM và schema: Prisma 7
- Auth: JWT + Argon2id
- Runtime package manager: pnpm
- Dev environment: Docker Compose

## Domain chính trong API

- `auth`: auth và token lifecycle
- `users`: hồ sơ, địa chỉ, metadata người dùng
- `kyc`: luồng eKYC mô phỏng
  - Có thêm nhánh review nội bộ cho admin
- `categories`: danh mục tài sản
- `assets`: listing, moderation, tìm kiếm
- `rentals`: booking, thanh toán, hợp đồng, handover
  - Có cancellation policy + auto refund/block payout theo rule cấu hình
  - Có thêm QR handover short-lived, one-time, bound theo rental/handover
- `reviews`: đánh giá sau giao dịch
  - Có edit theo `review_edit_hours` và moderation hide/publish cho staff
- `chat`: hội thoại theo đơn thuê, ảnh chat, cảnh báo trao đổi ngoài nền tảng và system message nghiệp vụ
- `disputes`: khiếu nại, evidence linkage, event timeline
- `reports`: report moderation và support workflow
- `support`: support ticket, lịch sử xử lý, assignment và note timeline
- `finance`: payment, payout, refund, finance controls
- `risk`: prohibited asset rules, risk incidents, manual-review workflow
- `favorites`: add/remove favorite, xem wishlist
- `analytics`: tracking event nghiệp vụ và funnel summary cho admin
- `admin`: dashboard, quản trị user và config
- `notifications`: hộp thông báo trong hệ thống
  - Có thêm endpoint admin để chạy batch reminder nghiệp vụ
- `audit`: ghi log cho hành vi nhạy cảm
- `health`: endpoint health check

## Chạy local

### 1. Cài dependency

```bash
pnpm install
```

### 2. Tạo file môi trường

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Khởi động PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Generate Prisma Client

```bash
pnpm prisma:generate
```

### 5. Seed dữ liệu mẫu

```bash
pnpm prisma:seed
```

### 6. Chạy API

```bash
pnpm start:dev
```

API mặc định chạy tại `http://localhost:3000`.

## Scripts hữu ích

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

## Biến môi trường chính

- `DATABASE_URL`: chuỗi kết nối PostgreSQL
- `JWT_ACCESS_SECRET`: secret cho access token
- `JWT_REFRESH_SECRET`: secret cho refresh token
- `THROTTLE_TTL`: thời gian rate limit
- `THROTTLE_LIMIT`: số request tối đa trong TTL
- `PLATFORM_FEE_PERCENT`: phí nền tảng
- `OWNER_COMMISSION_PERCENT`: phần trăm khấu trừ payout

## Gợi ý flow test nhanh

1. Đăng nhập bằng tài khoản seed.
2. Tạo hoặc duyệt một listing.
3. Tạo yêu cầu thuê và approve.
4. Ghi nhận thanh toán sandbox.
5. Ký hợp đồng cả hai phía.
6. Tạo handover delivery rồi confirm.
7. Yêu cầu return, tạo handover return hoặc mở dispute.
8. Tạo refund hoặc kiểm tra payout nếu cần xử lý tranh chấp.
9. Thử hủy booking để kiểm tra flow cancellation policy.
10. Tạo listing chứa keyword cấm để kiểm tra risk incident/manual review.
11. Add favorite rồi chạy batch reminder để kiểm tra notification availability/reminder.
12. Gửi chat text/image, thử nhập số điện thoại hoặc email để kiểm tra system warning ngoài nền tảng.
13. Approve rental, ký xong contract, hoàn tất return để kiểm tra system message tự sinh trong chat timeline.
14. Tạo phiên delivery handover, generate QR rồi confirm bằng token để kiểm tra QR handover one-time.
15. Kiểm tra `GET /analytics/events` và `GET /analytics/summary` sau khi chạy các flow đăng ký, KYC, search, rental, review, dispute.
16. Tạo review, sửa review trong cửa sổ cho phép và thử moderation review bằng tài khoản staff.
17. Tạo support ticket gắn với rental/report/dispute rồi thử assign, đổi trạng thái và thêm note.

## Tài khoản seed mẫu

- Admin: `admin@toolshare.local`
- Owner: `owner@toolshare.local`
- Renter: `renter@toolshare.local`
- Mật khẩu admin: `Admin@123456`
- Mật khẩu owner/renter: `User@123456`

## Ghi chú triển khai

- Repo đang ưu tiên backend hoàn chỉnh theo tài liệu nghiệp vụ.
- Frontend mobile chưa được scaffold để giữ đúng yêu cầu “không đụng frontend”.
- Hiện tại Prisma schema đã sẵn cho phát triển tiếp migration thực tế trên PostgreSQL.

## License

MIT
