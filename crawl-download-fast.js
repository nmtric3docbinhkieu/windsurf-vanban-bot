const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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
function saveVanBanMoi(thongTinVanBan) {
  try {
    const logsPath = path.join(__dirname, '..', 'logs', 'van_ban_den_2025_2026.json');
    let data = { tong_so_van_ban: 0, ngay_xuat_du_lieu: new Date().toISOString().split('T')[0], nguon: "Hệ thống QLVBĐH tỉnh Đồng Tháp - Tab Chờ duyệt", danh_sach_van_ban: [] };
    
    if (fs.existsSync(logsPath)) {
      data = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
    }
    
    // Kiem tra trung lap
    const tonTai = data.danh_sach_van_ban.some(vb => vb.so_hieu === thongTinVanBan.so_hieu);
    if (!tonTai) {
      data.danh_sach_van_ban.push(thongTinVanBan);
      data.tong_so_van_ban = data.danh_sach_van_ban.length;
      
      fs.writeFileSync(logsPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`   Da luu van ban moi: ${thongTinVanBan.so_hieu}`);
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
    const downloadsDir = path.join(process.cwd(), 'van-ban-den');
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
              trichYeu = cellText.trim();
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
                  trichYeu = cellText.trim();
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
        if (vanBan.hasLink) {
          console.log('   Click vào văn bản để xem chi tiết...');
            
          // Click bằng locator cho ổn định hơn
          try {
            await page.locator(':scope').locator('a').first().click();
          } catch (e) {
            // Fallback: dùng evaluate
            await page.evaluate((element) => {
              const link = element.querySelector('a');
              if (link) link.click();
            }, vanBan.element);
          }
          
          await page.waitForTimeout(3000);
          
          // Dùng evaluate để tìm file đính kèm nhanh
          const fileData = await page.evaluate(() => {
            const files = [];
            
            // Chụp màn hình debug
            console.log('Đang tìm file đính kèm...');
            
            // Tìm tất cả các button có more_vert icon
            const moreVertButtons = document.querySelectorAll('button, mat-icon');
            
            for (const btn of moreVertButtons) {
              const btnText = btn.textContent || btn.innerText || '';
              const btnTitle = btn.title || btn.getAttribute('aria-label') || '';
              
              // Kiểm tra có phải more_vert không
              if (btnText.includes('more_vert') || btnTitle.includes('more') || 
                  btnText.includes('more_horiz') || btn.querySelector('.material-icons')) {
                
                // Tìm row cha của button
                let parent = btn.parentElement;
                while (parent && parent.tagName !== 'TR') {
                  parent = parent.parentElement;
                }
                
                if (parent) {
                  const rowText = parent.textContent || parent.innerText || '';
                  
                  // Kiểm tra row có chứa file không
                  if (rowText.includes('.pdf') || rowText.includes('.doc') || 
                      rowText.includes('Tải') || rowText.includes('File')) {
                    
                    files.push({
                      element: parent,
                      button: btn,
                      hasMoreVert: true
                    });
                  }
                }
              }
            }
            
            // Nếu không tìm thấy, thử cách khác
            if (files.length === 0) {
              const rows = document.querySelectorAll('tr');
              for (const row of rows) {
                const rowText = row.textContent || row.innerText || '';
                
                if (rowText.includes('.pdf') || rowText.includes('.doc') || 
                    rowText.includes('Tải xuống') || rowText.includes('File đính kèm')) {
                  
                  const buttons = row.querySelectorAll('button, mat-icon');
                  for (const btn of buttons) {
                    const btnText = btn.textContent || btn.innerText || '';
                    if (btnText.includes('more') || btnText.includes('vert')) {
                      files.push({
                        element: row,
                        button: btn,
                        hasMoreVert: true
                      });
                      break;
                    }
                  }
                }
              }
            }
            
            return files;
          });
          
          console.log(`   Tìm thấy ${fileData.length} file đính kèm`);
          
          // Tải từng file
          for (let j = 0; j < fileData.length; j++) {
            try {
              console.log(`   File ${j + 1}: Đang tải...`);
              
              // Click more_vert bằng evaluate - dùng button đã tìm thấy
              await page.evaluate((button) => {
                if (button) button.click();
              }, fileData[j].button);
              
              await page.waitForTimeout(500);
              
              // Click menu download
              const downloadPromise = page.waitForEvent('download');
              
              const downloadClicked = await page.evaluate(() => {
                const menuItems = document.querySelectorAll('mat-menu-item, [role="menuitem"], button');
                
                for (const item of menuItems) {
                  const text = item.textContent || item.innerText || '';
                  if (text.includes('Tải') || text.includes('xuống')) {
                    item.click();
                    return true;
                  }
                }
                return false;
              });
              
              if (downloadClicked) {
                const download = await downloadPromise;
                
                // Lấy tên file
                let originalFileName = download.suggestedFilename();
                if (!originalFileName || originalFileName.includes('tmp')) {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  originalFileName = `${vanBan.soHieu.replace(/[/]/g, '-')}-${timestamp}.pdf`;
                }
                
                // Đợi download hoàn tất
                const tempPath = await download.path();
                const savePath = path.join(downloadsDir, originalFileName);
                await download.saveAs(savePath);
                
                if (fs.existsSync(savePath)) {
                  const stats = fs.statSync(savePath);
                  console.log(`   Đã tải thành công: ${originalFileName} (${stats.size} bytes)`);
                  fileTaiVeCount++;
                }
                
                await page.waitForTimeout(1000);
              }
              
            } catch (error) {
              console.error(`   Lỗi khi tải file ${j + 1}: ${error.message}`);
            }
          }
          
          // Quay lại danh sách
          await page.goBack();
          await page.waitForTimeout(1000);
        }
        
        // Lưu thông tin văn bản mới vào logs
        const thongTinVanBan = {
          so_hieu: vanBan.soHieu,
          trich_yeu: vanBan.trichYeu || 'Không xác định',
          ngay_ban_hanh: vanBan.ngayBanHanh || new Date().toLocaleDateString('vi-VN'),
          co_quan_ban_hanh: vanBan.coQuan || 'Sở Giáo dục và Đào tạo - Tỉnh Đồng Tháp'
        };
        
        saveVanBanMoi(thongTinVanBan);
        
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
