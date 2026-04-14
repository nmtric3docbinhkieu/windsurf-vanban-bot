const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = '087086001224';
const PASSWORD = 'Dongthap@123';

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
    console.log('1. Tìm và xóa các file download tùy...');
    const downloadsDir = path.join(process.cwd(), 'van-ban-den');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    console.log('2. Tiang nhap...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Chuyu trang dang nhap - thu nhiều selector khác nhau
    console.log('   Tim input dang nhap...');
    
    // Thử các selector cho username
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
        console.log(`   Username input found with selector: ${selector}`);
        usernameFound = true;
        break;
      } catch (e) {
        // Thử selector tiếp theo
      }
    }
    
    if (!usernameFound) {
      throw new Error('Không tìm thấy input username');
    }
    
    // Thử các selector cho password
    const passwordSelectors = [
      'input[placeholder*="Nhập mật khẩu"]',
      'input[placeholder*="mật khẩu"]',
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
        console.log(`   Password input found with selector: ${selector}`);
        passwordFound = true;
        break;
      } catch (e) {
        // Thử selector tiếp theo
      }
    }
    
    if (!passwordFound) {
      throw new Error('Không tìm thấy input password');
    }
    
    // Thử các selector cho nút login
    const loginSelectors = [
      'button[type="submit"]',
      'button:has-text("Đăng nhập")',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'input[type="submit"]',
      '[role="button"]:has-text("Đăng nhập")'
    ];
    
    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.locator(selector).click();
        console.log(`   Login button clicked with selector: ${selector}`);
        loginClicked = true;
        break;
      } catch (e) {
        // Thử selector tiếp theo
      }
    }
    
    if (!loginClicked) {
      throw new Error('Không tìm thấy nút đăng nhập');
    }
    
    // Cho trang chuyen huong
    await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 15000 });
    
    // Debug: Cho trang load hoàn toàn và kiểm tra URL hiện tại
    console.log('   Đợi trang load hoàn toàn...');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Debug: Chụp ảnh màn hình để xem trang hiện tại
    await page.screenshot({ path: 'debug-after-login.png', fullPage: true });
    console.log('   Đã chụp màn hình: debug-after-login.png');
    
    console.log('3. Vao tab "Cho duyet" trong Van ban den...');
    
    // Debug: Tìm tất cả các menu item có text liên quan
    console.log('   Tìm các menu item...');
    const allMenuItems = await page.locator('a, button, [role="menuitem"], span').all();
    for (let i = 0; i < Math.min(allMenuItems.length, 20); i++) {
      try {
        const text = await allMenuItems[i].innerText();
        if (text && text.toLowerCase().includes('văn')) {
          console.log(`   Found menu item: "${text}"`);
        }
      } catch (e) {
        // Bỏ qua
      }
    }
    
    // Thử các selector cho "Văn bản đến"
    const vanBanDenSelectors = [
      'text=Văn bản đến',
      'text=Van ban den',
      'a:has-text("Văn bản đến")',
      'button:has-text("Văn bản đến")',
      '[role="menuitem"]:has-text("Văn bản đến")',
      '.menu-item:has-text("Văn bản đến")',
      'span:has-text("Văn bản đến")'
    ];
    
    let vanBanDenClicked = false;
    for (const selector of vanBanDenSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.locator(selector).click();
        console.log(`   Văn bản đến clicked with selector: ${selector}`);
        vanBanDenClicked = true;
        break;
      } catch (e) {
        console.log(`   Selector failed: ${selector}`);
      }
    }
    
    if (!vanBanDenClicked) {
      throw new Error('Không tìm thấy menu "Văn bản đến"');
    }
    
    // Cho menu mo ra
    await page.waitForTimeout(1000);
    
    // Thử các selector cho "Chờ duyệt"
    const choDuyetSelectors = [
      'text=Chờ duyệt',
      'text=Cho duyet',
      'a:has-text("Chờ duyệt")',
      'button:has-text("Chờ duyệt")',
      '[role="menuitem"]:has-text("Chờ duyệt")',
      'li:has-text("Chờ duyệt")',
      '.submenu-item:has-text("Chờ duyệt")'
    ];
    
    let choDuyetClicked = false;
    for (const selector of choDuyetSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.locator(selector).click();
        console.log(`   Chờ duyệt clicked with selector: ${selector}`);
        choDuyetClicked = true;
        break;
      } catch (e) {
        console.log(`   Selector failed: ${selector}`);
      }
    }
    
    if (!choDuyetClicked) {
      throw new Error('Không tìm thấy menu "Chờ duyệt"');
    }
    
    // Cho trang danh sach tai
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    console.log('4. Lay van ban dau tien...');
    const firstDocLink = await page.locator('table tbody tr').first().locator('a').first();
    const docTitle = await firstDocLink.innerText();
    console.log(`   Van ban: ${docTitle}`);
    
    // Click vao van ban dau tien
    await firstDocLink.click();
    
    // Cho trang chi tai tai
    await page.waitForSelector('text=CHI TIET Van ban den', { timeout: 10000 });
    
    console.log('5. Tim va tai TAT CA file dinh kem...');
    
    // Tim tat ca cac file dinh kem
    const fileRows = await page.locator('table tbody tr').all();
    
    if (fileRows.length === 0) {
      console.log('   Khong co file dinh kem nao.');
      return;
    }
    
    console.log(`   Tim thay ${fileRows.length} file dinh kem`);
    
    // Tai tung file - dung selector chính xác t codegen
    for (let i = 0; i < fileRows.length; i++) {
      try {
        console.log(`   File ${i + 1}: Dang tai...`);
        
        // Click nut more_vert theo index
        const moreVertButton = page.getByRole('button').filter({ hasText: 'more_vert' }).nth(i + 1);
        await moreVertButton.click();
        
        // Cho menu hien ra
        await page.waitForTimeout(500);
        
        // Click vao "Tai xuong tep tin" - thu nhiều selector khác nhau
        const downloadPromise = page.waitForEvent('download');
        
        // Thử các selector khác nhau cho menu download
        let downloadClicked = false;
        const selectors = [
          () => page.getByRole('menuitem', { name: 'Tải xuống tệp tin' }).click(),
          () => page.getByRole('menuitem', { name: 'Tai xuong tep tin' }).click(),
          () => page.getByRole('menuitem', { name: /tải xuống/i }).click(),
          () => page.locator('mat-menu-item:has-text("Tải")').click(),
          () => page.locator('[role="menuitem"]:has-text("Tải")').click()
        ];
        
        for (const selectorFn of selectors) {
          try {
            await selectorFn();
            downloadClicked = true;
            break;
          } catch (e) {
            console.log(`   Selector failed: ${e.message}`);
          }
        }
        
        if (!downloadClicked) {
          throw new Error('Không thể click vào menu download');
        }
        
        const download = await downloadPromise;
        
        // Debug logging
        console.log(`   Download URL: ${download.url()}`);
        console.log(`   Suggested filename: ${download.suggestedFilename()}`);
        
        // Lấy tên file - xử lý trường hợp không có suggestedFilename
        let originalFileName = download.suggestedFilename();
        if (!originalFileName || originalFileName.includes('tmp') || originalFileName.length < 3) {
          // Tạo tên file từ timestamp nếu không có tên gốc
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          originalFileName = `van-ban-${timestamp}.pdf`;
          console.log(`   Using generated filename: ${originalFileName}`);
        }
        
        // Đợi download hoàn tất
        console.log('   Đợi download hoàn tất...');
        const path = await download.path();
        console.log(`   Download temp path: ${path}`);
        
        const savePath = path.join(downloadsDir, originalFileName);
        
        console.log(`   Dang luu: ${originalFileName} -> van-ban-den/${originalFileName}`);
        await download.saveAs(savePath);
        
        // Kiểm tra file đã được lưu thực sự
        if (fs.existsSync(savePath)) {
          const stats = fs.statSync(savePath);
          console.log(`   Da tai thanh cong: ${originalFileName} (${stats.size} bytes)`);
        } else {
          console.error(`   WARNING: File không tồn tại sau khi save: ${savePath}`);
        }
        
        // Cho menu dong truoc khi tiep tuc
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.error(`   Loi khi tai file ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('6. Hoan thanh!');
    
    // Kiểm tra lại thư mục downloads
    const downloadedFiles = fs.readdirSync(downloadsDir);
    console.log(`   Da tai ${downloadedFiles.length} file vao thu muc van-ban-den/:`);
    downloadedFiles.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${stats.size} bytes)`);
    });
    
  } catch (error) {
    console.error('Loi:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('7. Dọn dẹp...');
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      console.error('Lỗi khi đóng browser:', e.message);
    }
  }
}

crawlAndDownload().catch(console.error);
