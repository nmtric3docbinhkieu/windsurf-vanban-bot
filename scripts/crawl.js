// scripts/crawl.js
const { chromium } = require('playwright');

const USERNAME = process.env.VPDT_USERNAME;
const PASSWORD = process.env.VPDT_PASSWORD;

async function crawl() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🔐 Đang đăng nhập...');
    await page.goto('https://vpdt.dongthap.gov.vn');
    await page.fill('input[name="087086001224"]', USERNAME);
    await page.fill('input[name="Dongthap@123"]', PASSWORD);
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