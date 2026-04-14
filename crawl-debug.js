const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USERNAME = '087086001224';
const PASSWORD = 'Dongthap@123';

async function debugCrawl() {
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
    console.log('1. Đăng nhập...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Đăng nhập nhanh
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
          if (text.includes('Đăng nhập') || text.includes('Login')) {
            btn.click();
            break;
          }
        }
      }
    }, { username: USERNAME, password: PASSWORD });
    
    await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    console.log('2. Chụp ảnh danh sách văn bản...');
    await page.screenshot({ path: 'debug-01-list.png', fullPage: true });
    console.log('   Đã chụp: debug-01-list.png');
    
    // Đợi table
    try {
      await page.waitForSelector('table, mat-table, .mat-mdc-table', { timeout: 10000 });
    } catch (e) {
      console.log('   Không tìm thấy table, thử đợi thêm...');
      await page.waitForTimeout(2000);
    }
    
    // Tìm và click văn bản đầu tiên
    console.log('3. Tìm link văn bản đầu tiên...');
    
    const firstLinkInfo = await page.evaluate(() => {
      // Tìm các row có số hiệu văn bản
      const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
      
      for (const row of rows) {
        const rowText = row.textContent || row.innerText || '';
        
        // Kiểm tra có phải row văn bản không
        if (rowText.match(/\d+\/SGDĐT-[\w-]+/)) {
          // Tìm link trong row
          const links = row.querySelectorAll('a');
          
          for (const link of links) {
            const linkText = link.textContent || link.innerText || '';
            const href = link.href || '';
            
            // Link trích yếu thường dài và có nội dung
            if (linkText.length > 10 && !linkText.match(/^\d+\//)) {
              return {
                rowText: rowText.substring(0, 200),
                linkText: linkText.substring(0, 100),
                href: href,
                linkFound: true
              };
            }
          }
        }
      }
      
      return { linkFound: false };
    });
    
    console.log('   Thông tin link:', firstLinkInfo);
    
    if (firstLinkInfo.linkFound) {
      console.log('4. Click vào link văn bản...');
      
      // Click vào link
      await page.evaluate(() => {
        const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
        
        for (const row of rows) {
          const rowText = row.textContent || row.innerText || '';
          
          if (rowText.match(/\d+\/SGDĐT-[\w-]+/)) {
            const links = row.querySelectorAll('a');
            
            for (const link of links) {
              const linkText = link.textContent || link.innerText || '';
              
              if (linkText.length > 10 && !linkText.match(/^\d+\//)) {
                link.click();
                return true;
              }
            }
          }
        }
        return false;
      });
      
      // Đợi trang tải
      await page.waitForTimeout(4000);
      
      // Chụp ảnh giao diện chi tiết
      console.log('5. Chụp ảnh giao diện chi tiết...');
      await page.screenshot({ path: 'debug-02-detail.png', fullPage: true });
      console.log('   Đã chụp: debug-02-detail.png');
      console.log('   URL hiện tại:', page.url());
      
      // Tìm các nút tải xuống
      console.log('6. Tìm các nút/link tải xuống...');
      
      const downloadInfo = await page.evaluate(() => {
        const results = [];
        
        // Tìm tất cả các button và link có liên quan đến tải
        const buttons = document.querySelectorAll('button, a, mat-icon');
        
        for (const btn of buttons) {
          const text = (btn.textContent || btn.innerText || '').toLowerCase();
          const title = (btn.title || '').toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          
          if (text.includes('tải') || text.includes('download') || 
              title.includes('tải') || title.includes('download') ||
              ariaLabel.includes('tải') || ariaLabel.includes('download') ||
              text.includes('file') || text.includes('đính kèm') ||
              text.includes('.pdf') || text.includes('.doc')) {
            
            results.push({
              tag: btn.tagName,
              text: btn.textContent || btn.innerText || '',
              title: btn.title || '',
              ariaLabel: btn.getAttribute('aria-label') || '',
              class: btn.className || '',
              id: btn.id || ''
            });
          }
        }
        
        // Tìm các section/file list
        const fileSections = document.querySelectorAll('[class*="file"], [class*="dinh-kem"], [class*="attachment"], [class*="tai-lieu"]');
        
        return {
          buttons: results.slice(0, 20), // Giới hạn 20 kết quả
          fileSectionsFound: fileSections.length,
          pageTitle: document.title,
          bodyText: document.body.textContent.substring(0, 500)
        };
      });
      
      console.log('   Thông tin tìm thấy:', JSON.stringify(downloadInfo, null, 2));
      
      // Tìm bảng file đính kèm
      const attachmentTable = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        
        for (const table of tables) {
          const tableText = table.textContent || '';
          
          if (tableText.includes('File') || tableText.includes('đính kèm') || 
              tableText.includes('Tên file') || tableText.includes('.pdf') ||
              tableText.includes('.doc')) {
            return {
              found: true,
              text: tableText.substring(0, 300),
              rowCount: table.querySelectorAll('tr').length
            };
          }
        }
        
        return { found: false };
      });
      
      console.log('   Bảng file đính kèm:', attachmentTable);
      
    } else {
      console.log('   Không tìm thấy link văn bản!');
    }
    
    console.log('\n7. Hoàn thành debug!');
    console.log('   Vui lòng kiểm tra các file ảnh:');
    console.log('   - debug-01-list.png: Danh sách văn bản');
    console.log('   - debug-02-detail.png: Giao diện chi tiết');
    
  } catch (error) {
    console.error('Lỗi:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n8. Dọn dẹp...');
    try {
      await context.close();
      await browser.close();
    } catch (e) {
      console.error('Lỗi khi đóng browser:', e.message);
    }
  }
}

debugCrawl().catch(console.error);
