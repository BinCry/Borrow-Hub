# Checklist tự kiểm thử Borrow-Hub

Ngày lập: 29/09/2026. Phạm vi: ứng dụng mobile/web và API trong repository hiện tại. Đây là danh sách ca cần chạy, **chưa phải kết quả đã kiểm thử**. Không thể bảo đảm bao phủ mọi tổ hợp đầu vào; checklist bao phủ các nhóm chức năng, nhánh nghiệp vụ và rủi ro chính tìm thấy trong mã nguồn.

## Cách dùng và chuẩn bị

- Mỗi ô tương ứng một ca: thực hiện thao tác trước dấu →, đối chiếu kết quả sau dấu →. Chỉ đánh dấu khi đạt; lỗi ghi theo mã ca.
- `[API]`: dùng Postman hoặc công cụ gọi API khi giao diện chưa có nút hoặc cần thay ID, token, payload. API mặc định: `http://localhost:3000/api/v1`.
- `[Biên]`: kỳ vọng cần xác nhận bằng chạy thực tế; nếu hệ thống chấp nhận dữ liệu không hợp lệ thì ghi lỗi, không mặc định code đã chặn.
- Test trên môi trường phát triển với dữ liệu và thanh toán thử nghiệm. Ghi rõ phiên bản app/API, thiết bị, hệ điều hành và cấu hình phí.
- Chuẩn bị A = chủ tài sản đã KYC; B = người thuê đã KYC; C = người dùng khác đã KYC; D = chưa KYC; quản trị viên và các tài khoản nhân viên có quyền khác nhau.
- Nếu đã chạy seed: `admin@toolshare.local / Admin@123456`, `owner@toolshare.local / User@123456`, `renter@toolshare.local / User@123456`. Kiểm tra trạng thái KYC thực tế trước khi dùng.
- Dùng hai thiết bị hoặc hai phiên trình duyệt độc lập cho A/B; thêm phiên C khi test đặt trùng lịch và quyền truy cập.
- Chuẩn bị tin ACTIVE, chờ duyệt, bị từ chối, bị đình chỉ và đã xóa; tài sản có phụ kiện, lịch mở và lịch khóa. Chuẩn bị đơn ở từng trạng thái bằng cách đi qua luồng thật hoặc fixture trên database test.
- Với ca hết hạn/quá hạn, chuẩn bị fixture thời gian trên môi trường test và chạy tác vụ nền tương ứng; chỉ đổi đồng hồ điện thoại không làm thay đổi giờ server.
- Các ca SMTP, webhook, vị trí, camera hoặc tác vụ nền thiếu cấu hình được ghi BLOCKED kèm lý do, không ghi PASS.

## 1. Tài khoản và phiên đăng nhập

- [ ] AUTH-01 Đăng ký bằng tên, email, số điện thoại và mật khẩu hợp lệ → tạo tài khoản, truy cập đúng luồng sau đăng ký.
- [ ] AUTH-02 Bỏ trống từng trường bắt buộc → thông báo rõ trường lỗi, không tạo tài khoản.
- [ ] AUTH-03 Tên dài 1/2/80/81 ký tự → chỉ độ dài 2–80 hợp lệ sau khi bỏ khoảng trắng đầu/cuối.
- [ ] AUTH-04 Email sai định dạng; email có chữ hoa/khoảng trắng đầu cuối → sai bị chặn, hợp lệ được chuẩn hóa.
- [ ] AUTH-05 Số điện thoại dạng 0 hoặc +84 hợp lệ, có khoảng trắng, thiếu/thừa chữ số, chứa chữ → chỉ dạng hợp lệ được chấp nhận.
- [ ] AUTH-06 Mật khẩu 7 và 8 ký tự; xác nhận mật khẩu khác nhau trên UI → kiểm tra ngưỡng tối thiểu và xác nhận.
- [ ] AUTH-07 Đăng ký trùng email hoặc số điện thoại → báo trùng, không sinh tài khoản thứ hai.
- [ ] AUTH-08 Đăng nhập bằng email và bằng số điện thoại → vào đúng tài khoản.
- [ ] AUTH-09 Sai mật khẩu hoặc tài khoản không tồn tại → thông báo thất bại, không vào màn hình riêng tư.
- [ ] AUTH-10 Tài khoản bị khóa/đã xóa đăng nhập → bị từ chối.
- [ ] AUTH-11 Đóng/mở app, tải lại web khi phiên còn hạn → khôi phục đúng tài khoản.
- [ ] AUTH-12 Access token hết hạn, refresh token còn hiệu lực → tự refresh và tiếp tục yêu cầu.
- [ ] AUTH-13 [API] Nhiều yêu cầu đồng thời gặp 401 → refresh không tạo vòng lặp, các yêu cầu được hoàn tất hoặc báo lỗi rõ.
- [ ] AUTH-14 Refresh token hết hạn/thu hồi → đăng xuất, không hiển thị dữ liệu riêng tư cũ.
- [ ] AUTH-15 Đăng xuất rồi bấm Back/mở link đơn cũ → không lấy được dữ liệu cần đăng nhập.
- [ ] AUTH-16 Đăng xuất A, đăng nhập B trên cùng thiết bị → đơn, chat, thông báo và hồ sơ thuộc B.
- [ ] AUTH-17 Quên mật khẩu với email tồn tại/không tồn tại → phản hồi không tiết lộ tài khoản; email hợp lệ nhận được hướng dẫn khi SMTP hoạt động.
- [ ] AUTH-18 Đặt lại mật khẩu bằng token hợp lệ → mật khẩu mới dùng được, mật khẩu cũ thất bại.
- [ ] AUTH-19 Token reset sai/hết hạn/đã dùng; mật khẩu mới quá ngắn → bị từ chối.

