# Borrow Hub - UI Screen Inventory

| Screen | Route | Mục đích | Role | Trạng thái | UI | UX | Data States | Backend Ready |
| ------ | ----- | -------- | ---- | ---------- | -- | -- | ----------- | ------------- |
| **Trang chủ (Home)** | `app/(tabs)/index.tsx` | Khám phá nhanh, đề xuất tài sản | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Khám phá (Search)** | `app/(tabs)/discover.tsx` | Tìm kiếm, lọc danh mục | Renter | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Đơn thuê (Rentals)** | `app/(tabs)/rentals.tsx` | Quản lý danh sách đơn đi thuê / cho thuê | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Tin nhắn (Chat)** | `app/(tabs)/messages.tsx` | Trò chuyện giữa Owner & Renter | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Cá nhân (Profile)** | `app/(tabs)/profile.tsx` | Quản lý tài khoản, KYC, cài đặt | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Đăng nhập (Login)** | `app/auth/login.tsx` | Xác thực người dùng | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Đăng ký (Register)** | `app/auth/register.tsx` | Đăng ký tài khoản mới | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Tạo tài sản (Create)**| `app/asset/create.tsx` | Đăng tài sản cho thuê | Owner | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Chi tiết tài sản** | `app/asset/[id].tsx` | Xem thông tin chi tiết, rating, khoảng cách | Renter | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Đặt thuê (Book)** | `app/asset/[id]/book.tsx` | Chọn ngày, xác nhận yêu cầu | Renter | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Chi tiết đơn thuê** | `app/rental/[id].tsx` | Xem trạng thái đơn, thao tác lifecycle | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Thanh toán (Payment)**| `app/rental/[id]/payment.tsx` | Giao diện thanh toán | Renter | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Ký hợp đồng** | `app/rental/[id]/contract.tsx`| Xem và ký hợp đồng điện tử | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Bàn giao (Handover)** | `app/rental/[id]/handover.tsx`| Checklist bàn giao, chụp ảnh | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Mã QR (QR Code)** | `app/rental/[id]/qr.tsx` | Quét QR xác nhận bàn giao | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |
| **Trả đồ (Return)** | `app/rental/[id]/return.tsx` | Đánh giá tình trạng lúc trả, xác nhận | Cả hai | NEEDS_POLISH | 🟨 | 🟨 | ❌ | ❌ |

*(Note: 🟨 = Đã có nền tảng nhưng cần tinh chỉnh thêm theo tiêu chuẩn mới, ❌ = Chưa hoàn thiện, ✅ = Hoàn thiện)*
