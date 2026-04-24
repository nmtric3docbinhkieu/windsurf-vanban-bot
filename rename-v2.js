/**
 * rename-v2.js - Script đổi tên văn bản v2
 *
 * Pipeline:
 *   1. Check  : bỏ qua file đã xử lý / đã đúng format
 *   2. Read   : đọc text (PDF thường / PDF ký số / PDF scan / DOCX)
 *   3. Extract: lấy số hiệu, ngày ban hành, trích yếu
 *   4. Validate: kiểm tra đủ thông tin chưa
 *   5. Rename : đổi tên theo format chuẩn
 *
 * Format tên: {soHieu}_{trichYeu}_{dd_mm_yyyy}.{ext}
 * Ví dụ     : 292-KH-SGDDT_chuyen_doi_so_nganh_giao_duc_30_03_2026.pdf
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const mammoth = require('mammoth');

// ✅ Dùng module đọc PDF dùng chung
const { readPDF } = require('./pdf-reader');

// ==================== CONFIG ====================

const CONFIG = {
  vanBanDenPath: path.join(__dirname, 'van-ban-den'),
  logPath      : path.join(__dirname, 'logs', 'processed-files.json'),
  manualPath   : path.join(__dirname, 'logs', 'need-manual.json'),
  dryRun       : process.argv.includes('--dry-run'),
  force        : process.argv.includes('--force'),
};

// ==================== PATTERNS ====================

const PATTERNS = {
  soHieu: [
    // OCR pattern: S61849BGDDT-GDPT (số hiệu ở dòng đầu, có thể thiếu dấu /)
    /S(\d{4,6})([A-ZĐ0-9\-]+)/i,
    // Số: 292 /KH-SGDĐT  (có khoảng trắng trước / — đặc trưng PDF ký số)
    /Số[:\s]*\s*(\d{0,4})\s*\/\s*([A-ZĐ0-9][A-ZĐ0-9\-]*)/i,
    // Fallback: số hiệu dạng đầy đủ không có từ "Số"
    /(\d{2,4}\/[A-ZĐ0-9\-]+(?:-[A-ZĐ0-9]+)*)/,
  ],
  trichYeu: [
    // V/v hoặc Về việc
    /(?:V\/v|Về việc|V\/V)\s+([\s\S]{20,1000})/i,
    // QUYẾT ĐỊNH - lấy nội dung sau dòng QUYẾT ĐỊNH
    /QUYẾT\s+ĐỊNH\s+([\s\S]{20,1000})/i,
  ],
  ngayThang: [
    // Ưu tiên: "ngày 30 tháng 3 năm 2026"
    /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(20\d{2})/gi,
    // Fallback: 30/03/2026 hoặc 30.03.2026
    /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/g,
  ],
};

// ==================== UTILS ====================

function loadJson(filePath, defaultVal = {}) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {}
  return defaultVal;
}

function saveJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function sanitize(str) {
  return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').trim();
}

function shorten(text, maxWords = 20) {
  const words = text
    .replace(/[.,;:!?()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  const finalWords = words.length <= 15 ? words : words.slice(0, maxWords);
  return removeVietnameseTones(finalWords.join('_').toLowerCase());
}

// ==================== STEP 1: CHECK ====================

function isAlreadyFormatted(fileName) {
  return /^\d{2,4}-[A-ZĐ0-9\-]+_.*\d{2}_\d{2}_20\d{2}\.(pdf|docx|doc)$/i.test(fileName);
}

function shouldSkip(fileName, processed) {
  if (!CONFIG.force && processed[fileName]) {
    console.log(`⏭️  Đã xử lý: ${fileName}`);
    return true;
  }
  if (!CONFIG.force && isAlreadyFormatted(fileName)) {
    console.log(`⏭️  Đã chuẩn: ${fileName}`);
    processed[fileName] = { formatted: true, skippedAt: new Date().toISOString() };
    return true;
  }
  return false;
}

// ==================== STEP 2: READ ====================

async function readFileStep(filePath, ext) {
  const extLower = ext.toLowerCase();

  if (extLower === '.pdf') {
    // headerOnly = true: chỉ cần trang 1 để lấy số hiệu + ngày → nhanh hơn
    const result = await readPDF(filePath, { headerOnly: true });
    console.log(`   📖 Đọc bằng: ${result.method.toUpperCase()}`);
    return result.text;
  }

  if (extLower === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (extLower === '.doc') {
    throw new Error('DOC cần chuyển sang DOCX trước');
  }

  throw new Error(`Không hỗ trợ: ${ext}`);
}

// ==================== STEP 3: EXTRACT ====================

function extractSoHieu(text) {
  const headerText = text.substring(0, 500);

  for (const pattern of PATTERNS.soHieu) {
    const match = headerText.match(pattern);
    if (match) {
      // Pattern OCR: [full, num, code] → "S61849BGDDT-GDPT" → "61849/BGDĐT-GDPT"
      // Pattern Số: [full, num, code] → "292/KH-SGDĐT" hoặc "/KH-SGDĐT"
      // Pattern fallback: [full, soHieu] → "292/KH-SGDĐT"
      if (match[2]) {
        const num = match[1].trim();
        const code = match[2].trim();
        // Nếu số để trống, chỉ trả về code
        return num ? `${num}/${code}` : code;
      }
      return match[1];
    }
  }
  return null;
}

function extractTrichYeu(text) {
  for (const pattern of PATTERNS.trichYeu) {
    const match = text.match(pattern);
    if (match) {
      const result = match[1].trim();
      return result.length > 200 ? result.substring(0, 200) : result;
    }
  }
  return null;
}

function extractNgay(text) {
  // Ưu tiên tìm trong 800 ký tự đầu (tránh bắt nhầm ngày trong nội dung)
  const headerText = text.substring(0, 800);

  for (const pattern of PATTERNS.ngayThang) {
    const matches = [...headerText.matchAll(pattern)];
    for (const match of matches) {
      const [, day, month, year] = match;
      const y = parseInt(year);
      if (y >= 2020 && y <= 2035) {
        return `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${year}`;
      }
    }
  }

  // Fallback: tìm toàn văn bản
  for (const pattern of PATTERNS.ngayThang) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const [, day, month, year] = match;
      const y = parseInt(year);
      if (y >= 2020 && y <= 2035) {
        return `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${year}`;
      }
    }
  }

  return null;
}

function extractStep(text) {
  return {
    soHieu     : extractSoHieu(text),
    trichYeu   : extractTrichYeu(text),
    ngayBanHanh: extractNgay(text),
  };
}

// ==================== STEP 4: VALIDATE ====================

function validateStep(info) {
  const missing = [];
  if (!info.soHieu)      missing.push('số hiệu');
  if (!info.ngayBanHanh) missing.push('ngày BH');
  return { valid: missing.length === 0, missing };
}

// ==================== STEP 5: BUILD NAME ====================

function buildNameStep(info, ext) {
  const cleanSoHieu   = sanitize(info.soHieu.replace(/\//g, '-'));
  const shortTrichYeu = info.trichYeu ? shorten(info.trichYeu) : 'van_ban';
  return `${cleanSoHieu}_${shortTrichYeu}_${info.ngayBanHanh}${ext}`;
}

// ==================== MAIN PIPELINE ====================

/**
 * Tìm file PDF tương ứng với file DOCX
 * Ưu tiên: cùng tên chính xác, khác extension
 * Fallback: cùng prefix (trước phần ngày _dd_mm_yyyy)
 */
