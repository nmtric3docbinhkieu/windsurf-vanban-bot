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
    let data = { tong_so_van_ban: 0, ngay_xuat_du_lieu: new Date().toISOString().split('T')[0], nguon: "Hê thông QLVBÐH tinh Dông Thap - Tab Chô duyêt", danh_sach_van_ban: [] };
    
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
    
    // Dang nhap voi nhieu selector
    console.log('   Tim input dang nhap...');
    const usernameSelectors = [
      'input[placeholder*="Công dân/DN"]',
      'input[placeholder*="Công dân"]',
      'input[placeholder*="DN"]',
      'input[type="text"]',
      'input[name*="username"]',
      'input[name*="user"]',
      'input[formcontrolname*="user"]'
    ];
    
    let usernameFound = false;
    for (const selector of usernameSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.locator(selector).fill(USERNAME);
        console.log(`   Username input found: ${selector}`);
        usernameFound = true;
        break;
      } catch (e) {}
    }
    
    if (!usernameFound) throw new Error('Không tìm sees input username');
    
    const passwordSelectors = [
      'input[placeholder*="Nhâp mâts khâu"]',
      'input[placeholder*="Nhâp mâts khâu"]',
      'input[placeholder*="mâts khâu"]',
      'input[placeholder*="password"]',
      'input[type="password"]',
      'input[name*="password"]',
      'input[name*="pass"]',
      'input[formcontrolname*="password"]'
    ];
    
    let passwordFound = false;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.locator(selector).fill(PASSWORD);
        console.log(`   Password input found: ${selector}`);
        passwordFound = true;
        break;
      } catch (e) {}
    }
    
    if (!passwordFound) throw new Error('Không tìm sees input password');
    
    const loginSelectors = [
      'button[type="submit"]',
      'button:has-text("Dang nhap")',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'input[type="submit"]',
      '[role="button"]:has-text("Dang nhap")'
    ];
    
    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.locator(selector).click();
        console.log(`   Login clicked: ${selector}`);
        loginClicked = true;
        break;
      } catch (e) {}
    }
    
    if (!loginClicked) throw new Error('Không tìm sees nut dang nhap');
    
    await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('3. Kiem tra trang hien tai...');
    
    // Debug: Chụp màn hình trang sau login
    await page.screenshot({ path: 'debug-after-login-new.png', fullPage: true });
    console.log('   Đã chụp màn hình: debug-after-login-new.png');
    
    // Kiem tra xem trang da hien thi danh sach van ban chua
    try {
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
      console.log('   Trang da hien thi danh sach van ban!');
    } catch (e) {
      console.log('   Trang chua co danh sach, thu tim menu...');
      
      // Neu chua co danh sach, thu tim menu
      const vanBanDenSelectors = [
        'text=Văn bản đến',
        'text=Van ban den',
        'a:has-text("Văn bản đến")',
        'button:has-text("Văn bản đến")'
      ];
      
      let vanBanDenClicked = false;
      for (const selector of vanBanDenSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.locator(selector).click();
          console.log(`   Van ban den clicked: ${selector}`);
          vanBanDenClicked = true;
          break;
        } catch (e) {
          console.log(`   Selector failed: ${selector}`);
        }
      }
      
      if (vanBanDenClicked) {
        await page.waitForTimeout(1000);
        
        // Tim Cho duyet
        const choDuyetSelectors = [
          'text=Chờ duyệt',
          'text=Cho duyet',
          'a:has-text("Chờ duyệt")',
          'button:has-text("Chờ duyệt")'
        ];
        
        let choDuyetClicked = false;
        for (const selector of choDuyetSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.locator(selector).click();
            console.log(`   Cho duyet clicked: ${selector}`);
            choDuyetClicked = true;
            break;
          } catch (e) {
            console.log(`   Selector failed: ${selector}`);
          }
        }
        
        if (!choDuyetClicked) {
          console.log('   Khong tim thay menu "Cho duyet", su dung trang hien tai');
        }
      }
      
      // Cho trang danh sach tai - thu nhieu selector
      const tableSelectors = [
        'table tbody tr',
        'tbody tr',
        'table tr',
        '.mat-table tbody tr',
        '[role="row"]',
        'tr[role="row"]',
        '.table-row'
      ];
      
      let tableFound = false;
      for (const selector of tableSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`   Table found with selector: ${selector}`);
          tableFound = true;
          break;
        } catch (e) {
          console.log(`   Table selector failed: ${selector}`);
        }
      }
      
      if (!tableFound) {
        // Debug: Tim cac element co van ban
        console.log('   Tim cac element chua van ban...');
        const textElements = await page.locator('div, span, td').all();
        for (let i = 0; i < Math.min(textElements.length, 20); i++) {
          try {
            const text = await textElements[i].innerText();
            if (text && text.match(/\d+\/\w+-\w+/)) {
              console.log(`   Found element with so hieu: "${text.substring(0, 100)}..."`);
            }
          } catch (e) {}
        }
        throw new Error('Không tìm thấy bảng văn bản');
      }
    }
    
    console.log('4. Quét danh sách van ban trong tab "Cho duyet"...');
    
    // Tim table chua van ban thuc su - tim cac element co so hieu
    console.log('   Tim table chua van ban...');
    
    // Cach 1: Tim tat ca cac element co so hieu
    let vanBanElements = [];
    try {
      const allElements = await page.locator('*').all();
      for (const element of allElements) {
        try {
          const text = await element.innerText();
          if (text && text.match(/\d+\/\w+-\w+/)) {
            // Tim cha cua element nay la row
            let parent = element;
            for (let i = 0; i < 5; i++) {
              try {
                parent = await parent.locator('..');
                const parentTag = await parent.evaluate(el => el.tagName.toLowerCase());
                if (parentTag === 'tr') {
                  vanBanElements.push(parent);
                  break;
                }
              } catch (e) {
                break;
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('   Error finding elements with so hieu');
    }
    
    // Cach 2: Neu khong tim duoc, thu cac table khac
    if (vanBanElements.length === 0) {
      console.log('   Thu tim table khac...');
      const tables = await page.locator('table').all();
      console.log(`   Found ${tables.length} tables`);
      
      for (let i = 0; i < tables.length; i++) {
        try {
          const tableText = await tables[i].innerText();
          if (tableText.match(/\d+\/\w+-\w+/)) {
            console.log(`   Table ${i} contains van ban`);
            vanBanElements = await tables[i].locator('tr').all();
            break;
          }
        } catch (e) {}
      }
    }
    
    // Cach 3: Tim theo class cua Material table
    if (vanBanElements.length === 0) {
      try {
        vanBanElements = await page.locator('.mat-row, [role="row"].mat-mdc-row').all();
        console.log(`   Found ${vanBanElements.length} Material rows`);
      } catch (e) {}
    }
    
    if (vanBanElements.length === 0) {
      throw new Error('Không tìm thấy văn bản nào trong trang');
    }
    
    console.log(`   Tim thay ${vanBanElements.length} van ban`);
    
    let vanBanMoiCount = 0;
    let fileTaiVeCount = 0;
    
    for (let i = 0; i < vanBanData.length; i++) {
      try {
        const vanBan = vanBanData[i];
        console.log(`\n   Van ban ${i + 1}/${vanBanData.length}:`);
        console.log(`   So hieu: ${vanBan.soHieu}`);
        console.log(`   Trich yeu: ${vanBan.trichYeu.substring(0, 100)}...`);
        
        // Kiem tra xem van ban da duoc xu ly chua
        if (vanBan.soHieu && vanBanDaXuLy.has(vanBan.soHieu)) {
          console.log('   -> Van ban nay da duoc xu ly roi, bo qua.');
          continue;
        }
        
        if (!vanBan.soHieu) {
          console.log('   -> Khong tim thay so hieu, bo qua.');
          continue;
        }
        
        console.log('   -> Van ban MOI! Can xu ly...');
        vanBanMoiCount++;
        
        // Click vao van ban de xem chi tiet
        if (vanBan.hasLink) {
          console.log('   Click vao van ban de xem chi tiet...');
          
          // Tim va click link
          await page.evaluate((element) => {
            const link = element.querySelector('a');
            if (link) link.click();
          }, vanBan.element);
          
          await page.waitForTimeout(3000);
          
          // Cho trang chi tiet tai
          await page.waitForSelector('text=CHI TIET', { timeout: 10000 }).catch(() => {});
          
          // Chup man hinh trang chi tiet
          await page.screenshot({ path: `debug-chi-tiet-${i}.png`, fullPage: true });
          console.log(`   Đã chụp màn hình chi tiết: debug-chi-tiet-${i}.png`);
          
          // Lay thong tin chi tiet
          try {
            // Thu tim cac thong tin chi tiet
            const detailSelectors = [
              '[label*="Sô hiêu"]',
              '[label*="Trich yeu"]', 
              '[label*="Ngày ban hành"]',
              '.field-label',
              'td:has-text("Sô hiêu")',
              'span:has-text("Sô hiêu")'
            ];
            
            for (const selector of detailSelectors) {
              try {
                const elements = await page.locator(selector).all();
                for (const element of elements) {
                  const text = await element.innerText();
                  if (text.includes('Sô hiêu') && !soHieu) {
                    const parent = element.locator('..');
                    const value = await parent.innerText();
                    const match = value.match(/\d+\/[\w-]+/);
                    if (match) soHieu = match[0];
                  }
                  if (text.includes('Trich yeu') && !trichYeu) {
                    const parent = element.locator('..');
                    trichYeu = await parent.innerText();
                    trichYeu = trichYeu.replace(/.*Trich yeu:? ?/i, '').trim();
                  }
                  if (text.includes('Ngày ban hành') && !ngayBanHanh) {
                    const parent = element.locator('..');
                    const dateText = await parent.innerText();
                    const dateMatch = dateText.match(/\d{2}\/\d{2}\/\d{4}/);
                    if (dateMatch) ngayBanHanh = dateMatch[0];
                  }
                }
              } catch (e) {}
            }
          } catch (e) {
            console.log('   Khong tim thay thong tin chi tiet them');
          }
          
          // Tim file dinh kem
          console.log('   Tim file dinh kem...');
          
          // Thu nhieu selector cho file dinh kem
          let fileRows = [];
          const fileSelectors = [
            'table tbody tr',
            'tbody tr',
            '.mat-table tbody tr',
            '[role="row"]',
            'tr:has-text(".pdf")',
            'tr:has-text(".doc")',
            'tr:has-text(".docx")',
            'tr:has-text("Tải xuống")',
            'tr:has-text("File")'
          ];
          
          for (const selector of fileSelectors) {
            try {
              fileRows = await page.locator(selector).all();
              if (fileRows.length > 0) {
                console.log(`   Found ${fileRows.length} file rows with selector: ${selector}`);
                break;
              }
            } catch (e) {}
          }
          
          // Neu van khong tim thay, thu tim theo text
          if (fileRows.length === 0) {
            try {
              const allRows = await page.locator('tr').all();
              for (const row of allRows) {
                try {
                  const text = await row.innerText();
                  if (text.includes('.pdf') || text.includes('.doc') || text.includes('Tải') || text.includes('File')) {
                    fileRows.push(row);
                  }
                } catch (e) {}
              }
              console.log(`   Found ${fileRows.length} file rows by text search`);
            } catch (e) {}
          }
          
          if (fileRows.length > 0) {
            console.log(`   Tim thay ${fileRows.length} file dinh kem`);
            
            for (let j = 0; j < fileRows.length; j++) {
              try {
                console.log(`   File ${j + 1}: Dang tai...`);
                
                // Tim nut more_vert
                const moreVertButton = page.getByRole('button').filter({ hasText: 'more_vert' }).nth(j + 1);
                await moreVertButton.click();
                await page.waitForTimeout(500);
                
                // Click tai xuong
                const downloadPromise = page.waitForEvent('download');
                
                const downloadSelectors = [
                  () => page.getByRole('menuitem', { name: 'Tài xuong tep tin' }).click(),
                  () => page.getByRole('menuitem', { name: 'Tài xuong tâp tin' }).click(),
                  () => page.getByRole('menuitem', { name: /tài xuông/i }).click(),
                  () => page.locator('mat-menu-item:has-text("Tài")').click(),
                  () => page.locator('[role="menuitem"]:has-text("Tài")').click()
                ];
                
                let downloadClicked = false;
                for (const selectorFn of downloadSelectors) {
                  try {
                    await selectorFn();
                    downloadClicked = true;
                    break;
                  } catch (e) {
                    console.log(`   Download selector failed: ${e.message}`);
                  }
                }
                
                if (!downloadClicked) {
                  throw new Error('Không thê click vào menu download');
                }
                
                const download = await downloadPromise;
                
                // Lay ten file
                let originalFileName = download.suggestedFilename();
                if (!originalFileName || originalFileName.includes('tmp') || originalFileName.length < 3) {
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  originalFileName = `${soHieu.replace(/[/]/g, '-')}-${timestamp}.pdf`;
                  console.log(`   Using generated filename: ${originalFileName}`);
                }
                
                // Doi download hoan tat
                console.log('   Dôi download hoàn tat...');
                const tempPath = await download.path();
                console.log(`   Download temp path: ${tempPath}`);
                
                const savePath = path.join(downloadsDir, originalFileName);
                console.log(`   Dang luu: ${originalFileName}`);
                await download.saveAs(savePath);
                
                // Kiem tra file
                if (fs.existsSync(savePath)) {
                  const stats = fs.statSync(savePath);
                  console.log(`   Da tai thanh cong: ${originalFileName} (${stats.size} bytes)`);
                  fileTaiVeCount++;
                } else {
                  console.error(`   WARNING: File không tôn tai sau khi save: ${savePath}`);
                }
                
                await page.waitForTimeout(1000);
                
              } catch (error) {
                console.error(`   Loi khi tai file ${j + 1}: ${error.message}`);
              }
            }
          } else {
            console.log('   Khong tim thay file dinh kem nao');
          }
          
          // Quay lai danh sach
          await page.goBack();
          await page.waitForTimeout(1000);
        }
        
        // Luu thong tin van ban moi vao logs
        const thongTinVanBan = {
          so_hieu: soHieu,
          trich_yeu: trichYeu || 'Không xác dânh',
          ngay_ban_hanh: ngayBanHanh || new Date().toLocaleDateString('vi-VN'),
          co_quan_ban_hanh: 'Sô Giáo duc và Dao tao - Tinh Dông Thap'
        };
        
        saveVanBanMoi(thongTinVanBan);
        
      } catch (error) {
        console.error(`   Loi khi xu ly van ban ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n5. Hoan thanh!');
    console.log(`   Tong cong: ${vanBanMoiCount} van ban moi`);
    console.log(`   Da tai: ${fileTaiVeCount} file`);
    
    // Kiem tra thu muc downloads
    const downloadedFiles = fs.readdirSync(downloadsDir);
    console.log(`   Thu muc van-ban-den/ chua ${downloadedFiles.length} file:`);
    downloadedFiles.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${stats.size} bytes)`);
    });
    
  } catch (error) {
    console.error('Loi:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('6. Dôn dêp...');
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      console.error('Loi khi dong browser:', e.message);
    }
  }
}

crawlAndDownload().catch(console.error);
