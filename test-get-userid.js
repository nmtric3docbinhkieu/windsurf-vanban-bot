const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const OA_ACCESS_TOKEN = process.env.ZALO_OA_TOKEN;

async function getUserId() {
  if (!OA_ACCESS_TOKEN) {
    console.log('❌ Chưa có ZALO_OA_TOKEN trong .env');
    return;
  }

  console.log('🔍 Đang lấy danh sách followers...\n');

  try {
    const response = await axios.get(
      'https://openapi.zalo.me/v3.0/oa/user/getlist',
      {
        params: {
          data: JSON.stringify({
            offset: 0,
            count: 10,
            user_type: 'follower'
          })
        },
        headers: {
          'access_token': OA_ACCESS_TOKEN
        }
      }
    );

    if (response.data.error === 0) {
      const users = response.data.data?.users || [];
      console.log(`✅ Tìm thấy ${users.length} follower(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`--- Người dùng ${index + 1} ---`);
        console.log(`User ID: ${user.user_id}`);
        console.log(`Tên: ${user.display_name}`);
        console.log(`Avatar: ${user.avatar}`);
        console.log('');
      });

      if (users.length > 0) {
        console.log(`📝 Copy User ID đầu tiên vào .env: ZALO_USER_ID=${users[0].user_id}`);
      }
    } else {
      console.log('❌ Lỗi API:', response.data);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    if (error.response) {
      console.error('Chi tiết:', error.response.data);
    }
  }
}

getUserId();