## 2. Hồ sơ, KYC và xóa tài khoản

- [ ] USER-01 Xem/sửa các trường hồ sơ giao diện cho phép → lưu và tải lại vẫn đúng.
- [ ] USER-02 [Biên] Hồ sơ rỗng, chỉ khoảng trắng, chuỗi dài, tiếng Việt và emoji → dữ liệu hợp lệ hiển thị đúng; dữ liệu sai có lỗi rõ.
- [ ] USER-03 Chuyển vai trò thuê/cho thuê nhiều lần rồi mở đơn và quay lại → tab, danh sách và điều hướng đúng.
- [ ] USER-04 Chưa đăng nhập chuyển tab/vai trò → không phát sinh yêu cầu dữ liệu riêng tư thành công.
- [ ] KYC-01 Gửi đủ mặt trước CCCD, mặt sau và selfie cùng dữ liệu bắt buộc → tạo hồ sơ chờ xử lý.
- [ ] KYC-02 Thiếu từng ảnh → không gửi hồ sơ thành công.
- [ ] KYC-03 Ảnh không hợp lệ, file hỏng, file rỗng, file lớn hơn 10 MB → bị từ chối rõ ràng.
- [ ] KYC-04 Từ chối quyền camera/thư viện; hủy chọn ảnh → không crash, có thể thao tác lại.
- [ ] KYC-05 Admin duyệt hồ sơ đầy đủ → người dùng thấy đã xác minh, mở được chức năng yêu cầu KYC.
- [ ] KYC-06 Admin từ chối và người dùng gửi lại → lý do/trạng thái hiển thị đúng, gửi lại được theo luồng.
- [ ] KYC-07 Người đã xác minh gửi lại KYC → bị chặn thay thế danh tính đã xác minh.
- [ ] KYC-08 D đăng tin hoặc đặt thuê, kể cả gọi API trực tiếp → bị chặn khi chưa xác minh.
- [ ] KYC-09 [API] C truy cập hồ sơ/ảnh KYC của A → không đọc được; response không lộ khóa lưu trữ riêng tư.
- [ ] USER-05 Xóa tài khoản còn đơn chưa kết thúc → bị chặn và giải thích được lý do.
- [ ] USER-06 Xóa tài khoản đủ điều kiện bằng token xác nhận hợp lệ → tài khoản bị vô danh hóa, mất quyền đăng nhập; lịch sử giao dịch được bảo toàn.
- [ ] USER-07 Token xóa tài khoản sai/hết hạn và email không tồn tại → không xóa nhầm, không tiết lộ sự tồn tại của email.

## 3. Đăng, sửa và xóa tài sản

