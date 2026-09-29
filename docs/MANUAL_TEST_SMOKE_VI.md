# Checklist smoke test Borrow-Hub

Chạy bộ này sau mỗi build hoặc trước khi demo. Dùng A = chủ tài sản đã KYC, B = người thuê đã KYC, C = tài khoản chưa KYC và Admin.

## Tài khoản và quyền

- [v] Đăng ký tài khoản mới với email/số điện thoại hợp lệ.
- [v] Đăng nhập bằng email và số điện thoại; đăng xuất rồi đăng nhập lại.
- [v] Sai mật khẩu và truy cập màn hình riêng tư khi chưa đăng nhập đều bị từ chối.
- [v] Access token hết hạn được refresh; refresh token sai dẫn tới đăng xuất.
- [v] C chưa KYC không thể đăng tin hoặc tạo yêu cầu thuê.
- [v] Admin vào được khu vực quản trị; B không gọi được API admin.

## Đăng tin và tìm kiếm

- [v] A tạo tin với ảnh, giá, địa chỉ và thời gian cho thuê hợp lệ.
- [v] Tin mới có trạng thái chờ duyệt; Admin duyệt tin thì tin xuất hiện trong khám phá.
- [v] Upload ảnh sai loại/quá lớn bị báo lỗi, không làm hỏng form.
- [v] A sửa tin của mình; B không sửa được tin của A.
- [v] Tìm theo từ khóa, danh mục, địa phương và khoảng giá.
- [v] Mở chi tiết tin công khai không làm lộ vị trí chính xác.
- [ ] A thêm/bỏ yêu thích tin của B; A không yêu thích được tin của chính mình.
- [ ] A xóa tin; tin biến mất khỏi khám phá và không thể đặt thuê mới.

## Luồng thuê chính

- [ ] B đặt tin ACTIVE với ngày hợp lệ → đơn PENDING_OWNER.
- [ ] B không thể thuê tài sản của chính mình.
- [ ] Ngày sai, thời lượng ngoài min/max hoặc vượt lịch mở → bị chặn.
- [ ] Hai yêu cầu trùng lịch đã được duyệt → chỉ một yêu cầu thành công.
- [ ] A duyệt → AWAITING_PAYMENT; A từ chối → DECLINED.
- [ ] B thanh toán thành công → `Payment = SUCCESS` (đã nhận tiền), `Payout = PENDING`, trạng thái đơn AWAITING_SIGNATURE và hợp đồng được tạo.
- [ ] Thanh toán lặp/webhook lặp không tạo tiền hoặc hợp đồng lần hai.
- [ ] Hai bên ký → CONFIRMED; người thứ ba không ký được.
- [ ] A bắt đầu bàn giao → READY_FOR_HANDOVER; QR hợp lệ đưa đơn sang ONGOING.
- [ ] QR sai, hết hạn hoặc đã dùng → bị từ chối.
- [ ] B yêu cầu trả; A xác nhận trả → COMPLETED, payout vẫn PENDING để admin/finance chuyển tiền.
- [ ] Đánh giá chỉ tạo được sau COMPLETED và mỗi bên chỉ đánh giá một lần.

## Hủy, tranh chấp và tiền

- [ ] B hủy trước thanh toán → CANCELLED, không phát sinh hoàn tiền giả.
- [ ] Hủy sau thanh toán trước ngưỡng và sát giờ → số tiền hoàn đúng cấu hình.
- [ ] A hủy đơn đã thanh toán → B được hoàn tiền, payout bị hủy/chặn phù hợp.
- [ ] Đơn quá hạn được đánh dấu đúng và không cộng phí trễ lặp.
- [ ] A báo hư hỏng tại RETURN_PENDING → DISPUTED, payout bị chặn.
- [ ] A đánh dấu tài sản chưa được trả ở OVERDUE/RETURN_PENDING → tạo tranh chấp LOST_ASSET.
- [ ] Tạo refund vượt số dư hoặc refund hai lần → bị chặn.
- [ ] Finance chuyển tiền cho A sau khi đơn COMPLETED và không có tranh chấp → admin đánh dấu payout PAID; không được đánh dấu PAID trước khi hoàn tất giao/nhận.

## Chat, thông báo và ổn định

- [ ] B và A gửi/nhận chat thời gian thực; tin có số điện thoại/link tạo cảnh báo.
- [ ] Sự kiện đặt thuê, thanh toán, ký và bàn giao tạo thông báo đúng người.
- [ ] Đánh dấu một/tất cả thông báo đã đọc; số chưa đọc không bị sai.
- [ ] Tắt mạng khi gửi form → hết loading, báo lỗi và thử lại không tạo bản ghi trùng.
- [ ] Nhấn nút gửi liên tục → chỉ tạo một yêu cầu/thanh toán/hành động.
- [ ] Mở ID đơn/tin không tồn tại hoặc của người khác → lỗi phù hợp, app không crash.

Nếu smoke pass, dùng [checklist đầy đủ](D:/HocTap/Projects/Borrow-Hub/docs/MANUAL_TEST_CHECKLIST_VI.md) cho regression hoặc trước phát hành.
