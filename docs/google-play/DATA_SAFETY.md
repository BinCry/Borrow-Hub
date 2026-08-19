# Google Play Data Safety — khai báo đề xuất

Tài liệu này phản ánh mã nguồn Borrow Hub hiện tại. Người sở hữu Play Console chịu trách nhiệm đối chiếu lại nhà cung cấp VPS, SMTP, SePay và mọi SDK được thêm trước khi gửi biểu mẫu.

## Câu hỏi tổng quan

- Ứng dụng có thu thập dữ liệu: `Có`.
- Ứng dụng có chia sẻ dữ liệu: `Có`, trong phạm vi xử lý thanh toán, nhà cung cấp dịch vụ và dữ liệu giao dịch hiển thị cho đối tác thuê/cho thuê. Đối chiếu ngoại lệ “service provider” trong Play Console trước khi chọn từng loại.
- Dữ liệu được mã hóa khi truyền: `Có`, chỉ khi production dùng HTTPS như cấu hình Caddy đã cung cấp.
- Người dùng có thể yêu cầu xóa dữ liệu: `Có`.
- Đường dẫn xóa: `https://<DOMAIN>/account-deletion`.
- Tài khoản trẻ em: `Không`; đối tượng sử dụng từ 18 tuổi.

## Loại dữ liệu cần khai báo

| Nhóm Play Console | Dữ liệu Borrow Hub | Bắt buộc/tùy chọn | Mục đích |
|---|---|---|---|
| Personal info — Name | Họ tên | Bắt buộc | Account management, app functionality, fraud prevention |
| Personal info — Email address | Email đăng nhập | Bắt buộc | Account management, authentication, communications |
| Personal info — Phone number | Số điện thoại | Bắt buộc | Account management, fraud prevention |
| Personal info — User IDs | ID tài khoản nội bộ | Bắt buộc | App functionality, security |
| Personal info — Address | Địa chỉ giao nhận | Tùy chọn đến khi tạo địa chỉ/đơn | App functionality |
| Personal info — Other info | Ngày sinh, điểm uy tín, dữ liệu KYC | Tùy chọn theo tính năng | Fraud prevention, compliance |
| Financial info — Purchase history | Đơn thuê, thanh toán, hoàn tiền, payout | Bắt buộc khi giao dịch | App functionality, fraud prevention, accounting |
| Financial info — User payment info | Tham chiếu chuyển khoản/VietQR, tài khoản nhận payout nếu cấu hình | Tùy chọn theo giao dịch | Payment processing |
| Messages — Other in-app messages | Chat, phiếu hỗ trợ, tranh chấp | Tùy chọn | App functionality, support, safety |
| Photos and videos — Photos | Ảnh tài sản, avatar, KYC, bằng chứng | Tùy chọn | App functionality, account verification, fraud prevention |
| Location — Approximate location | Thành phố/quận/huyện, IP có thể suy ra khu vực | Tùy chọn | Marketplace matching, security |
| Location — Precise location | Tọa độ địa chỉ nếu người dùng nhập | Tùy chọn | App functionality |
| App activity — App interactions | Sự kiện nghiệp vụ, trạng thái quy trình | Bắt buộc | Analytics nội bộ, app functionality, fraud prevention |
| App info and performance — Crash logs/diagnostics | Nhật ký lỗi và request nếu phát sinh | Bắt buộc trong vận hành | Diagnostics, security |
| Device or other IDs | IP/request identifiers, không có advertising ID | Bắt buộc trong vận hành | Security, fraud prevention |

## Không thu thập theo mã nguồn hiện tại

- Danh bạ, lịch, SMS/MMS, lịch sử cuộc gọi.
- Microphone hoặc bản ghi âm.
- Dữ liệu sức khỏe/thể chất.
- Advertising ID và dữ liệu quảng cáo.
- Danh sách ứng dụng đã cài.

## Kiểm tra trước khi submit

1. Kiểm tra manifest của AAB trong App Bundle Explorer và đối chiếu quyền Camera/Photos.
2. Kiểm tra Data Safety của mọi SDK mới; hiện ứng dụng không tích hợp quảng cáo hoặc analytics SDK bên thứ ba.
3. Dùng domain production và kiểm tra `/privacy`, `/account-deletion` không lỗi.
4. Chỉ chọn “encrypted in transit” sau khi API production bắt buộc HTTPS và không còn URL HTTP trong EAS production environment.
5. Cập nhật biểu mẫu nếu thay đổi nhà cung cấp thanh toán, analytics, crash reporting hoặc quảng cáo.
