const { notifyNewVanBan } = require('./zalo-notify');

// Test gửi thông báo văn bản mẫu
const testVanBan = {
  so_hieu: 'TEST/2026',
  ngay_ban_hanh: '17/04/2026',
  co_quan_ban_hanh: 'Sở Giáo dục và Đào tạo - Tỉnh Đồng Tháp',
  trich_yeu: 'Đây là tin nhắn test từ hệ thống văn bản. Nếu bạn nhận được tin này, cấu hình Zalo OA đã hoạt động!'
};

console.log('🚀 Đang test gửi thông báo Zalo OA...\n');
notifyNewVanBan(testVanBan);
