# Asset Sources

## Nền lá mint — đăng nhập và đăng ký

Ảnh hiện dùng: `apps/mobile/assets/images/borrow-auth-mint-leaves.webp`. Tạo bằng imagegen tích hợp từ ảnh tham khảo người dùng cung cấp `Gemini_Generated_Image_90klf590klf590kl.png`; nén WebP quality 90. Họa tiết lá nổi nhẹ trên nền mint, khoảng trống cho biểu mẫu.

Prompt:

```text
Use the supplied image as the visual reference. Create a refined portrait mobile authentication background, 1024x2048. Match the extremely pale mint green tone, softly embossed sage botanical sprigs, delicate monochromatic leaf veins and soft diffuse lighting. Arrange sparse elegant leafy branches mostly along upper left and lower right edges, with a few subtle small sprigs. Keep the central form area spacious and nearly blank for dark text. Flat full-bleed background, no rounded outer frame or simulated device, no text, no letters, no UI, no logos, no sparkle emblem or watermark. Preserve the reference's quiet airy minimalist botanical mood, subtle relief and very low contrast. No people, electronics or photographic scenery.
```

## Banner đồ điện tử

`apps/mobile/assets/images/borrow-electronics-banner.webp` — banner trang chủ hiện tại, tạo bằng imagegen tích hợp ngày 2026-09-30, WebP quality 85, 1774 × 887. Thay banner đồ dùng tổng hợp bằng laptop, máy ảnh, tai nghe và loa.

Prompt:

```text
Use case: ads-marketing. Wide 2:1 landscape premium photographic banner for Borrow Hub electronics rental app. Elegant modern studio still life of an unbranded slim laptop with blank dark screen, mirrorless camera, over-ear headphones and compact portable speaker, grouped on the right two thirds on subtle pale stone platforms. Soft mint and forest green background, warm ivory highlights, beautiful diffused daylight, precise realistic materials, polished premium consumer electronics editorial photography. Keep left third clean deep green negative space for white Vietnamese headline rendered by app. Keep subjects in central vertical area for shallow mobile banner crop. Electronics only. No tools, no camping equipment, no plants obscuring devices, no words, no logos, no watermarks, no UI. Friendly aspirational and uncluttered.
```

## Nền cộng đồng cho đăng nhập / đăng ký

Ảnh đang dùng: `apps/mobile/assets/images/borrow-auth-community.webp`, tạo bằng imagegen tích hợp ngày 2026-09-30, tối ưu WebP quality 85. Minh họa hai người trao đồ trong sân khu phố, tông mint–cam–kem. Thay nền `borrow-auth.webp` ở đăng nhập và đăng ký; ảnh cũ giữ lại làm phiên bản trước.

Prompt:

```text
Use case: illustration-story. Create a portrait 1024x1536 background illustration for Borrow Hub login and registration, a Vietnamese neighborhood item-sharing and rental app. Entirely illustrated editorial style, graceful hand-drawn shapes with subtle paper grain and soft gouache shading. Upper third: two friendly young Vietnamese adults meeting in a leafy apartment courtyard, one passing a compact camera bag to the other, a bicycle parked nearby and a small camping tent in the distance. Clear natural hands, relaxed believable poses, warmly human community sharing story. Interesting architectural arches, rounded foliage, playful sunlit shadows. Palette mint green, teal, warm coral orange and creamy ivory. Lower two thirds fades into spacious nearly blank pale mint-ivory with only tiny botanical accents at far bottom corners so dark login fields remain legible. Asymmetric lively composition, polished modern lifestyle illustration. NO product still life, NO shelf, NO drill, NO photorealism, NO words, NO letters, NO logo, NO UI, NO watermark. Full bleed portrait.
```

Mọi external asset (hình ảnh, minh họa, icon) sử dụng trong dự án Borrow Hub phải được ghi nhận tại đây.

| Tên asset | URL nguồn | License | Tác giả (nếu có) | Screen sử dụng |
| --------- | --------- | ------- | ---------------- | -------------- |
| `icon.png` | Default Expo | MIT | Expo | App Icon |
| `adaptive-icon.png` | Default Expo | MIT | Expo | App Icon |
| `splash.png` | Default Expo | MIT | Expo | Splash Screen |
| `favicon.png` | Default Expo | MIT | Expo | Web Favicon |

| `borrow-auth.webp` | Tạo bằng công cụ imagegen tích hợp, 2026-09-30 | Ảnh AI tạo cho dự án; không có giấy phép stock bên thứ ba | OpenAI imagegen | Đăng nhập, đăng ký |
| `borrow-home-banner.webp` | Tạo bằng công cụ imagegen tích hợp, 2026-09-30 | Ảnh AI tạo cho dự án; không có giấy phép stock bên thứ ba | OpenAI imagegen | Banner trang chủ |

Hai ảnh được lưu tại `apps/mobile/assets/images/`, nén WebP quality 85, giữ nguyên kích thước và bố cục ảnh gốc. Ảnh nền 1024 × 1536; banner 1774 × 887. Không chứa chữ hoặc logo; nội dung chữ được dựng bằng giao diện để giữ độ rõ nét.

### Prompt tạo ảnh nền đăng nhập / đăng ký

```text
Use case: ads-marketing. Create a portrait 1024x1536 photographic background for Borrow Hub, a Vietnamese community app for renting and sharing everyday items. Premium natural product photography: an unbranded camera with lens, cordless drill and neatly closed tool case, rolled camping mat and small olive backpack arranged on a warm pale stone shelf in the upper third and along edges, a subtle leafy plant, soft sage green wall. Clear recognizable useful rental items, warm daylight, realistic materials, inviting trustworthy sustainable community mood. Center and lower half very quiet softly shaded deep forest green negative space for a login/register form overlay. Restrained sage, forest green, warm cream palette. No words, no letters, no logos, no watermark, no collage, no UI. Portrait composition with safe central cropping.
```

### Prompt tạo banner trang chủ

```text
Use case: ads-marketing. Create a wide landscape 1536x768 premium photographic hero banner for Borrow Hub, Vietnamese community rental and borrowing app. A tidy set of useful shared everyday equipment on a pale warm stone tabletop: unbranded black mirrorless camera and lens, forest green cordless drill with small tool case, olive camping backpack and rolled mat. Arrange recognizable objects across the center-right, keep all subjects inside central 75 percent for mobile cropping. Soft sage wall with subtle sunlit plant shadows, warm natural morning light, premium realistic editorial product photography, approachable sustainable neighborhood sharing mood. Leave lower left half calm dark forest green softly shaded negative space for white headline overlay. Green, cream and natural wood palette. Wide composition, no text, no logos, no watermark, no UI, no borders.
```
