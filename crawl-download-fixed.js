const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { notifyNewVanBan: notifyZalo } = require('./zalo-notify');
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
    let data = { tong_so_van_ban: 0, ngay_xuat_du_lieu: new Date().toISOString().split('T')[0], nguon: "Hê thông QLVBÐH tinh Dong Thap - Tab Cho duyet", danh_sach_van_ban: [] };
    
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
      
      // Gui thông báo qua ca Zalo và Telegram
      await Promise.all([
        notifyZalo(thongTinVanBan),
        notifyTelegram(thongTinVanBan)
      ]);
      
      return true;
    }
  } catch (error) {
    console.error('   Loi khi luu logs:', error.message);
  }
  return false;
}

async function crawlAndDownloadFixed() {
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
    console.log('1. Chuân bi thu muc download...');
    const downloadsDir = path.join(process.cwd(), 'van-ban-den');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Load danh sach van ban da xu ly
    const vanBanDaXuLy = loadVanBanDaXuLy();
    
    console.log('2. Dang nhap...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Dang nhap nhanh
    console.log('   Dang nhap nhanh...');
    await page.evaluate(({ username, password }) => {
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
      
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (!submitBtn) {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || btn.innerText || '';
          if (text.includes('Dang nhap') || text.includes('Login')) {
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
    
    console.log('3. Quêt danh sách van ban trong tab "Cho duyet"...');
    await page.waitForTimeout(3000);
    
    // Quêt table
    const vanBanData = await page.evaluate(() => {
      const vanBans = [];
      const matRows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"]');
      
      for (const row of matRows) {
        const rowText = row.textContent || row.innerText || '';
        
        let soHieuMatch = rowText.match(/\d+\/SGDÐT-[\w-]+/);
        if (!soHieuMatch) {
          soHieuMatch = rowText.match(/\d+\/[\wÀ-Ýà-ý]+-[\wÀ-Ýà-ý-]+/);
        }
        if (!soHieuMatch) {
          soHieuMatch = rowText.match(/\d+\/[\w-]+-[\w-]+/);
        }
        
        if (soHieuMatch) {
          const soHieu = soHieuMatch[0];
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
            
            if (cellText.includes('Sô Giáo duc') || cellText.includes('SGDÐT')) {
              coQuan = cellText.trim();
            }
          }
          
          // Lây trích yêu dung - bô qua UI text
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].textContent || cells[i].innerText || '';
            const cleanText = cellText.trim();
            
            if (!cleanText.match(/^\d+\//) && 
                !cleanText.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                !cleanText.includes('Sô Giáo duc') &&
                !cleanText.match(/^[A-Z]{2,4}$/)) {
              
              if ((cleanText.startsWith('V/v') || 
                   cleanText.startsWith('Hôi nghi') || 
                   cleanText.startsWith('Vê viêc') || 
                   cleanText.startsWith('Thông báo') ||
                   cleanText.startsWith('Chi dao') || 
                   cleanText.startsWith('Kê hoach') ||
                   cleanText.startsWith('Huong dân') || 
                   cleanText.startsWith('Tô chuc') ||
                   cleanText.startsWith('Quyêt dính') ||
                   cleanText.includes('vê viêc') ||
                   cleanText.length > 20) && 
                  !cleanText.match(/^\d+[\/-]/)) {
                
                trichYeu = cleanText;
                break;
              }
            }
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
      
      return vanBans;
    });
    
    console.log(`   Tim thay ${vanBanData.length} van ban`);
    
    if (vanBanData.length === 0) {
      throw new Error('Không tim thay van ban nào trong trang');
    }
    
    let vanBanMoiCount = 0;
    let fileTaiVeCount = 0;
    
    for (let i = 0; i < vanBanData.length; i++) {
      try {
        const vanBan = vanBanData[i];
        console.log(`\n   Van ban ${i + 1}/${vanBanData.length}:`);
        console.log(`   Sô hiêu: ${vanBan.soHieu}`);
        console.log(`   Trích yêu: ${vanBan.trichYeu.substring(0, 100)}...`);
        
        if (vanBan.soHieu && vanBanDaXuLy.has(vanBan.soHieu)) {
          console.log('   -> Van ban này dã duôc xû ly rôi, bô qua.');
          continue;
        }
        
        if (!vanBan.soHieu) {
          console.log('   -> Không tim thay sô hiêu, bô qua.');
          continue;
        }
        
        console.log('   -> Van ban MÔI! Cân xû ly...');
        vanBanMoiCount++;
        
        // Click vào van ban
        console.log('   Click vào trích yêu dê xem chi tiêt...');
        
        const linkHandle = await page.evaluateHandle((soHieu) => {
          const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
          
          for (const row of rows) {
            const rowText = row.textContent || row.innerText || '';
            
            if (rowText.includes(soHieu)) {
              const links = row.querySelectorAll('a');
              
              for (const link of links) {
                const linkText = link.textContent || link.innerText || '';
                if (linkText.length > 20 && !linkText.match(/^\d+\/\w+/)) {
                  return link;
                }
              }
            }
          }
          return null;
        }, vanBan.soHieu);
        
        if (linkHandle) {
          console.log('   Dang click link trích yêu...');
          await linkHandle.click();
        }
        
        await page.waitForTimeout(5000);
        
        const currentUrl = page.url();
        if (!currentUrl.includes('document-process/info')) {
          console.log(`   -> URL không dúng: ${currentUrl}`);
          continue;
        }
        console.log(`   -> Dã vào trang chi tiêt`);
        
        await page.waitForTimeout(2000);
        
        // Lây thông tin chi tiêt TÚ TRANG CHI TIÊT
        console.log('   Lây thông tin chi tiêt...');
        const thongTinChiTiet = await page.evaluate(() => {
          const result = { trich_yeu: '', ngay_ban_hanh: '', co_quan_ban_hanh: '' };
          
          // Tìm trong các field có label
          const allElements = document.querySelectorAll('*');
          for (const elem of allElements) {
            const text = elem.textContent || elem.innerText || '';
            
            // Tìm trích yêu - các chuôi dài có nghia
            if (text.length > 30 && text.length < 500 && 
                !text.includes('Sô hiêu') && !text.includes('Ngày') && !text.includes('Cô quan') &&
                !text.match(/^\d+\//) && !text.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                (text.includes('Quyêt dính') || text.includes('Kê hoach') || text.includes('Thông báo') ||
                 text.includes('Chi dao') || text.includes('Huong dân') || text.includes('Vê viêc') ||
                 text.includes('V/v') || text.includes('Hôi nghi') || text.includes('Tô chuc'))) {
              result.trich_yeu = text.trim();
              break;
            }
          }
          
          // Fallback: tim div dài nhât
          if (!result.trich_yeu) {
            const divs = document.querySelectorAll('div, p, span');
            let longestText = '';
            for (const div of divs) {
              const text = (div.textContent || div.innerText || '').trim();
              if (text.length > longestText.length && text.length > 20 && text.length < 500 &&
                  !text.includes('Sô hiêu') && !text.includes('Ngày') && !text.includes('Cô quan') &&
                  !text.match(/^\d+\//) && !text.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                longestText = text;
              }
            }
            result.trich_yeu = longestText;
          }
          
          return result;
        });
        
        // Tìm và tài các file dinh kèm
        console.log('   Tim bâng FILE VÂN BÂN...');
        
        const fileListInfo = await page.evaluate(() => {
          const result = { fileCount: 0, files: [] };
          
          const bodyText = document.body.textContent || '';
          const fileMatch = bodyText.match(/FILE VÂN BÂN\s*\((\d+)\)/i);
          if (fileMatch) {
            result.fileCount = parseInt(fileMatch[1]);
          }
          
          const allTables = document.querySelectorAll('mat-table, .mat-table, .mat-mdc-table, table');
          
          for (let t = 0; t < allTables.length; t++) {
            const table = allTables[t];
            const tableText = table.textContent || '';
            
            if (tableText.includes('.pdf') || tableText.includes('.doc') || 
                tableText.includes('.xls') || tableText.includes('.docx') ||
                tableText.includes('.xlsx')) {
              
              const rows = table.querySelectorAll('mat-row, .mat-row, tr');
              
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowText = row.textContent || '';
                
                if (rowText.includes('Tên file') || rowText.includes('STT') || 
                    rowText.includes('Tên tài liêu') || rowText.includes('#')) {
                  continue;
                }
                
                if (rowText.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) {
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
        
        console.log(`   Tim thay ${fileListInfo.fileCount} file (phát hiên ${fileListInfo.files.length} file trong bâng)`);
        
        // Tai tùng file
        for (const fileInfo of fileListInfo.files) {
          try {
            console.log(`   File ${fileInfo.index} (${fileInfo.fileName}): Dang tai...`);
            
            // Click vào dâu 3 châm
            const moreBtnClicked = await page.evaluate((targetIndex) => {
              const tables = document.querySelectorAll('mat-table, .mat-table, .mat-mdc-table, table');
              
              for (const table of tables) {
                const tableText = table.textContent || '';
                
                if (tableText.includes('.pdf') || tableText.includes('.doc') || 
                    tableText.includes('.xls') || tableText.includes('.docx')) {
                  
                  const rows = table.querySelectorAll('mat-row, .mat-row, tr');
                  let fileCount = 0;
                  
                  for (const row of rows) {
                    const rowText = row.textContent || '';
                    
                    if (rowText.includes('Tên file') || rowText.includes('STT') ||
                        rowText.includes('Tên tài liêu') || rowText.includes('#')) {
                      continue;
                    }
                    
                    if (rowText.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) {
                      fileCount++;
                      
                      if (fileCount === targetIndex) {
                        const buttons = row.querySelectorAll('button');
                        
                        for (const btn of buttons) {
                          const btnText = btn.textContent || btn.innerText || '';
                          const ariaLabel = btn.getAttribute('aria-label') || '';
                          
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
              console.log(`   -> Không tim thay nút 3 châm cho file ${fileInfo.index}`);
              continue;
            }
            
            await page.waitForTimeout(800);
            
            // Click "Tai xuong têp tin" - DÙNG CACH TAI FILE THUC
            console.log('   Dang click tai xuong...');
            
            const downloadClicked = await page.evaluate(() => {
              const allMenuItems = document.querySelectorAll('button[role="menuitem"]');
              
              for (const item of allMenuItems) {
                const text = (item.textContent || item.innerText || '').toLowerCase();
                
                if (text.includes('tai xuong tep tin') || text.includes('tai xuong têp tin')) {
                  item.click();
                  return { clicked: true, option: text };
                }
              }
              
              for (const item of allMenuItems) {
                const text = (item.textContent || item.innerText || '').toLowerCase();
                if (text.includes('tai xuong') && !text.includes('tat ca') && !text.includes('toan bo')) {
                  item.click();
                  return { clicked: true, option: text };
                }
              }
              
              return { clicked: false };
            });
            
            console.log(`   -> Clicked option: ${JSON.stringify(downloadClicked)}`);
            
            if (downloadClicked.clicked) {
              // DÙNG CACH TAI FILE THUC - DOI DOWNLOAD EVENT
              try {
                const download = await page.waitForEvent('download', { timeout: 30000 });
                
                let originalFileName = download.suggestedFilename() || 'download.pdf';
                const savePath = path.join(downloadsDir, originalFileName);
                
                await download.saveAs(savePath);
                
                if (fs.existsSync(savePath)) {
                  const stats = fs.statSync(savePath);
                  console.log(`   Dã tai: ${originalFileName} (${stats.size} bytes)`);
                  fileTaiVeCount++;
                } else {
                  console.log(`   -> File không luu duoc: ${originalFileName}`);
                }
                
              } catch (downloadError) {
                console.log(`   -> Loi tai file: ${downloadError.message}`);
              }
              
              await page.waitForTimeout(1000);
            } else {
              console.log(`   -> Không tim thay option "Tai xuong têp tin" trong menu`);
            }
            
          } catch (error) {
            console.error(`   Loi khi tai file ${fileInfo.index}: ${error.message}`);
          }
        }
        
        // Quay lai danh sách
        console.log('   Quay lai danh sách van ban...');
        await page.goBack();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1500);
        
        // Lây thông tin van ban moi vào logs - DÙNG TRÍCH YÊU TÚ TRANG CHI TIÊT
        const thongTinVanBan = {
          so_hieu: vanBan.soHieu,
          trich_yeu: thongTinChiTiet.trich_yeu || vanBan.trichYeu || 'Không xác dinh',
          ngay_ban_hanh: vanBan.ngayBanHanh || new Date().toLocaleDateString('vi-VN'),
          co_quan_ban_hanh: vanBan.coQuan || 'Sô Giáo duc và Dào tao - Tinh Dong Thap'
        };
        
        await saveVanBanMoi(thongTinVanBan);
        
      } catch (error) {
        console.error(`   Loi khi xû ly van ban ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n4. Hoàn thành!');
    console.log(`   Tông công: ${vanBanMoiCount} van ban moi`);
    console.log(`   Dã tai: ${fileTaiVeCount} file`);
    
    // Kiêm tra thu muc downloads
    const downloadedFiles = fs.readdirSync(downloadsDir);
    console.log(`   Thu muc van-ban-den/ chûa ${downloadedFiles.length} file:`);
    downloadedFiles.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${stats.size} bytes)`);
    });
    
  } catch (error) {
    console.error('Loi:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('5. Don döp...');
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      console.error('Loi khi dong browser:', e.message);
    }
  }
}

crawlAndDownloadFixed().catch(console.error);
