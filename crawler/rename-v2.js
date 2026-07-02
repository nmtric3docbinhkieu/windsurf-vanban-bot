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
const BOT_DIR = path.join(__dirname, '..');
const DATA_ROOT = process.env.VANBAN_DATA_ROOT
  ? path.resolve(process.env.VANBAN_DATA_ROOT)
  : path.join(BOT_DIR, '..');

// ✅ Dùng module đọc PDF dùng chung
const { readPDF } = require('./pdf-reader');

// ==================== CONFIG ====================

const CONFIG = {
  vanBanDenPath: path.join(DATA_ROOT, 'van-ban-den'),
  logPath      : path.join(DATA_ROOT, 'logs', 'processed-files.json'),
  manualPath   : path.join(DATA_ROOT, 'logs', 'need-manual.json'),
  dryRun       : process.argv.includes('--dry-run'),
  force        : process.argv.includes('--force'),
  compactOnly  : process.argv.includes('--compact-only'),
};

// ==================== PATTERNS ====================

const PATTERNS = {
  soHieu: [
    // Ưu tiên 1: Số: XXX/YYY/ZZZ (dòng Số ở đầu văn bản, đầy đủ)
    // Chỉ match trên cùng dòng với "Số:" (tránh match trong phần căn cứ)
    /S[ố][:\s]*([0-9Il]{1,4}\s*\/\s*[0-9Il]{4}\s*\/\s*[A-ZĐ0-9\-]+)/i,
    // Ưu tiên 2: Số: XXX/YYY (dạng ngắn hơn)
    /S[ố][:\s]*([0-9Il]{1,4}\s*\/\s*[A-ZĐ0-9\-]+)/i,
    // Ưu tiên 3: OCR pattern SXXXXXCODE-CODE (số hiệu ở dòng đầu, có thể thiếu dấu /)
    /S([0-9Il]{4,6})([A-ZĐ0-9\-]+)/i,
    // Fallback: số hiệu dạng đầy đủ - chỉ dùng khi KHÔNG có từ "Số:" trong text
    // để tránh match nhầm số hiệu trong phần căn cứ
  ],
  trichYeu: [
    // V/v hoặc Về việc
    /(?:V\/v|Về việc|V\/V)\s+([\s\S]{20,1000})/i,
    // QUYẾT ĐỊNH - lấy nội dung sau dòng QUYẾT ĐỊNH
    /QUYẾT\s+ĐỊNH\s+([\s\S]{20,1000})/i,
    // THÔNG TƯ, KẾ HOẠCH - lấy nội dung ngay sau tiêu đề (trước khi đến "Căn cứ")
    /(?:THÔNG\s+TƯ|KẾ\s+HOẠCH)\s+([\s\S]{10,300}?)(?=Căn\s+cứ|Theo|Theodore)/i,
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
  return str.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_').replace(/_+/g, '_').trim();
}

function shorten(text, maxWords = 10, maxChars = 80) {
  const words = text
    .replace(/[.,;:!?()]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  const finalWords = words.slice(0, maxWords);
  let compact = removeVietnameseTones(finalWords.join('_').toLowerCase());
  if (compact.length > maxChars) compact = compact.substring(0, maxChars);
  return compact.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function compactSoHieu(soHieu) {
  let s = sanitize((soHieu || '').replace(/\//g, '-').toUpperCase());
  s = s.replace(/^(VB-)+/, 'VB-');
  if (s.length > 35) s = s.substring(0, 35);
  return s || 'VB-KHONGSO';
}

function compactTrichYeu(text) {
  const base = removeVietnameseTones(String(text || ''))
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const stopWords = new Set(['vb', 'signed']);
  const words = base
    .split(' ')
    .filter(w => w.length > 1 && !stopWords.has(w));

  return sanitize(shorten(words.join(' '), 10, 75) || 'van_ban');
}

function parseFormattedFileName(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const match = base.match(/^(.*)_(\d{2}_\d{2}_20\d{2})$/);
  if (!match) return null;

  const left = match[1];
  const ngayBanHanh = match[2];
  const firstSep = left.indexOf('_');
  if (firstSep === -1) return null;

  return {
    soHieu: left.substring(0, firstSep),
    trichYeu: left.substring(firstSep + 1),
    ngayBanHanh,
    ext,
  };
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
  if (!CONFIG.force && !CONFIG.compactOnly && isAlreadyFormatted(fileName)) {
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
  // Chỉ tìm trong dòng đầu tiên có "Số:" để tránh match trong phần căn cứ
  const lines = text.split('\n');
  let soHieuLine = '';
  for (const line of lines) {
    if (line.includes('Số:')) {
      soHieuLine = line;
      break;
    }
  }

  // Nếu không tìm thấy dòng "Số:", thử tìm dòng có "Số" (cho OCR)
  if (!soHieuLine) {
    for (const line of lines) {
      if (line.includes('Số')) {
        soHieuLine = line;
        break;
      }
    }
  }

  for (const pattern of PATTERNS.soHieu) {
    const match = soHieuLine.match(pattern);
    if (match) {
      // Pattern 1 (đầy đủ): [full, soHieu] → "14/2026/TT-BKHCN"
      // Pattern 2 (OCR): [full, num, code] → "S61849BGDDT-GDPT" → "61849/BGDĐT-GDPT"
      if (match[2]) {
        // Pattern OCR: có 2 groups (num, code)
        let num = match[1].trim();
        const code = match[2].trim();
        // Chuyển chữ I/l thành số 1 (xử lý lỗi OCR)
        num = num.replace(/[Il]/g, '1');
        // Nếu số để trống, chỉ trả về code
        return num ? `${num}-${code}` : code;
      }
      // Pattern đầy đủ: chỉ có 1 group (soHieu)
      let soHieu = match[1].trim();
      // Chuyển chữ I/l thành số 1 (xử lý lỗi OCR)
      soHieu = soHieu.replace(/[Il]/g, '1');
      // Xóa khoảng trắng thừa trong số hiệu
      soHieu = soHieu.replace(/\s+/g, '');
      return soHieu.replace(/\//g, '-');
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
  // Chỉ tìm ngày ở phần đầu thể thức văn bản, cắt trước các marker nội dung.
  const rawHeader = text.substring(0, 2200);
  const markerPatterns = [/\n\s*Kính\s*gửi\s*:/i, /\n\s*Căn\s*cứ/i, /\n\s*QUYẾT\s+ĐỊNH/i, /\n\s*Điều\s+1/i, /\n\s*Nơi\s*nhận\s*:/i];
  let cutPos = rawHeader.length;
  for (const pattern of markerPatterns) {
    const idx = rawHeader.search(pattern);
    if (idx !== -1 && idx < cutPos) cutPos = idx;
  }
  const headerText = rawHeader.substring(0, cutPos);

  // 1) Mẫu chuẩn: "..., ngày 10 tháng 6 năm 2026"
  let match = headerText.match(/(?:^|[\n\r])[^\n\r,]{0,60},?\s*ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(20\d{2})/i);
  if (match) {
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${y}`;
    }
  }

  // 2) Mẫu số: "..., ngày 10/06/2026" hoặc "ngày 10-06-2026"
  match = headerText.match(/(?:^|[\n\r])[^\n\r,]{0,60},?\s*ngày\s*(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})\s*[\/\.\-]\s*(20\d{2})/i);
  if (match) {
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${y}`;
    }
  }

  // 3) Mẫu thiếu ngày: "..., ngày      tháng 6 năm 2026" -> mặc định ngày 01
  match = headerText.match(/(?:^|[\n\r])[^\n\r,]{0,60},?\s*ngày\s*tháng\s*(\d{1,2})\s*năm\s*(20\d{2})/i);
  if (match) {
    const [, m, y] = match;
    const month = parseInt(m, 10);
    if (month >= 1 && month <= 12) {
      return `01_${String(month).padStart(2, '0')}_${y}`;
    }
  }

  return null;
}

function extractSoHieuFromFileName(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  const normalized = removeVietnameseTones(base)
    .replace(/signed/gi, '')
    .replace(/\(\d+\)/g, '')
    .replace(/_+/g, '_')
    .trim();

  // Pattern ưu tiên: 2637-BGDDT-VP, 589-SGDDT-GDPT
  let match = normalized.match(/^(\d{2,5})[-_ ]([A-Za-z0-9-]{2,})/);
  if (match) {
    const num = match[1];
    const code = match[2].replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    if (code.length >= 2) return `${num}-${code}`;
  }

  // Pattern fallback: 844_08062026_... => lấy 844-VB
  match = normalized.match(/^(\d{2,5})[_-]/);
  if (match) {
    return `${match[1]}-VB`;
  }

  return null;
}

function extractNgayFromFileName(fileName) {
  const base = path.basename(fileName, path.extname(fileName));

  // ddmmyyyy trong tên file, ví dụ 08062026
  let match = base.match(/(?:^|[_\-\s])(\d{2})(\d{2})(20\d{2})(?:[_\-\s]|$)/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${dd}_${mm}_${yyyy}`;
    }
  }

  // dd_mm_yyyy hoặc dd-mm-yyyy trong tên file
  match = base.match(/(?:^|[_\-\s])(\d{1,2})[_\-](\d{1,2})[_\-](20\d{2})(?:[_\-\s]|$)/);
  if (match) {
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${y}`;
    }
  }

  return null;
}

function buildGenericSoHieu(fileName) {
  const base = path.basename(fileName, path.extname(fileName));
  const normalized = removeVietnameseTones(base)
    .replace(/\(\d+\)/g, '')
    .replace(/signed/gi, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  const code = normalized || 'KHONGSO';
  if (code.startsWith('VB-')) {
    return code.substring(0, 35);
  }
  return `VB-${code.substring(0, 32)}`;
}

function extractNgayFromFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const d = stats.mtime;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}_${mm}_${yyyy}`;
  } catch {
    return null;
  }
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
  const cleanSoHieu = compactSoHieu(info.soHieu);
  let shortTrichYeu = info.trichYeu ? compactTrichYeu(info.trichYeu) : 'van_ban';

  // Giới hạn độ dài tên file để dễ nhìn/dễ thao tác trên Windows.
  let fileName = `${cleanSoHieu}_${shortTrichYeu}_${info.ngayBanHanh}${ext}`;
  if (fileName.length > 150) {
    const overflow = fileName.length - 150;
    shortTrichYeu = shortTrichYeu.substring(0, Math.max(12, shortTrichYeu.length - overflow));
    fileName = `${cleanSoHieu}_${shortTrichYeu}_${info.ngayBanHanh}${ext}`;
  }
  return fileName;
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

  if (CONFIG.compactOnly) {
    const parsed = parseFormattedFileName(fileName);
    if (!parsed) {
      console.log('   ⏭️  Bỏ qua (chưa đúng format cũ để compact an toàn)');
      return null;
    }

    const info = {
      soHieu: parsed.soHieu,
      trichYeu: parsed.trichYeu,
      ngayBanHanh: parsed.ngayBanHanh,
    };

    const newName = buildNameStep(info, ext);
    if (newName === fileName) {
      console.log('   ⏭️  Đã gọn rồi');
      return null;
    }

    const newPath = path.join(CONFIG.vanBanDenPath, newName);
    if (fs.existsSync(newPath)) {
      console.log('   ⚠️  Tên gọn đã tồn tại, bỏ qua');
      return null;
    }

    console.log(`   ✅ ${newName}`);
    return { oldPath: filePath, newPath, fileName, newName, info };
  }

  try {
    const text       = await readFileStep(filePath, ext);
    let info       = extractStep(text);

    if (!info.soHieu) {
      const fallbackSoHieu = extractSoHieuFromFileName(fileName);
      if (fallbackSoHieu) {
        info.soHieu = fallbackSoHieu;
        console.log(`   ↪ So hieu fallback tu ten file: ${info.soHieu}`);
      }
    }

    if (!info.soHieu) {
      info.soHieu = buildGenericSoHieu(fileName);
      console.log(`   ↪ So hieu fallback tong quat: ${info.soHieu}`);
    }

    if (!info.ngayBanHanh) {
      const fallbackNgay = extractNgayFromFileName(fileName);
      if (fallbackNgay) {
        info.ngayBanHanh = fallbackNgay;
        console.log(`   ↪ Ngay BH fallback tu ten file: ${info.ngayBanHanh}`);
      }
    }

    if (!info.ngayBanHanh) {
      const fallbackNgayStats = extractNgayFromFileStats(filePath);
      if (fallbackNgayStats) {
        info.ngayBanHanh = fallbackNgayStats;
        console.log(`   ↪ Ngay BH fallback tu file mtime: ${info.ngayBanHanh}`);
      }
    }

    if (!info.trichYeu) {
      const base = path.basename(fileName, ext);
      info.trichYeu = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

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
