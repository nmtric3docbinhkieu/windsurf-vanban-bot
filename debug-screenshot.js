const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = '087086001224';
const PASSWORD = 'Dongthap@123';

async function debugScreenshot() {
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('1. Đăng nhập...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Đăng nhập
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
      if (submitBtn) {
        submitBtn.click();
      } else {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent || btn.innerText || '';
          if (text.includes('Đăng nhập')) btn.click();
        }
      }
    }, { username: USERNAME, password: PASSWORD });
    
    await page.waitForTimeout(5000);
    console.log('   Đã đăng nhập');
    
    // Chụp danh sách văn bản
    console.log('2. Chụp danh sách văn bản...');
    await page.screenshot({ path: 'debug-list.png', fullPage: false });
    
    // Click vào văn bản 1143/SGDĐT-TCCB
    console.log('3. Click vào văn bản 1143/SGDĐT-TCCB...');
    const clicked = await page.evaluate(() => {
      const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
      
      for (const row of rows) {
        const rowText = row.textContent || '';
        
        if (rowText.includes('1143/SGDĐT-TCCB')) {
          const links = row.querySelectorAll('a');
          
          for (const link of links) {
            const linkText = link.textContent || '';
            if (linkText.length > 20 && !linkText.match(/^\d+\/\w+/)) {
              link.click();
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (!clicked) {
      console.log('   Không tìm thấy văn bản 1143');
      return;
    }
    
    // Đợi trang chi tiết
    console.log('4. Đợi trang chi tiết...');
    await page.waitForTimeout(6000);
    
    // Chụp ảnh trang chi tiết (viewport)
    console.log('5. Chụp ảnh trang chi tiết...');
    await page.screenshot({ path: 'debug-detail.png', fullPage: false });
    
    // Chụp full page
    await page.screenshot({ path: 'debug-detail-full.png', fullPage: true });
    
    // Lưu HTML content
    console.log('6. Lưu HTML content...');
    const htmlContent = await page.content();
    fs.writeFileSync('debug-detail.html', htmlContent, 'utf8');
    
    // Lấy thông tin các element
    console.log('7. Phân tích cấu trúc...');
    const structure = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        tableCount: document.querySelectorAll('table').length,
        matTableCount: document.querySelectorAll('mat-table, .mat-table, .mat-mdc-table').length,
        rowCount: document.querySelectorAll('tr').length,
        buttonCount: document.querySelectorAll('button').length,
        hasFileVanBan: document.body.textContent.includes('FILE VĂN BẢN'),
        bodyTextPreview: document.body.textContent.substring(0, 1000)
      };
    });
    
    console.log('   Cấu trúc:', JSON.stringify(structure, null, 2));
    
    // Tìm các bảng cụ thể
    const tables = await page.evaluate(() => {
      const result = [];
      const allTables = document.querySelectorAll('table, mat-table, .mat-table, .mat-mdc-table');
      
      allTables.forEach((table, index) => {
        const text = table.textContent || '';
        result.push({
          index,
          tag: table.tagName,
          class: table.className,
          textPreview: text.substring(0, 200),
          hasFileKeyword: text.includes('FILE') || text.includes('VĂN BẢN') || text.includes('Tên file'),
          hasExtension: text.includes('.pdf') || text.includes('.doc'),
          rowCount: table.querySelectorAll('tr').length
        });
      });
      
      return result;
    });
    
    console.log('   Tables found:', JSON.stringify(tables, null, 2));
    
    // Chụp thêm ảnh vùng có file văn bản (nếu có)
    console.log('8. Tìm và chụp vùng FILE VĂN BẢN...');
    const fileSection = await page.evaluate(() => {
      // Tìm element chứa "FILE VĂN BẢN"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes('FILE VĂN BẢN')) {
          return {
            found: true,
            text: node.textContent,
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className
          };
        }
      }
      return { found: false };
    });
    
    console.log('   File section:', fileSection);
    
    console.log('\n✅ Hoàn thành! Các file đã tạo:');
    console.log('   - debug-list.png: Danh sách văn bản');
    console.log('   - debug-detail.png: Trang chi tiết (viewport)');
    console.log('   - debug-detail-full.png: Trang chi tiết (full page)');
    console.log('   - debug-detail.html: HTML content');
    
  } catch (error) {
    console.error('Lỗi:', error.message);
  } finally {
    console.log('\nNhấn Enter trong terminal để đóng browser...');
    // Không đóng browser để user có thể xem
  }
}

debugScreenshot().catch(console.error);
