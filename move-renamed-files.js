/**
 * move-renamed-files.js - Chuyển file đã đổi tên thành công sang thư mục mới
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG = {
  vanBanDenPath: path.join(__dirname, '..', 'van-ban-den'),
  targetPath: path.join(__dirname, '..', 'van-ban-den-da-doi-ten'),
  logPath: path.join(__dirname, '..', 'logs', 'processed-files.json'),
};

// Kiểm tra file đã đúng format
function isAlreadyFormatted(fileName) {
  // Format chuẩn: có số hiệu ở đầu + ngày tháng năm ở cuối
  const standardFormat = /^\d{2,4}-[A-ZĐ0-9\-]+_.*\d{2}_\d{2}_20\d{2}\.(pdf|docx|doc)$/i.test(fileName);
  
  // Format DOCX ký số: không cần số hiệu, chỉ cần có ngày tháng năm ở cuối
  const docxSignedFormat = fileName.toLowerCase().endsWith('.docx') &&
    /_\d{2}_\d{2}_20\d{2}\.docx$/i.test(fileName);
  
  return standardFormat || docxSignedFormat;
}

function main() {
  console.log('=== 🔄 CHUYỂN FILE ĐÃ ĐỔI TÊN ===\n');

  // Tạo thư mục đích nếu chưa có
  if (!fs.existsSync(CONFIG.targetPath)) {
    fs.mkdirSync(CONFIG.targetPath, { recursive: true });
    console.log(`✅ Tạo thư mục: ${CONFIG.targetPath}\n`);
  }

  // Đọc file log để biết các file đã xử lý thành công
  const processed = {};
  try {
    if (fs.existsSync(CONFIG.logPath)) {
      const logData = JSON.parse(fs.readFileSync(CONFIG.logPath, 'utf8'));
      Object.assign(processed, logData);
    }
  } catch (err) {
    console.log(`⚠️  Không đọc được file log: ${err.message}\n`);
  }

  // Lấy danh sách file trong thư mục van-ban-den
  const files = fs.readdirSync(CONFIG.vanBanDenPath)
    .filter(f => /\.(pdf|docx|doc)$/i.test(f));

  console.log(`Tìm thấy ${files.length} file trong van-ban-den\n`);

  // Tìm các file đã đổi tên thành công
  const renamedFiles = [];
  for (const fileName of files) {
    // Kiểm tra 1: Có trong log processed
    if (processed[fileName] && processed[fileName].newName) {
      renamedFiles.push(fileName);
      continue;
    }

    // Kiểm tra 2: Đã đúng format
    if (isAlreadyFormatted(fileName)) {
      renamedFiles.push(fileName);
    }
  }

  console.log(`Tìm thấy ${renamedFiles.length} file đã đổi tên thành công\n`);

  if (renamedFiles.length === 0) {
    console.log('Không có file nào cần chuyển.');
    return;
  }

  console.log('--- Danh sách file sẽ chuyển ---');
  renamedFiles.forEach((f, i) => console.log(`${i + 1}. ${f}`));

  // Chuyển file sang thư mục mới
  console.log('\n🔄 Đang chuyển file...');
  let successCount = 0;
  let errorCount = 0;

  for (const fileName of renamedFiles) {
    const srcPath = path.join(CONFIG.vanBanDenPath, fileName);
    const destPath = path.join(CONFIG.targetPath, fileName);

    try {
      fs.renameSync(srcPath, destPath);
      console.log(`✅ ${fileName}`);
      successCount++;
    } catch (err) {
      console.log(`❌ ${fileName} - ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n=== 📊 TỔNG KẾT ===');
  console.log(`✅ Thành công: ${successCount}`);
  console.log(`❌ Lỗi     : ${errorCount}`);
  console.log('\n=== ✅ HOÀN TẤT ===');
}

main();
