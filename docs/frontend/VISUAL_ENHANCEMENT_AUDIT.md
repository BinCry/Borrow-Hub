# Visual Enhancement Audit

Dự án: **Borrow Hub**
Mục tiêu: Đánh giá cảm giác "basic/prototype" hiện tại của UI và lập danh sách cơ hội nâng cấp thành "production-grade/premium".

Thang điểm:
- Visual quality (Chất lượng thị giác): 1 → 10
- Information hierarchy (Phân cấp thông tin): 1 → 10
- Brand feeling (Cảm giác thương hiệu): 1 → 10
- Trust feeling (Độ tin cậy): 1 → 10
- UX clarity (Độ rõ ràng trải nghiệm): 1 → 10

---

## 1. Auth Family (Login, Register, Forgot Password)

| Screen | Current Quality | Basicness | Enhancement Opportunity | Priority |
| ------ | --------------: | --------: | ----------------------- | -------- |
| Login | 5/10 | Background trắng trơn, form generic. | Thêm hình nền ảnh editorial lifestyle, phủ overlay màu gradient primary, đưa form nổi lên dạng glass/surface. | High |
| Register | 5/10 | Text heavy, khô khan. | Giữ chung visual family với Login nhưng thay đổi hero copy và có thể dùng hình nền nhấn mạnh tính "Cộng đồng". | High |
| Forgot Pwd | 4/10 | Chỉ có input và nút, cảm giác như form nháp. | Thêm illustration bảo mật (ổ khóa/khiên), hỗ trợ success screen với animation/icon to hơn. | Medium |

**Đánh giá chi tiết:**
- Visual quality: 5
- Information hierarchy: 7
- Brand feeling: 4
- Trust feeling: 6
- UX clarity: 8
- **Tổng quan**: Khá functional nhưng thiếu hoàn toàn Brand feeling. Cần xử lý ảnh nền và form composition.

## 2. Discovery & Marketplace (Home, Search, Asset Details)

| Screen | Current Quality | Basicness | Enhancement Opportunity | Priority |
| ------ | --------------: | --------: | ----------------------- | -------- |
| Home / Index | 6/10 | Chỉ có Search bar và Category list icon chay. | Cần một Hero banner tạo cảm hứng "Thuê thay vì mua". Các category cần nâng cấp thành visual blocks thay vì text. | High |
| Asset Card | 6/10 | Ảnh có thể bị lệch tỉ lệ, typo đều nhau. | Phân cấp lại font-weight cho giá tiền, thêm badge "Đã xác thực" hoặc Trust signals. Bo góc (radius) mượt hơn. | High |
| Asset Detail | 7/10 | Ảnh cover nhỏ, owner profile chìm. | Đưa ảnh lên thành full-width Hero gallery. Tạo Owner Trust Block (avatar to, verified badge, rating) nổi bật. Mua CTA cố định dưới bottom. | High |
| Search / Filter | 6/10 | List text đơn giản, empty state khô khan. | Thêm Illustration cho Empty State. Nâng cấp Filter thành Bottom Sheet gọn gàng hơn với Chips thay vì text buttons. | Medium |

**Đánh giá chi tiết:**
- Visual quality: 6
- Information hierarchy: 6
- Brand feeling: 5
- Trust feeling: 7
- UX clarity: 8
- **Tổng quan**: UI kit cơ bản. Cần bổ sung Photography-first approach, làm nổi bật giá trị cốt lõi là hình ảnh món đồ.

## 3. Transactional Flows (Rentals, Payment, Handover)

| Screen | Current Quality | Basicness | Enhancement Opportunity | Priority |
| ------ | --------------: | --------: | ----------------------- | -------- |
| Rental Detail | 7/10 | Text buttons cho Approve/Decline. Status chỉ là label. | Xây dựng Visual Timeline (Yêu cầu -> Xác nhận -> Hợp đồng -> Bàn giao). Giúp user hình dung lifecycle dễ hơn. | High |
| Contract | 6/10 | Khá text-heavy, thiếu trust. | Nâng cấp typography thành dạng "Legal document" dễ đọc, clear header, sticky sign CTA. | Medium |
| Handover (QR) | 6/10 | QR nhỏ, thiếu instruction mạnh. | QR card làm focal point to, có shadow. Thêm icon an toàn (shield) để tăng độ tin cậy. | High |
| Payment | 6/10 | Icon to, text giải thích. | Tinh chỉnh spacing, nhấn mạnh tổng tiền (Total amount) và thêm icon security/lock. | Medium |

**Đánh giá chi tiết:**
- Visual quality: 6
- Information hierarchy: 7
- Brand feeling: 6
- Trust feeling: 6
- UX clarity: 7
- **Tổng quan**: Cần "Trust indicators" nhiều hơn thay vì decoration.

## 4. Profile & Empty States

| Screen | Current Quality | Basicness | Enhancement Opportunity | Priority |
| ------ | --------------: | --------: | ----------------------- | -------- |
| Profile Header | 5/10 | Chỉ có tên và vài dòng text. | Cần avatar lớn, trust stats (số lượt thuê, rating), cover background mờ hoặc primary color block. | High |
| KYC | 6/10 | Form hành chính. | Thêm illustration bảo mật (Security), progress steps rõ ràng, instruction bằng hình ảnh cách chụp CCCD. | High |
| Empty States | 4/10 | Icon default + Text ngắn. | Cần đầu tư Illustration library đồng nhất (vector tối giản) cho các trường hợp: Không có đơn thuê, Không có tin nhắn. | Medium |

**Đánh giá chi tiết:**
- Visual quality: 5
- Information hierarchy: 6
- Brand feeling: 5
- Trust feeling: 6
- UX clarity: 8
- **Tổng quan**: Profile đang giống "settings list" mặc định. Cần biến thành "Dashboard cá nhân" có hồn hơn.

---
*Ghi chú: Điểm số sẽ được cập nhật lại sau khi hoàn thành đợt Execution Loop.*
