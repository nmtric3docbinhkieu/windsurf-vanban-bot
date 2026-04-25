const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { notifyNewVanBan: notifyTelegram } = require('./telegram-notify');

const USERNAME = '087086001224';
const PASSWORD = 'Dongthap@123';

// Hàm load danh sách van ban da xu ly
function loadVanBanDaXuLy() {
  try {
    const logsPath = path.join(__dirname, '..', 'logs', 'van_ban_den_2025_2026.json');
    if (fs.existsSync(logsPath)) {
      const data = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      const soHieuSet = new Set();
      data.danh_sach_van_ban.forEach(vb => {
        soHieuSet.add(vb.so_hieu);
      });
      console.log(`   Da load ${soHieuSet.size} van ban da xu ly`);
      return soHieuSet;
    }
  } catch (error) {
    console.log('   Loi khi load logs, bat dau voi danh sach rong:', error.message);
  }
  return new Set();
}

// Hàm luu van ban moi vao logs
async function saveVanBanMoi(thongTinVanBan) {
  try {
    const logsPath = path.join(__dirname, '..', 'logs', 'van_ban_den_2025_2026.json');
    let data = { tong_so_van_ban: 0, ngay_xuat_du_lieu: new Date().toISOString().split('T')[0], nguon: "Hệ thống QLVBĐH tỉnh Đồng Tháp - Tab Chờ duyệt", danh_sach_van_ban: [] };
    
    if (fs.existsSync(logsPath)) {
      data = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
    }
    
    // Kiem tra trung lap
    const tonTai = data.danh_sach_van_ban.some(vb => vb.so_hieu === thongTinVanBan.so_hieu);
    if (!tonTai) {
      // Thêm văn bản mới vào ĐẦU danh sách để dễ xem
      data.danh_sach_van_ban.unshift(thongTinVanBan);
      data.tong_so_van_ban = data.danh_sach_van_ban.length;
      
      fs.writeFileSync(logsPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`   Da luu van ban moi: ${thongTinVanBan.so_hieu}`);
      
      // Gửi thông báo qua Telegram
      await notifyTelegram(thongTinVanBan);
      
      return true;
    }
  } catch (error) {
    console.error('   Loi khi luu logs:', error.message);
  }
  return false;
}

