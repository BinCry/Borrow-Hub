# Google Play release checklist — Borrow Hub 1.0.0

## Đã đáp ứng trong repository

- [x] Package Android cố định: `com.borrowhub.app`.
- [x] Expo SDK 57, mặc định compile/target Android API 36.
- [x] Production EAS profile tạo Android App Bundle và tự tăng versionCode từ remote.
- [x] Icon 1024 × 1024, adaptive icon, monochrome icon, splash và feature graphic 1024 × 500.
- [x] Splash có animation, hỗ trợ Reduce Motion và preload dữ liệu có giới hạn thời gian.
- [x] Camera chỉ được hỏi khi quét QR bàn giao; không khai báo location permission.
- [x] Access/refresh token lưu trong SecureStore; API production dùng HTTPS.
- [x] Xóa tài khoản trong app và qua web/email xác nhận một lần.
- [x] Privacy policy, Data Safety worksheet, store copy và App access guide.
- [x] Backend healthcheck, migration deploy, Redis có mật khẩu, Caddy TLS, container non-root/read-only.

## Bắt buộc thực hiện bằng tài khoản/chứng thư của chủ ứng dụng

- [ ] Thay toàn bộ giá trị `example.com`, email hỗ trợ, ngân hàng, SMTP và secrets trong `.env` production.
- [ ] Xác minh `/api/v1/health`, `/privacy` và `/account-deletion` trên domain HTTPS thật.
- [ ] Đăng nhập EAS, chạy `eas build --platform android --profile production` và lưu AAB đã ký.
- [ ] Kiểm tra AAB trong Play Console: target API 36, versionCode duy nhất, supported devices và quyền manifest.
- [ ] Cài bản Internal testing trên ít nhất một máy Android API 36 và một máy Android 7+; hoàn tất smoke test end-to-end với API/SePay thật hoặc sandbox được kiểm soát.
- [ ] Chụp tối thiểu 2 screenshot điện thoại từ chính build production; tải cùng feature graphic.
- [ ] Khai báo Data Safety, Content rating, App access, Ads = No, Target audience = 18+, Financial features và Account deletion URL.
- [ ] Tạo hai tài khoản review production theo `APP_ACCESS.md`.
- [ ] Bật Play App Signing, tải AAB lên Internal testing, xử lý toàn bộ Pre-launch report rồi mới promote Production.

Không thể hoàn thành các ô trên chỉ bằng mã nguồn: chúng cần domain, SMTP/ngân hàng, EAS và Google Play Console thuộc quyền sở hữu của đơn vị phát hành.
