# Hướng dẫn App access cho Google Play Review

Borrow Hub cho phép duyệt danh mục công khai nhưng cần đăng nhập để thuê, chat, thanh toán, KYC và bàn giao.

## Tài khoản review cần chuẩn bị trên production

Tạo hai tài khoản riêng, không dùng tài khoản cá nhân và không commit mật khẩu vào Git:

- `Reviewer renter`: tài khoản đã xác minh, có thể thuê tài sản.
- `Reviewer owner`: tài khoản đã xác minh, sở hữu ít nhất một tài sản ACTIVE có lịch trống.

Điền email/mật khẩu của hai tài khoản trực tiếp vào mục **Policy and programs → App content → App access** trong Play Console. Tài khoản không được yêu cầu OTP, VPN, vị trí đặc biệt hoặc thao tác từ nhân viên Borrow Hub trong thời gian review.

## Chỉ dẫn cho reviewer

1. Đăng nhập bằng tài khoản renter để mở Discover, chi tiết tài sản và tạo yêu cầu thuê.
2. Dùng tài khoản owner trên thiết bị/phiên khác để chấp nhận yêu cầu.
3. Môi trường review phải dùng cổng thanh toán sandbox hoặc giao dịch review có giá trị kiểm soát; ghi rõ quy trình trong phần instructions của Play Console.
4. Hai tài khoản cần có sẵn một đơn ở từng trạng thái quan trọng để reviewer xem hợp đồng, VietQR, chat và QR bàn giao mà không phải chờ chuyển khoản thật.
5. Không cung cấp tài khoản SUPER_ADMIN cho reviewer.

## Ghi chú vận hành

Seed local dùng domain `.local` chỉ phục vụ phát triển, không phải thông tin App access production. Thay mật khẩu hoặc xóa các tài khoản reviewer sau khi đợt review kết thúc và tạo lại trước đợt review tiếp theo.