- [ ] ASSET-01 A tạo tin đủ danh mục, thông tin, giá, địa chỉ và ảnh → tin xuất hiện trong danh sách của A với trạng thái kiểm duyệt đúng.
- [ ] ASSET-02 Thiếu lần lượt các trường bắt buộc → UI báo rõ, không tạo tin không sử dụng được.
- [ ] ASSET-03 Giá thuê/giá trị tài sản bằng 0, âm, số lẻ hoặc chữ → từ chối; số nguyên dương hợp lệ được lưu.
- [ ] ASSET-04 [Biên] Số ngày tối thiểu/tối đa bằng 0, âm, số lẻ hoặc min > max → từ chối cấu hình không hợp lệ.
- [ ] ASSET-05 Chọn tỉnh/thành, quận/huyện, phường/xã rồi đổi cấp cha → không giữ lựa chọn con sai địa phương.
- [ ] ASSET-06 Upload một/nhiều ảnh, đổi ảnh bìa và thứ tự nếu UI hỗ trợ → ảnh tải lại đúng, không mất ảnh sau lưu.
- [ ] ASSET-07 Upload file sai loại, rỗng, hỏng hoặc vượt giới hạn cấu hình → báo lỗi, không tạo ảnh hỏng.
- [ ] ASSET-08 Thêm phụ kiện với tên, mô tả, số lượng; số lượng 0/âm/lẻ → chỉ số lượng nguyên >= 1 được chấp nhận.
- [ ] ASSET-09 [Biên] Thêm lịch mở/khóa có đầu >= cuối hoặc lịch giao nhau → phản hồi nhất quán, không cho đặt sai lịch.
- [ ] ASSET-10 A sửa tin của mình rồi tải lại → nội dung và trạng thái duyệt phản ánh đúng thay đổi.
- [ ] ASSET-11 [API] B sửa/xóa tin của A → bị từ chối.
- [ ] ASSET-12 Admin tạo tin cho thuê → bị chặn theo quy tắc hiện tại.
- [ ] ASSET-13 A xóa tin của mình không nhập lý do → xóa được, tin biến mất khỏi khám phá và danh sách liên quan.
- [ ] ASSET-14 Admin xóa tin A mà không có lý do → bị chặn; có lý do → xóa và gửi thông báo đúng lý do cho A.
- [ ] ASSET-15 Xóa tin rồi tải lại, đổi tab, chờ request danh sách cũ trả về → tin không xuất hiện lại do cache.
- [ ] ASSET-16 Xóa thất bại do mạng/server → tin vẫn còn, có lỗi rõ và có thể thử lại.
- [ ] ASSET-17 Xóa tin đang có lịch sử/đơn thuê → lịch sử đơn còn nguyên; không đặt thuê mới từ tin đã xóa.
- [ ] ASSET-18 Sửa hoặc duyệt lại tin đã xóa → bị chặn; gọi xóa lại không tạo hậu quả lặp.
- [ ] ASSET-19 API triển khai chưa có DELETE: admin thực hiện xóa → đường kiểm duyệt dự phòng hoạt động; chủ tin không gọi nhầm API admin.

## 4. Khám phá, tìm kiếm, chi tiết và yêu thích

- [ ] SEARCH-01 Khách mở trang chủ/khám phá/chi tiết tin ACTIVE → dữ liệu công khai hiển thị được.
- [ ] SEARCH-02 Tìm từ khóa có kết quả, không có kết quả, tiếng Việt và khoảng trắng → danh sách/empty state phù hợp.
- [ ] SEARCH-03 Lọc lần lượt theo danh mục, địa phương, khoảng giá, tình trạng, cách giao và đánh giá → mỗi kết quả thỏa bộ lọc.
- [ ] SEARCH-04 Kết hợp nhiều bộ lọc rồi xóa bộ lọc → kết quả và nhãn lọc đồng bộ.
- [ ] SEARCH-05 Sắp xếp mới nhất, giá tăng/giảm, đánh giá cao, thuê nhiều → đúng thứ tự.
- [ ] SEARCH-06 Cho phép/từ chối vị trí; chọn gần nhất hoặc bán kính → có tọa độ thì lọc đúng, thiếu tọa độ thì báo yêu cầu phù hợp.
- [ ] SEARCH-07 Lọc theo ngày thuê → loại tin bị khóa hoặc đã có đơn giữ lịch trong khoảng đó.
- [ ] SEARCH-08 [API] Ngày không hợp lệ/thiếu một đầu khoảng, minPrice > maxPrice, tọa độ thiếu → không trả kết quả gây hiểu nhầm.
- [ ] SEARCH-09 Cuộn nhiều trang, refresh, đổi bộ lọc khi request cũ chưa xong → không trùng hoặc trộn kết quả cũ.
- [ ] SEARCH-10 Mở tin bị từ chối/đình chỉ/đã xóa bằng link trực tiếp với khách → không xem như tin đang cho thuê.
- [ ] SEARCH-11 Chi tiết công khai → không lộ vị trí chính xác/địa chỉ riêng tư ngoài phạm vi được phép.
- [ ] SEARCH-12 Tin không có ảnh hoặc ảnh tải lỗi → có hiển thị thay thế, bố cục không vỡ.
- [ ] FAV-01 B thêm/bỏ yêu thích tin A → trạng thái tim và danh sách cập nhật, tải lại vẫn đúng.
- [ ] FAV-02 A tự yêu thích tin của mình → bị chặn.
- [ ] FAV-03 [API] Thêm trùng, bỏ mục không tồn tại, thêm tin không ACTIVE → phản hồi rõ, không sinh bản ghi trùng.

## 5. Tạo và duyệt yêu cầu thuê

