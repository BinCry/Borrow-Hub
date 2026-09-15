UPDATE "categories"
SET "name" = CASE "slug"
  WHEN 'electronics' THEN 'Đồ điện tử'
  WHEN 'tools' THEN 'Dụng cụ'
  WHEN 'camera' THEN 'Máy ảnh'
  WHEN 'projector' THEN 'Máy chiếu'
  WHEN 'speaker' THEN 'Loa'
  WHEN 'drill' THEN 'Máy khoan'
  WHEN 'saw' THEN 'Máy cưa'
  WHEN 'measuring-tool' THEN 'Dụng cụ đo lường'
  ELSE "name"
END
WHERE "slug" IN (
  'electronics',
  'tools',
  'camera',
  'projector',
  'speaker',
  'drill',
  'saw',
  'measuring-tool'
);
