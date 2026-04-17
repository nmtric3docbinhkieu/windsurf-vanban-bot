const { chromium } = require('playwright');
require('dotenv').config();

async function debugMenu() {
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
    console.log('1. Dang nhap...');
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Dang nhap
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
    }, { username: '087086001224', password: 'Dongthap@123' });
    await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('2. Tim van ban 362/KH-SGD...');
    await page.waitForTimeout(3000);
    
    // Click vào van ban
    const linkHandle = await page.evaluateHandle(() => {
      const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], tr');
      
      for (const row of rows) {
        const rowText = row.textContent || row.innerText || '';
        
        if (rowText.includes('362/KH-SGD')) {
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
    });
    
    if (linkHandle) {
      console.log('3. Click van ban...');
      await linkHandle.click();
      await page.waitForTimeout(5000);
      
      console.log('4. Dang tai trang chi tiet...');
      await page.screenshot({ path: 'debug-detail-page.png', fullPage: true });
      
      // Tim và click vào file dau tien
      console.log('5. Click vào file dau tien...');
      const moreBtnClicked = await page.evaluate(() => {
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
                
                if (fileCount === 1) {
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
      });
      
      if (moreBtnClicked) {
        console.log('6. Da click menu, doi 2s...');
        await page.waitForTimeout(2000);
        
        // Chup màn hình menu
        await page.screenshot({ path: 'debug-menu.png', fullPage: true });
        console.log('7. Da chup menu: debug-menu.png');
        
        // Debug menu items
        const menuDebug = await page.evaluate(() => {
          const allMenuItems = document.querySelectorAll('mat-menu-item, [role="menuitem"], .mat-mdc-menu-item, button, div');
          const menuDebug = [];
          
          allMenuItems.forEach((item, idx) => {
            const text = item.textContent || item.innerText || '';
            const tag = item.tagName;
            const role = item.getAttribute('role') || '';
            const classes = item.className || '';
            
            if (text.length > 0 && text.length < 200) {
              menuDebug.push({
                index: idx,
                text: text.trim(),
                tag: tag,
                role: role,
                classes: classes
              });
            }
          });
          
          return menuDebug;
        });
        
        console.log('8. Menu items found:');
        menuDebug.forEach(item => {
          console.log(`   [${item.index}] ${item.tag} (${item.role}): "${item.text}"`);
        });
        
        // Thoát sau 10s
        await page.waitForTimeout(10000);
      } else {
        console.log('6. Không tìm thay nút 3 châm');
      }
    }
    
  } catch (error) {
    console.error('Loi:', error.message);
  } finally {
    await browser.close();
  }
}

debugMenu().catch(console.error);