- [ ] RENT-01 B chọn tin ACTIVE, ngày hợp lệ rồi gửi → đơn PENDING_OWNER; A nhận yêu cầu, B thấy đơn trong vai trò người thuê.
- [ ] RENT-02 A thuê chính tài sản của mình → bị chặn.
- [ ] RENT-03 Tài khoản nhân viên tạo yêu cầu thuê → bị chặn.
- [ ] RENT-04 Ngày bắt đầu = ngày kết thúc, bắt đầu > kết thúc hoặc chuỗi ngày sai → bị chặn.
- [ ] RENT-05 [Biên] Chọn ngày trong quá khứ → kiểm tra và ghi lỗi nếu hệ thống cho đặt trái quy tắc sản phẩm mong muốn.
- [ ] RENT-06 Thời lượng dưới min, đúng min, đúng max, trên max → chỉ khoảng hợp lệ được chấp nhận.
- [ ] RENT-07 Thời lượng 24 giờ và 24 giờ + 1 phút → theo code hiện tại tính lần lượt 1 và 2 ngày; UI và server phải thống nhất.
- [ ] RENT-08 Ngày thuê vượt lịch mở hoặc chạm vào lịch khóa → bị chặn.
- [ ] RENT-09 Trùng toàn phần, trùng một phần, nằm trong hoặc bao ngoài một đơn đã giữ lịch → bị chặn.
- [ ] RENT-10 Đơn mới bắt đầu đúng thời điểm đơn trước kết thúc → không coi là giao nhau theo phép so sánh hiện tại, nếu các điều kiện khác hợp lệ.
- [ ] RENT-11 B và C gửi yêu cầu cùng khoảng khi chưa đơn nào được duyệt → có thể cùng PENDING_OWNER; không mặc định đây là lỗi đặt trùng.
- [ ] RENT-12 A duyệt đồng thời hai yêu cầu trùng lịch bằng hai phiên → chỉ một đơn được giữ lịch AWAITING_PAYMENT.
- [ ] RENT-13 A duyệt → B thấy AWAITING_PAYMENT, hạn thanh toán và thông báo đúng.
- [ ] RENT-14 A từ chối kèm lý do → DECLINED, B nhận được kết quả.
- [ ] RENT-15 B/C duyệt hoặc từ chối thay A qua API → bị chặn.
- [ ] RENT-16 Duyệt/từ chối lại đơn đã xử lý → không chuyển trạng thái ngược hoặc phát sinh tác động trùng.
- [ ] RENT-17 Tin bị xóa hoặc lịch đã được giữ trong lúc B đang xem trang đặt thuê → gửi đơn phải kiểm tra dữ liệu mới nhất.
- [ ] RENT-18 Đổi vai trò thuê/cho thuê, lọc trạng thái, mở chi tiết và quay lại → danh sách, nhãn trạng thái và nút hành động đúng.

## 6. Giá tiền và thanh toán

- [ ] PAY-01 Đối chiếu số ngày × giá/ngày, phí dịch vụ và tổng trên trang đặt thuê, đơn và thanh toán → số tiền nhất quán.
- [ ] PAY-02 Với giá 100.000đ/ngày, 2 ngày, phí nền tảng cấu hình 5% → tiền thuê 200.000đ, phí 10.000đ, tổng 210.000đ; phí giao theo code hiện tại bằng 0.
- [ ] PAY-03 [API] Thay tổng tiền phía client → server dùng giá tự tính, không tin số tiền bị sửa.
- [ ] PAY-04 Mở lại màn hình thanh toán nhiều lần → dùng payment đang chờ phù hợp, không tạo giao dịch dư.
- [ ] PAY-05 Thanh toán thử thành công trong môi trường cho phép sandbox → AWAITING_SIGNATURE, có hợp đồng và thông báo cho hai bên.
- [ ] PAY-06 Nhấn thanh toán liên tục/gửi lại request → không ghi nhận tiền, hợp đồng hoặc payout hai lần.
- [ ] PAY-07 Thanh toán đơn chưa được duyệt/đã hủy/đã thanh toán → bị chặn hoặc trả kết quả đã xử lý, không thu thêm.
- [ ] PAY-08 Hết hạn thanh toán rồi mở payment intent → đơn EXPIRED; không tiếp tục như đơn còn hạn.
- [ ] PAY-09 Khi payment hết hạn, duyệt yêu cầu khác cùng lịch → lịch hết hạn được giải phóng theo luồng xử lý.
- [ ] PAY-10 [API] Khi tắt thanh toán sandbox, gọi endpoint tự ghi nhận thanh toán → không được giả lập thành công trái cấu hình.
- [ ] PAY-11 [API] Webhook đúng chữ ký, đúng giao dịch, đúng số tiền → thanh toán được ghi nhận một lần.
- [ ] PAY-12 [API] Webhook sai chữ ký → từ chối trước khi thay đổi dữ liệu.
- [ ] PAY-13 [API] Gửi lại cùng webhook → không cộng tiền hoặc chuyển trạng thái lần hai.
- [ ] PAY-14 [API] Webhook lệch số tiền → chuyển kiểm tra thủ công, không xác nhận thuê tự động.
- [ ] PAY-15 Mất mạng khi thanh toán rồi mở lại đơn → hiển thị trạng thái từ server, không buộc trả lần nữa vì UI chưa nhận response.

## 7. Hợp đồng, bàn giao và QR

