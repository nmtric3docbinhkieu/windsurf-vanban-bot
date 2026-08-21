const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function notifyNewVanBan(vanBan) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('   ⚠️ Chưa cấu hình Telegram, bỏ qua gửi thông báo');
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
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      }
    );
    
    if (response.data && response.data.ok) {
      console.log('   ✅ Đã gửi thông báo Telegram');
    } else {
      console.log('   ⚠️ Lỗi gửi Telegram:', response.data);
    }
  } catch (error) {
    console.error('   ❌ Lỗi gửi Telegram:', error.message);
    if (error.response) {
      console.error('      Chi tiết:', error.response.data);
    }
  }
}

async function notifyScanCompleted({ newDocumentCount, downloadedFileCount }) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('   ⚠️ Chưa cấu hình Telegram, bỏ qua gửi xác nhận quét');
    return;
  }

  const checkedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const result = newDocumentCount === 0
    ? 'Không phát hiện văn bản mới.'
    : `Phát hiện ${newDocumentCount} văn bản mới, đã tải ${downloadedFileCount} tệp.`;
  const message = `✅ *ĐÃ QUÉT VĂN BẢN*\n\n⏰ Thời gian: ${checkedAt}\n📋 ${result}`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      }
    );

    if (response.data && response.data.ok) {
      console.log('   ✅ Đã gửi xác nhận quét qua Telegram');
    } else {
      console.log('   ⚠️ Lỗi gửi xác nhận quét Telegram:', response.data);
    }
  } catch (error) {
    console.error('   ❌ Lỗi gửi xác nhận quét Telegram:', error.message);
  }
}

module.exports = { notifyNewVanBan, notifyScanCompleted };
