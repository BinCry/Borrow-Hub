# Hợp đồng Tích hợp Frontend - Backend (Backend Integration Contract)

Tài liệu này xác định các hợp đồng API và domain model mà Frontend (mobile app) hiện đang sử dụng thông qua các Mock API. Backend Engineer (Codex) cần dựa vào đây để thiết kế API thực tế.

## 1. Domain Models

### 1.1 Asset (Tài sản)
Định nghĩa một tài sản được đăng cho thuê:
```typescript
interface Asset {
  id: string;
  title: string;
  description: string;
  pricePerDay: number;
  ownerId: string;
  categoryId: string;
  images: string[];
  location: {
    city: string;
    district: string;
    latitude?: number;
    longitude?: number;
  };
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'WORN';
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'HIDDEN';
  minimumDurationDays: number;
  maximumDurationDays?: number;
  estimatedValue: number;
  rating?: number;
  reviewCount?: number;
}
```

### 1.2 Rental (Đơn thuê)
Định nghĩa một giao dịch thuê tài sản:
```typescript
interface Rental {
  id: string;
  assetId: string;
  renterId: string;
  ownerId: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'READY_FOR_HANDOVER' | 'ACTIVE' | 'RETURN_REQUESTED' | 'COMPLETED' | 'DISPUTED';
  totalPrice: number;
  paymentStatus: 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED';
  handoverMethod: 'MEETUP' | 'DELIVERY';
}
```

### 1.3 User (Người dùng)
Định nghĩa người dùng trong hệ thống:
```typescript
interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  avatarUrl?: string;
  rating?: number;
  kycStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
}
```

## 2. API Endpoints cần thiết

Frontend hiện đang sử dụng `services/api/client.ts`. Backend cần expose các RESTful endpoints sau (prefix `/api/v1`):

### 2.1 Auth
- `POST /auth/login`: Nhận số điện thoại/password -> Trả về `{ accessToken, user }`.
- `POST /auth/register`: Đăng ký tài khoản.
- `POST /auth/forgot-password`: Yêu cầu cấp lại mật khẩu.

### 2.2 Assets (Tài sản)
- `GET /assets`: Lấy danh sách tài sản (Hỗ trợ phân trang, lọc theo category, city, giá).
- `GET /assets/:id`: Lấy chi tiết tài sản.
- `POST /assets`: Tạo bài đăng mới.

### 2.3 Rentals (Đơn thuê)
- `GET /rentals?role=renter|owner`: Lấy danh sách đơn thuê của tôi (theo vai trò).
- `GET /rentals/:id`: Chi tiết đơn thuê.
- `POST /rentals`: Tạo yêu cầu thuê.
- `POST /rentals/:id/approve`: Chủ sở hữu đồng ý đơn thuê.
- `POST /rentals/:id/decline`: Chủ sở hữu từ chối đơn thuê.
- `POST /rentals/:id/sign`: Ký hợp đồng.
- `POST /rentals/:id/pay`: Thanh toán (Sandbox).
- `POST /rentals/:id/handover`: Bắt đầu quá trình giao nhận (Trả về QR/ID).
- `POST /rentals/:id/return-request`: Yêu cầu trả lại đồ.

## 3. Quy trình Tích hợp (Handoff)
- Frontend hiện đã triển khai cờ `EXPO_PUBLIC_USE_MOCKS=true`.
- Khi Backend sẵn sàng, chỉ cần đổi `EXPO_PUBLIC_USE_MOCKS=false` trong `.env`.
- Frontend sử dụng React Query, nên việc cache và invalidation đã được xử lý. API responses cần trả về đúng chuẩn JSON, ví dụ bọc trong `{ data: ..., meta: ... }` cho các request có phân trang.
