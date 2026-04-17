const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const OA_ACCESS_TOKEN = process.env.ZALO_OA_TOKEN;
const USER_ID = process.env.ZALO_USER_ID; // Chỉ gửi cho bạn

async function notifyNewVanBan(vanBan) {
  if (!OA_ACCESS_TOKEN || !USER_ID) {
    console.log('   ⚠️ Chưa cấu hình Zalo OA, bỏ qua gửi thông báo');
    return;
  }

  const message = 
    `📄 *VĂN BẢN MỚI ĐẾN*\n\n` +
    `Số hiệu: ${vanBan.so_hieu}\n` +
    `Ngày ban hành: ${vanBan.ngay_ban_hanh}\n` +
    `Cơ quan: ${vanBan.co_quan_ban_hanh}\n\n` +
    `📋 Trích yếu: ${vanBan.trich_yeu}\n\n` +
    `⏰ Văn bản đã được tải về thư mục van-ban-den/`;

  try {
    const response = await axios.post(
      'https://openapi.zalo.me/v3.0/oa/message/cs',
      {
        recipient: { user_id: USER_ID },
        message: { text: message }
      },
      {
        headers: { 
          'access_token': OA_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.error === 0) {
      console.log('   ✅ Đã gửi thông báo Zalo');
    } else {
      console.log('   ⚠️ Lỗi gửi Zalo:', response.data);
    }
  } catch (error) {
    console.error('   ❌ Lỗi gửi Zalo:', error.message);
    if (error.response) {
      console.error('      Chi tiết:', error.response.data);
    }
  }
}

module.exports = { notifyNewVanBan };