- [ ] CONTRACT-01 Sau thanh toán mở hợp đồng → đúng hai bên, tài sản, ngày thuê, số tiền và mã hợp đồng.
- [ ] CONTRACT-02 A ký trước/B ký trước → một chữ ký vẫn AWAITING_SIGNATURE; đủ hai chữ ký mới CONFIRMED.
- [ ] CONTRACT-03 Ký lại hoặc hai bên ký gần đồng thời → không mất chữ ký, không sinh hợp đồng trùng.
- [ ] CONTRACT-04 C ký/xem hợp đồng; ký khi chưa có hợp đồng → bị chặn.
- [ ] CONTRACT-05 Sửa tin sau khi hợp đồng được tạo → kiểm tra thông tin đã chốt trong hợp đồng không bị thay đổi ngoài ý muốn.
- [ ] HAND-01 A tạo bàn giao giao tài sản khi CONFIRMED → READY_FOR_HANDOVER, B nhận thông báo.
- [ ] HAND-02 B thử khởi tạo giao thay A; A khởi tạo trước khi ký đủ → bị chặn.
- [ ] HAND-03 Nhập phụ kiện, số lượng thực tế, tình trạng, ghi chú và bằng chứng → lưu đúng vào biên bản.
- [ ] HAND-04 [Biên] Số lượng âm, file lỗi hoặc bỏ dữ liệu cần thiết trên UI → lỗi rõ, không tạo biên bản sai.
- [ ] HAND-05 B xác nhận nhận tài sản bằng luồng hỗ trợ → ONGOING; A thấy trạng thái cập nhật.
- [ ] HAND-06 Tạo QR giao tài sản rồi B quét → xác nhận đúng đơn và đúng phiên bàn giao.
- [ ] HAND-07 QR sai/hết hạn/đã dùng → bị từ chối, không đổi trạng thái.
- [ ] HAND-08 A tự quét xác nhận giao, C hoặc nhân viên quét thay B → bị chặn sai vai trò.
- [ ] HAND-09 [API] Ghép handoverId thuộc đơn khác với rentalId hiện tại → bị chặn.
- [ ] HAND-10 Hai thiết bị cùng xác nhận một phiên/QR → chỉ một lần xác nhận có hiệu lực.
- [ ] HAND-11 Camera bị từ chối, hủy quét hoặc quét mã không phải Borrow-Hub → không crash, hướng dẫn/thông báo rõ.

## 8. Hoàn trả, quá hạn, hủy và hoàn tiền

- [ ] RETURN-01 B yêu cầu trả khi ONGOING → RETURN_PENDING, A nhận được yêu cầu.
- [ ] RETURN-02 Tạo biên bản trả với phụ kiện/tình trạng/ảnh → lưu đúng dữ liệu trả, phân biệt biên bản giao.
- [ ] RETURN-03 A xác nhận nhận lại, trực tiếp hoặc bằng QR trả → COMPLETED, không còn thao tác giao/thuê đang diễn ra.
- [ ] RETURN-04 B tự xác nhận nhận lại thay A hoặc C xác nhận → bị chặn.
- [ ] RETURN-05 Yêu cầu trả trước khi nhận tài sản, trả lại đơn đã hoàn tất → không làm sai trạng thái.
- [ ] RETURN-06 Qua hạn trả và chạy tác vụ nền → trạng thái quá hạn và thông báo đúng.
- [ ] RETURN-07 Phí trễ bật/tắt, chạy tác vụ nhiều lần → phí đúng cấu hình/thời gian, không cộng lặp sai; tắt phí không hiện nội dung thu phí trễ.
- [ ] CANCEL-01 B hủy yêu cầu chưa thanh toán → CANCELLED, không có khoản hoàn tiền giả.
- [ ] CANCEL-02 B hủy đơn đã thanh toán trước ngưỡng hoàn toàn phần → đúng số tiền hoàn theo cấu hình.
- [ ] CANCEL-03 B hủy sát giờ bắt đầu → đúng tỷ lệ hoàn một phần và trạng thái payout tương ứng.
- [ ] CANCEL-04 Kiểm tra trước/đúng/sau ngưỡng hủy (mặc định 24 giờ, có thể cấu hình khác) → đúng nhánh tính hoàn tiền.
- [ ] CANCEL-05 A hủy đơn đã thanh toán → hoàn tiền cho B, hủy payout và áp dụng giảm điểm uy tín theo cấu hình.
- [ ] CANCEL-06 C hủy đơn người khác; hủy ở trạng thái không được phép → bị chặn.
- [ ] CANCEL-07 Hủy hai lần/hủy đồng thời với thanh toán → không hoàn tiền hai lần hoặc để hợp đồng còn hiệu lực trên đơn đã hủy.
- [ ] CANCEL-08 Sau hủy kiểm tra lịch, hợp đồng, thông báo, payment, refund và payout → đồng bộ với kết quả hủy.

