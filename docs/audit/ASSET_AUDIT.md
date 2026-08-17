# ASSET AUDIT

| Asset Type | Source | License | Usage | Status |
| :--- | :--- | :--- | :--- | :--- |
| Icons | `lucide-react-native` | ISC License | App icons (chevron, star, user, etc.) | ✅ Validated |
| Typography | System fonts | N/A | React Native default fonts | ⚠️ Needs Vietnamese support check |
| Branding / Logo | *Pending* | - | Splash screen and App icon | ❌ Needs Audit |

## Vấn đề cần giải quyết
1. **App Icon & Splash Screen**: Cần xác minh `apps/mobile/assets` có chứa icon và splash mặc định của Expo không. Nếu có, cần thay thế bằng asset chuẩn của Borrow Hub.
2. **Hình ảnh Placeholder / Empty State**: Hiện chưa có ảnh tĩnh (illustration) nào cho các trạng thái lỗi hoặc rỗng. Cần tìm/generate ảnh phù hợp.
3. **Màu sắc**: Đã được định nghĩa trong Tailwind, nhưng cần đảm bảo không dùng ảnh PNG có nền hardcode.
