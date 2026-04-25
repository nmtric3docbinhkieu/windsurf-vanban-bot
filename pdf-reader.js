/**
 * pdf-reader.js - Module đọc PDF dùng chung cho toàn dự án
 *
 * Hỗ trợ 3 loại:
 *   1. PDF thường       → pdftotext (nhanh, chính xác)
 *   2. PDF ký số        → pdftotext (vẫn đọc được nhờ poppler)
 *   3. PDF scan (ảnh)   → pdftoppm + tesseract OCR
 *
 * Yêu cầu cài ở cấp hệ thống (không phải npm):
 *   - poppler-utils : pdftotext, pdftoppm
 *   - tesseract-ocr : tesseract
 *   - tesseract-ocr-vie : gói tiếng Việt cho tesseract
 *
 * Cài trên Windows:
 *   - poppler  : https://github.com/oschwartz10612/poppler-windows (giải nén, thêm vào PATH)
 *   - tesseract: https://github.com/UB-Mannheim/tesseract/wiki (cài .exe, chọn Vietnamese data)
 *
 * Cài trên Ubuntu/Debian:
 *   sudo apt install poppler-utils tesseract-ocr tesseract-ocr-vie
 *
 * Cài trên Mac:
 *   brew install poppler tesseract tesseract-lang
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFile } = require('child_process');

// ==================== CONFIG ====================

const OCR_CONFIG = {
  // Ngôn ngữ OCR: tiếng Việt + tiếng Anh (fallback)
  lang: 'vie+eng',

  // Độ phân giải render PDF → ảnh (DPI)
  // 200 = nhanh, 300 = cân bằng (khuyến nghị), 400 = chậm nhưng chính xác hơn
  dpi: 300,

  // Ngưỡng text tối thiểu để coi là "đọc được" (không phải scan)
  // Nếu pdftotext trả về ít hơn ngưỡng này → chuyển sang OCR
  minTextLength: 50,

  // Timeout mỗi lệnh (ms)
  timeout: 60000,
};

// ==================== HELPERS ====================

/**
 * Chạy một lệnh shell, trả về stdout dạng Promise
 */
function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: OCR_CONFIG.timeout, ...options }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`[${cmd}] ${err.message}${stderr ? '\n' + stderr : ''}`));
      }
      resolve(stdout);
    });
  });
}

/**
 * Tạo thư mục tạm, trả về đường dẫn
 */
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-reader-'));
}

/**
 * Xóa thư mục tạm (dọn dẹp sau OCR)
 */
function removeTempDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (_) {}
}

// ==================== CORE FUNCTIONS ====================

/**
 * Đọc PDF thường hoặc PDF ký số bằng pdftotext
 * Trả về text hoặc '' nếu thất bại
 */
async function readWithPdftotext(filePath) {
  try {
    // -layout : giữ layout gốc (quan trọng cho văn bản 2 cột như văn bản hành chính VN)
    // -enc UTF-8: đảm bảo tiếng Việt đúng encoding
    // '-'      : xuất ra stdout thay vì file
    const text = await run('pdftotext', ['-layout', '-enc', 'UTF-8', filePath, '-']);
    return text.trim();
  } catch (err) {
    console.warn(`   ⚠️  pdftotext thất bại: ${err.message}`);
    return '';
  }
}

/**
 * OCR một trang PDF bằng pdftoppm + tesseract
 * @param {string} filePath - Đường dẫn file PDF
 * @param {number} page     - Số trang (bắt đầu từ 1)
 * @returns {Promise<string>} Text OCR của trang đó
 */
async function ocrPage(filePath, page, tempDir) {
  const prefix = path.join(tempDir, `page-${page}`);

  // Bước 1: Render trang PDF → ảnh PNG
  // -png     : xuất PNG (chất lượng tốt hơn JPEG cho OCR)
  // -r {dpi} : độ phân giải
  // -f/-l    : từ trang / đến trang
  await run('pdftoppm', [
    '-png',
    '-r', String(OCR_CONFIG.dpi),
    '-f', String(page),
    '-l', String(page),
    filePath,
    prefix,
  ]);

  // Tìm file ảnh vừa tạo (pdftoppm đặt tên dạng page-1-000001.png)
  const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`page-${page}-`) && f.endsWith('.png'));
  if (files.length === 0) throw new Error(`Không tìm thấy ảnh trang ${page}`);

  const imagePath = path.join(tempDir, files[0]);
  const outputBase = path.join(tempDir, `ocr-${page}`);

  // Bước 2: Tesseract OCR ảnh → text
  // -l vie+eng : tiếng Việt + tiếng Anh
  // --psm 1    : tự động phát hiện chiều trang + OSD (tốt cho văn bản nhiều cột)
  // txt        : xuất ra file .txt
  await run('tesseract', [
    imagePath,
    outputBase,
    '-l', OCR_CONFIG.lang,
    '--psm', '1',
    'txt',
  ]);

  const txtPath = outputBase + '.txt';
  const text = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf8') : '';
  return text.trim();
}