## 9. Hư hỏng, không trả tài sản và tranh chấp

- [ ] DISPUTE-01 A báo hư hỏng tại RETURN_PENDING kèm mô tả, hạng mục, ảnh, ước tính → DISPUTED, tranh chấp chờ phản hồi, payout bị chặn.
- [ ] DISPUTE-02 B/C báo hư hỏng qua endpoint dành cho A hoặc A báo sai trạng thái → bị chặn.
- [ ] DISPUTE-03 Ước tính âm, mô tả quá 1.000 ký tự, quá 10 evidenceIds/hạng mục → bị từ chối.
- [ ] DISPUTE-04 Dùng bằng chứng thuộc đơn khác/người khác hoặc ID không tồn tại → bị chặn.
- [ ] DISPUTE-05 B chấp nhận báo hư hỏng → tranh chấp và luồng payout/đơn được cập nhật theo kết quả; không mặc định đây là giao dịch thu tiền sửa chữa thực tế.
- [ ] DISPUTE-06 A/C chấp nhận thay B hoặc chấp nhận tranh chấp không phải báo hư hỏng → bị chặn.
- [ ] DISPUTE-07 A báo chưa nhận lại tài sản ở OVERDUE/RETURN_PENDING → tạo tranh chấp LOST_ASSET và chặn payout.
- [ ] DISPUTE-08 Báo không trả khi đơn chưa đến trạng thái cho phép → bị chặn.
- [ ] DISPUTE-09 Tạo thêm tranh chấp đang hoạt động cho cùng đơn → bị chặn trùng.
- [ ] DISPUTE-10 Hai bên gửi phản hồi, ghi chú và bằng chứng qua luồng được hỗ trợ → lịch sử đúng người gửi, thời gian và nội dung.
- [ ] DISPUTE-11 Nhân viên được cấp quyền nhận xử lý, yêu cầu bổ sung, đưa kết luận → trạng thái và lịch sử cập nhật, hai bên đọc được phần được phép.
- [ ] DISPUTE-12 Phân công cho người không phải nhân viên hoặc tài khoản không tồn tại → bị chặn.
- [ ] DISPUTE-13 Đóng tranh chấp sau khi xác nhận đã trả → khôi phục luồng đơn/payout phù hợp, không kẹt BLOCKED vô lý.
- [ ] DISPUTE-14 Sửa tranh chấp đã đóng hoặc C đọc tranh chấp của A/B → bị chặn theo quyền.

## 10. Chat, thông báo và hỗ trợ

- [ ] CHAT-01 B mở trò chuyện từ tin A → đúng người, đúng ngữ cảnh, mở lại không tạo hội thoại trùng ngoài ý muốn.
- [ ] CHAT-02 Gửi/nhận tin nhắn giữa hai thiết bị → hiển thị thời gian thực, thứ tự và người gửi đúng.
- [ ] CHAT-03 Gửi ảnh hợp lệ; gửi tin loại ảnh thiếu attachment → ảnh hợp lệ hiển thị, payload thiếu bị chặn.
- [ ] CHAT-04 [Biên] Tin rỗng/chỉ khoảng trắng, dài, tiếng Việt, emoji → không crash, validation và hiển thị hợp lý.
- [ ] CHAT-05 Gửi số điện thoại/email/link → xuất hiện cảnh báo giao dịch ngoài nền tảng theo cơ chế hiện tại.
- [ ] CHAT-06 [API] Người dùng tự gửi message loại SYSTEM → bị chặn.
- [ ] CHAT-07 Các mốc yêu cầu thuê/thanh toán/hợp đồng/bàn giao → tin hệ thống đúng đơn, không nhầm hội thoại.
- [ ] CHAT-08 Mất mạng/kết nối lại/đưa app xuống nền rồi mở → tải bù tin, không nhân đôi hoặc mất tin đã gửi thành công.
- [ ] CHAT-09 [API] C đọc/gửi vào hội thoại A–B; socket thiếu token/token sai → không truy cập được.
- [ ] NOTI-01 Phát sinh sự kiện khi bên nhận đang mở app → thông báo và số chưa đọc cập nhật.
- [ ] NOTI-02 Đánh dấu một/tất cả đã đọc rồi tải lại → trạng thái và số đếm đúng, không âm.
- [ ] NOTI-03 Bấm thông báo → mở đúng đơn/tin/tranh chấp; đối tượng không còn truy cập được thì báo phù hợp.
- [ ] NOTI-04 Tác vụ nhắc lịch chạy lặp trong thời gian chống trùng → không spam thông báo/tin hệ thống.
- [ ] NOTI-05 Admin gửi thông báo toàn hệ thống trong môi trường test → người dùng hoạt động nhận đúng nội dung, không nhân đôi.
- [ ] SUPPORT-01 Tạo yêu cầu hỗ trợ đủ thông tin, gắn đơn/tranh chấp mình được xem → lưu thành công, xem lại được.
- [ ] SUPPORT-02 Gắn đơn người khác/tranh chấp không tồn tại → bị chặn.
- [ ] SUPPORT-03 Nhân viên hỗ trợ được cấp quyền nhận và xử lý ticket → trạng thái/phản hồi hiển thị đúng.
- [ ] SUPPORT-04 Phân công người không có quyền hỗ trợ hoặc C đọc ticket B → bị chặn.

