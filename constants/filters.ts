// Genres available in OPhim API — Phim 18+ excluded
export const GENRES = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Cổ Trang', slug: 'co-trang' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Tài Liệu', slug: 'tai-lieu' },
  { name: 'Bí Ẩn', slug: 'bi-an' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' },
  { name: 'Võ Thuật', slug: 'vo-thuat' },
  { name: 'Chiến Tranh', slug: 'chien-tranh' },
  { name: 'Thể Thao', slug: 'the-thao' },
  { name: 'Chính Kịch', slug: 'chinh-kich' },
  { name: 'Lịch Sử', slug: 'lich-su' },
  { name: 'Khoa Học', slug: 'khoa-hoc' },
  { name: 'Học Đường', slug: 'hoc-duong' },
  { name: 'Gia Đình', slug: 'gia-dinh' },
  { name: 'Âm Nhạc', slug: 'am-nhac' },
  { name: 'Thần Thoại', slug: 'than-thoai' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { name: 'Kinh Điển', slug: 'kinh-dien' },
  { name: 'Short Drama', slug: 'short-drama' },
];

// Countries available in OPhim API
export const COUNTRIES = [
  { name: 'Trung Quốc', slug: 'trung-quoc' },
  { name: 'Âu Mỹ', slug: 'au-my' },
  { name: 'Hàn Quốc', slug: 'han-quoc' },
  { name: 'Nhật Bản', slug: 'nhat-ban' },
  { name: 'Thái Lan', slug: 'thai-lan' },
  { name: 'Việt Nam', slug: 'viet-nam' },
  { name: 'Hồng Kông', slug: 'hong-kong' },
  { name: 'Đài Loan', slug: 'dai-loan' },
  { name: 'Ấn Độ', slug: 'an-do' },
  { name: 'Pháp', slug: 'phap' },
  { name: 'Anh', slug: 'anh' },
  { name: 'Đức', slug: 'duc' },
  { name: 'Tây Ban Nha', slug: 'tay-ban-nha' },
  { name: 'Úc', slug: 'uc' },
  { name: 'Thổ Nhĩ Kỳ', slug: 'tho-nhi-ky' },
  { name: 'Nga', slug: 'nga' },
  { name: 'Indonesia', slug: 'indonesia' },
  { name: 'Philippines', slug: 'philippines' },
  { name: 'Singapore', slug: 'singapore' },
  { name: 'Malaysia', slug: 'malaysia' },
  { name: 'Na Uy', slug: 'na-uy' },
  { name: 'Hà Lan', slug: 'ha-lan' },
  { name: 'Brazil', slug: 'brazil' },
  { name: 'Mexico', slug: 'mexico' },
  { name: 'Argentina', slug: 'argentina' },
  { name: 'Đan Mạch', slug: 'dan-mach' },
  { name: 'Thụy Điển', slug: 'thuy-dien' },
  { name: 'Bồ Đào Nha', slug: 'bo-dao-nha' },
  { name: 'Ukraina', slug: 'ukraina' },
  { name: 'Canada', slug: 'canada' },
];

// Movie types from OPhim /v1/api/danh-sach/
export const MOVIE_TYPES = [
  { name: 'Phim Mới', slug: 'phim-moi' },
  { name: 'Phim Lẻ', slug: 'phim-le' },
  { name: 'Phim Bộ', slug: 'phim-bo' },
  { name: 'TV Shows', slug: 'tv-shows' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { name: 'Chiếu Rạp', slug: 'phim-chieu-rap' },
  { name: 'Vietsub', slug: 'phim-vietsub' },
  { name: 'Thuyết Minh', slug: 'phim-thuyet-minh' },
  { name: 'Lồng Tiếng', slug: 'phim-long-tien' },
  { name: 'Đang Chiếu', slug: 'phim-bo-dang-chieu' },
  { name: 'Hoàn Thành', slug: 'phim-bo-hoan-thanh' },
];

export const SORT_OPTIONS = [
  { name: 'Mới cập nhật', value: 'modified.time' },
  { name: 'Năm mới nhất', value: 'year' },
  { name: 'Xem nhiều', value: 'view' },
];

export const YEARS: number[] = (() => {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 2000; y--) years.push(y);
  return years;
})();
