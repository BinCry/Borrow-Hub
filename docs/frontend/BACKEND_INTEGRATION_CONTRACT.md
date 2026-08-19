# Hợp đồng tích hợp Mobile — API

## Tổng quan

Ứng dụng Expo kết nối trực tiếp NestJS API qua `EXPO_PUBLIC_API_URL`, mặc định có prefix `/api/v1`. Chế độ mock đã được gỡ bỏ; kiểu dữ liệu hiện hành nằm tại `apps/mobile/src/types/domain/index.ts`, còn DTO và Swagger nằm trong `apps/api/src`.

## Quy ước chung

- Header xác thực: `Authorization: Bearer <access-token>`.
- Access token hết hạn được làm mới một lần bằng refresh token lưu trong SecureStore; các request đồng thời dùng chung một hàng đợi refresh.
- Danh sách phân trang trả `{ data, meta }` với `page`, `limit`, `total`, `totalPages`.
- Thời gian dùng ISO 8601; tiền tệ dùng số nguyên VND.
- Mobile production bắt buộc đặt `EXPO_PUBLIC_API_URL=https://<DOMAIN>/api/v1`.

## Luồng end-to-end đã kết nối

- Auth: đăng ký, đăng nhập, refresh/logout, quên/đặt lại mật khẩu.
- Assets: danh mục, tìm kiếm/phân trang, chi tiết, tài sản của tôi, upload ảnh và tạo bài.
- Rentals: tạo, duyệt/từ chối/hủy, hợp đồng, payment intent/VietQR, trạng thái thanh toán, bàn giao và hoàn trả QR.
- Chat và thông báo: danh sách hội thoại/tin nhắn, gửi tin, đọc thông báo.
- Hồ sơ: thông tin người dùng, KYC multipart, địa chỉ, cài đặt và xóa tài khoản.
- Hỗ trợ: tạo/xem phiếu hỗ trợ; backend còn cung cấp reports/disputes/admin cho vận hành.

## Cache và preload

React Query giữ cache 10 phút, dữ liệu mặc định fresh 45 giây. Root layout preload danh sách Home, category, ảnh cover và — khi đã đăng nhập — hồ sơ, đơn thuê hai vai trò, hội thoại và thông báo. Preload không giữ splash quá 1,4 giây.

## Nguồn cấu hình

- Mobile: `apps/mobile/.env.example`.
- API/VPS: `.env.example`.
- EAS: `apps/mobile/eas.json`.
- Production compose: `docker-compose.production.yml`.
