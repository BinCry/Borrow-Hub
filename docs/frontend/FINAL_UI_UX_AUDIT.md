# Báo cáo UI/UX Mobile — Borrow Hub

## Trạng thái hiện tại

Mobile đã chuyển khỏi prototype/mock sang API thật. Các luồng chính gồm auth, khám phá, tạo tài sản, đặt thuê, quản lý đơn theo hai vai trò, hợp đồng, VietQR, QR bàn giao/hoàn trả, chat, thông báo, KYC, hỗ trợ và xóa tài khoản.

## Hệ thống hình ảnh

- Auth dùng background rental-items riêng, lớp phủ gradient và form glassmorphism không che kín ảnh.
- Logo, app icon, adaptive icon, splash và favicon dùng cùng bộ nhận diện sage/ivory/gold.
- Home dùng ảnh nội bộ đã đóng gói, không phụ thuộc banner quảng cáo hoặc nội dung giảm giá giả.
- Google Play feature graphic nằm tại `docs/google-play/assets/feature-graphic.png`.

## Trải nghiệm khởi động

- Native splash được giữ trong lúc kiểm tra session và warm cache.
- Launch overlay dùng Reanimated trên UI thread, chuyển cảnh scale/fade và tôn trọng Reduce Motion.
- Thời gian chờ preload có trần 1,4 giây; tác vụ mạng còn lại tiếp tục nền.
- Ảnh cover được prefetch vào memory/disk cache trước khi Home hiển thị khi mạng đáp ứng kịp.

## Accessibility và trạng thái giao diện

- Nút quan trọng có vùng chạm tối thiểu, accessibility label/role và trạng thái disabled/loading.
- Danh sách có skeleton, empty state, error/retry và pull-to-refresh.
- Camera chỉ xin quyền tại màn quét QR; người dùng từ chối quyền vẫn nhận hướng dẫn rõ ràng.
- Chính sách quyền riêng tư mở bằng system browser từ Settings.

## Nghiệm thu còn phụ thuộc bên phát hành

Ảnh chụp màn hình Google Play phải được lấy từ AAB production đã kết nối domain/API thật. Các bước cần tài khoản EAS, Play Console, thiết bị Android và thông tin pháp nhân được ghi trong `docs/google-play/RELEASE_CHECKLIST.md`.
