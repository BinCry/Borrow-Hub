export type LocationOption = {
  name: string;
  districts: string[];
};

// Local data keeps the form usable when the location service is unavailable.
export const vietnamLocations: LocationOption[] = [
  { name: 'Hà Nội', districts: ['Ba Đình', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Hoàn Kiếm', 'Hà Đông', 'Long Biên', 'Nam Từ Liêm', 'Tây Hồ', 'Thanh Xuân'] },
  { name: 'Hồ Chí Minh', districts: ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Bình Tân', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Thủ Đức'] },
  { name: 'Đà Nẵng', districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'] },
  { name: 'Hải Phòng', districts: ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Kiến An', 'Hải An', 'Đồ Sơn', 'Thủy Nguyên'] },
  { name: 'Cần Thơ', districts: ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt', 'Phong Điền'] },
  { name: 'Thừa Thiên Huế', districts: ['Thuận Hóa', 'Phú Xuân', 'Hương Thủy', 'Hương Trà', 'Phong Điền'] },
  { name: 'Đồng Nai', districts: ['Biên Hòa', 'Long Khánh', 'Nhơn Trạch', 'Long Thành', 'Trảng Bom', 'Tân Phú'] },
  { name: 'Bình Dương', districts: ['Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Tân Uyên', 'Bến Cát', 'Dầu Tiếng'] },
  { name: 'Khánh Hòa', districts: ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Vạn Ninh', 'Diên Khánh'] },
  { name: 'Lâm Đồng', districts: ['Đà Lạt', 'Bảo Lộc', 'Đức Trọng', 'Di Linh', 'Lạc Dương'] },
  { name: 'Bà Rịa - Vũng Tàu', districts: ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Châu Đức', 'Long Điền', 'Đất Đỏ'] },
  { name: 'Quảng Ninh', districts: ['Hạ Long', 'Móng Cái', 'Uông Bí', 'Cẩm Phả', 'Đông Triều', 'Vân Đồn'] },
  { name: 'Nghệ An', districts: ['Vinh', 'Cửa Lò', 'Thái Hòa', 'Diễn Châu', 'Nghi Lộc', 'Quỳnh Lưu'] },
  { name: 'Thanh Hóa', districts: ['Thanh Hóa', 'Sầm Sơn', 'Bỉm Sơn', 'Nghi Sơn', 'Hoằng Hóa', 'Quảng Xương'] },
  { name: 'Bình Định', districts: ['Quy Nhơn', 'An Nhơn', 'Hoài Nhơn', 'Tuy Phước', 'Phù Cát'] },
  { name: 'Quảng Nam', districts: ['Tam Kỳ', 'Hội An', 'Điện Bàn', 'Duy Xuyên', 'Núi Thành'] },
  { name: 'Kiên Giang', districts: ['Rạch Giá', 'Hà Tiên', 'Phú Quốc', 'Châu Thành', 'Kiên Lương'] },
  { name: 'An Giang', districts: ['Long Xuyên', 'Châu Đốc', 'Tân Châu', 'Châu Phú', 'Chợ Mới'] },
  { name: 'Các tỉnh/thành khác', districts: ['Quận/Huyện khác'] },
];
