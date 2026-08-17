# UI/UX AUDIT REPORT

## 1. Localization (Tiếng Việt)
- **Vấn đề**: Hầu hết các chuỗi văn bản (text), placeholder, và thông báo lỗi (Zod validation) đều được code cứng bằng tiếng Anh (ví dụ: "Recommended for you", "Request to Rent", "Title must be at least 5 characters").
- **Nguyên nhân**: Dấu vết của bản nháp/MVP chưa được bản địa hóa.
- **UX Impact**: Gây khó hiểu và không chuyên nghiệp cho người dùng Việt Nam.
- **Giải pháp**: Xóa toàn bộ tiếng Anh user-facing. Dịch sang tiếng Việt chuẩn, có dấu theo nguyên tắc (ví dụ: "Request to Rent" -> "Yêu cầu thuê", "Location" -> "Khu vực").
- **Trạng thái**: ĐANG CHỜ XỬ LÝ

## 2. Trạng thái tải (Loading States)
- **Vấn đề**: Các màn hình danh sách (Home) và chi tiết (Asset Detail) đang dùng `ActivityIndicator` (spinner) ở giữa màn hình khi fetch API bằng React Query. 
- **Nguyên nhân**: Chưa xây dựng Skeleton component.
- **UX Impact**: Gây cảm giác chờ đợi lâu, layout shift sau khi dữ liệu load xong.
- **Giải pháp**: Tạo và sử dụng `Skeleton` component (Card Skeleton, Detail Skeleton).
- **Trạng thái**: ĐANG CHỜ XỬ LÝ

## 3. Trạng thái rỗng (Empty States)
- **Vấn đề**: Màn hình Home hiển thị "No assets found right now" dưới dạng text thô.
- **Nguyên nhân**: Chưa có component `EmptyState` chuẩn.
- **UX Impact**: Kém thu hút, không có CTA (Call To Action) hướng dẫn người dùng làm gì tiếp theo.
- **Giải pháp**: Tạo component `EmptyState` với hình ảnh/icon, thông điệp rõ ràng và nút hành động.
- **Trạng thái**: ĐANG CHỜ XỬ LÝ

## 4. Trải nghiệm Form (Form UX)
- **Vấn đề**: Màn hình `create.tsx` (Tạo tài sản) thiếu `KeyboardAvoidingView` và `ScrollView` chưa được cấu hình offset đúng khi bàn phím hiện lên. Nút submit có thể bị che. 
- **Nguyên nhân**: Thiếu cấu hình layout cho bàn phím.
- **UX Impact**: Người dùng không thể bấm nút lưu hoặc khó thao tác nhập liệu ở các trường cuối.
- **Giải pháp**: Áp dụng `KeyboardAvoidingView` hoặc thư viện chuyên dụng, thêm padding bottom cho ScrollView.
- **Trạng thái**: ĐANG CHỜ XỬ LÝ

## 5. Token Thiết kế (Design Tokens)
- **Vấn đề**: `apps/mobile/tailwind.config.js` có các biến màu (primary, background, surface) nhưng chưa có tài liệu quy chuẩn, đôi khi màu hex vẫn bị hardcode (vd: `color="#4F7C6B"` trong ActivityIndicator).
- **Nguyên nhân**: Thiếu hệ thống token chặt chẽ.
- **UX Impact**: Thay đổi Theme (Dark/Light) sẽ gặp lỗi do màu hardcode.
- **Giải pháp**: Tạo file constants cho Colors và ép toàn bộ icon, loader dùng màu từ theme context.
- **Trạng thái**: ĐANG CHỜ XỬ LÝ