## 11. Đánh giá và báo cáo vi phạm

- [ ] REVIEW-01 A và B đánh giá nhau sau COMPLETED → mỗi bên tạo được một đánh giá, điểm hiển thị được cập nhật.
- [ ] REVIEW-02 Đánh giá trước COMPLETED, người ngoài đánh giá hoặc đánh giá lần hai → bị chặn.
- [ ] REVIEW-03 Điểm 1/5 hợp lệ; 0/6/số lẻ → xử lý đúng ràng buộc điểm.
- [ ] REVIEW-04 Sửa đánh giá trong thời hạn cấu hình → lưu được; quá hạn hoặc sửa của người khác → bị chặn.
- [ ] REVIEW-05 Admin ẩn/kiểm duyệt đánh giá → nội dung công khai và điểm uy tín được tính lại phù hợp.
- [ ] REPORT-01 Báo cáo tin, người dùng hoặc đánh giá qua luồng được hỗ trợ → vào hàng đợi đúng đối tượng.
- [ ] REPORT-02 Admin xác nhận báo cáo tin vi phạm → tin bị ẩn theo hành động xử lý.
- [ ] REPORT-03 Admin cảnh báo người dùng hoặc ẩn đánh giá từ báo cáo → đúng đối tượng, thông báo/điểm được cập nhật.
- [ ] REPORT-04 [API] Chọn hành động không phù hợp loại đối tượng báo cáo → bị chặn.

## 12. Quản trị, tài chính và phân quyền

- [ ] ADMIN-01 Đăng nhập admin → đúng khu vực quản trị; người dùng thường không mở được API admin bằng link trực tiếp.
- [ ] ADMIN-02 Kiểm tra từng tài khoản nhân viên với quyền kiểm duyệt/hỗ trợ/tài chính/quản trị được cấp → chỉ xem và thao tác trong phạm vi quyền.
- [ ] ADMIN-03 Tìm/lọc người dùng, đổi trạng thái, cập nhật vai trò → kết quả đúng đối tượng và có hiệu lực ở request sau.
- [ ] ADMIN-04 Tạo người dùng nội bộ hợp lệ; email trùng/role không hợp lệ → tạo đúng hoặc báo lỗi, không tạo quyền ngoài dự kiến.
- [ ] ADMIN-05 Duyệt/từ chối/đình chỉ tin → trạng thái ở admin, chủ tin và khám phá đồng bộ; lý do được gửi đúng.
- [ ] ADMIN-06 Danh sách mặc định không hiện tin đã xóa; lọc riêng đã xóa nếu được hỗ trợ → trả đúng kết quả.
- [ ] ADMIN-07 Dashboard khi có dữ liệu và khi rỗng → số liệu đúng phạm vi, không NaN/Infinity/chia cho 0.
- [ ] ADMIN-08 Số đếm hàng đợi sau xử lý KYC/tin/báo cáo/tranh chấp → cập nhật sau refresh và sau thời gian cache nếu có.
- [ ] FIN-01 B xem payment của mình, A xem payout của mình → số tiền/trạng thái đúng; C không xem được qua thay ID.
- [ ] FIN-02 Đối chiếu payout với tiền thuê trừ hoa hồng cấu hình → đúng số tiền; mặc định hoa hồng chủ tài sản 10% khi không có cấu hình khác.
- [ ] FIN-03 Người có quyền tài chính đánh dấu payout đã trả → cập nhật, gửi thông báo A; gửi lại không thông báo lặp.
- [ ] FIN-04 Người không có quyền thay đổi payout/refund → bị chặn.
- [ ] FIN-05 Tạo hoàn tiền một phần/toàn phần cho payment đã thanh toán → không vượt số dư được hoàn.
- [ ] FIN-06 Hoàn vượt số dư, hoàn payment chưa thanh toán hoặc hai yêu cầu hoàn đồng thời → không hoàn quá tổng tiền thực nhận.
- [ ] FIN-07 Refund mới PENDING → payment chưa bị coi đã hoàn; hoàn tất refund → payment cập nhật đúng mức hoàn.
- [ ] FIN-08 Cập nhật lại refund đã kết thúc → bị chặn, không ghi nhận hoàn thêm.
- [ ] ADMIN-09 Đổi phí/ngưỡng hủy trong system-configs trên môi trường test → đơn mới dùng cấu hình mới; kiểm tra đơn cũ không đổi khoản tiền đã chốt ngoài ý muốn.
- [ ] ADMIN-10 Xem audit log/request log sau thao tác → đúng người/thao tác/thời gian; không lộ mật khẩu, token, dữ liệu KYC nhạy cảm.

