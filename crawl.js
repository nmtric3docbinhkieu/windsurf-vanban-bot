// scripts/crawl.js
const { chromium } = require('playwright');

const USERNAME = '087086001224';
const PASSWORD = 'Dongthap@123';

async function crawl() {
  // SỬA: Dùng Chrome thay vì Edge
  const browser = await chromium.launch({ 
    headless: false,  // false để nhìn thấy trình duyệt
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  
  try {
    console.log('🔐 Đang đăng nhập...');
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000 });
    await page.fill('input[name="username"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    console.log('📂 Vào tab Chờ duyệt...');
    await page.click('text=Chờ duyệt');
    await page.waitForSelector('table tbody tr');
    
    const documents = await page.$$eval('table tbody tr', rows => {
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          so_hieu: cells[0]?.innerText?.trim() || '',
          trich_yeu: cells[1]?.innerText?.trim() || '',
          ngay_ban_hanh: cells[2]?.innerText?.trim() || '',
        };
      });
    });
    
    console.log(`📋 Tìm thấy ${documents.length} văn bản trong Chờ duyệt`);
    
    if (documents.length === 0) {
      console.log('✅ Không có văn bản mới.');
    } else {
      console.log('📄 Danh sách:');
      documents.forEach(doc => {
        console.log(`   - ${doc.so_hieu}: ${doc.trich_yeu.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await browser.close();
  }
}

crawl();