function findMatchingPdf(docxPath) {
  const dir = path.dirname(docxPath);
  const baseName = path.basename(docxPath, '.docx');

  // Ưu tiên 1: cùng tên chính xác
  const exactPdfPath = path.join(dir, baseName + '.pdf');
  if (fs.existsSync(exactPdfPath)) return exactPdfPath;

  // Ưu tiên 2: cùng prefix (trước phần ngày _dd_mm_yyyy)
  const prefixMatch = baseName.match(/^(.+?)_\d{2}_\d{2}_20\d{2}$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const files = fs.readdirSync(dir);
    const matchingPdf = files.find(f =>
      f.startsWith(prefix) && f.endsWith('.pdf')
    );
    if (matchingPdf) return path.join(dir, matchingPdf);
  }

  return null;
}

async function processFile(filePath, processed, manual, pdfInfoCache = {}) {
  const fileName = path.basename(filePath);
  const ext      = path.extname(filePath);

  if (shouldSkip(fileName, processed)) return null;

  console.log(`\n📄 ${fileName}`);

  try {
    const text       = await readFileStep(filePath, ext);
    let info       = extractStep(text);

    // Nếu là DOCX và số hiệu không có số ở đầu (dạng SGDĐT-TCCB thay vì 123/SGDĐT-TCCB), thử lấy từ file PDF tương ứng
    if (ext.toLowerCase() === '.docx' && info.soHieu && !/^\d+\/[A-ZĐ0-9\-]+$/i.test(info.soHieu)) {
      const pdfPath = findMatchingPdf(filePath);
      if (pdfPath) {
        console.log(`   🔗 Tìm file PDF tương ứng: ${path.basename(pdfPath)}`);
        // Kiểm tra cache trước
        if (pdfInfoCache[pdfPath]) {
          info.soHieu = pdfInfoCache[pdfPath].soHieu;
          console.log(`   ✅ Lấy số hiệu từ cache: ${info.soHieu}`);
        } else {
          try {
            const pdfText = await readFileStep(pdfPath, '.pdf');
            const pdfInfo = extractStep(pdfText);
            if (pdfInfo.soHieu) {
              info.soHieu = pdfInfo.soHieu;
              pdfInfoCache[pdfPath] = pdfInfo;
              console.log(`   ✅ Lấy số hiệu từ PDF: ${info.soHieu}`);
            }
          } catch (err) {
            console.log(`   ⚠️  Không đọc được PDF: ${err.message}`);
          }
        }
      }
    }

    console.log(`   Số hiệu : ${info.soHieu       || '❓'}`);
    console.log(`   Ngày BH : ${info.ngayBanHanh   || '❓'}`);
    console.log(`   Trích yếu: ${info.trichYeu ? info.trichYeu.substring(0, 60) + '...' : '❓'}`);

    const validation = validateStep(info);
    if (!validation.valid) {
      console.log(`   ⚠️  Thiếu: ${validation.missing.join(', ')}`);
      manual.push({ file: fileName, reason: `Thiếu: ${validation.missing.join(', ')}`, extracted: info, timestamp: new Date().toISOString() });
      return null;
    }

    const newName = buildNameStep(info, ext);
    const newPath = path.join(CONFIG.vanBanDenPath, newName);

    if (fs.existsSync(newPath)) {
      console.log(`   ⚠️  Tên đã tồn tại`);
      manual.push({ file: fileName, reason: 'Tên mới đã tồn tại', suggested: newName, timestamp: new Date().toISOString() });
      return null;
    }

    console.log(`   ✅ ${newName}`);
    return { oldPath: filePath, newPath, fileName, newName, info };

  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    manual.push({ file: fileName, reason: 'Lỗi đọc file', error: err.message, timestamp: new Date().toISOString() });
    return null;
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('=== 🔄 RENAME V2 ===\n');

  const processed = loadJson(CONFIG.logPath, {});
  const manual    = loadJson(CONFIG.manualPath, []);

  const files = fs.readdirSync(CONFIG.vanBanDenPath)
    .filter(f => /\.(pdf|docx|doc)$/i.test(f))
    .map(f => path.join(CONFIG.vanBanDenPath, f));

  console.log(`Tìm thấy ${files.length} file\n`);

  const toRename = [];
  const pdfInfoCache = {}; // Cache thông tin PDF để DOCX lấy số hiệu

  for (const filePath of files) {
    const result = await processFile(filePath, processed, manual, pdfInfoCache);
    if (result) toRename.push(result);
  }

  console.log('\n=== 📊 TỔNG KẾT ===');
  console.log(`✅ Sẵn sàng          : ${toRename.length}`);
  console.log(`⚠️  Cần xử lý thủ công: ${manual.filter(m => !m.resolved).length}`);

  if (toRename.length === 0) {
    console.log('\nKhông có file mới cần xử lý.');
    saveJson(CONFIG.manualPath, manual);
    saveJson(CONFIG.logPath, processed);
    return;
  }

  console.log('\n--- File sẽ đổi tên ---');
  toRename.forEach((r, i) => console.log(`${i + 1}. ${r.fileName} → ${r.newName}`));

  if (!CONFIG.dryRun) {
    console.log('\n🔄 Đang đổi tên...');
    for (const r of toRename) {
      try {
        fs.renameSync(r.oldPath, r.newPath);
        console.log(`✅ ${r.newName}`);
        processed[r.fileName] = { newName: r.newName, info: r.info, processedAt: new Date().toISOString() };
      } catch (err) {
        console.log(`❌ Lỗi: ${r.fileName} - ${err.message}`);
      }
    }
    saveJson(CONFIG.logPath, processed);
  } else {
    console.log('\n⚠️  Dry-run: Chưa đổi tên thật');
  }

  saveJson(CONFIG.manualPath, manual);
  console.log('\n=== ✅ HOÀN TẤT ===');
}

main().catch(console.error);