## 13. Độ ổn định, giao diện và kiểm tra chéo

- [ ] CROSS-01 Với mỗi form quan trọng, nhấn nút gửi nhanh nhiều lần → có trạng thái đang xử lý, không tạo bản ghi/tác động trùng.
- [ ] CROSS-02 Tắt mạng trước gửi, trong khi gửi và ngay sau gửi → có lỗi hoặc kết quả xác nhận từ server, thử lại không gây mất dữ liệu.
- [ ] CROSS-03 API timeout/500 → thoát loading, có thể thử lại, không hiển thị thành công giả.
- [ ] CROSS-04 Mở link có ID sai/không tồn tại/không được phép → màn hình lỗi phù hợp, không crash.
- [ ] CROSS-05 Tải lại web ở màn hình chi tiết; Android Back; đóng modal/bàn phím → điều hướng đúng, không mắc kẹt.
- [ ] CROSS-06 Kiểm tra màn hình nhỏ, bàn phím mở, cỡ chữ lớn → đọc được nội dung và bấm được nút chính.
- [ ] CROSS-07 Kiểm tra tiếng Việt, tiền VND, ngày và múi giờ Asia/Saigon → không lỗi dấu, không lệch ngày thuê giữa app và API.
- [ ] CROSS-08 Danh sách rỗng/nhiều dữ liệu, ảnh chậm tải → có loading/empty/error state phù hợp, cuộn dùng được.
- [ ] CROSS-09 Tài khoản bị khóa/đổi quyền khi đang đăng nhập → request riêng tư sau đó bị kiểm soát, không chỉ ẩn nút phía UI.
- [ ] CROSS-10 [API] Thay ID trên đơn, payment, payout, contract, handover, chat, KYC, ticket và dispute → không đọc/sửa dữ liệu ngoài quyền.
- [ ] CROSS-11 [API] Gửi payload sai kiểu, trường thừa, chuỗi rất dài vào endpoint chính → lỗi validation phù hợp, không rò stack trace/dữ liệu nhạy cảm.
- [ ] CROSS-12 Kiểm tra cùng luồng quan trọng trên Android/iOS/web thuộc phạm vi phát hành → kết quả nghiệp vụ thống nhất; nền tảng chưa chạy ghi NOT RUN.

## Thứ tự chạy đề xuất

1. Luồng thành công: đăng nhập → KYC → đăng tin → duyệt tin → đặt thuê → duyệt yêu cầu → thanh toán thử → hai bên ký → giao/QR → trả/QR → đánh giá.
2. Luồng thay thế: từ chối thuê, hủy trước/sau thanh toán, hết hạn thanh toán, quá hạn trả, hư hỏng, không trả, giải quyết tranh chấp.
3. Kiểm tra mất tiền/mất quyền: đặt trùng lịch, thanh toán/hoàn tiền lặp, sai vai trò, thay ID, xóa tin, đổi tài khoản, mất mạng.
4. Chạy các ca còn lại theo từng nhóm chức năng.

## Mẫu ghi kết quả/lỗi

| Mã ca | Trạng thái | Thiết bị/bản build | Dữ liệu test (ID đơn/tin) | Thực tế/ảnh lỗi |
|---|---|---|---|---|
| RENT-12 | NOT RUN / PASS / FAIL / BLOCKED | | | |

Khi ghi lỗi, thêm: tài khoản/vai trò, trạng thái ban đầu, từng bước tái hiện, kết quả mong đợi, kết quả thực tế, thời điểm và request ID nếu có. Không ghi mật khẩu/token thật vào báo cáo lỗi.

## Căn cứ và giới hạn

- Đối chiếu từ `apps/mobile/src/app`, các controller/service/DTO và test trong `apps/api/src`, `apps/mobile/tests`.
- Các nguồn chính: `auth`, `kyc`, `assets`, `rentals`, `payment`, `finance`, `disputes`, `reviews`, `chat`, `notifications`, `support`, `reports`, `admin` và client refresh token.
- README và tài liệu state machine có nội dung cũ: code hiện có reset-password và refresh-token retry; AWAITING_PAYMENT đang giữ lịch còn PENDING_OWNER chưa giữ lịch. Checklist dùng hành vi code mới hơn làm căn cứ.
- Mức phí, cửa sổ hủy/sửa đánh giá, hạn thanh toán và nhà cung cấp thực tế phụ thuộc cấu hình môi trường. Ghi cấu hình trước khi chấm kết quả.
- Một số ca yêu cầu API/fixture vì chưa xác nhận có UI tương ứng. Việc liệt kê ca không khẳng định chức năng đã chạy thành công hoặc tích hợp dịch vụ thật đã sẵn sàng.