async function crawlAndDownload() {
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('1. Chuẩn bị thư mục download...');
    const downloadsDir = path.join(__dirname, '..', 'van-ban-den');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Load danh sach van ban da xu ly
    const vanBanDaXuLy = loadVanBanDaXuLy();
    
    console.log('2. Đăng nhập...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Đăng nhập nhanh - dùng evaluate cho nhanh
    console.log('   Đăng nhập nhanh...');
    await page.evaluate(({ username, password }) => {
      // Tìm các input
      const inputs = document.querySelectorAll('input');
      let usernameInput = null;
      let passwordInput = null;
      
      for (const input of inputs) {
        if (input.placeholder && input.placeholder.includes('Công dân')) {
          usernameInput = input;
        } else if (input.type === 'password') {
          passwordInput = input;
        }
      }
      
      if (usernameInput) usernameInput.value = username;
      if (passwordInput) passwordInput.value = password;
      
      // Tìm nút submit
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (!submitBtn) {
        // Thu tim nut theo text
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || btn.innerText || '';
          if (text.includes('Đăng nhập') || text.includes('Login')) {
            btn.click();
            break;
          }
        }
      } else {
        submitBtn.click();
      }
    }, { username: USERNAME, password: PASSWORD });
    await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('3. Quét danh sách văn bản trong tab "Chờ duyệt"...');
    
    // Đợi data load - Material table thường load động
    console.log('   Đợi data load...');
    await page.waitForTimeout(3000);
    
    // Chụp màn hình để debug
    await page.screenshot({ path: 'debug-table.png', fullPage: true });
    console.log('   Đã chụp màn hình table: debug-table.png');
    
    // Đợi table hoặc Material table
    try {
      await page.waitForSelector('table, mat-table, .mat-mdc-table', { timeout: 10000 });
    } catch (e) {
      console.log('   Không tìm thấy table, thử đợi thêm...');
      await page.waitForTimeout(2000);
    }
    
    // Debug: Xem nội dung trang
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        tableCount: document.querySelectorAll('table').length,
        hasVanBan: document.body.textContent.includes('SGDĐT'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('   Page info:', pageContent);
    
    // Dùng evaluate để quét table nhanh - thử nhiều cách
    const vanBanData = await page.evaluate(() => {
      const vanBans = [];
      
      // Cách 1: Tìm Material table rows
      const matRows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"]');
      
      for (const row of matRows) {
        const rowText = row.textContent || row.innerText || '';
        
        // Tìm số hiệu văn bản - Ưu tiên pattern đầy đủ nhất
        let soHieuMatch = rowText.match(/\d+\/SGDĐT-[\w-]+/);  // 1107/SGDĐT-VP
        if (!soHieuMatch) {
          soHieuMatch = rowText.match(/\d+\/[\wÀ-Ỷà-ỷ]+-[\wÀ-Ỷà-ỷ-]+/);  // Pattern tiếng Việt
        }
        if (!soHieuMatch) {
          soHieuMatch = rowText.match(/\d+\/[\w-]+-[\w-]+/);  // Pattern chung
        }
        // KHONG dùng pattern ngắn (\d+\/[\w-]+/) vì nó cắt số hiệu
        
        if (soHieuMatch) {
          const soHieu = soHieuMatch[0];
          
          // Tìm thông tin trong row
          const cells = row.querySelectorAll('.mat-mdc-cell, mat-cell, td');
          let trichYeu = '';
          let ngayBanHanh = '';
          let coQuan = '';
          let linkElement = null;
          
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent || cells[i].innerText || '';
            const link = cells[i].querySelector('a');
            
            if (link && !linkElement) {
              linkElement = link;
              // Chỉ lấy text từ link, không lấy toàn bộ cell content
              trichYeu = (link.textContent || link.innerText || '').trim();
            }
            
            const dateMatch = cellText.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dateMatch) ngayBanHanh = dateMatch[0];
            
            if (cellText.includes('Sở Giáo dục') || cellText.includes('SGDĐT')) {
              coQuan = cellText.trim();
            }
          }
          
          // Lấy trích yếu đúng - tìm cell có nội dung tiếng Việt có nghĩa
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent || cells[i].innerText || '';
            const cleanText = cellText.trim();
            
            // Bỏ qua các cell không phải trích yếu
            if (!cleanText.match(/^\d+\//) && 
                !cleanText.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                !cleanText.includes('Sở Giáo dục') &&
                !cleanText.match(/^[A-Z]{2,4}$/)) {
              
              // Tìm cell có nội dung trích yếu thực sự
              if ((cleanText.startsWith('V/v') || 
                   cleanText.startsWith('Hội nghị') || 
                   cleanText.startsWith('Về việc') || 
                   cleanText.startsWith('Thông báo') ||
                   cleanText.startsWith('Chỉ đạo') || 
                   cleanText.startsWith('Kế hoạch') ||
                   cleanText.startsWith('Hướng dẫn') || 
                   cleanText.startsWith('Tổ chức') ||
                   cleanText.startsWith('Quyết định') ||
                   cleanText.includes('về việc') ||
                   cleanText.length > 20) && 
                  !cleanText.match(/^\d+[\/-]/)) {
                
                trichYeu = cleanText;
                break;
              }
            }
          }
          
          // Fallback: tìm cell dài nhất không phải số hiệu/ngày/cơ quan
          if (!trichYeu) {
            let longestText = '';
            for (let i = 0; i < cells.length; i++) {
              const cellText = cells[i].textContent || cells[i].innerText || '';
              const cleanText = cellText.trim();
              
              // Bỏ qua các cell không phải trích yếu
              if (!cleanText.match(/^\d+\//) && 
                  !cleanText.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                  !cleanText.includes('Sở Giáo dục') &&
                  !cleanText.match(/^[A-Z]{2,4}$/) &&
                  cleanText.length > longestText.length &&
                  cleanText.length > 10) {
                longestText = cleanText;
              }
            }
            trichYeu = longestText;
          }
          
          vanBans.push({
            soHieu,
            trichYeu,
            ngayBanHanh,
            coQuan,
            hasLink: !!linkElement,
            element: row
          });
        }
      }
      
      // Cách 2: Nếu không tìm thấy, thử table thường
      if (vanBans.length === 0) {
        const tables = document.querySelectorAll('table');
        
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          
          for (const row of rows) {
            const rowText = row.textContent || row.innerText || '';
            
            // Tìm số hiệu văn bản - Ưu tiên pattern đầy đủ nhất
            let soHieuMatch = rowText.match(/\d+\/SGDĐT-[\w-]+/);  // 1107/SGDĐT-VP
            if (!soHieuMatch) {
              soHieuMatch = rowText.match(/\d+\/[\wÀ-Ỷà-ỷ]+-[\wÀ-Ỷà-ỷ-]+/);  // Pattern tiếng Việt
            }
            if (!soHieuMatch) {
              soHieuMatch = rowText.match(/\d+\/[\w-]+-[\w-]+/);  // Pattern chung
            }
            // KHONG dùng pattern ngắn (\d+\/[\w-]+/) vì nó cắt số hiệu
            
            if (soHieuMatch) {
              const soHieu = soHieuMatch[0];
              
              const cells = row.querySelectorAll('td, th');
              let trichYeu = '';
              let ngayBanHanh = '';
              let coQuan = '';
              let linkElement = null;
              
              for (let i = 0; i < cells.length; i++) {
                const cellText = cells[i].textContent || cells[i].innerText || '';
                const link = cells[i].querySelector('a');

                if (link && !linkElement) {
                  linkElement = link;
                  // Chỉ lấy text từ link, không lấy toàn bộ cell content
                  trichYeu = (link.textContent || link.innerText || '').trim();
                }

                const dateMatch = cellText.match(/\d{2}\/\d{2}\/\d{4}/);
                if (dateMatch) ngayBanHanh = dateMatch[0];

                if (cellText.includes('Sở Giáo dục') || cellText.includes('SGDĐT')) {
                  coQuan = cellText.trim();
                }
              }

              // Lấy trích yếu đúng - tìm cell có nội dung tiếng Việt có nghĩa
              for (let i = 0; i < cells.length; i++) {
                const cellText = cells[i].textContent || cells[i].innerText || '';
                const cleanText = cellText.trim();
                
                // Bỏ qua các cell không phải trích yếu
                if (!cleanText.match(/^\d+\//) && 
                    !cleanText.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                    !cleanText.includes('Sở Giáo dục') &&
                    !cleanText.match(/^[A-Z]{2,4}$/)) {
                  
                  // Tìm cell có nội dung trích yếu thực sự
                  if ((cleanText.startsWith('V/v') || 
                       cleanText.startsWith('Hội nghị') || 
                       cleanText.startsWith('Về việc') || 
                       cleanText.startsWith('Thông báo') ||
                       cleanText.startsWith('Chỉ đạo') || 
                       cleanText.startsWith('Kế hoạch') ||
                       cleanText.startsWith('Hướng dẫn') || 
                       cleanText.startsWith('Tổ chức') ||
                       cleanText.startsWith('Quyết định') ||
                       cleanText.includes('về việc') ||
                       cleanText.length > 20) && 
                      !cleanText.match(/^\d+[\/-]/)) {
                    
                    trichYeu = cleanText;
                    break;
                  }
                }
              }
              
              // Fallback: tìm cell dài nhất không phải số hiệu/ngày/cơ quan
              if (!trichYeu) {
                let longestText = '';
                for (let i = 0; i < cells.length; i++) {
                  const cellText = cells[i].textContent || cells[i].innerText || '';
                  const cleanText = cellText.trim();
                  
                  // Bỏ qua các cell không phải trích yếu
                  if (!cleanText.match(/^\d+\//) && 
                      !cleanText.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                      !cleanText.includes('Sở Giáo dục') &&
                      !cleanText.match(/^[A-Z]{2,4}$/) &&
                      cleanText.length > longestText.length &&
                      cleanText.length > 10) {
                    longestText = cleanText;
                  }
                }
                trichYeu = longestText;
              }
              
              vanBans.push({
                soHieu,
                trichYeu,
                ngayBanHanh,
                coQuan,
                hasLink: !!linkElement,
                element: row
              });
            }
          }
        }
      }
      
      return vanBans;
    });
    
    console.log(`   Tìm thấy ${vanBanData.length} văn bản`);
    
    if (vanBanData.length === 0) {
      throw new Error('Không tìm thấy văn bản nào trong trang');
    }
    
    let vanBanMoiCount = 0;
    let fileTaiVeCount = 0;
    
    for (let i = 0; i < vanBanData.length; i++) {
      try {
        const vanBan = vanBanData[i];
        console.log(`\n   Văn bản ${i + 1}/${vanBanData.length}:`);
        console.log(`   Số hiệu: ${vanBan.soHieu}`);
        console.log(`   Trích yếu: ${vanBan.trichYeu.substring(0, 100)}...`);
        
        // Kiểm tra xem văn bản đã được xử lý chưa
        if (vanBan.soHieu && vanBanDaXuLy.has(vanBan.soHieu)) {
          console.log('   -> Văn bản này đã được xử lý rồi, bỏ qua.');
          continue;
        }
        
        if (!vanBan.soHieu) {
          console.log('   -> Không tìm thấy số hiệu, bỏ qua.');
          continue;
        }
        
        console.log('   -> Văn bản MỚI! Cần xử lý...');
        vanBanMoiCount++;
        
        // Click vào văn bản để xem chi tiết
        console.log('   Click vào trích yếu để xem chi tiết...');
        
        // Tìm link và navigate trực tiếp
        let detailUrl = null;
        try {
          detailUrl = await page.evaluate((soHieu) => {
            const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
            
            for (const row of rows) {
              const rowText = row.textContent || row.innerText || '';
              
              if (rowText.includes(soHieu)) {
                const links = row.querySelectorAll('a');
                
                for (const link of links) {
                  // Tìm link có href chứa /info/ (trang chi tiết)
                  if (link.href && link.href.includes('/info/')) {
                    return link.href;
                  }
                }
              }
            }
            return null;
          }, vanBan.soHieu);
          
          if (detailUrl) {
            console.log('   Đang vào trang chi tiết...');
            await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15000 });
          } else {
            console.log('   -> Không tìm thấy link chi tiết.');
            continue;
          }
        } catch (e) {
          console.log(`   Lỗi khi vào trang chi tiết: ${e.message}`);
          continue;
        }
        
        // Kiểm tra URL có đúng không
        const currentUrl = page.url();
        if (!currentUrl.includes('document-process/info')) {
          console.log(`   -> URL không đúng: ${currentUrl}`);
          continue;
        }
        console.log(`   -> Đã vào trang chi tiết`);
        
        // Đợi table xuất hiện (Angular có thể render chậm)
        console.log('   Đợi bảng file xuất hiện...');
        try {
          await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
          console.log('   -> Không tìm thấy table sau 10s, thử tiếp...');
        }
        await page.waitForTimeout(2000);
        
        // Tìm và tải các file đính kèm
        console.log('   Tìm bảng FILE VĂN BẢN...');
        
        // Tìm số lượng file và danh sách file
        const fileListInfo = await page.evaluate(() => {
          const result = {
            fileCount: 0,
            files: []
          };
          
          // Tìm text "FILE VĂN BẢN (X)"
          const bodyText = document.body.textContent || '';
          const fileMatch = bodyText.match(/FILE VĂN BẢN\s*\((\d+)\)/i);
          if (fileMatch) {
            result.fileCount = parseInt(fileMatch[1]);
          }
          
          // Tìm bảng file đính kèm - dùng mat-table (Angular Material)
          const allTables = document.querySelectorAll('mat-table, .mat-table, .mat-mdc-table, table');
          
          for (let t = 0; t < allTables.length; t++) {
            const table = allTables[t];
            const tableText = table.textContent || '';
            
            // Bảng file thường có các extension file
            if (tableText.includes('.pdf') || tableText.includes('.doc') || 
                tableText.includes('.xls') || tableText.includes('.docx') ||
                tableText.includes('.xlsx')) {
              
              // Tìm các row trong mat-table (mat-row) hoặc tr thông thường
              const rows = table.querySelectorAll('mat-row, .mat-row, tr');
              
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowText = row.textContent || '';
                
                // Bỏ qua header row
                if (rowText.includes('Tên file') || rowText.includes('STT') || 
                    rowText.includes('Tên tài liệu') || rowText.includes('#')) {
                  continue;
                }
                
                // Kiểm tra row có chứa file không (có extension)
                if (rowText.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) {
                  // Lấy tên file từ row - tìm text chứa extension
                  const fileNameMatch = rowText.match(/[^\n\t]+\.(pdf|doc|docx|xls|xlsx|zip|rar)/i);
                  const fileName = fileNameMatch ? fileNameMatch[0].trim().split(/\s+/)[0] : `file-${result.files.length + 1}`;
                  
                  result.files.push({
                    index: result.files.length + 1,
                    fileName: fileName,
                    rowIndex: i,
                    tableIndex: t
                  });
                }
              }
            }
          }
          
          return result;
        });
        
        console.log(`   Tìm thấy ${fileListInfo.fileCount} file (phát hiện ${fileListInfo.files.length} file trong bảng)`);
        
        // Tải từng file
        for (const fileInfo of fileListInfo.files) {
          try {
            console.log(`   File ${fileInfo.index} (${fileInfo.fileName}): Đang tải...`);
            
            // Click vào dấu 3 chấm của file thứ fileInfo.index
            const moreBtnClicked = await page.evaluate((targetIndex) => {
              // Dùng mat-table (Angular Material)
              const tables = document.querySelectorAll('mat-table, .mat-table, .mat-mdc-table, table');
              
              for (const table of tables) {
                const tableText = table.textContent || '';
                
                if (tableText.includes('.pdf') || tableText.includes('.doc') || 
                    tableText.includes('.xls') || tableText.includes('.docx')) {
                  
                  // Dùng mat-row hoặc tr
                  const rows = table.querySelectorAll('mat-row, .mat-row, tr');
                  let fileCount = 0;
                  
                  for (const row of rows) {
                    const rowText = row.textContent || '';
                    
                    // Bỏ qua header
                    if (rowText.includes('Tên file') || rowText.includes('STT') ||
                        rowText.includes('Tên tài liệu') || rowText.includes('#')) {
                      continue;
                    }
                    
                    // Kiểm tra row có phải file không
                    if (rowText.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) {
                      fileCount++;
                      
                      if (fileCount === targetIndex) {
                        // Tìm button có icon more_vert (dấu 3 chấm) trong row
                        const buttons = row.querySelectorAll('button');
                        
                        for (const btn of buttons) {
                          const btnText = btn.textContent || btn.innerText || '';
                          const ariaLabel = btn.getAttribute('aria-label') || '';
                          
                          // Chỉ click nút có more_vert hoặc aria-label chứa 'more'
                          if (btnText.includes('more_vert') || 
                              btnText.includes('more_horiz') ||
                              ariaLabel.toLowerCase().includes('more') ||
                              btn.querySelector('mat-icon')?.textContent?.includes('more')) {
                            btn.click();
                            return true;
                          }
                        }
                      }
                    }
                  }
                }
              }
              return false;
            }, fileInfo.index);
            
            if (!moreBtnClicked) {
              console.log(`   -> Không tìm thấy nút 3 chấm cho file ${fileInfo.index}`);
              continue;
            }
            
            // Đợi menu dropdown hiện ra
            await page.waitForTimeout(800);
            
            // Click "Tải xuống tệp tin" - timeout 60s cho file lớn
            const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
            
            const downloadClicked = await page.evaluate(() => {
              // Debug: liệt kê tất cả menu items
              const allMenuItems = document.querySelectorAll('mat-menu-item, [role="menuitem"], .mat-mdc-menu-item');
              const menuDebug = [];
              allMenuItems.forEach((item, idx) => {
                menuDebug.push({
                  index: idx,
                  text: item.textContent || item.innerText || '',
                  tag: item.tagName
                });
              });
              console.log('Menu items found:', JSON.stringify(menuDebug));
              
              // Tìm menu item "Tải xuống tệp tin" - tìm chính xác
              for (const item of allMenuItems) {
                const text = (item.textContent || item.innerText || '').toLowerCase();
                
                // Tìm chính xác "tải xuống tệp tin" cho từng file
                if (text.includes('tải xuống tệp tin') || text.includes('tai xuong tep tin')) {
                  item.click();
                  return { clicked: true, option: text };
                }
              }
              
              // Fallback: thử tìm "tải xuống" đơn giản
              for (const item of allMenuItems) {
                const text = (item.textContent || item.innerText || '').toLowerCase();
                if (text.includes('tải xuống') && !text.includes('tất cả') && !text.includes('toàn bộ')) {
                  item.click();
                  return { clicked: true, option: text };
                }
              }
              
              return { clicked: false };
            });
            
            console.log(`   -> Clicked option: ${JSON.stringify(downloadClicked)}`);
            
            if (downloadClicked.clicked) {
              const download = await downloadPromise;
              
              // Lấy tên file gốc từ hệ thống
              let originalFileName = download.suggestedFilename() || 'download.pdf';
              const savePath = path.join(downloadsDir, originalFileName);
              
              // Lưu file
              await download.saveAs(savePath);
              
              if (fs.existsSync(savePath)) {
                const stats = fs.statSync(savePath);
                console.log(`   Đã tải: ${originalFileName} (${stats.size} bytes)`);
                fileTaiVeCount++;
              }
              
              // Đợi menu đóng
              await page.waitForTimeout(1000);
            } else {
              console.log(`   -> Không tìm thấy option "Tải xuống tệp tin" trong menu`);
            }
            
          } catch (error) {
            console.error(`   Lỗi khi tải file ${fileInfo.index}: ${error.message}`);
          }
        }
        
        // Quay lại danh sách
        console.log('   Quay lại danh sách văn bản...');
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1500);
        
        // Lưu thông tin văn bản mới vào logs
        const thongTinVanBan = {
          so_hieu: vanBan.soHieu,
          trich_yeu: vanBan.trichYeu || 'Không xác định',
          ngay_ban_hanh: vanBan.ngayBanHanh || new Date().toLocaleDateString('vi-VN'),
          co_quan_ban_hanh: vanBan.coQuan || 'Sở Giáo dục và Đào tạo - Tỉnh Đồng Tháp'
        };
        
        await saveVanBanMoi(thongTinVanBan);
        
      } catch (error) {
        console.error(`   Lỗi khi xử lý văn bản ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n4. Hoàn thành!');
    console.log(`   Tổng cộng: ${vanBanMoiCount} văn bản mới`);
    console.log(`   Đã tải: ${fileTaiVeCount} file`);
    
    // Kiểm tra thư mục downloads
    const downloadedFiles = fs.readdirSync(downloadsDir);
    console.log(`   Thư mục van-ban-den/ chứa ${downloadedFiles.length} file:`);
    downloadedFiles.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${stats.size} bytes)`);
    });
    
  } catch (error) {
    console.error('Lỗi:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('5. Dọn dẹp...');
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      console.error('Lỗi khi đóng browser:', e.message);
    }
  }
}

crawlAndDownload().catch(console.error);