/**
 * Đếm số trang của file PDF
 */
async function countPages(filePath) {
  try {
    // pdfinfo trả về dòng "Pages: N"
    const info = await run('pdfinfo', [filePath]);
    const match = info.match(/Pages:\s*(\d+)/i);
    return match ? parseInt(match[1]) : 1;
  } catch {
    return 1; // fallback: giả sử 1 trang
  }
}

/**
 * OCR toàn bộ file PDF scan
 * @param {string} filePath  - Đường dẫn file PDF
 * @param {object} options
 * @param {number} [options.maxPages]    - Giới hạn số trang (undefined = tất cả)
 * @param {function} [options.onProgress] - Callback(trangHienTai, tongTrang)
 * @returns {Promise<string>} Toàn bộ text OCR
 */
async function readWithOCR(filePath, options = {}) {
  const tempDir = makeTempDir();

  try {
    const totalPages = await countPages(filePath);
    const maxPages = options.maxPages || totalPages;
    const pagesToRead = Math.min(totalPages, maxPages);

    console.log(`   🔍 OCR: ${pagesToRead}/${totalPages} trang (${OCR_CONFIG.dpi}dpi)`);

    const pageTexts = [];

    for (let page = 1; page <= pagesToRead; page++) {
      if (options.onProgress) options.onProgress(page, pagesToRead);
      else console.log(`   📄 OCR trang ${page}/${pagesToRead}...`);

      try {
        const text = await ocrPage(filePath, page, tempDir);
        pageTexts.push(text);
      } catch (err) {
        console.warn(`   ⚠️  OCR trang ${page} thất bại: ${err.message}`);
        pageTexts.push(''); // vẫn giữ chỗ để đúng thứ tự trang
      }
    }

    return pageTexts.join('\n\n--- Trang tiếp theo ---\n\n').trim();

  } finally {
    removeTempDir(tempDir);
  }
}

// ==================== PUBLIC API ====================

/**
 * Đọc nội dung text của file PDF (tự động chọn phương pháp phù hợp)
 *
 * @param {string} filePath - Đường dẫn file PDF
 * @param {object} options
 * @param {boolean} [options.forceOCR=false]  - Bỏ qua pdftotext, OCR luôn
 * @param {number}  [options.maxPages]        - Giới hạn số trang OCR (undefined = tất cả)
 * @param {boolean} [options.headerOnly=false] - Chỉ đọc trang 1 (dùng cho đổi tên file)
 * @param {function} [options.onProgress]     - Callback tiến độ OCR(trang, tổng)
 *
 * @returns {Promise<{ text: string, method: 'pdftotext'|'ocr', pages: number }>}
 */
async function readPDF(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File không tồn tại: ${filePath}`);
  }

  // Nếu chỉ cần header (đổi tên file) → giới hạn 1 trang
  const effectiveOptions = options.headerOnly
    ? { ...options, maxPages: 1 }
    : options;

  // Bước 1: Thử pdftotext trước (nhanh, không mất tài nguyên)
  if (!options.forceOCR) {
    const text = await readWithPdftotext(filePath);

    if (text.length >= OCR_CONFIG.minTextLength) {
      // Kiểm tra xem text có chứa pattern số hiệu đầy đủ hay không
      // Pattern phải có dạng: Số: XXX/YYY hoặc XXX/YYY (có số và mã)
      const hasSoHieu = /Số[:\s]*\s*\d+\/[A-ZĐ0-9\-]+|\d{2,4}\/[A-ZĐ0-9\-]+/i.test(text);
      
      if (hasSoHieu) {
        // Nếu headerOnly thì chỉ lấy text trước dấu phân trang đầu tiên
        const finalText = options.headerOnly
          ? text.split('\f')[0].trim()
          : text;

        return { text: finalText, method: 'pdftotext', pages: null };
      } else {
        console.log(`   ℹ️  Text không chứa số hiệu (${text.length} ký tự) → chuyển sang OCR`);
      }
    } else {
      console.log(`   ℹ️  Text quá ngắn (${text.length} ký tự) → chuyển sang OCR`);
    }
  }

  // Bước 2: OCR (PDF scan hoặc forceOCR)
  const text = await readWithOCR(filePath, effectiveOptions);
  const pages = effectiveOptions.maxPages || null;

  return { text, method: 'ocr', pages };
}

// ==================== EXPORTS ====================

module.exports = {
  readPDF,

  // Export riêng cho trường hợp muốn kiểm soát thủ công
  readWithPdftotext,
  readWithOCR,
  countPages,
  OCR_CONFIG,
};
