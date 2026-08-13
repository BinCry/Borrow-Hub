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
  - Trust score hiện được tính lại tập trung từ KYC, review, completed rental, open dispute, overdue rental và user risk incident
- eKYC giả lập: submit hồ sơ, xem trạng thái xác minh
- KYC review nội bộ: admin duyệt `VERIFIED / REJECTED / REQUIRES_REVIEW`
- Danh mục tài sản: cây danh mục, CRUD cơ bản cho admin
- Tài sản cho thuê: tạo listing, tìm kiếm, lọc, moderation kèm lý do xử lý cho owner
- Quy trình thuê: tạo yêu cầu, duyệt/từ chối, hủy đơn theo policy, thanh toán sandbox, tự động tính late fee khi quá hạn
- Hợp đồng điện tử: tạo contract snapshot, ký hai bên, kích hoạt
- Bàn giao và hoàn trả: checklist, evidence, xác nhận giao nhận, upload standalone evidence cho dispute/damage report
- QR handover: owner tạo QR ngắn hạn, renter scan một lần để xác nhận bàn giao
- Đánh giá sau thuê: review hai chiều, edit trong cửa sổ cấu hình, moderation cho staff
- Chat theo rental: conversation giữa owner, renter và staff, hỗ trợ text/image/system warning và lifecycle timeline (approve, contract signed, rental begins tomorrow, returned)
- Dispute: mở vụ việc, phản hồi, gán người xử lý, cập nhật trạng thái, hỗ trợ nhánh asset not returned, damage report và tự mở lại payout flow khi dispute return được đóng
- Reports: report user, listing, review và chat message; moderator có thể cảnh báo user, ẩn listing, review hoặc chat message khi report hợp lệ
- Support ticket: lịch sử hỗ trợ, note nội bộ, phân công customer support
- Finance: tra cứu payment, payout, refund, khóa payout khi có dispute và thông báo khi payout hoàn tất
- Risk engine: prohibited asset rules, risk incidents và manual review
- Favorite/Wishlist: lưu tài sản yêu thích và xem danh sách wish list
- Reminder batch: tạo notification cho rental tomorrow, return reminder, overdue, review reminder, availability match
- Handover notification: khi owner bắt đầu phiên bàn giao delivery, renter nhận `HANDOVER_READY`
- Analytics: tracking funnel sự kiện nghiệp vụ chính và endpoint summary cho admin
- Request logs: tracing request ID, user ID, endpoint, status và latency cho vận hành
- Admin: dashboard, quản lý user, role, user nội bộ, system config, audit log
  - Dashboard đã có thêm marketplace KPI, finance KPI, risk overview và trust KPI
- Notifications và audit log cho các action nhạy cảm, bao gồm payment success, contract ready và signature required

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
- `assets`: listing, moderation, tìm kiếm và public listing detail
  - Moderation có thể gửi lý do duyệt/từ chối/khóa listing cho owner
- `rentals`: booking, thanh toán, hợp đồng, handover
  - Có cancellation policy + auto refund/block payout theo rule cấu hình
  - Có overdue late fee theo `late_fee_rate` trong `SystemConfig`
  - Có endpoint owner báo `asset not returned` để mở dispute và khóa payout
  - Có endpoint upload standalone evidence và damage report kèm estimate/evidenceIds
  - Có `HANDOVER_READY` khi owner bắt đầu delivery handover
  - Có thêm QR handover short-lived, one-time, bound theo rental/handover
- `reviews`: đánh giá sau giao dịch
  - Có edit theo `review_edit_hours` và moderation hide/publish cho staff
- `chat`: hội thoại theo đơn thuê, ảnh chat, cảnh báo trao đổi ngoài nền tảng và system message nghiệp vụ
  - Timeline đã bao gồm approve, contract signed, rental begins tomorrow và asset returned
- `disputes`: khiếu nại, evidence linkage, event timeline
  - Có thêm renter accept damage report và tự gỡ `BLOCKED -> PENDING` cho payout khi dispute return khép lại
- `trust-score`: service dùng chung để chuẩn hóa cách tính trust score giữa KYC, review, dispute và moderation
- `reports`: report moderation, support workflow và moderation action lên target bị report
- `support`: support ticket, lịch sử xử lý, assignment và note timeline
- `finance`: payment, payout, refund, finance controls
  - Có notification `PAYOUT_COMPLETED` khi payout được đánh dấu `PAID`
- `risk`: prohibited asset rules, risk incidents, manual-review workflow
- `favorites`: add/remove favorite, xem wishlist
- `analytics`: tracking event nghiệp vụ và funnel summary cho admin
- `request-logs`: request tracing an toàn, không lưu password/OTP/token
- `admin`: dashboard, quản trị user và config
  - `GET /admin/dashboard` trả thêm refund, blocked payout, fraud reports, suspicious accounts, take rate, dispute rate, damage report rate, late return rate, fake listing rate
- `notifications`: hộp thông báo trong hệ thống
  - Có thêm endpoint admin để chạy batch reminder nghiệp vụ
  - Luồng payment hiện phát đủ `PAYMENT_SUCCESS`, `CONTRACT_READY`, `SIGNATURE_REQUIRED`
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
2. Tạo hoặc duyệt một listing, thử moderation với lý do để kiểm tra notification cho owner.
3. Tạo yêu cầu thuê và approve.
4. Ghi nhận thanh toán sandbox và kiểm tra notification payment success / contract ready / signature required.
5. Ký hợp đồng cả hai phía.
6. Tạo handover delivery rồi kiểm tra notification `HANDOVER_READY`, sau đó confirm.
7. Yêu cầu return, tạo handover return hoặc mở dispute; nếu tài sản chưa được hoàn trả thì thử endpoint asset not returned.
8. Tạo refund hoặc cập nhật payout sang `PAID` để kiểm tra notification payout completed.
9. Thử hủy booking để kiểm tra flow cancellation policy.
10. Tạo listing chứa keyword cấm để kiểm tra risk incident/manual review.
11. Add favorite rồi chạy batch reminder để kiểm tra notification availability/reminder và late fee khi rental quá hạn.
12. Gửi chat text/image, thử nhập số điện thoại hoặc email để kiểm tra system warning ngoài nền tảng.
13. Approve rental, ký xong contract, chạy batch reminder sát ngày bắt đầu và hoàn tất return để kiểm tra system message tự sinh trong chat timeline.
14. Tạo phiên delivery handover, generate QR rồi confirm bằng token để kiểm tra QR handover one-time.
15. Kiểm tra `GET /analytics/events` và `GET /analytics/summary` sau khi chạy các flow đăng ký, KYC, search, rental, review, dispute.
16. Kiểm tra `GET /admin/request-logs` và xác nhận response có `x-request-id`, status, latency, endpoint.
17. Tạo review, sửa review trong cửa sổ cho phép và thử moderation review bằng tài khoản staff.
18. Tạo report cho user/listing/review/chat message rồi resolve với `action` phù hợp để kiểm tra warning, ẩn nội dung và audit log moderation.
19. Upload standalone evidence cho rental rồi dùng `report-issue` với `repairEstimate`, `damageItems`, `evidenceIds` để kiểm tra damage report timeline.
20. Dùng renter gọi `POST /disputes/:disputeId/accept-damage-report` hoặc để staff đóng dispute return rồi xác nhận payout được mở lại từ `BLOCKED` sang `PENDING`.
21. Tạo support ticket gắn với rental/report/dispute rồi thử assign, đổi trạng thái và thêm note.
22. Gọi `GET /admin/dashboard` để kiểm tra thêm các KPI: cancellation rate, take rate, refund amount, blocked payout, fraud reports, suspicious accounts và trust KPI.
23. Duyệt KYC, tạo review, mở/đóng dispute rồi kiểm tra `trustScore` ở profile user để xác nhận trust score thay đổi theo vòng đời nghiệp vụ.

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
